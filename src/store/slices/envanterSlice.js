import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  documentId,
  getCountFromServer,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import cacheService from '../../services/cacheService';
import { CACHE_KEYS } from '../../config/appConfig';

const tsToISO = (val) => val?.toDate?.()?.toISOString() ?? val ?? null;

const ENVANTER_PAGE_SIZE = 20;

const mapEnvanterDoc = (d) => {
  const data = d.data();
  return {
    ...data,
    _docId: d.id,
    sonTeslimAlma: tsToISO(data.sonTeslimAlma),
    sonTeslimEtme: tsToISO(data.sonTeslimEtme),
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
  };
};

/**
 * QR data ile doğrudan Firestore'dan item arar.
 * Önce Firestore doc ID olarak dener, sonra 'id' alanıyla sorgular.
 */
export const lookupItemByQRData = async (data) => {
  if (!data) return null;
  try {
    // 1) Firestore doc ID olarak dene
    const docSnap = await getDoc(doc(db, 'envanterItems', data));
    if (docSnap.exists()) return mapEnvanterDoc(docSnap);

    // 2) 'id' alanıyla sorgula (QR'da özel ID varsa)
    const q = query(collection(db, 'envanterItems'), where('id', '==', data), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return mapEnvanterDoc(snap.docs[0]);

    return null;
  } catch (e) {
    if (__DEV__) console.warn('[lookupItemByQRData] error:', e);
    return null;
  }
};

/** İlk sayfa envanter. tur = 'Tümü' ise tüm kategoriler, aksi hâlde sadece o tur.
 *  forceRefresh = true → cache atla, her zaman Firestore'dan çek (pull-to-refresh için). */
export const fetchEnvanterItemsFirstPage = createAsyncThunk(
  'envanter/fetchItemsFirstPage',
  async ({ tur = 'Tümü', forceRefresh = false } = {}, { rejectWithValue }) => {
    const cacheKey = `${CACHE_KEYS.ENVANTER_ITEMS}_${tur}`;
    try {
      // Cache kontrolü (forceRefresh değilse)
      if (!forceRefresh) {
        const cached = await cacheService.getValid(cacheKey);
        if (cached) return { ...cached, tur };
      }
      const filters = [where('bos', '==', false)];
      if (tur && tur !== 'Tümü') filters.push(where('tur', '==', tur));
      const q = query(
        collection(db, 'envanterItems'),
        ...filters,
        orderBy('ad'),
        orderBy(documentId()),
        limit(ENVANTER_PAGE_SIZE)
      );
      const snapshot = await getDocs(q);
      const allDocs = snapshot.docs;
      const items = allDocs.map(mapEnvanterDoc);
      const lastDoc = allDocs[allDocs.length - 1];
      const nextCursor = lastDoc ? { ad: lastDoc.data().ad, id: lastDoc.id } : null;
      const hasMore = allDocs.length === ENVANTER_PAGE_SIZE;
      await cacheService.set(cacheKey, { items, nextCursor, hasMore });
      return { items, nextCursor, hasMore, tur };
    } catch (error) {
      // Hata durumunda süresi dolmuş da olsa cache'i göster
      const cached = await cacheService.getAny(cacheKey);
      if (cached) return { ...cached, tur };
      return rejectWithValue(error.message);
    }
  }
);

/** Sonraki sayfa envanter. cursor + tur aynı olmalı. */
export const fetchEnvanterItemsNextPage = createAsyncThunk(
  'envanter/fetchItemsNextPage',
  async ({ cursor, tur = 'Tümü' }, { rejectWithValue }) => {
    try {
      if (!cursor?.ad || !cursor?.id) {
        return { items: [], nextCursor: null, hasMore: false, tur };
      }
      const filters = [where('bos', '==', false)];
      if (tur && tur !== 'Tümü') filters.push(where('tur', '==', tur));
      const q = query(
        collection(db, 'envanterItems'),
        ...filters,
        orderBy('ad'),
        orderBy(documentId()),
        limit(ENVANTER_PAGE_SIZE),
        startAfter(cursor.ad, cursor.id)
      );
      const snapshot = await getDocs(q);
      const allDocs = snapshot.docs;
      const items = allDocs.map(mapEnvanterDoc);
      const lastDoc = allDocs[allDocs.length - 1];
      const nextCursor = lastDoc ? { ad: lastDoc.data().ad, id: lastDoc.id } : null;
      const hasMore = allDocs.length === ENVANTER_PAGE_SIZE;
      return { items, nextCursor, hasMore, tur };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/** Tüm envanter (önceki davranış; gerekirse kullan). */
export const fetchEnvanterItems = createAsyncThunk(
  'envanter/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const snapshot = await getDocs(collection(db, 'envanterItems'));
      const items = snapshot.docs.map(mapEnvanterDoc);

      await cacheService.set(CACHE_KEYS.ENVANTER_ITEMS, items);
      return items;
    } catch (error) {
      const cached = await cacheService.getAny(CACHE_KEYS.ENVANTER_ITEMS);
      if (cached) return cached;
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEnvanterCounts = createAsyncThunk(
  'envanter/fetchCounts',
  async ({ forceRefresh = false } = {}, { rejectWithValue }) => {
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(CACHE_KEYS.ENVANTER_COUNTS);
        if (cached) return cached;
      }
      const [totalSnap, ofistSnap, disaridaSnap] = await Promise.all([
        getCountFromServer(query(collection(db, 'envanterItems'), where('bos', '==', false))),
        getCountFromServer(query(collection(db, 'envanterItems'), where('bos', '==', false), where('durum', '==', 'ofiste'))),
        getCountFromServer(query(collection(db, 'envanterItems'), where('bos', '==', false), where('durum', '==', 'disarida'))),
      ]);
      const result = {
        total: totalSnap.data().count,
        ofiste: ofistSnap.data().count,
        disarida: disaridaSnap.data().count,
      };
      await cacheService.set(CACHE_KEYS.ENVANTER_COUNTS, result);
      return result;
    } catch (error) {
      const cached = await cacheService.getAny(CACHE_KEYS.ENVANTER_COUNTS);
      if (cached) return cached;
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEnvanterHareketler = createAsyncThunk(
  'envanter/fetchHareketler',
  async ({ forceRefresh = false, uid = null, role = null } = {}, { rejectWithValue }) => {
    const isAdminOrManager = role === 'admin' || role === 'manager';
    if (!isAdminOrManager && !uid) return rejectWithValue('Kullanıcı oturumu bulunamadı.');
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(CACHE_KEYS.ENVANTER_HAREKETLER);
        if (cached) return cached;
      }
      const birAyOnce = new Date();
      birAyOnce.setMonth(birAyOnce.getMonth() - 1);

      // Normal kullanıcı sadece kendi hareketlerini okuyabilir, son 1 ay
      const q = isAdminOrManager
        ? query(
            collection(db, 'envanterHareketler'),
            where('teslimAlma', '>=', birAyOnce),
            orderBy('teslimAlma', 'desc')
          )
        : query(
            collection(db, 'envanterHareketler'),
            where('userId', '==', uid),
            where('teslimAlma', '>=', birAyOnce),
            orderBy('teslimAlma', 'desc')
          );

      const snapshot = await getDocs(q);
      const hareketler = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          _hareketId: d.id,
          teslimAlma: tsToISO(data.teslimAlma),
          teslimEtme: tsToISO(data.teslimEtme),
        };
      });

      await cacheService.set(CACHE_KEYS.ENVANTER_HAREKETLER, hareketler);
      return hareketler;
    } catch (error) {
      const cached = await cacheService.getAny(CACHE_KEYS.ENVANTER_HAREKETLER);
      if (cached) return cached;
      return rejectWithValue(error.message);
    }
  }
);

const EQUIP_HISTORY_PAGE_SIZE = 15;

/** Kullanıcıya ait ekipman geçmişi — sayfalama destekli. */
export const fetchUserEquipmentHistory = createAsyncThunk(
  'envanter/fetchUserEquipmentHistory',
  async ({ userId, cursor = null, forceRefresh = false }, { rejectWithValue }) => {
    const cacheKey = `${CACHE_KEYS.EQUIP_HISTORY}_${userId}`;
    try {
      // Sadece ilk sayfa cache'lenebilir
      if (!cursor && !forceRefresh) {
        const cached = await cacheService.getValid(cacheKey);
        if (cached) return { ...cached, userId };
      }
      const constraints = [
        where('userId', '==', userId),
        orderBy('teslimAlma', 'desc'),
        limit(EQUIP_HISTORY_PAGE_SIZE),
      ];
      if (cursor) constraints.push(startAfter(Timestamp.fromDate(new Date(cursor))));
      const snapshot = await getDocs(query(collection(db, 'envanterHareketler'), ...constraints));
      const hareketler = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          _hareketId: d.id,
          teslimAlma: tsToISO(data.teslimAlma),
          teslimEtme: tsToISO(data.teslimEtme),
        };
      });
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      const nextCursor = lastDoc ? tsToISO(lastDoc.data().teslimAlma) : null;
      const hasMore = snapshot.docs.length === EQUIP_HISTORY_PAGE_SIZE;
      const result = { hareketler, nextCursor, hasMore };
      if (!cursor) await cacheService.set(cacheKey, result);
      return { ...result, userId };
    } catch (error) {
      if (!cursor) {
        const cached = await cacheService.getAny(cacheKey);
        if (cached) return { ...cached, userId };
      }
      return rejectWithValue(error.message);
    }
  }
);

export const teslimAl = createAsyncThunk(
  'envanter/teslimAl',
  async ({ docId, userId, displayName, itemAd, itemTur }, { rejectWithValue }) => {
    try {
      const now = new Date();
      const itemRef = doc(db, 'envanterItems', docId);
      // Yeni hareket için önceden ID üret (transaction içinde kullanmak için)
      const hareketRef = doc(collection(db, 'envanterHareketler'));

      await runTransaction(db, async (transaction) => {
        const itemSnap = await transaction.get(itemRef);
        if (!itemSnap.exists()) throw new Error('Ekipman bulunamadı.');

        // Anlık Firestore durumunu kontrol et — cache değil!
        const current = itemSnap.data();
        if (current.durum !== 'ofiste') {
          throw new Error('Bu ekipman başka birinde. Lütfen listeyi yenileyin.');
        }

        transaction.set(hareketRef, {
          itemId: docId,
          itemAd,
          itemTur,
          userId,
          kullaniciAd: displayName,
          teslimAlma: now,
          teslimEtme: null,
        });

        transaction.update(itemRef, {
          durum: 'disarida',
          kimde: userId,
          kimdeAd: displayName,
          sonTeslimAlma: now,
          aktifHareketId: hareketRef.id,
          updatedAt: now,
        });
      });

      return {
        docId,
        durum: 'disarida',
        kimde: userId,
        kimdeAd: displayName,
        sonTeslimAlma: now.toISOString(),
        aktifHareketId: hareketRef.id,
        updatedAt: now.toISOString(),
        yeniHareket: {
          _hareketId: hareketRef.id,
          itemId: docId,
          itemAd,
          itemTur,
          userId,
          kullaniciAd: displayName,
          teslimAlma: now.toISOString(),
          teslimEtme: null,
        },
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const teslimEt = createAsyncThunk(
  'envanter/teslimEt',
  async ({ docId, aktifHareketId, userId }, { rejectWithValue }) => {
    try {
      const now = new Date();
      const itemRef = doc(db, 'envanterItems', docId);

      await runTransaction(db, async (transaction) => {
        const itemSnap = await transaction.get(itemRef);
        if (!itemSnap.exists()) throw new Error('Ekipman bulunamadı.');

        const current = itemSnap.data();
        if (current.durum !== 'disarida') {
          throw new Error('Ekipman zaten ofiste.');
        }
        // Sahiplik kontrolü: sadece elinde tutan kişi iade edebilir
        if (userId && current.kimde !== userId) {
          throw new Error('Bu ekipman sizde değil, iade edilemez.');
        }

        if (aktifHareketId) {
          const hareketRef = doc(db, 'envanterHareketler', aktifHareketId);
          transaction.update(hareketRef, { teslimEtme: now });
        }

        transaction.update(itemRef, {
          durum: 'ofiste',
          kimde: null,
          kimdeAd: null,
          sonTeslimEtme: now,
          aktifHareketId: null,
          updatedAt: now,
        });
      });

      return {
        docId,
        durum: 'ofiste',
        kimde: null,
        kimdeAd: null,
        sonTeslimEtme: now.toISOString(),
        aktifHareketId: null,
        updatedAt: now.toISOString(),
        teslimEdilenHareketId: aktifHareketId,
        teslimEtmeZamani: now.toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const envanterSlice = createSlice({
  name: 'envanter',
  initialState: {
    items: [],
    activeTur: 'Tümü',
    hareketler: [],
    loading: false,
    loadingMore: false,
    hareketlerLoading: false,
    processingId: null,
    error: null,
    itemsCursor: null,
    itemsHasMore: false,
    lastItemsFetchAt: null,
    lastHareketlerFetchAt: null,
    counts: { total: null, ofiste: null, disarida: null },
    countsLoading: false,
    equipmentHistory: [],
    equipmentHistoryCursor: null,
    equipmentHistoryHasMore: false,
    equipmentHistoryLoading: false,
    equipmentHistoryLoadingMore: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnvanterItemsFirstPage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEnvanterItemsFirstPage.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.itemsCursor = action.payload.nextCursor;
        state.itemsHasMore = action.payload.hasMore;
        state.lastItemsFetchAt = Date.now();
        state.activeTur = action.payload.tur || 'Tümü';
        // counts sıfırlanmıyor — getCountFromServer ile ayrı çekilir
      })
      .addCase(fetchEnvanterItemsFirstPage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchEnvanterItemsNextPage.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(fetchEnvanterItemsNextPage.fulfilled, (state, action) => {
        state.loadingMore = false;
        state.items = state.items.concat(action.payload.items);
        state.itemsCursor = action.payload.nextCursor;
        state.itemsHasMore = action.payload.hasMore;
      })
      .addCase(fetchEnvanterItemsNextPage.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchEnvanterItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEnvanterItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.itemsCursor = null;
        state.itemsHasMore = false;
      })
      .addCase(fetchEnvanterItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchEnvanterCounts.pending, (state) => {
        state.countsLoading = true;
      })
      .addCase(fetchEnvanterCounts.fulfilled, (state, action) => {
        state.counts = action.payload;
        state.countsLoading = false;
      })
      .addCase(fetchEnvanterCounts.rejected, (state) => {
        state.countsLoading = false;
      });

    builder
      .addCase(fetchEnvanterHareketler.pending, (state) => {
        state.hareketlerLoading = true;
        state.error = null;
      })
      .addCase(fetchEnvanterHareketler.fulfilled, (state, action) => {
        state.hareketlerLoading = false;
        state.hareketler = action.payload;
        state.lastHareketlerFetchAt = Date.now();
      })
      .addCase(fetchEnvanterHareketler.rejected, (state, action) => {
        state.hareketlerLoading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchUserEquipmentHistory.pending, (state, action) => {
        if (action.meta.arg.cursor) {
          state.equipmentHistoryLoadingMore = true;
        } else {
          state.equipmentHistoryLoading = true;
        }
      })
      .addCase(fetchUserEquipmentHistory.fulfilled, (state, action) => {
        state.equipmentHistoryLoading = false;
        state.equipmentHistoryLoadingMore = false;
        if (action.meta.arg.cursor) {
          state.equipmentHistory = state.equipmentHistory.concat(action.payload.hareketler);
        } else {
          state.equipmentHistory = action.payload.hareketler;
        }
        state.equipmentHistoryCursor = action.payload.nextCursor;
        state.equipmentHistoryHasMore = action.payload.hasMore;
      })
      .addCase(fetchUserEquipmentHistory.rejected, (state) => {
        state.equipmentHistoryLoading = false;
        state.equipmentHistoryLoadingMore = false;
      });

    builder
      .addCase(teslimAl.pending, (state, action) => {
        state.processingId = action.meta.arg.docId;
        state.error = null;
      })
      .addCase(teslimAl.fulfilled, (state, action) => {
        state.processingId = null;
        const { yeniHareket, ...itemGuncelleme } = action.payload;
        const idx = state.items.findIndex((i) => i._docId === itemGuncelleme.docId);
        if (idx !== -1) state.items[idx] = { ...state.items[idx], ...itemGuncelleme };
        if (yeniHareket) state.hareketler = [yeniHareket, ...state.hareketler];
      })
      .addCase(teslimAl.rejected, (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      });

    builder
      .addCase(teslimEt.pending, (state, action) => {
        state.processingId = action.meta.arg.docId;
        state.error = null;
      })
      .addCase(teslimEt.fulfilled, (state, action) => {
        state.processingId = null;
        const { teslimEdilenHareketId, teslimEtmeZamani, ...itemGuncelleme } = action.payload;
        const idx = state.items.findIndex((i) => i._docId === itemGuncelleme.docId);
        if (idx !== -1) state.items[idx] = { ...state.items[idx], ...itemGuncelleme };
        if (teslimEdilenHareketId) {
          const hIdx = state.hareketler.findIndex((h) => h._hareketId === teslimEdilenHareketId);
          if (hIdx !== -1) state.hareketler[hIdx] = { ...state.hareketler[hIdx], teslimEtme: teslimEtmeZamani };
        }
      })
      .addCase(teslimEt.rejected, (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      });
  },
});

export default envanterSlice.reducer;
