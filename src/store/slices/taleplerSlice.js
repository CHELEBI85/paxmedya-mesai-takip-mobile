import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, addDoc, doc, updateDoc, query, where, getDocs, orderBy, limit, startAfter, documentId } from 'firebase/firestore';
import { db } from '../../config/firebase';
import cacheService from '../../services/cacheService';
import { CACHE_KEYS } from '../../config/appConfig';

const TALEP_PAGE_SIZE = 20;

const dateDescCursor = (snap) => {
  const last = snap.docs[snap.docs.length - 1];
  if (!last) return null;
  return { createdAt: last.data().createdAt || '', id: last.id };
};

export const fetchTalepler = createAsyncThunk(
  'talepler/fetchTalepler',
  async ({ uid, forceRefresh = false }) => {
    const cacheKey = `${CACHE_KEYS.TALEPLER}_${uid}`;
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(cacheKey);
        if (cached) {
          const items = Array.isArray(cached) ? cached : (cached.items || []);
          return { items, cursor: cached.cursor || null, hasMore: cached.hasMore || false };
        }
      }
      const q = query(
        collection(db, 'talepler'),
        where('olusturanId', '==', uid),
        orderBy('createdAt', 'desc'),
        orderBy(documentId(), 'desc'),
        limit(TALEP_PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const cursor = dateDescCursor(snap);
      const hasMore = snap.docs.length === TALEP_PAGE_SIZE;
      await cacheService.set(cacheKey, { items, cursor, hasMore });
      return { items, cursor, hasMore };
    } catch (error) {
      const cached = await cacheService.getAny(cacheKey);
      if (cached) {
        const items = Array.isArray(cached) ? cached : (cached.items || []);
        return { items, cursor: cached.cursor || null, hasMore: cached.hasMore || false };
      }
      throw error;
    }
  }
);

export const fetchAllTalepler = createAsyncThunk(
  'talepler/fetchAllTalepler',
  async ({ forceRefresh = false } = {}) => {
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(CACHE_KEYS.TALEPLER_ALL);
        if (cached) {
          const items = Array.isArray(cached) ? cached : (cached.items || []);
          return { items, cursor: cached.cursor || null, hasMore: cached.hasMore || false };
        }
      }
      const q = query(
        collection(db, 'talepler'),
        orderBy('createdAt', 'desc'),
        orderBy(documentId(), 'desc'),
        limit(TALEP_PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const cursor = dateDescCursor(snap);
      const hasMore = snap.docs.length === TALEP_PAGE_SIZE;
      await cacheService.set(CACHE_KEYS.TALEPLER_ALL, { items, cursor, hasMore });
      return { items, cursor, hasMore };
    } catch (error) {
      const cached = await cacheService.getAny(CACHE_KEYS.TALEPLER_ALL);
      if (cached) {
        const items = Array.isArray(cached) ? cached : (cached.items || []);
        return { items, cursor: cached.cursor || null, hasMore: cached.hasMore || false };
      }
      throw error;
    }
  }
);

export const fetchIzinler = createAsyncThunk(
  'talepler/fetchIzinler',
  async ({ uid, forceRefresh = false }) => {
    const cacheKey = `${CACHE_KEYS.IZINLER}_${uid}`;
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(cacheKey);
        if (cached) {
          const items = Array.isArray(cached) ? cached : (cached.items || []);
          return { items, cursor: cached.cursor || null, hasMore: cached.hasMore || false };
        }
      }
      const q = query(
        collection(db, 'izinTalepleri'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        orderBy(documentId(), 'desc'),
        limit(TALEP_PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const cursor = dateDescCursor(snap);
      const hasMore = snap.docs.length === TALEP_PAGE_SIZE;
      await cacheService.set(cacheKey, { items, cursor, hasMore });
      return { items, cursor, hasMore };
    } catch (error) {
      const cached = await cacheService.getAny(cacheKey);
      if (cached) {
        const items = Array.isArray(cached) ? cached : (cached.items || []);
        return { items, cursor: cached.cursor || null, hasMore: cached.hasMore || false };
      }
      throw error;
    }
  }
);

export const fetchAllIzinler = createAsyncThunk(
  'talepler/fetchAllIzinler',
  async ({ forceRefresh = false } = {}) => {
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(CACHE_KEYS.IZINLER_ALL);
        if (cached) {
          const items = Array.isArray(cached) ? cached : (cached.items || []);
          return { items, cursor: cached.cursor || null, hasMore: cached.hasMore || false };
        }
      }
      const q = query(
        collection(db, 'izinTalepleri'),
        orderBy('createdAt', 'desc'),
        orderBy(documentId(), 'desc'),
        limit(TALEP_PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const cursor = dateDescCursor(snap);
      const hasMore = snap.docs.length === TALEP_PAGE_SIZE;
      await cacheService.set(CACHE_KEYS.IZINLER_ALL, { items, cursor, hasMore });
      return { items, cursor, hasMore };
    } catch (error) {
      const cached = await cacheService.getAny(CACHE_KEYS.IZINLER_ALL);
      if (cached) {
        const items = Array.isArray(cached) ? cached : (cached.items || []);
        return { items, cursor: cached.cursor || null, hasMore: cached.hasMore || false };
      }
      throw error;
    }
  }
);

export const addTalep = createAsyncThunk(
  'talepler/addTalep',
  async ({ uid, displayName, payload }) => {
    const createdAt = new Date().toISOString();
    const ref = await addDoc(collection(db, 'talepler'), {
      ...payload, olusturanId: uid, displayName, durum: 'Beklemede', createdAt,
    });
    const newTalep = { id: ref.id, ...payload, olusturanId: uid, displayName, durum: 'Beklemede', createdAt };
    await cacheService.patch(`${CACHE_KEYS.TALEPLER}_${uid}`, (cached) => {
      if (!Array.isArray(cached)) return [newTalep];
      return [newTalep, ...cached];
    });
    await cacheService.remove(CACHE_KEYS.TALEPLER_ALL);
    return { talep: newTalep, uid };
  }
);

export const fetchTaleplerNextPage = createAsyncThunk(
  'talepler/fetchTaleplerNextPage',
  async ({ uid, cursor }) => {
    const q = query(
      collection(db, 'talepler'),
      where('olusturanId', '==', uid),
      orderBy('createdAt', 'desc'),
      orderBy(documentId(), 'desc'),
      startAfter(cursor.createdAt, cursor.id),
      limit(TALEP_PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const nextCursor = dateDescCursor(snap);
    const hasMore = snap.docs.length === TALEP_PAGE_SIZE;
    return { items, cursor: nextCursor, hasMore };
  }
);

export const fetchAllTaleplerNextPage = createAsyncThunk(
  'talepler/fetchAllTaleplerNextPage',
  async ({ cursor }) => {
    const q = query(
      collection(db, 'talepler'),
      orderBy('createdAt', 'desc'),
      orderBy(documentId(), 'desc'),
      startAfter(cursor.createdAt, cursor.id),
      limit(TALEP_PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const nextCursor = dateDescCursor(snap);
    const hasMore = snap.docs.length === TALEP_PAGE_SIZE;
    return { items, cursor: nextCursor, hasMore };
  }
);

export const fetchIzinlerNextPage = createAsyncThunk(
  'talepler/fetchIzinlerNextPage',
  async ({ uid, cursor }) => {
    const q = query(
      collection(db, 'izinTalepleri'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      orderBy(documentId(), 'desc'),
      startAfter(cursor.createdAt, cursor.id),
      limit(TALEP_PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const nextCursor = dateDescCursor(snap);
    const hasMore = snap.docs.length === TALEP_PAGE_SIZE;
    return { items, cursor: nextCursor, hasMore };
  }
);

export const fetchAllIzinlerNextPage = createAsyncThunk(
  'talepler/fetchAllIzinlerNextPage',
  async ({ cursor }) => {
    const q = query(
      collection(db, 'izinTalepleri'),
      orderBy('createdAt', 'desc'),
      orderBy(documentId(), 'desc'),
      startAfter(cursor.createdAt, cursor.id),
      limit(TALEP_PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const nextCursor = dateDescCursor(snap);
    const hasMore = snap.docs.length === TALEP_PAGE_SIZE;
    return { items, cursor: nextCursor, hasMore };
  }
);

export const updateTalep = createAsyncThunk(
  'talepler/updateTalep',
  async ({ talepId, data, uid }) => {
    const updatedAt = new Date().toISOString();
    await updateDoc(doc(db, 'talepler', talepId), { ...data, updatedAt });
    if (uid) {
      await cacheService.patch(`${CACHE_KEYS.TALEPLER}_${uid}`, (cached) => {
        if (!Array.isArray(cached)) return cached;
        return cached.map(t => t.id === talepId ? { ...t, ...data, updatedAt } : t);
      });
    }
    await cacheService.remove(CACHE_KEYS.TALEPLER_ALL);
    return { talepId, data: { ...data, updatedAt }, uid };
  }
);

export const updateTalepDurum = createAsyncThunk(
  'talepler/updateTalepDurum',
  async ({ talepId, durum }) => {
    const updatedAt = new Date().toISOString();
    await updateDoc(doc(db, 'talepler', talepId), { durum, updatedAt });
    await cacheService.remove(CACHE_KEYS.TALEPLER_ALL);
    return { talepId, durum, updatedAt };
  }
);

export const addIzin = createAsyncThunk(
  'talepler/addIzin',
  async ({ uid, displayName, payload }) => {
    const createdAt = new Date().toISOString();
    const ref = await addDoc(collection(db, 'izinTalepleri'), {
      ...payload, userId: uid, displayName, durum: 'Beklemede', createdAt,
    });
    const newIzin = { id: ref.id, ...payload, userId: uid, displayName, durum: 'Beklemede', createdAt };
    await cacheService.patch(`${CACHE_KEYS.IZINLER}_${uid}`, (cached) => {
      if (!Array.isArray(cached)) return [newIzin];
      return [newIzin, ...cached];
    });
    await cacheService.remove(CACHE_KEYS.IZINLER_ALL);
    return { izin: newIzin, uid };
  }
);

export const updateIzinDurum = createAsyncThunk(
  'talepler/updateIzinDurum',
  async ({ izinId, durum, adminNotu = '' }) => {
    const updatedAt = new Date().toISOString();
    await updateDoc(doc(db, 'izinTalepleri', izinId), { durum, adminNotu, updatedAt });
    await cacheService.remove(CACHE_KEYS.IZINLER_ALL);
    return { izinId, durum, adminNotu, updatedAt };
  }
);

const taleplerSlice = createSlice({
  name: 'talepler',
  initialState: {
    talepler: [],
    taleplerLoading: false,
    taleplerLoadingMore: false,
    taleplerCursor: null,
    taleplerHasMore: false,
    lastTaleplerFetchAt: null,
    allTalepler: [],
    allTaleplerLoading: false,
    allTaleplerLoadingMore: false,
    allTaleplerCursor: null,
    allTaleplerHasMore: false,
    lastAllTaleplerFetchAt: null,
    izinler: [],
    izinlerLoading: false,
    izinlerLoadingMore: false,
    izinlerCursor: null,
    izinlerHasMore: false,
    lastIzinlerFetchAt: null,
    allIzinler: [],
    allIzinlerLoading: false,
    allIzinlerLoadingMore: false,
    allIzinlerCursor: null,
    allIzinlerHasMore: false,
    lastAllIzinlerFetchAt: null,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTalepler.pending, (s) => { s.taleplerLoading = true; })
      .addCase(fetchTalepler.fulfilled, (s, a) => { s.taleplerLoading = false; s.talepler = a.payload.items; s.taleplerCursor = a.payload.cursor; s.taleplerHasMore = a.payload.hasMore; s.lastTaleplerFetchAt = Date.now(); })
      .addCase(fetchTalepler.rejected, (s) => { s.taleplerLoading = false; })

      .addCase(fetchAllTalepler.pending, (s) => { s.allTaleplerLoading = true; })
      .addCase(fetchAllTalepler.fulfilled, (s, a) => { s.allTaleplerLoading = false; s.allTalepler = a.payload.items; s.allTaleplerCursor = a.payload.cursor; s.allTaleplerHasMore = a.payload.hasMore; s.lastAllTaleplerFetchAt = Date.now(); })
      .addCase(fetchAllTalepler.rejected, (s) => { s.allTaleplerLoading = false; })

      .addCase(fetchIzinler.pending, (s) => { s.izinlerLoading = true; })
      .addCase(fetchIzinler.fulfilled, (s, a) => { s.izinlerLoading = false; s.izinler = a.payload.items; s.izinlerCursor = a.payload.cursor; s.izinlerHasMore = a.payload.hasMore; s.lastIzinlerFetchAt = Date.now(); })
      .addCase(fetchIzinler.rejected, (s) => { s.izinlerLoading = false; })

      .addCase(fetchAllIzinler.pending, (s) => { s.allIzinlerLoading = true; })
      .addCase(fetchAllIzinler.fulfilled, (s, a) => { s.allIzinlerLoading = false; s.allIzinler = a.payload.items; s.allIzinlerCursor = a.payload.cursor; s.allIzinlerHasMore = a.payload.hasMore; s.lastAllIzinlerFetchAt = Date.now(); })
      .addCase(fetchAllIzinler.rejected, (s) => { s.allIzinlerLoading = false; })

      .addCase(addTalep.fulfilled, (s, a) => {
        s.talepler = [a.payload.talep, ...s.talepler];
        if (s.allTalepler.length > 0) s.allTalepler = [a.payload.talep, ...s.allTalepler];
      })
      .addCase(updateTalep.fulfilled, (s, a) => {
        const { talepId, data } = a.payload;
        s.talepler = s.talepler.map(t => t.id === talepId ? { ...t, ...data } : t);
        s.allTalepler = s.allTalepler.map(t => t.id === talepId ? { ...t, ...data } : t);
      })
      .addCase(updateTalepDurum.fulfilled, (s, a) => {
        const { talepId, durum, updatedAt } = a.payload;
        s.allTalepler = s.allTalepler.map(t => t.id === talepId ? { ...t, durum, updatedAt } : t);
        s.talepler = s.talepler.map(t => t.id === talepId ? { ...t, durum, updatedAt } : t);
      })
      .addCase(addIzin.fulfilled, (s, a) => {
        s.izinler = [a.payload.izin, ...s.izinler];
        if (s.allIzinler.length > 0) s.allIzinler = [a.payload.izin, ...s.allIzinler];
      })
      .addCase(updateIzinDurum.fulfilled, (s, a) => {
        const { izinId, durum, adminNotu, updatedAt } = a.payload;
        s.allIzinler = s.allIzinler.map(i => i.id === izinId ? { ...i, durum, adminNotu, updatedAt } : i);
        s.izinler = s.izinler.map(i => i.id === izinId ? { ...i, durum, adminNotu, updatedAt } : i);
      })

      .addCase(fetchTaleplerNextPage.pending, (s) => { s.taleplerLoadingMore = true; })
      .addCase(fetchTaleplerNextPage.fulfilled, (s, a) => { s.taleplerLoadingMore = false; s.talepler = [...s.talepler, ...a.payload.items]; s.taleplerCursor = a.payload.cursor; s.taleplerHasMore = a.payload.hasMore; })
      .addCase(fetchTaleplerNextPage.rejected, (s) => { s.taleplerLoadingMore = false; })

      .addCase(fetchAllTaleplerNextPage.pending, (s) => { s.allTaleplerLoadingMore = true; })
      .addCase(fetchAllTaleplerNextPage.fulfilled, (s, a) => { s.allTaleplerLoadingMore = false; s.allTalepler = [...s.allTalepler, ...a.payload.items]; s.allTaleplerCursor = a.payload.cursor; s.allTaleplerHasMore = a.payload.hasMore; })
      .addCase(fetchAllTaleplerNextPage.rejected, (s) => { s.allTaleplerLoadingMore = false; })

      .addCase(fetchIzinlerNextPage.pending, (s) => { s.izinlerLoadingMore = true; })
      .addCase(fetchIzinlerNextPage.fulfilled, (s, a) => { s.izinlerLoadingMore = false; s.izinler = [...s.izinler, ...a.payload.items]; s.izinlerCursor = a.payload.cursor; s.izinlerHasMore = a.payload.hasMore; })
      .addCase(fetchIzinlerNextPage.rejected, (s) => { s.izinlerLoadingMore = false; })

      .addCase(fetchAllIzinlerNextPage.pending, (s) => { s.allIzinlerLoadingMore = true; })
      .addCase(fetchAllIzinlerNextPage.fulfilled, (s, a) => { s.allIzinlerLoadingMore = false; s.allIzinler = [...s.allIzinler, ...a.payload.items]; s.allIzinlerCursor = a.payload.cursor; s.allIzinlerHasMore = a.payload.hasMore; })
      .addCase(fetchAllIzinlerNextPage.rejected, (s) => { s.allIzinlerLoadingMore = false; });
  },
});

export default taleplerSlice.reducer;
