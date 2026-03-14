import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { widgetGuncelle } from '../../widgets/widgetUpdater';

export const fetchGorevler = createAsyncThunk('takvim/fetchGorevler', async ({ uid, role }) => {
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

  widgetGuncelle(gorevler); // widget cache + anlık render
  return gorevler;
});

export const fetchKullanicilar = createAsyncThunk('takvim/fetchKullanicilar', async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
});

export const addGorev = createAsyncThunk('takvim/addGorev', async (data) => {
  const createdAt = new Date().toISOString();
  const ref = await addDoc(collection(db, 'gorevler'), { ...data, createdAt });
  return { id: ref.id, ...data, createdAt };
});

export const updateGorev = createAsyncThunk('takvim/updateGorev', async ({ id, data }, { getState }) => {
  const updatedAt = new Date().toISOString();
  await updateDoc(doc(db, 'gorevler', id), { ...data, updatedAt });

  // Güncel listeyi hesapla ve widget'ı güncelle
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

  // Redux state henüz güncellenmedi — manuel uygula
  const gorevler = getState().takvim.gorevler.map(g =>
    g.id === id ? { ...g, ...updates } : g
  );
  widgetGuncelle(gorevler); // anlık widget güncelle

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
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGorevler.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchGorevler.fulfilled, (s, a) => { s.loading = false; s.gorevler = a.payload; })
      .addCase(fetchGorevler.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(fetchKullanicilar.pending, (s) => { s.kullanicilarLoading = true; })
      .addCase(fetchKullanicilar.fulfilled, (s, a) => { s.kullanicilarLoading = false; s.kullanicilar = a.payload; })
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
