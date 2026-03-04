import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import databaseReducer from './slices/databaseSlice';
import envanterReducer from './slices/envanterSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    database: databaseReducer,
    envanter: envanterReducer,
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
          'database/updateWorkRecord/fulfilled',
          'database/deleteWorkRecord/fulfilled',
          'envanter/fetchItems/fulfilled',
          'envanter/fetchHareketler/fulfilled',
          'envanter/teslimAl/fulfilled',
          'envanter/teslimEt/fulfilled',
        ],
        ignoredPaths: [
          'auth.user',
          'database.userProfile.updatedAt',
          'database.userProfile.createdAt',
          'database.userProfile.deviceRegisteredAt',
          'database.records',
          'envanter.items',
          'envanter.hareketler',
        ],
      },
    }),
});
