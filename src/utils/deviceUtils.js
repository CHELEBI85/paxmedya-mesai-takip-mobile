import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@device_id';

// Cihaz ID'sini al veya oluştur
export const getDeviceId = async () => {
  try {
    // Önce AsyncStorage'dan kontrol et
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Eğer yoksa, cihaz bilgilerinden oluştur
      const deviceInfo = {
        modelName: Device.modelName || 'Unknown',
        osInternalBuildId: Device.osInternalBuildId || 'Unknown',
        brand: Device.brand || 'Unknown',
      };
      
      // Benzersiz bir ID oluştur
      deviceId = `${deviceInfo.brand}_${deviceInfo.modelName}_${deviceInfo.osInternalBuildId}_${Date.now()}`;
      
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    if (__DEV__) {
      console.error('Cihaz ID alınamadı:', error);
    }
    // Fallback: timestamp bazlı ID
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Cihaz adını al (görüntüleme için)
export const getDeviceName = async () => {
  try {
    const deviceInfo = {
      brand: Device.brand || 'Unknown',
      modelName: Device.modelName || 'Unknown',
    };
    
    return `${deviceInfo.brand} ${deviceInfo.modelName}`;
  } catch (error) {
    if (__DEV__) {
      console.error('Cihaz adı alınamadı:', error);
    }
    return 'Bilinmeyen Cihaz';
  }
};

