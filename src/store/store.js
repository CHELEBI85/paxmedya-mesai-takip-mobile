import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import databaseReducer from './slices/databaseSlice';
import envanterReducer from './slices/envanterSlice';
import locationReducer from './slices/locationSlice';
import takvimReducer from './slices/takvimSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    database: databaseReducer,
    envanter: envanterReducer,
    location: locationReducer,
    takvim: takvimReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'auth/loginUser/fulfilled',
          'auth/registerUser/fulfilled',
          'database/updateUserProfile/fulfilled',
          'database/getUserProfile/fulfilled',
          'database/addWorkRecord/fulfilled',
          'database/fetchWorkRecords/fulfilled',
          'database/fetchWorkRecordsFirstPage/fulfilled',
          'database/fetchWorkRecordsNextPage/fulfilled',
          'database/updateWorkRecord/fulfilled',
          'database/deleteWorkRecord/fulfilled',
          'envanter/fetchItems/fulfilled',
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
        ],
      },
    }),
});
