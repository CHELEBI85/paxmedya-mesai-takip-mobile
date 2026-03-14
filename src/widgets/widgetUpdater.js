import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { GorevWidget } from './GorevWidget';
import { WIDGET_GOREV_KEY } from './widgetTaskHandler';

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

export async function widgetGuncelle(gorevler = []) {
  try {
    const { baslangic, bitis } = buHaftaAraligi();
    const haftaGorevleri = gorevler.filter(
      g => g.baslangic >= baslangic && g.baslangic <= bitis
    );

    // 1. AsyncStorage'ı güncelle (widget task handler okur)
    await AsyncStorage.setItem(WIDGET_GOREV_KEY, JSON.stringify(haftaGorevleri));

    // 2. Widget'ı anlık yeniden render et
    await requestWidgetUpdate({
      widgetName: 'GorevWidget',
      renderWidget: () => <GorevWidget gorevler={haftaGorevleri} />,
      widgetNotFound: () => {},
    });
  } catch (e) {
    // Widget eklenmemişse veya hata varsa sessizce geç
  }
}
