import { useDispatch, useSelector } from 'react-redux';
import {
  fetchEnvanterItems,
  fetchEnvanterHareketler,
  teslimAl,
  teslimEt,
} from '../store/slices/envanterSlice';
import notificationService from '../services/notificationService';
import { NOTIFICATION_CONFIG } from '../config/appConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_KEY_PREFIX = '@equip_notif_';

export const useEnvanter = () => {
  const dispatch = useDispatch();
  const { items, hareketler, loading, hareketlerLoading, processingId, error } = useSelector(
    (state) => state.envanter
  );

  const getItems = () => dispatch(fetchEnvanterItems());
  const getHareketler = () => dispatch(fetchEnvanterHareketler());

  const handleTeslimAl = async (docId, userId, displayName, itemAd, itemTur) => {
    const result = await dispatch(teslimAl({ docId, userId, displayName, itemAd, itemTur }));

    if (!result.error) {
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
  };

  const handleTeslimEt = async (docId, aktifHareketId) => {
    const result = await dispatch(teslimEt({ docId, aktifHareketId }));

    if (!result.error) {
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
  };

  return {
    items,
    hareketler,
    loading,
    hareketlerLoading,
    processingId,
    error,
    getItems,
    getHareketler,
    handleTeslimAl,
    handleTeslimEt,
  };
};
