import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WIDGET_GOREV_KEY, WIDGET_USER_KEY } from './widgetTaskHandler';

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

/**
 * Widget'ı günceller ve arka plan fetcher için uid/role'ü AsyncStorage'a kaydeder.
 * @param {Array}  gorevler - Tüm görevler listesi
 * @param {string} uid      - Giriş yapan kullanıcının UID'i
 * @param {string} role     - Kullanıcı rolü ('admin' | 'manager' | 'user')
 */
export async function widgetGuncelle(gorevler = [], uid = null, role = null) {
  try {
    const { baslangic, bitis } = buHaftaAraligi();
    const haftaGorevleri = gorevler.filter(
      g => g.baslangic >= baslangic && g.baslangic <= bitis
    );

    // uid/role'ü kaydet — widgetTaskHandler arka planda Firestore'a bağlanmak için kullanır
    if (uid || role) {
      await AsyncStorage.setItem(WIDGET_USER_KEY, JSON.stringify({ uid, role }));
    }

    // AsyncStorage'ı güncelle (widget task handler okur)
    await AsyncStorage.setItem(WIDGET_GOREV_KEY, JSON.stringify(haftaGorevleri));

    // Android'de widget'ı anlık yeniden render et
    if (Platform.OS === 'android') {
      const React = require('react');
      const { requestWidgetUpdate } = require('react-native-android-widget');
      const { GorevWidget } = require('./GorevWidget');
      await requestWidgetUpdate({
        widgetName: 'GorevWidget',
        renderWidget: () => React.createElement(GorevWidget, { gorevler: haftaGorevleri }),
        widgetNotFound: () => {},
      });
    }
  } catch {
    // Widget eklenmemişse veya hata varsa sessizce geç
  }
}
