import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { widgetGuncelle } from '../../widgets/widgetUpdater';
import cacheService from '../../services/cacheService';
import { CACHE_KEYS } from '../../config/appConfig';

const gorevlerCacheKey = (uid, role) =>
  role === 'admin' || role === 'manager'
    ? `${CACHE_KEYS.GOREVLER}_all`
    : `${CACHE_KEYS.GOREVLER}_${uid}`;

export const fetchGorevler = createAsyncThunk(
  'takvim/fetchGorevler',
  async ({ uid, role, forceRefresh = false }) => {
    const cacheKey = gorevlerCacheKey(uid, role);
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(cacheKey);
        if (cached) {
          // uid/role'ü kaydet ki widget arka planda Firestore'a bağlanabilsin
          widgetGuncelle(cached, uid, role);
          return cached;
        }
      }
      let q;
      if (role === 'admin' || role === 'manager') {
        q = collection(db, 'gorevler');
      } else {
        q = query(collection(db, 'gorevler'), where('sorumluUidler', 'array-contains', uid));
      }
      const snap = await getDocs(q);
      const gorevler = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.baslangic || '').localeCompare(b.baslangic || ''));

      await cacheService.set(cacheKey, gorevler);
      widgetGuncelle(gorevler, uid, role);
      return gorevler;
    } catch (error) {
      const cached = await cacheService.getAny(cacheKey);
      if (cached) {
        widgetGuncelle(cached, uid, role);
        return cached;
      }
      throw error;
    }
  }
);

export const fetchKullanicilar = createAsyncThunk(
  'takvim/fetchKullanicilar',
  async ({ forceRefresh = false } = {}) => {
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(CACHE_KEYS.KULLANICILAR);
        if (cached) return cached;
      }
      const snap = await getDocs(collection(db, 'users'));
      const kullanicilar = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      await cacheService.set(CACHE_KEYS.KULLANICILAR, kullanicilar);
      return kullanicilar;
    } catch (error) {
      const cached = await cacheService.getAny(CACHE_KEYS.KULLANICILAR);
      if (cached) return cached;
      throw error;
    }
  }
);

export const addGorev = createAsyncThunk('takvim/addGorev', async (data, { getState }) => {
  const createdAt = new Date().toISOString();
  const ref = await addDoc(collection(db, 'gorevler'), { ...data, createdAt });
  const newGorev = { id: ref.id, ...data, createdAt };
  // Widget'ı yeni görevle güncelle
  const updatedGorevler = [...getState().takvim.gorevler, newGorev];
  widgetGuncelle(updatedGorevler);
  return newGorev;
});

export const updateGorev = createAsyncThunk('takvim/updateGorev', async ({ id, data }, { getState }) => {
  const updatedAt = new Date().toISOString();
  await updateDoc(doc(db, 'gorevler', id), { ...data, updatedAt });

  const gorevler = getState().takvim.gorevler.map(g =>
    g.id === id ? { ...g, ...data, updatedAt } : g
  );
  widgetGuncelle(gorevler);

  return { id, updates: { ...data, updatedAt } };
});

export const deleteGorev = createAsyncThunk('takvim/deleteGorev', async (id, { getState }) => {
  await deleteDoc(doc(db, 'gorevler', id));

  const gorevler = getState().takvim.gorevler.filter(g => g.id !== id);
  widgetGuncelle(gorevler);

  return id;
});

export const tamamlaGorev = createAsyncThunk('takvim/tamamlaGorev', async ({ id, tamamlandi }, { getState }) => {
  const updates = { tamamlandi, tamamlandiAt: tamamlandi ? new Date().toISOString() : null };
  await updateDoc(doc(db, 'gorevler', id), updates);

  const gorevler = getState().takvim.gorevler.map(g =>
    g.id === id ? { ...g, ...updates } : g
  );
  widgetGuncelle(gorevler);

  return { id, updates };
});

const takvimSlice = createSlice({
  name: 'takvim',
  initialState: {
    gorevler: [],
    kullanicilar: [],
    loading: false,
    kullanicilarLoading: false,
    error: null,
    lastGorevlerFetchAt: null,
    lastKullanicilarFetchAt: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGorevler.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchGorevler.fulfilled, (s, a) => {
        s.loading = false;
        s.gorevler = a.payload;
        s.lastGorevlerFetchAt = Date.now();
      })
      .addCase(fetchGorevler.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(fetchKullanicilar.pending, (s) => { s.kullanicilarLoading = true; })
      .addCase(fetchKullanicilar.fulfilled, (s, a) => {
        s.kullanicilarLoading = false;
        s.kullanicilar = a.payload;
        s.lastKullanicilarFetchAt = Date.now();
      })
      .addCase(fetchKullanicilar.rejected, (s) => { s.kullanicilarLoading = false; })

      .addCase(addGorev.fulfilled, (s, a) => { s.gorevler.push(a.payload); })
      .addCase(updateGorev.fulfilled, (s, a) => {
        const idx = s.gorevler.findIndex(g => g.id === a.payload.id);
        if (idx !== -1) s.gorevler[idx] = { ...s.gorevler[idx], ...a.payload.updates };
      })
      .addCase(deleteGorev.fulfilled, (s, a) => {
        s.gorevler = s.gorevler.filter(g => g.id !== a.payload);
      })
      .addCase(tamamlaGorev.fulfilled, (s, a) => {
        const idx = s.gorevler.findIndex(g => g.id === a.payload.id);
        if (idx !== -1) s.gorevler[idx] = { ...s.gorevler[idx], ...a.payload.updates };
      });
  },
});

export default takvimSlice.reducer;
