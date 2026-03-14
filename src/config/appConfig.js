export const GEOFENCE_CONFIG = {
  center: {
    latitude: parseFloat(process.env.EXPO_PUBLIC_GEOFENCE_LATITUDE) || 39.90022219885123,
    longitude: parseFloat(process.env.EXPO_PUBLIC_GEOFENCE_LONGITUDE) || 32.85887139306502,
  },
  radius: parseFloat(process.env.EXPO_PUBLIC_GEOFENCE_RADIUS) || 100,
};

export const CACHE_KEYS = {
  ENVANTER_ITEMS: '@cache_envanter_items',       // + '_' + tur suffix
  ENVANTER_HAREKETLER: '@cache_envanter_hareketler',
  ENVANTER_COUNTS: '@cache_envanter_counts',
  WORK_RECORDS: '@cache_work_records',           // + '_' + userId suffix
  USER_PROFILE: '@cache_user_profile',           // + '_' + userId suffix
  EQUIP_HISTORY: '@cache_equip_history',         // + '_' + userId suffix
};

export const CACHE_TTL = 30 * 60 * 1000; // 30 dakika

/** Liste verileri bu süre geçmeden tekrar istek atılmaz (gereksiz Firebase okuma önlenir). */
export const LIST_STALE_MS = 2 * 60 * 1000; // 2 dakika

export const NOTIFICATION_CONFIG = {
  equipmentReminderHours: 24,
};
