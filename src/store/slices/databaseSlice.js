import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import cacheService from '../../services/cacheService';
import { CACHE_KEYS } from '../../config/appConfig';

export const getUserProfile = createAsyncThunk(
  'database/getUserProfile',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const profile = {
          id: userSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          deviceRegisteredAt: data.deviceRegisteredAt?.toDate?.()?.toISOString() || data.deviceRegisteredAt,
        };
        await cacheService.set(CACHE_KEYS.USER_PROFILE + '_' + userId, profile);
        return profile;
      } else {
        return rejectWithValue('Kullanıcı profili bulunamadı');
      }
    } catch (error) {
      const cached = await cacheService.getAny(CACHE_KEYS.USER_PROFILE + '_' + userId);
      if (cached) return cached;
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'database/updateUserProfile',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { ...data, updatedAt: new Date() }, { merge: true });
      return { id: userId, ...data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchWorkRecords = createAsyncThunk(
  'database/fetchWorkRecords',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const q = query(collection(db, 'workRecords'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const records = [];
      snapshot.forEach((d) => records.push({ id: d.id, ...d.data() }));

      await cacheService.set(CACHE_KEYS.WORK_RECORDS + '_' + userId, records);
      return records;
    } catch (error) {
      const cached = await cacheService.getAny(CACHE_KEYS.WORK_RECORDS + '_' + userId);
      if (cached) return cached;
      return rejectWithValue(error.message);
    }
  }
);

export const addWorkRecord = createAsyncThunk(
  'database/addWorkRecord',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const docRef = await addDoc(collection(db, 'workRecords'), {
        userId,
        ...data,
        createdAt: new Date(),
      });
      return { id: docRef.id, userId, ...data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateWorkRecord = createAsyncThunk(
  'database/updateWorkRecord',
  async ({ recordId, data }, { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'workRecords', recordId);
      await updateDoc(docRef, data);
      return { id: recordId, ...data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteWorkRecord = createAsyncThunk(
  'database/deleteWorkRecord',
  async ({ recordId }, { rejectWithValue }) => {
    try {
      await deleteDoc(doc(db, 'workRecords', recordId));
      return recordId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const databaseSlice = createSlice({
  name: 'database',
  initialState: {
    records: [],
    userProfile: null,
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserProfile.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = action.payload;
        state.error = null;
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(updateUserProfile.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = { ...state.userProfile, ...action.payload };
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchWorkRecords.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchWorkRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload;
        state.error = null;
      })
      .addCase(fetchWorkRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(addWorkRecord.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(addWorkRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.records.push(action.payload);
        state.error = null;
      })
      .addCase(addWorkRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(updateWorkRecord.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateWorkRecord.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.records.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) state.records[index] = { ...state.records[index], ...action.payload };
        state.error = null;
      })
      .addCase(updateWorkRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(deleteWorkRecord.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteWorkRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.records = state.records.filter((r) => r.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteWorkRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default databaseSlice.reducer;
