export const GEOFENCE_CONFIG = {
  center: {
    latitude: parseFloat(process.env.EXPO_PUBLIC_GEOFENCE_LATITUDE) || 39.90022219885123,
    longitude: parseFloat(process.env.EXPO_PUBLIC_GEOFENCE_LONGITUDE) || 32.85887139306502,
  },
  radius: parseFloat(process.env.EXPO_PUBLIC_GEOFENCE_RADIUS) || 100,
};

export const CACHE_KEYS = {
  ENVANTER_ITEMS: '@cache_envanter_items',
  ENVANTER_HAREKETLER: '@cache_envanter_hareketler',
  WORK_RECORDS: '@cache_work_records',
  USER_PROFILE: '@cache_user_profile',
};

export const CACHE_TTL = 30 * 60 * 1000; // 30 dakika

export const NOTIFICATION_CONFIG = {
  equipmentReminderHours: 24,
};
