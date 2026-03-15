import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { getDeviceId, getDeviceName } from '../../utils/deviceUtils';

// Firebase User'dan yalnızca gerekli alanları serileştir
const serializeUser = (firebaseUser) => {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
  };
};

// Async Thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Önce Firebase Auth ile giriş yap
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Cihaz ID'sini ve adını al
      const currentDeviceId = await getDeviceId();
      const deviceName = await getDeviceName();
      
      // Kullanıcı profilini Firestore'dan getir
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const registeredDeviceId = userData.deviceId;
        const registeredDeviceName = userData.deviceName;
        
        // Eğer cihaz adı yoksa, tekrar kaydet
        if (!registeredDeviceName) {
          await setDoc(userRef, {
            ...userData,
            deviceId: currentDeviceId,
            deviceName: deviceName,
            deviceRegisteredAt: new Date(),
            updatedAt: new Date(),
          }, { merge: true });
        } else {
          // Cihaz adına göre kontrol et (cihaz adı daha stabil)
          if (registeredDeviceName !== deviceName) {
            // Farklı cihaz - giriş yapma!
            await signOut(auth);
            return rejectWithValue('Bu hesap sadece kayıtlı cihazdan giriş yapabilir. Lütfen yetkili cihazınızı kullanın.');
          }
          // Cihaz adı eşleşiyor - cihaz ID'yi güncelle (değişmiş olabilir)
          await setDoc(userRef, {
            ...userData,
            deviceId: currentDeviceId,
            updatedAt: new Date(),
          }, { merge: true });
        }
      } else {
        // Kullanıcı profili yok - oluştur ve cihaz bilgilerini kaydet
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.email.split('@')[0],
          photoURL: null,
          deviceId: currentDeviceId,
          deviceName: deviceName,
          deviceRegisteredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      return serializeUser(user);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth);
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default authSlice.reducer;
