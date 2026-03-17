import { doc, getDoc } from 'firebase/firestore';
import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import { db } from '../config/firebase';

const PACKAGE_ID     = 'com.paxmedya.paxportal';
const PLAY_STORE_URL = `market://details?id=${PACKAGE_ID}`;
const PLAY_STORE_WEB = `https://play.google.com/store/apps/details?id=${PACKAGE_ID}`;

// App Store'a yükledikten sonra buraya sayısal App Store ID'yi yaz
// Örnek: 'itms-apps://apps.apple.com/tr/app/pax-portal/1234567890'
const APP_STORE_ID   = '';
const APP_STORE_URL  = APP_STORE_ID ? `itms-apps://apps.apple.com/tr/app/pax-portal/${APP_STORE_ID}` : '';
const APP_STORE_WEB  = APP_STORE_ID ? `https://apps.apple.com/tr/app/pax-portal/${APP_STORE_ID}` : '';

/** Semver karşılaştırma: a < b → -1, a === b → 0, a > b → 1 */
function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

const updateService = {
  /**
   * Firestore'daki `config/appVersion` dökümanına bakarak güncelleme gerekip gerekmediğini döner.
   * Döküman yoksa veya hata oluşursa güncelleme gerektirmez (uygulama bloklanmasın).
   *
   * Firestore döküman yapısı:
   * {
   *   minVersion:    "1.0.0",   // bu sürümden eskiler zorla güncellenir
   *   latestVersion: "1.2.0",   // bilgi amaçlı gösterilir
   *   message:       "..."      // isteğe bağlı özel mesaj
   * }
   */
  async checkForUpdate() {
    try {
      const currentVersion = Application.nativeApplicationVersion;
      // Expo Go / simulator ortamında version null olabilir → güncelleme kontrolü atla
      if (!currentVersion) return { needsUpdate: false };

      const snap = await getDoc(doc(db, 'config', 'appVersion'));
      if (!snap.exists()) return { needsUpdate: false };

      const { minVersion, latestVersion, message } = snap.data();
      const needsUpdate = !!minVersion && compareVersions(currentVersion, minVersion) < 0;

      return {
        needsUpdate,
        currentVersion,
        latestVersion: latestVersion || minVersion || null,
        message: message || null,
      };
    } catch {
      // Ağ hatası vs. → uygulamayı bloklamıyoruz
      return { needsUpdate: false };
    }
  },

  async openStore() {
    try {
      if (Platform.OS === 'ios') {
        if (!APP_STORE_URL) return; // App Store ID henüz eklenmemiş
        const canOpen = await Linking.canOpenURL(APP_STORE_URL);
        await Linking.openURL(canOpen ? APP_STORE_URL : APP_STORE_WEB);
      } else {
        const canOpen = await Linking.canOpenURL(PLAY_STORE_URL);
        await Linking.openURL(canOpen ? PLAY_STORE_URL : PLAY_STORE_WEB);
      }
    } catch {
      try {
        const fallback = Platform.OS === 'ios' ? APP_STORE_WEB : PLAY_STORE_WEB;
        if (fallback) await Linking.openURL(fallback);
      } catch { }
    }
  },

  // Geriye dönük uyumluluk için alias
  async openPlayStore() {
    return this.openStore();
  },
};

export default updateService;
