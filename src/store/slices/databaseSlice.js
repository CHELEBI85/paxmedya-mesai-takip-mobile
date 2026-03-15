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
  orderBy,
  limit,
  startAfter,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import cacheService from '../../services/cacheService';
import { CACHE_KEYS } from '../../config/appConfig';

export const getUserProfile = createAsyncThunk(
  'database/getUserProfile',
  async ({ userId, forceRefresh = false }, { rejectWithValue }) => {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId}`;
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(cacheKey);
        if (cached) return cached;
      }
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
        await cacheService.set(cacheKey, profile);
        return profile;
      } else {
        return rejectWithValue('Kullanıcı profili bulunamadı');
      }
    } catch (error) {
      const cached = await cacheService.getAny(cacheKey);
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

const PAGE_SIZE = 20;

const tsToISO = (val) => val?.toDate?.()?.toISOString?.() ?? (val instanceof Object && val.seconds ? new Date(val.seconds * 1000).toISOString() : val) ?? null;

const workRecordToPlain = (d) => {
  const data = d.data();
  return {
    id: d.id,
    ...data,
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
    checkInTime: tsToISO(data.checkInTime),
    checkOutTime: tsToISO(data.checkOutTime),
  };
};

/** İlk sayfa kayıtlar. forceRefresh = true → cache atla (pull-to-refresh için). */
export const fetchWorkRecordsFirstPage = createAsyncThunk(
  'database/fetchWorkRecordsFirstPage',
  async ({ userId, forceRefresh = false }, { rejectWithValue }) => {
    const cacheKey = `${CACHE_KEYS.WORK_RECORDS}_${userId}`;
    try {
      if (!forceRefresh) {
        const cached = await cacheService.getValid(cacheKey);
        if (cached) return cached;
      }
      const q = query(
        collection(db, 'workRecords'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(workRecordToPlain);
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      const nextCursor = lastDoc
        ? {
            createdAt: lastDoc.data().createdAt?.toDate?.()?.toISOString?.() ?? lastDoc.data().createdAt,
            id: lastDoc.id,
          }
        : null;
      const hasMore = snapshot.docs.length === PAGE_SIZE;
      const result = { records, nextCursor, hasMore };
      await cacheService.set(cacheKey, result);
      return result;
    } catch (error) {
      const cached = await cacheService.getAny(cacheKey);
      if (cached) return cached;
      return rejectWithValue(error.message);
    }
  }
);

/** Sonraki 10 kayıt. Kullanıcı aşağı indikçe çağrılır. */
export const fetchWorkRecordsNextPage = createAsyncThunk(
  'database/fetchWorkRecordsNextPage',
  async ({ userId, cursor }, { rejectWithValue }) => {
    try {
      if (!cursor?.createdAt || !cursor?.id) {
        return { records: [], nextCursor: null, hasMore: false };
      }
      const q = query(
        collection(db, 'workRecords'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
        startAfter(Timestamp.fromDate(new Date(cursor.createdAt)))
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(workRecordToPlain);
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      const nextCursor = lastDoc
        ? {
            createdAt: lastDoc.data().createdAt?.toDate?.()?.toISOString?.() ?? lastDoc.data().createdAt,
            id: lastDoc.id,
          }
        : null;
      const hasMore = snapshot.docs.length === PAGE_SIZE;
      return { records, nextCursor, hasMore };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addWorkRecord = createAsyncThunk(
  'database/addWorkRecord',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const now = new Date();
      const docRef = await addDoc(collection(db, 'workRecords'), {
        userId,
        ...data,
        createdAt: now,
      });
      const newRecord = { id: docRef.id, userId, ...data, createdAt: now.toISOString() };
      // Cache'e yeni kaydı öne ekle (uygulama kapanıp açılınca güncel görünsün)
      const cacheKey = `${CACHE_KEYS.WORK_RECORDS}_${userId}`;
      await cacheService.patch(cacheKey, (cached) => {
        if (!cached?.records) return cached;
        return { ...cached, records: [newRecord, ...cached.records] };
      });
      return newRecord;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateWorkRecord = createAsyncThunk(
  'database/updateWorkRecord',
  async ({ recordId, data, userId }, { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'workRecords', recordId);
      await updateDoc(docRef, data);
      // Cache'deki kaydı yerinde güncelle (TTL korunur, Firestore isteği yok)
      if (userId) {
        const cacheKey = `${CACHE_KEYS.WORK_RECORDS}_${userId}`;
        await cacheService.patch(cacheKey, (cached) => {
          if (!cached?.records) return cached;
          return {
            ...cached,
            records: cached.records.map(r => r.id === recordId ? { ...r, ...data } : r),
          };
        });
      }
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
    recordsLoading: false,
    loadingMore: false,
    error: null,
    recordsCursor: null,
    recordsHasMore: false,
    lastWorkRecordsFetchAt: null,
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
      .addCase(fetchWorkRecordsFirstPage.pending, (state) => { state.recordsLoading = true; state.error = null; })
      .addCase(fetchWorkRecordsFirstPage.fulfilled, (state, action) => {
        state.recordsLoading = false;
        state.records = action.payload.records;
        state.recordsCursor = action.payload.nextCursor;
        state.recordsHasMore = action.payload.hasMore;
        state.lastWorkRecordsFetchAt = Date.now();
        state.error = null;
      })
      .addCase(fetchWorkRecordsFirstPage.rejected, (state, action) => {
        state.recordsLoading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchWorkRecordsNextPage.pending, (state) => { state.loadingMore = true; })
      .addCase(fetchWorkRecordsNextPage.fulfilled, (state, action) => {
        state.loadingMore = false;
        state.records = state.records.concat(action.payload.records);
        state.recordsCursor = action.payload.nextCursor;
        state.recordsHasMore = action.payload.hasMore;
      })
      .addCase(fetchWorkRecordsNextPage.rejected, (state, action) => {
        state.loadingMore = false;
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
