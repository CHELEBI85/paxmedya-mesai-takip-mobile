import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayUnion, orderBy,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { widgetGuncelle } from '../../widgets/widgetUpdater';
import cacheService from '../../services/cacheService';
import { CACHE_KEYS } from '../../config/appConfig';

const gorevlerCacheKey = (uid, role) =>
  role === 'admin' || role === 'manager'
    ? `${CACHE_KEYS.GOREVLER}_all`
    : `${CACHE_KEYS.GOREVLER}_${uid}`;

const threeMonthsAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export const fetchGorevler = createAsyncThunk(
  'takvim/fetchGorevler',
  async ({ uid, role, forceRefresh = false, dateFrom = null }) => {
    const cacheKey = gorevlerCacheKey(uid, role);
    const actualDateFrom = dateFrom || threeMonthsAgo();
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(cacheKey);
        if (cached) {
          const gorevler = Array.isArray(cached) ? cached : (cached.gorevler || []);
          const cachedDateFrom = Array.isArray(cached) ? actualDateFrom : (cached.dateFrom || actualDateFrom);
          widgetGuncelle(gorevler, uid, role);
          return { gorevler, dateFrom: cachedDateFrom };
        }
      }
      let q;
      if (role === 'admin' || role === 'manager') {
        q = query(collection(db, 'gorevler'), where('baslangic', '>=', actualDateFrom), orderBy('baslangic'));
      } else {
        q = query(
          collection(db, 'gorevler'),
          where('sorumluUidler', 'array-contains', uid),
          where('baslangic', '>=', actualDateFrom),
          orderBy('baslangic')
        );
      }
      const snap = await getDocs(q);
      const gorevler = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      await cacheService.set(cacheKey, { gorevler, dateFrom: actualDateFrom });
      widgetGuncelle(gorevler, uid, role);
      return { gorevler, dateFrom: actualDateFrom };
    } catch (error) {
      const cached = await cacheService.getAny(cacheKey);
      if (cached) {
        const gorevler = Array.isArray(cached) ? cached : (cached.gorevler || []);
        const cachedDateFrom = Array.isArray(cached) ? actualDateFrom : (cached.dateFrom || actualDateFrom);
        widgetGuncelle(gorevler, uid, role);
        return { gorevler, dateFrom: cachedDateFrom };
      }
      throw error;
    }
  }
);

export const fetchGorevlerOncesi = createAsyncThunk(
  'takvim/fetchGorevlerOncesi',
  async ({ uid, role, newDateFrom, currentDateFrom }) => {
    let q;
    if (role === 'admin' || role === 'manager') {
      q = query(
        collection(db, 'gorevler'),
        where('baslangic', '>=', newDateFrom),
        where('baslangic', '<', currentDateFrom),
        orderBy('baslangic')
      );
    } else {
      q = query(
        collection(db, 'gorevler'),
        where('sorumluUidler', 'array-contains', uid),
        where('baslangic', '>=', newDateFrom),
        where('baslangic', '<', currentDateFrom),
        orderBy('baslangic')
      );
    }
    const snap = await getDocs(q);
    const gorevler = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { gorevler, newDateFrom };
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

export const durumGuncelle = createAsyncThunk('takvim/durumGuncelle', async ({ id, durum, revizeNotu, gonderenAd, gonderenId }, { getState }) => {
  const tamamlandi = durum === 'tamamlandi';

  const baseUpdates = {
    durum,
    tamamlandi,
    ...(tamamlandi ? { tamamlandiAt: new Date().toISOString() } : {}),
    ...(durum === 'onay_bekliyor' ? { onayBekliyorAt: new Date().toISOString() } : {}),
  };

  // Revize geçmişine eklenecek yeni kayıt
  let revizeEntry = null;
  if (durum === 'revize') {
    revizeEntry = {
      not: revizeNotu || '',
      tarih: new Date().toISOString(),
      gonderenAd: gonderenAd || '',
      gonderenId: gonderenId || '',
    };
    baseUpdates.revizeNotu = revizeNotu || ''; // geriye dönük uyumluluk
  }

  // Firestore: revizeler arrayUnion ile eklenir (eski kayıtlar silinmez)
  await updateDoc(doc(db, 'gorevler', id), {
    ...baseUpdates,
    ...(revizeEntry ? { revizeler: arrayUnion(revizeEntry) } : {}),
  });

  // Redux: plain array olarak güncelle (arrayUnion sentinel kullanılamaz)
  const currentGorev = getState().takvim.gorevler.find(g => g.id === id);
  const reduxUpdates = {
    ...baseUpdates,
    ...(revizeEntry ? { revizeler: [...(currentGorev?.revizeler || []), revizeEntry] } : {}),
  };

  const gorevler = getState().takvim.gorevler.map(g =>
    g.id === id ? { ...g, ...reduxUpdates } : g
  );
  widgetGuncelle(gorevler);

  return { id, updates: reduxUpdates };
});

const takvimSlice = createSlice({
  name: 'takvim',
  initialState: {
    gorevler: [],
    kullanicilar: [],
    loading: false,
    kullanicilarLoading: false,
    oncesiLoading: false,
    error: null,
    gorevlerDateFrom: null,
    lastGorevlerFetchAt: null,
    lastKullanicilarFetchAt: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGorevler.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchGorevler.fulfilled, (s, a) => {
        s.loading = false;
        s.gorevler = a.payload.gorevler;
        s.gorevlerDateFrom = a.payload.dateFrom;
        s.lastGorevlerFetchAt = Date.now();
      })
      .addCase(fetchGorevler.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(fetchGorevlerOncesi.pending, (s) => { s.oncesiLoading = true; })
      .addCase(fetchGorevlerOncesi.fulfilled, (s, a) => {
        s.oncesiLoading = false;
        const existing = new Set(s.gorevler.map(g => g.id));
        const yeni = a.payload.gorevler.filter(g => !existing.has(g.id));
        s.gorevler = [...yeni, ...s.gorevler].sort((a, b) => (a.baslangic || '').localeCompare(b.baslangic || ''));
        s.gorevlerDateFrom = a.payload.newDateFrom;
      })
      .addCase(fetchGorevlerOncesi.rejected, (s) => { s.oncesiLoading = false; })

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
      })
      .addCase(durumGuncelle.fulfilled, (s, a) => {
        const idx = s.gorevler.findIndex(g => g.id === a.payload.id);
        if (idx !== -1) s.gorevler[idx] = { ...s.gorevler[idx], ...a.payload.updates };
      });
  },
});

export default takvimSlice.reducer;
