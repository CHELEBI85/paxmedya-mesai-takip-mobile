import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDae2jGiXg6cmdppuGq3BtHJZcPoyTVAhg",
  authDomain: "pax-medya-mesai-takibi.firebaseapp.com",
  projectId: "pax-medya-mesai-takibi",
  storageBucket: "pax-medya-mesai-takibi.firebasestorage.app",
  messagingSenderId: "906086917177",
  appId: "1:906086917177:web:4545f66a668e296bf359e8",
  measurementId: "G-TW0SE7JPTN"
};

// Firebase Başlatma
const app = initializeApp(firebaseConfig);

// Auth with Persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Firestore
export const db = getFirestore(app);

export default app;
