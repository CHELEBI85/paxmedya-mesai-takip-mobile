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
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Async Thunks

// Kullanıcı profil bilgisini getir
export const getUserProfile = createAsyncThunk(
  'database/getUserProfile',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        // Timestamp'leri string'e çevir
        return {
          id: userSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          deviceRegisteredAt: data.deviceRegisteredAt?.toDate?.()?.toISOString() || data.deviceRegisteredAt,
        };
      } else {
        return rejectWithValue('Kullanıcı profili bulunamadı');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Kullanıcı profil bilgisini güncelle
export const updateUserProfile = createAsyncThunk(
  'database/updateUserProfile',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      console.log('Iniciando atualização de perfil:', { userId, data });
      const userRef = doc(db, 'users', userId);
      
      // setDoc com merge: true -> oluşturur veya günceller
      await setDoc(userRef, {
        ...data,
        updatedAt: new Date(),
      }, { merge: true });
      
      console.log('Perfil atualizado com sucesso');
      return { id: userId, ...data };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Çalışma kayıtlarını getir
export const fetchWorkRecords = createAsyncThunk(
  'database/fetchWorkRecords',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const workRecordsRef = collection(db, 'workRecords');
      const q = query(workRecordsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const records = [];
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });
      
      return records;
    } catch (error) {
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

const initialState = {
  records: [],
  userProfile: null,
  loading: false,
  error: null,
};

const databaseSlice = createSlice({
  name: 'database',
  initialState,
  extraReducers: (builder) => {
    // Get User Profile
    builder
      .addCase(getUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = action.payload;
        state.error = null;
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update User Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = { ...state.userProfile, ...action.payload };
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Records
    builder
      .addCase(fetchWorkRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload;
        state.error = null;
      })
      .addCase(fetchWorkRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Add Record
    builder
      .addCase(addWorkRecord.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addWorkRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.records.push(action.payload);
        state.error = null;
      })
      .addCase(addWorkRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Record
    builder
      .addCase(updateWorkRecord.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWorkRecord.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.records.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.records[index] = { ...state.records[index], ...action.payload };
        }
        state.error = null;
      })
      .addCase(updateWorkRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Record
    builder
      .addCase(deleteWorkRecord.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWorkRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.records = state.records.filter(r => r.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteWorkRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default databaseSlice.reducer;
