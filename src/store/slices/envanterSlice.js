import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import cacheService from '../../services/cacheService';
import { CACHE_KEYS } from '../../config/appConfig';

const tsToISO = (val) => val?.toDate?.()?.toISOString() ?? val ?? null;

export const fetchEnvanterItems = createAsyncThunk(
  'envanter/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const snapshot = await getDocs(collection(db, 'envanterItems'));
      const items = snapshot.docs
        .filter((d) => !d.data().bos)
        .map((d) => {
          const data = d.data();
          return {
            ...data,
            _docId: d.id,
            sonTeslimAlma: tsToISO(data.sonTeslimAlma),
            sonTeslimEtme: tsToISO(data.sonTeslimEtme),
            createdAt: tsToISO(data.createdAt),
            updatedAt: tsToISO(data.updatedAt),
          };
        });

      await cacheService.set(CACHE_KEYS.ENVANTER_ITEMS, items);
      return items;
    } catch (error) {
      const cached = await cacheService.getAny(CACHE_KEYS.ENVANTER_ITEMS);
      if (cached) return cached;
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEnvanterHareketler = createAsyncThunk(
  'envanter/fetchHareketler',
  async (_, { rejectWithValue }) => {
    try {
      const birAyOnce = new Date();
      birAyOnce.setMonth(birAyOnce.getMonth() - 1);

      const q = query(
        collection(db, 'envanterHareketler'),
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

export const teslimAl = createAsyncThunk(
  'envanter/teslimAl',
  async ({ docId, userId, displayName, itemAd, itemTur }, { rejectWithValue }) => {
    try {
      const now = new Date();

      const hareketRef = await addDoc(collection(db, 'envanterHareketler'), {
        itemId: docId,
        itemAd,
        itemTur,
        userId,
        kullaniciAd: displayName,
        teslimAlma: now,
        teslimEtme: null,
      });

      await updateDoc(doc(db, 'envanterItems', docId), {
        durum: 'disarida',
        kimde: userId,
        kimdeAd: displayName,
        sonTeslimAlma: now,
        aktifHareketId: hareketRef.id,
        updatedAt: now,
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
  async ({ docId, aktifHareketId }, { rejectWithValue }) => {
    try {
      const now = new Date();

      if (aktifHareketId) {
        await updateDoc(doc(db, 'envanterHareketler', aktifHareketId), {
          teslimEtme: now,
        });
      }

      await updateDoc(doc(db, 'envanterItems', docId), {
        durum: 'ofiste',
        kimde: null,
        kimdeAd: null,
        sonTeslimEtme: now,
        aktifHareketId: null,
        updatedAt: now,
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
    hareketler: [],
    loading: false,
    hareketlerLoading: false,
    processingId: null,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnvanterItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEnvanterItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchEnvanterItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchEnvanterHareketler.pending, (state) => {
        state.hareketlerLoading = true;
        state.error = null;
      })
      .addCase(fetchEnvanterHareketler.fulfilled, (state, action) => {
        state.hareketlerLoading = false;
        state.hareketler = action.payload;
      })
      .addCase(fetchEnvanterHareketler.rejected, (state, action) => {
        state.hareketlerLoading = false;
        state.error = action.payload;
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
