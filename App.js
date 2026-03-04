import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Provider, useDispatch } from 'react-redux';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { store } from './src/store/store';
import { auth, db } from './src/config/firebase';
import { getDeviceName } from './src/utils/deviceUtils';

import { getUserProfile, fetchWorkRecords } from './src/store/slices/databaseSlice';
import { fetchEnvanterItems, fetchEnvanterHareketler } from './src/store/slices/envanterSlice';

import Login from './src/pages/Login';
import Home from './src/pages/Home';
import EnvanterYonetim from './src/pages/EnvanterYonetim';
import Profile from './src/pages/Profile';
import Bildirimler from './src/pages/Bildirimler';
import ConfirmModal from './src/components/ConfirmModal';
import ErrorBoundary from './src/components/ErrorBoundary';
import ProtectedScreen from './src/components/ProtectedScreen';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import notificationService from './src/services/notificationService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = { Home: 'home', EnvanterYonetim: 'inventory' };

function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  if (isConnected) return null;
  return (
    <View style={ob.banner}>
      <MaterialIcons name="cloud-off" size={14} color="#f59e0b" />
      <Text style={ob.text}>Çevrimdışı mod — Önbellek verileri gösteriliyor</Text>
    </View>
  );
}

const ob = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#451a03', paddingVertical: 6, paddingHorizontal: 12,
  },
  text: { fontSize: 11, color: '#f59e0b', fontWeight: '500' },
});

function BottomTabNavigator({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
        tabBarActiveTintColor: '#ffd800',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        headerShown: true,
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#ffd800',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18, color: '#ffd800' },
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ marginRight: 16 }}>
            <MaterialIcons name="account-circle" size={30} color="#ffd800" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Home" component={Home} options={{ title: 'Ana Sayfa', tabBarLabel: 'Ana Sayfa' }} />
      <Tab.Screen name="EnvanterYonetim" component={EnvanterYonetim} options={{ title: 'Envanter Yönetim', tabBarLabel: 'Envanter' }} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <ProtectedScreen>
      <OfflineBanner />
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={BottomTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen
          name="Profile"
          component={Profile}
          options={{
            title: 'Profil',
            headerStyle: { backgroundColor: '#1e293b' },
            headerTintColor: '#ffd800',
            headerTitleStyle: { fontWeight: 'bold', fontSize: 18, color: '#ffd800' },
          }}
        />
        <Stack.Screen
          name="Bildirimler"
          component={Bildirimler}
          options={{
            title: 'Bildirimler',
            headerStyle: { backgroundColor: '#1e293b' },
            headerTintColor: '#ffd800',
            headerTitleStyle: { fontWeight: 'bold', fontSize: 18, color: '#ffd800' },
          }}
        />
      </Stack.Navigator>
    </ProtectedScreen>
  );
}

function AppContent() {
  const dispatch = useDispatch();
  const [initializing, setInitializing] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);

  useEffect(() => {
    notificationService.requestPermissions();
  }, []);

  const loadAllData = useCallback(async (uid) => {
    setDataLoading(true);
    try {
      await Promise.all([
        dispatch(getUserProfile({ userId: uid })),
        dispatch(fetchWorkRecords({ userId: uid })),
        dispatch(fetchEnvanterItems()),
        dispatch(fetchEnvanterHareketler()),
      ]);
      notificationService.scheduleWeekdayMotivation().catch(() => {});
    } catch (e) {
      if (__DEV__) console.error('Veri yükleme hatası:', e);
    } finally {
      setDataLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    let unsubscribe;
    const checkAuthState = async () => {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const deviceName = await getDeviceName();
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData.deviceName && userData.deviceName !== deviceName) {
                await signOut(auth);
                setAuthModalVisible(true);
                setUser(null);
                setInitializing(false);
                return;
              }
            }

            setUser(firebaseUser);
            await loadAllData(firebaseUser.uid);
          } catch (error) {
            setUser(firebaseUser);
            if (__DEV__) console.error('Cihaz kontrolü hatası:', error);
          }
        } else {
          setUser(null);
        }
        setInitializing(false);
      });
    };
    checkAuthState();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [loadAllData]);

  const yetkisizCihazModal = (
    <ConfirmModal
      visible={authModalVisible}
      icon="security"
      iconColor="#ef4444"
      title="Yetkisiz Cihaz"
      message="Bu hesap sadece kayıtlı cihazdan giriş yapabilir. Lütfen yetkili cihazınızı kullanın."
      confirmText="Tamam"
      hideCancel
      onConfirm={() => setAuthModalVisible(false)}
      onCancel={() => setAuthModalVisible(false)}
    />
  );

  if (initializing || dataLoading) {
    return (
      <>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', gap: 16 }}>
          <ActivityIndicator size="large" color="#ffd800" />
          {dataLoading && (
            <Text style={{ color: '#64748b', fontSize: 13 }}>Veriler yükleniyor...</Text>
          )}
        </View>
        {yetkisizCihazModal}
      </>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen name="MainApp" component={MainNavigator} options={{ animationEnabled: false }} />
          ) : (
            <Stack.Screen name="Login" component={Login} options={{ animationEnabled: false }} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      {yetkisizCihazModal}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </ErrorBoundary>
  );
}
