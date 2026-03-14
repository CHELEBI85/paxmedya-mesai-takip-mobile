import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  fetchEnvanterItems,
  fetchEnvanterItemsFirstPage,
  fetchEnvanterItemsNextPage,
  fetchEnvanterHareketler,
  fetchEnvanterCounts,
  fetchUserEquipmentHistory,
  teslimAl,
  teslimEt,
  lookupItemByQRData,
} from '../store/slices/envanterSlice';
import { LIST_STALE_MS, NOTIFICATION_CONFIG, CACHE_KEYS } from '../config/appConfig';
import notificationService from '../services/notificationService';
import cacheService from '../services/cacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_KEY_PREFIX = '@equip_notif_';

export const useEnvanter = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const userProfile = useSelector((state) => state.database.userProfile);
  const uid = user?.uid || null;
  const role = userProfile?.role || null;
  const {
    items,
    activeTur,
    hareketler,
    loading,
    loadingMore,
    hareketlerLoading,
    processingId,
    error,
    itemsCursor,
    itemsHasMore,
    lastItemsFetchAt,
    lastHareketlerFetchAt,
    counts,
    countsLoading,
    equipmentHistory,
    equipmentHistoryCursor,
    equipmentHistoryHasMore,
    equipmentHistoryLoading,
    equipmentHistoryLoadingMore,
  } = useSelector((state) => state.envanter);

  const getItems = useCallback(() => dispatch(fetchEnvanterItems()), [dispatch]);

  // Pull-to-refresh → her zaman Firestore'dan çek, cache'i güncelle
  const getItemsFirstPage = useCallback(
    (tur = 'Tümü') => dispatch(fetchEnvanterItemsFirstPage({ tur, forceRefresh: true })),
    [dispatch]
  );

  // Tab geçişi / app açılışı → cache varsa kullan, yoksa Firestore'dan çek
  const getItemsFirstPageIfNeeded = useCallback((tur = 'Tümü') => {
    const now = Date.now();
    const hasFresh = lastItemsFetchAt != null && now - lastItemsFetchAt < LIST_STALE_MS;
    const turChanged = activeTur !== tur;
    if (hasFresh && !turChanged) return Promise.resolve();
    return dispatch(fetchEnvanterItemsFirstPage({ tur, forceRefresh: false }));
  }, [dispatch, lastItemsFetchAt, activeTur]);

  const getItemsNextPage = useCallback(
    (tur = 'Tümü') => dispatch(fetchEnvanterItemsNextPage({ cursor: itemsCursor, tur })),
    [dispatch, itemsCursor]
  );

  // Pull-to-refresh için forceRefresh: true
  const getHareketler = useCallback(
    () => dispatch(fetchEnvanterHareketler({ forceRefresh: true, uid, role })),
    [dispatch, uid, role]
  );

  // İlk yüklemede cache'i kullan
  const getHareketlerIfNeeded = useCallback(() => {
    const now = Date.now();
    const hasFresh = lastHareketlerFetchAt != null && now - lastHareketlerFetchAt < LIST_STALE_MS;
    if (hareketler.length > 0 && hasFresh) return Promise.resolve();
    return dispatch(fetchEnvanterHareketler({ forceRefresh: false, uid, role }));
  }, [dispatch, hareketler.length, lastHareketlerFetchAt, uid, role]);

  // forceRefresh = true → pull-to-refresh, false (default) → cache kullan
  const getCounts = useCallback(
    (forceRefresh = false) => dispatch(fetchEnvanterCounts({ forceRefresh })),
    [dispatch]
  );

  // activeTur'u dışa aç — EnvanterYonetim nextPage için kullanır
  const getItemsNextPageForActiveTur = useCallback(
    () => dispatch(fetchEnvanterItemsNextPage({ cursor: itemsCursor, tur: activeTur })),
    [dispatch, itemsCursor, activeTur]
  );

  // Mutation sonrası cache'deki ilgili item'ı yerinde güncelle (TTL korunur, Firestore isteği yok)
  const patchItemCache = useCallback(async (docId, itemTur, updatedFields) => {
    const updater = (data) => {
      if (!data?.items) return data;
      return { ...data, items: data.items.map((i) => i._docId === docId ? { ...i, ...updatedFields } : i) };
    };
    await Promise.all([
      cacheService.patch(`${CACHE_KEYS.ENVANTER_ITEMS}_Tümü`, updater),
      cacheService.patch(`${CACHE_KEYS.ENVANTER_ITEMS}_${itemTur}`, updater),
    ]);
  }, []);

  // Counts cache'ini yerinde güncelle (delta = { ofiste: ±1, disarida: ±1 })
  const patchCountsCache = useCallback(async (delta) => {
    await cacheService.patch(CACHE_KEYS.ENVANTER_COUNTS, (data) => {
      if (!data) return data;
      return {
        ...data,
        ofiste: (data.ofiste ?? 0) + (delta.ofiste ?? 0),
        disarida: (data.disarida ?? 0) + (delta.disarida ?? 0),
      };
    });
  }, []);

  const handleTeslimAl = useCallback(async (docId, userId, displayName, itemAd, itemTur) => {
    const result = await dispatch(teslimAl({ docId, userId, displayName, itemAd, itemTur }));
    if (!result.error) {
      // Cache'deki item'ı yerinde güncelle + counts'u patch'le
      const p = result.payload;
      patchItemCache(docId, itemTur, {
        durum: p.durum, kimde: p.kimde, kimdeAd: p.kimdeAd,
        sonTeslimAlma: p.sonTeslimAlma, aktifHareketId: p.aktifHareketId,
      });
      patchCountsCache({ ofiste: -1, disarida: +1 });
      try {
        const notifId = await notificationService.scheduleEquipmentReminder(
          itemAd,
          NOTIFICATION_CONFIG.equipmentReminderHours
        );
        if (notifId) await AsyncStorage.setItem(`${NOTIF_KEY_PREFIX}${docId}`, notifId);
      } catch (e) {
        if (__DEV__) console.warn('Bildirim planlanamadı:', e);
      }
    }
    return result;
  }, [dispatch, patchItemCache, patchCountsCache]);

  const handleTeslimEt = useCallback(async (docId, aktifHareketId, userId, itemTur) => {
    const result = await dispatch(teslimEt({ docId, aktifHareketId, userId }));
    if (!result.error) {
      // Cache'deki item'ı yerinde güncelle + counts'u patch'le
      const p = result.payload;
      patchItemCache(docId, itemTur, {
        durum: p.durum, kimde: null, kimdeAd: null,
        sonTeslimEtme: p.sonTeslimEtme, aktifHareketId: null,
      });
      patchCountsCache({ ofiste: +1, disarida: -1 });
      try {
        const notifId = await AsyncStorage.getItem(`${NOTIF_KEY_PREFIX}${docId}`);
        if (notifId) {
          await notificationService.cancelNotification(notifId);
          await AsyncStorage.removeItem(`${NOTIF_KEY_PREFIX}${docId}`);
        }
      } catch (e) {
        if (__DEV__) console.warn('Bildirim iptal edilemedi:', e);
      }
    }
    return result;
  }, [dispatch, patchItemCache, patchCountsCache]);

  const getEquipmentHistory = useCallback(
    (userId) => dispatch(fetchUserEquipmentHistory({ userId, forceRefresh: true })),
    [dispatch]
  );

  const getEquipmentHistoryIfNeeded = useCallback(
    (userId) => dispatch(fetchUserEquipmentHistory({ userId, forceRefresh: false })),
    [dispatch]
  );

  const getEquipmentHistoryNextPage = useCallback(
    (userId) => dispatch(fetchUserEquipmentHistory({ userId, cursor: equipmentHistoryCursor })),
    [dispatch, equipmentHistoryCursor]
  );

  const getItemByQRData = useCallback((data) => lookupItemByQRData(data), []);

  return {
    items,
    hareketler,
    loading,
    loadingMore,
    hareketlerLoading,
    processingId,
    error,
    itemsCursor,
    itemsHasMore,
    counts,
    countsLoading,
    equipmentHistory,
    equipmentHistoryHasMore,
    equipmentHistoryLoading,
    equipmentHistoryLoadingMore,
    getItems,
    getItemsFirstPage,
    getItemsFirstPageIfNeeded,
    getItemsNextPage,
    getItemsNextPageForActiveTur,
    getHareketler,
    getHareketlerIfNeeded,
    getCounts,
    handleTeslimAl,
    handleTeslimEt,
    getEquipmentHistory,
    getEquipmentHistoryIfNeeded,
    getEquipmentHistoryNextPage,
    getItemByQRData,
  };
};
