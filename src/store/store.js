import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import databaseReducer from './slices/databaseSlice';
import envanterReducer from './slices/envanterSlice';
import locationReducer from './slices/locationSlice';
import takvimReducer from './slices/takvimSlice';
import taleplerReducer from './slices/taleplerSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    database: databaseReducer,
    envanter: envanterReducer,
    location: locationReducer,
    takvim: takvimReducer,
    talepler: taleplerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        warnAfter: 128,
        ignoredActions: [
          'auth/loginUser/fulfilled',
          'database/updateUserProfile/fulfilled',
          'database/getUserProfile/fulfilled',
          'database/addWorkRecord/fulfilled',
          'database/fetchWorkRecordsFirstPage/fulfilled',
          'database/fetchWorkRecordsNextPage/fulfilled',
          'database/updateWorkRecord/fulfilled',
          'database/deleteWorkRecord/fulfilled',
          'envanter/fetchItemsFirstPage/fulfilled',
          'envanter/fetchItemsNextPage/fulfilled',
          'envanter/fetchHareketler/fulfilled',
          'envanter/fetchCounts/fulfilled',
          'envanter/teslimAl/fulfilled',
          'envanter/teslimEt/fulfilled',
          'envanter/fetchUserEquipmentHistory/fulfilled',
          'takvim/fetchGorevler/fulfilled',
          'takvim/fetchKullanicilar/fulfilled',
          'takvim/addGorev/fulfilled',
          'takvim/updateGorev/fulfilled',
          'talepler/fetchTalepler/fulfilled',
          'talepler/fetchAllTalepler/fulfilled',
          'talepler/fetchIzinler/fulfilled',
          'talepler/fetchAllIzinler/fulfilled',
          'talepler/addTalep/fulfilled',
          'talepler/updateTalep/fulfilled',
          'talepler/updateTalepDurum/fulfilled',
          'talepler/addIzin/fulfilled',
          'talepler/updateIzinDurum/fulfilled',
          'talepler/fetchTaleplerNextPage/fulfilled',
          'talepler/fetchAllTaleplerNextPage/fulfilled',
          'talepler/fetchIzinlerNextPage/fulfilled',
          'talepler/fetchAllIzinlerNextPage/fulfilled',
          'takvim/fetchGorevlerOncesi/fulfilled',
        ],
        ignoredPaths: [
          'auth.user',
          'database.userProfile.updatedAt',
          'database.userProfile.createdAt',
          'database.userProfile.deviceRegisteredAt',
          'database.records',
          'envanter.items',
          'envanter.hareketler',
          'envanter.equipmentHistory',
          'takvim.gorevler',
          'takvim.kullanicilar',
          'talepler.talepler',
          'talepler.allTalepler',
          'talepler.izinler',
          'talepler.allIzinler',
        ],
      },
    }),
});
