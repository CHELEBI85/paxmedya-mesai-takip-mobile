import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from '../config/firebase';
import { GorevWidget } from './GorevWidget';

export const WIDGET_GOREV_KEY = 'widget_gorevler_hafta';
export const WIDGET_USER_KEY  = 'widget_user_info';

function buHaftaAraligi() {
  const bugun = new Date();
  const gun = (bugun.getDay() + 6) % 7; // Pazartesi = 0
  const haftaBasi = new Date(bugun);
  haftaBasi.setDate(bugun.getDate() - gun);
  const haftaSonu = new Date(haftaBasi);
  haftaSonu.setDate(haftaBasi.getDate() + 6);
  const fmt = d => d.toISOString().slice(0, 10);
  return { baslangic: fmt(haftaBasi), bitis: fmt(haftaSonu) };
}

async function fetchFreshGorevler(uid, role) {
  try {
    const q = (role === 'admin' || role === 'manager')
      ? collection(db, 'gorevler')
      : query(collection(db, 'gorevler'), where('sorumluUidler', 'array-contains', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return null;
  }
}

async function showNewTaskNotification(newCount) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('gorevler', {
        name: 'Görev Bildirimleri',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: newCount === 1 ? 'Yeni görev atandı' : `${newCount} yeni görev atandı`,
        body: 'Bu haftaki görev listeniz güncellendi. Kontrol etmek için dokunun.',
        data: { type: 'new_task' },
        ...(Platform.OS === 'android' && { channelId: 'gorevler' }),
      },
      trigger: null, // anlık göster
    });
  } catch { /* Bildirim izni yoksa sessizce geç */ }
}

export async function widgetTaskHandler(props) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      try {
        // Önceki görevleri oku (yeni görev karşılaştırması için)
        const prevRaw = await AsyncStorage.getItem(WIDGET_GOREV_KEY);
        const prevGorevler = prevRaw ? JSON.parse(prevRaw) : [];
        const prevIds = new Set(prevGorevler.map(g => g.id));

        // Kaydedilmiş kullanıcı bilgisini oku
        const userRaw = await AsyncStorage.getItem(WIDGET_USER_KEY);
        const { uid, role } = userRaw ? JSON.parse(userRaw) : {};

        let gorevler = prevGorevler;

        if (uid) {
          const fresh = await fetchFreshGorevler(uid, role);
          if (fresh) {
            const { baslangic, bitis } = buHaftaAraligi();
            const haftaGorevleri = fresh.filter(
              g => g.baslangic >= baslangic && g.baslangic <= bitis
            );

            // Yeni görev var mı kontrol et → bildirim gönder
            const yeniGorevler = haftaGorevleri.filter(g => !prevIds.has(g.id));
            if (yeniGorevler.length > 0) {
              await showNewTaskNotification(yeniGorevler.length);
            }

            await AsyncStorage.setItem(WIDGET_GOREV_KEY, JSON.stringify(haftaGorevleri));
            gorevler = haftaGorevleri;
          }
        }

        props.renderWidget(<GorevWidget gorevler={gorevler} />);
      } catch {
        props.renderWidget(<GorevWidget gorevler={[]} />);
      }
      break;
    }
    case 'WIDGET_DELETED':
      break;
    default:
      break;
  }
}
