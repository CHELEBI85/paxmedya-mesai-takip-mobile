import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_TTL } from '../config/appConfig';

const cacheService = {
  async set(key, data) {
    try {
      const entry = { data, timestamp: Date.now() };
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      if (__DEV__) console.warn('Cache write error:', e);
    }
  },

  async get(key) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const { data, timestamp } = JSON.parse(raw);
      const isExpired = Date.now() - timestamp > CACHE_TTL;
      return { data, timestamp, isExpired };
    } catch (e) {
      if (__DEV__) console.warn('Cache read error:', e);
      return null;
    }
  },

  async getValid(key) {
    const result = await this.get(key);
    if (!result || result.isExpired) return null;
    return result.data;
  },

  async getAny(key) {
    const result = await this.get(key);
    return result?.data ?? null;
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      if (__DEV__) console.warn('Cache remove error:', e);
    }
  },

  async clear() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith('@cache_'));
      if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
    } catch (e) {
      if (__DEV__) console.warn('Cache clear error:', e);
    }
  },
};

export default cacheService;
