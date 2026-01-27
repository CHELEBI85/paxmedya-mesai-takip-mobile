import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import databaseReducer from './slices/databaseSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    database: databaseReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignora avisos de serialização para o Firebase (apenas desenvolvimento)
        ignoredActions: [
          'auth/loginUser/fulfilled',
          'auth/registerUser/fulfilled',
          'database/updateUserProfile/fulfilled',
          'database/getUserProfile/fulfilled',
          'database/addWorkRecord/fulfilled',
          'database/fetchWorkRecords/fulfilled',
        ],
        ignoredPaths: [
          'auth.user',
          'database.userProfile.updatedAt',
          'database.userProfile.createdAt',
          'database.userProfile.deviceRegisteredAt',
          'database.records',
        ],
      },
    }),
});
