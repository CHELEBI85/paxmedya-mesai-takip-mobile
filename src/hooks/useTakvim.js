import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchGorevler, fetchKullanicilar, addGorev, updateGorev, deleteGorev, tamamlaGorev,
} from '../store/slices/takvimSlice';

export function useTakvim() {
  const dispatch = useDispatch();
  const { gorevler, kullanicilar, loading, kullanicilarLoading, error } = useSelector(s => s.takvim);

  const getGorevler = useCallback(
    (uid, role) => dispatch(fetchGorevler({ uid, role })),
    [dispatch]
  );
  const getKullanicilar = useCallback(() => dispatch(fetchKullanicilar()), [dispatch]);
  const gorevEkle = useCallback((data) => dispatch(addGorev(data)), [dispatch]);
  const gorevGuncelle = useCallback((id, data) => dispatch(updateGorev({ id, data })), [dispatch]);
  const gorevSil = useCallback((id) => dispatch(deleteGorev(id)), [dispatch]);
  const gorevTamamla = useCallback((id, tamamlandi) => dispatch(tamamlaGorev({ id, tamamlandi })), [dispatch]);

  return {
    gorevler, kullanicilar, loading, kullanicilarLoading, error,
    getGorevler, getKullanicilar, gorevEkle, gorevGuncelle, gorevSil, gorevTamamla,
  };
}
