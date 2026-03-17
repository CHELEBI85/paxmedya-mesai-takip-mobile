import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchGorevler, fetchGorevlerOncesi, fetchKullanicilar, addGorev, updateGorev, deleteGorev, tamamlaGorev, durumGuncelle,
} from '../store/slices/takvimSlice';
import { LIST_STALE_MS } from '../config/appConfig';

export function useTakvim() {
  const dispatch = useDispatch();
  const {
    gorevler, kullanicilar, loading, kullanicilarLoading, oncesiLoading, error,
    gorevlerDateFrom, lastGorevlerFetchAt, lastKullanicilarFetchAt,
  } = useSelector(s => s.takvim);

  // Pull-to-refresh → her zaman Firestore'dan çek, cache'i güncelle
  const getGorevler = useCallback(
    (uid, role) => dispatch(fetchGorevler({ uid, role, forceRefresh: true })),
    [dispatch]
  );

  // Sayfa açılışı / tab geçişi → cache varsa kullan, stalse Firestore'a git
  const getGorevlerIfNeeded = useCallback(
    (uid, role) => {
      const now = Date.now();
      const hasFresh = lastGorevlerFetchAt != null && now - lastGorevlerFetchAt < LIST_STALE_MS;
      if (hasFresh) return Promise.resolve();
      return dispatch(fetchGorevler({ uid, role, forceRefresh: false }));
    },
    [dispatch, lastGorevlerFetchAt]
  );

  // Pull-to-refresh → her zaman Firestore'dan çek
  const getKullanicilar = useCallback(
    () => dispatch(fetchKullanicilar({ forceRefresh: true })),
    [dispatch]
  );

  // Sayfa açılışı → cache varsa kullan
  const getKullanicilarIfNeeded = useCallback(
    () => {
      const now = Date.now();
      const hasFresh = lastKullanicilarFetchAt != null && now - lastKullanicilarFetchAt < LIST_STALE_MS;
      if (hasFresh) return Promise.resolve();
      return dispatch(fetchKullanicilar({ forceRefresh: false }));
    },
    [dispatch, lastKullanicilarFetchAt]
  );

  const gorevEkle = useCallback((data) => dispatch(addGorev(data)), [dispatch]);
  const gorevGuncelle = useCallback((id, data) => dispatch(updateGorev({ id, data })), [dispatch]);
  const gorevSil = useCallback((id) => dispatch(deleteGorev(id)), [dispatch]);
  const gorevTamamla = useCallback((id, tamamlandi) => dispatch(tamamlaGorev({ id, tamamlandi })), [dispatch]);
  const gorevDurumGuncelle = useCallback(
    (id, durum, revizeNotu, gonderenAd, gonderenId) =>
      dispatch(durumGuncelle({ id, durum, revizeNotu, gonderenAd, gonderenId })),
    [dispatch]
  );

  const getGorevlerOncesi = useCallback(
    (uid, role, aylarGeri = 3) => {
      if (!gorevlerDateFrom) return Promise.resolve();
      const d = new Date(gorevlerDateFrom + 'T00:00:00');
      d.setMonth(d.getMonth() - aylarGeri);
      const newDateFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      return dispatch(fetchGorevlerOncesi({ uid, role, newDateFrom, currentDateFrom: gorevlerDateFrom }));
    },
    [dispatch, gorevlerDateFrom]
  );

  return {
    gorevler, kullanicilar, loading, kullanicilarLoading, oncesiLoading, error,
    gorevlerDateFrom,
    getGorevler, getGorevlerIfNeeded, getGorevlerOncesi,
    getKullanicilar, getKullanicilarIfNeeded,
    gorevEkle, gorevGuncelle, gorevSil, gorevTamamla, gorevDurumGuncelle,
  };
}
