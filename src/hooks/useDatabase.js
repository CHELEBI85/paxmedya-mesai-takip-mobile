import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import {
  fetchWorkRecords,
  fetchWorkRecordsFirstPage,
  fetchWorkRecordsNextPage,
  addWorkRecord,
  updateWorkRecord,
  deleteWorkRecord,
  getUserProfile,
  updateUserProfile,
} from '../store/slices/databaseSlice';
import { LIST_STALE_MS } from '../config/appConfig';

export const useDatabase = () => {
  const dispatch = useDispatch();
  const {
    records,
    userProfile,
    loading,
    recordsLoading,
    loadingMore,
    error,
    recordsCursor,
    recordsHasMore,
    lastWorkRecordsFetchAt,
  } = useSelector((state) => state.database);

  const getWorkRecords = useCallback(
    (userId) => dispatch(fetchWorkRecords({ userId })),
    [dispatch]
  );

  // Pull-to-refresh → her zaman Firestore'dan çek, cache'i güncelle
  const getWorkRecordsFirstPage = useCallback(
    (userId) => dispatch(fetchWorkRecordsFirstPage({ userId, forceRefresh: true })),
    [dispatch]
  );

  // Tab geçişi / app açılışı → önce cache'e bak, geçerliyse Firestore'a gitme
  const getWorkRecordsFirstPageIfNeeded = useCallback(
    (userId) => {
      const now = Date.now();
      const hasFresh = lastWorkRecordsFetchAt != null && now - lastWorkRecordsFetchAt < LIST_STALE_MS;
      if (hasFresh) return Promise.resolve();
      return dispatch(fetchWorkRecordsFirstPage({ userId, forceRefresh: false }));
    },
    [dispatch, lastWorkRecordsFetchAt]
  );

  const getWorkRecordsNextPage = useCallback(
    (userId, cursor) => dispatch(fetchWorkRecordsNextPage({ userId, cursor })),
    [dispatch]
  );

  // forceRefresh: true → profil güncellemesi sonrası, false → app açılışında cache kullan
  const getProfile = useCallback(
    (userId, forceRefresh = true) => dispatch(getUserProfile({ userId, forceRefresh })),
    [dispatch]
  );

  const getProfileIfNeeded = useCallback(
    (userId) => dispatch(getUserProfile({ userId, forceRefresh: false })),
    [dispatch]
  );

  const updateProfile = useCallback(
    (userId, data) => dispatch(updateUserProfile({ userId, data })),
    [dispatch]
  );

  const addRecord = useCallback(
    (userId, data) => dispatch(addWorkRecord({ userId, data })),
    [dispatch]
  );

  const updateRecord = useCallback(
    (recordId, data) => dispatch(updateWorkRecord({ recordId, data })),
    [dispatch]
  );

  const deleteRecord = useCallback(
    (recordId) => dispatch(deleteWorkRecord({ recordId })),
    [dispatch]
  );

  return {
    records,
    userProfile,
    loading,
    recordsLoading,
    loadingMore,
    error,
    recordsCursor,
    recordsHasMore,
    getWorkRecords,
    getWorkRecordsFirstPage,
    getWorkRecordsFirstPageIfNeeded,
    getWorkRecordsNextPage,
    getProfile,
    getProfileIfNeeded,
    updateProfile,
    addRecord,
    updateRecord,
    deleteRecord,
  };
};
