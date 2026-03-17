import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTalepler, fetchAllTalepler, fetchIzinler, fetchAllIzinler,
  fetchTaleplerNextPage, fetchAllTaleplerNextPage, fetchIzinlerNextPage, fetchAllIzinlerNextPage,
  addTalep, updateTalep, updateTalepDurum, addIzin, updateIzinDurum,
} from '../store/slices/taleplerSlice';
import { LIST_STALE_MS } from '../config/appConfig';

export function useTalepler() {
  const dispatch = useDispatch();
  const {
    talepler, taleplerLoading, taleplerLoadingMore, taleplerCursor, taleplerHasMore, lastTaleplerFetchAt,
    allTalepler, allTaleplerLoading, allTaleplerLoadingMore, allTaleplerCursor, allTaleplerHasMore, lastAllTaleplerFetchAt,
    izinler, izinlerLoading, izinlerLoadingMore, izinlerCursor, izinlerHasMore, lastIzinlerFetchAt,
    allIzinler, allIzinlerLoading, allIzinlerLoadingMore, allIzinlerCursor, allIzinlerHasMore, lastAllIzinlerFetchAt,
  } = useSelector(s => s.talepler);

  const getTalepler = useCallback(
    (uid) => dispatch(fetchTalepler({ uid, forceRefresh: true })),
    [dispatch]
  );

  const getTaleplerIfNeeded = useCallback(
    (uid) => {
      if (lastTaleplerFetchAt != null && Date.now() - lastTaleplerFetchAt < LIST_STALE_MS) return Promise.resolve();
      return dispatch(fetchTalepler({ uid, forceRefresh: false }));
    },
    [dispatch, lastTaleplerFetchAt]
  );

  const getAllTalepler = useCallback(
    () => dispatch(fetchAllTalepler({ forceRefresh: true })),
    [dispatch]
  );

  const getAllTaleplerIfNeeded = useCallback(
    () => {
      if (lastAllTaleplerFetchAt != null && Date.now() - lastAllTaleplerFetchAt < LIST_STALE_MS) return Promise.resolve();
      return dispatch(fetchAllTalepler({ forceRefresh: false }));
    },
    [dispatch, lastAllTaleplerFetchAt]
  );

  const getIzinler = useCallback(
    (uid) => dispatch(fetchIzinler({ uid, forceRefresh: true })),
    [dispatch]
  );

  const getIzinlerIfNeeded = useCallback(
    (uid) => {
      if (lastIzinlerFetchAt != null && Date.now() - lastIzinlerFetchAt < LIST_STALE_MS) return Promise.resolve();
      return dispatch(fetchIzinler({ uid, forceRefresh: false }));
    },
    [dispatch, lastIzinlerFetchAt]
  );

  const getAllIzinler = useCallback(
    () => dispatch(fetchAllIzinler({ forceRefresh: true })),
    [dispatch]
  );

  const getAllIzinlerIfNeeded = useCallback(
    () => {
      if (lastAllIzinlerFetchAt != null && Date.now() - lastAllIzinlerFetchAt < LIST_STALE_MS) return Promise.resolve();
      return dispatch(fetchAllIzinler({ forceRefresh: false }));
    },
    [dispatch, lastAllIzinlerFetchAt]
  );

  const talepEkle = useCallback(
    (uid, displayName, payload) => dispatch(addTalep({ uid, displayName, payload })).unwrap(),
    [dispatch]
  );

  const talepGuncelle = useCallback(
    (talepId, data, uid) => dispatch(updateTalep({ talepId, data, uid })).unwrap(),
    [dispatch]
  );

  const talepDurumGuncelle = useCallback(
    (talepId, durum) => dispatch(updateTalepDurum({ talepId, durum })).unwrap(),
    [dispatch]
  );

  const izinEkle = useCallback(
    (uid, displayName, payload) => dispatch(addIzin({ uid, displayName, payload })).unwrap(),
    [dispatch]
  );

  const izinDurumGuncelle = useCallback(
    (izinId, durum, adminNotu) => dispatch(updateIzinDurum({ izinId, durum, adminNotu })).unwrap(),
    [dispatch]
  );

  const getTaleplerNextPage = useCallback(
    (uid) => {
      if (!taleplerCursor || !taleplerHasMore) return Promise.resolve();
      return dispatch(fetchTaleplerNextPage({ uid, cursor: taleplerCursor }));
    },
    [dispatch, taleplerCursor, taleplerHasMore]
  );

  const getAllTaleplerNextPage = useCallback(
    () => {
      if (!allTaleplerCursor || !allTaleplerHasMore) return Promise.resolve();
      return dispatch(fetchAllTaleplerNextPage({ cursor: allTaleplerCursor }));
    },
    [dispatch, allTaleplerCursor, allTaleplerHasMore]
  );

  const getIzinlerNextPage = useCallback(
    (uid) => {
      if (!izinlerCursor || !izinlerHasMore) return Promise.resolve();
      return dispatch(fetchIzinlerNextPage({ uid, cursor: izinlerCursor }));
    },
    [dispatch, izinlerCursor, izinlerHasMore]
  );

  const getAllIzinlerNextPage = useCallback(
    () => {
      if (!allIzinlerCursor || !allIzinlerHasMore) return Promise.resolve();
      return dispatch(fetchAllIzinlerNextPage({ cursor: allIzinlerCursor }));
    },
    [dispatch, allIzinlerCursor, allIzinlerHasMore]
  );

  return {
    talepler, taleplerLoading, taleplerLoadingMore, taleplerHasMore,
    allTalepler, allTaleplerLoading, allTaleplerLoadingMore, allTaleplerHasMore,
    izinler, izinlerLoading, izinlerLoadingMore, izinlerHasMore,
    allIzinler, allIzinlerLoading, allIzinlerLoadingMore, allIzinlerHasMore,
    getTalepler, getTaleplerIfNeeded, getTaleplerNextPage,
    getAllTalepler, getAllTaleplerIfNeeded, getAllTaleplerNextPage,
    getIzinler, getIzinlerIfNeeded, getIzinlerNextPage,
    getAllIzinler, getAllIzinlerIfNeeded, getAllIzinlerNextPage,
    talepEkle, talepGuncelle, talepDurumGuncelle,
    izinEkle, izinDurumGuncelle,
  };
}
