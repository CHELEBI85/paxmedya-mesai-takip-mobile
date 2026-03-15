import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchGorevler, fetchKullanicilar, addGorev, updateGorev, deleteGorev, tamamlaGorev,
} from '../store/slices/takvimSlice';
import { LIST_STALE_MS } from '../config/appConfig';

export function useTakvim() {
  const dispatch = useDispatch();
  const {
    gorevler, kullanicilar, loading, kullanicilarLoading, error,
    lastGorevlerFetchAt, lastKullanicilarFetchAt,
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
      if (gorevler.length > 0 && hasFresh) return Promise.resolve();
      return dispatch(fetchGorevler({ uid, role, forceRefresh: false }));
    },
    [dispatch, gorevler.length, lastGorevlerFetchAt]
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
      if (kullanicilar.length > 0 && hasFresh) return Promise.resolve();
      return dispatch(fetchKullanicilar({ forceRefresh: false }));
    },
    [dispatch, kullanicilar.length, lastKullanicilarFetchAt]
  );

  const gorevEkle = useCallback((data) => dispatch(addGorev(data)), [dispatch]);
  const gorevGuncelle = useCallback((id, data) => dispatch(updateGorev({ id, data })), [dispatch]);
  const gorevSil = useCallback((id) => dispatch(deleteGorev(id)), [dispatch]);
  const gorevTamamla = useCallback((id, tamamlandi) => dispatch(tamamlaGorev({ id, tamamlandi })), [dispatch]);

  return {
    gorevler, kullanicilar, loading, kullanicilarLoading, error,
    getGorevler, getGorevlerIfNeeded,
    getKullanicilar, getKullanicilarIfNeeded,
    gorevEkle, gorevGuncelle, gorevSil, gorevTamamla,
  };
}
