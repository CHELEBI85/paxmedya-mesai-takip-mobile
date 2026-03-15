import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet, Image, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import * as Location from 'expo-location';

import { store } from './src/store/store';
import { auth, db } from './src/config/firebase';
import { getDeviceName } from './src/utils/deviceUtils';
import { GEOFENCE_CONFIG } from './src/config/appConfig';
import { setLocation, setLocationError } from './src/store/slices/locationSlice';

import { getUserProfile, fetchWorkRecordsFirstPage } from './src/store/slices/databaseSlice';
import { fetchEnvanterItemsFirstPage, fetchEnvanterHareketler } from './src/store/slices/envanterSlice';
import updateService from './src/services/updateService';

const calcDistance = (p1, p2) => {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (p2.latitude - p1.latitude) * rad;
  const dLon = (p2.longitude - p1.longitude) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.latitude * rad) * Math.cos(p2.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

import Login from './src/pages/Login';
import Home from './src/pages/Home';
import EnvanterYonetim from './src/pages/EnvanterYonetim';
import Takvim from './src/pages/Takvim';
import Profile from './src/pages/Profile';
import Bildirimler from './src/pages/Bildirimler';
import ConfirmModal from './src/components/ConfirmModal';
import ErrorBoundary from './src/components/ErrorBoundary';
import ProtectedScreen from './src/components/ProtectedScreen';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import notificationService from './src/services/notificationService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = { Home: 'home', EnvanterYonetim: 'inventory', Takvim: 'calendar-today' };

const FALLBACK_AVATAR = 'https://paxmedya.com.tr/wp-content/uploads/2026/03/logo.png';

// ── Zorunlu Güncelleme Modal ──────────────────────────────────────────────────
function ForceUpdateModal({ visible, latestVersion, message }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}} // geri tuşuyla kapatılamaz
    >
      <View style={fu.overlay}>
        <View style={fu.card}>
          {/* İkon */}
          <View style={fu.iconWrap}>
            <MaterialIcons name="system-update" size={38} color="#ffd800" />
          </View>

          {/* Başlık */}
          <Text style={fu.title}>Güncelleme Gerekli</Text>

          {/* Açıklama */}
          <Text style={fu.subtitle}>
            {message ||
              'Uygulamanın daha güncel bir sürümü yayınlandı. Devam edebilmek için lütfen güncelleyin.'}
          </Text>

          {/* Sürüm etiketi */}
          {latestVersion ? (
            <View style={fu.versionBadge}>
              <MaterialIcons name="new-releases" size={12} color="#ffd800" />
              <Text style={fu.versionTxt}>Yeni sürüm: v{latestVersion}</Text>
            </View>
          ) : null}

          {/* Güncelle butonu */}
          <TouchableOpacity
            style={fu.btn}
            onPress={() => updateService.openPlayStore()}
            activeOpacity={0.85}
          >
            <MaterialIcons name="get-app" size={18} color="#000000" />
            <Text style={fu.btnTxt}>Play Store'da Güncelle</Text>
          </TouchableOpacity>

          <Text style={fu.hint}>Bu ekranı kapatmak için uygulamayı güncelleyin.</Text>
        </View>
      </View>
    </Modal>
  );
}

const fu = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#000000ee',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#111111', borderRadius: 22, padding: 28,
    width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: '#ffd80033',
    gap: 14,
  },
  iconWrap: {
    width: 76, height: 76, borderRadius: 22,
    backgroundColor: '#ffd80015', borderWidth: 1, borderColor: '#ffd80033',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 21, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  subtitle: {
    fontSize: 13, color: '#888888', textAlign: 'center', lineHeight: 20,
  },
  versionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ffd80015', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#ffd80030',
  },
  versionTxt: { fontSize: 11, color: '#ffd800', fontWeight: '700' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#ffd800', borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 24,
    width: '100%', marginTop: 4,
  },
  btnTxt: { fontSize: 15, fontWeight: '800', color: '#000000' },
  hint: { fontSize: 10, color: '#333333', textAlign: 'center' },
});
// ─────────────────────────────────────────────────────────────────────────────

function HeaderAvatar({ onPress }) {
  const userProfile = useSelector((st) => st.database.userProfile);
  const photoURL = userProfile?.photoURL || null;
  const [imgErr, setImgErr] = React.useState(false);

  return (
    <TouchableOpacity onPress={onPress} style={{ marginRight: 14 }} activeOpacity={0.75}>
      <Image
        source={{ uri: imgErr || !photoURL ? FALLBACK_AVATAR : photoURL }}
        style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#ffd80055' }}
        onError={() => setImgErr(true)}
      />
    </TouchableOpacity>
  );
}

function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  if (isConnected) return null;
  return (
    <View style={ob.banner}>
      <MaterialIcons name="cloud-off" size={14} color="#888888" />
      <Text style={ob.text}>Çevrimdışı mod — Önbellek verileri gösteriliyor</Text>
    </View>
  );
}

const ob = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#111111', paddingVertical: 6, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  text: { fontSize: 11, color: '#888888', fontWeight: '500' },
});

function TabHeaderLogo() {
  return (
    <Image
      source={require('./assets/Pax_Portal_Saydam.png')}
      style={{ width: 160, height: 36 }}
      resizeMode="contain"
    />
  );
}

function BottomTabNavigator({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
        tabBarActiveTintColor: '#ffd800',
        tabBarInactiveTintColor: '#555555',
        tabBarStyle: { backgroundColor: '#111111', borderTopColor: '#1e1e1e' },
        headerShown: true,
        headerStyle: { backgroundColor: '#111111', borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
        headerTitle: () => <TabHeaderLogo />,
        headerTitleAlign: 'left',
        headerLeft: () => null,
        headerRight: () => (
          <HeaderAvatar onPress={() => navigation.navigate('Profile')} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={Home} options={{ tabBarLabel: 'Ana Sayfa' }} />
      <Tab.Screen name="EnvanterYonetim" component={EnvanterYonetim} options={{ tabBarLabel: 'Envanter' }} />
      <Tab.Screen name="Takvim" component={Takvim} options={{ tabBarLabel: 'Takvim' }} />
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
            headerStyle: { backgroundColor: '#111111' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#ffffff' },
          }}
        />
        <Stack.Screen
          name="Bildirimler"
          component={Bildirimler}
          options={{
            title: 'Bildirimler',
            headerStyle: { backgroundColor: '#111111' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#ffffff' },
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
  const [updateInfo, setUpdateInfo] = useState({ needsUpdate: false });

  // Güncelleme kontrolü — auth'tan bağımsız, uygulama açılır açılmaz
  useEffect(() => {
    updateService.checkForUpdate()
      .then(info => { if (info.needsUpdate) setUpdateInfo(info); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    notificationService.requestPermissions();
  }, []);

  const loadAllData = useCallback(async (uid) => {
    setDataLoading(true);
    try {
      // App açılışı: cache varsa kullan, Firestore'a gitme (forceRefresh: false)
      const [profileResult] = await Promise.all([
        dispatch(getUserProfile({ userId: uid, forceRefresh: false })),
        dispatch(fetchWorkRecordsFirstPage({ userId: uid, forceRefresh: false })),
      ]);
      // Role bilgisi profil yüklendikten sonra gelir — hareketler için gerekli
      const role = profileResult?.payload?.role || null;
      // Envanter arka planda — cache'i kontrol eder, geçerliyse Firestore'a gitmiyor
      Promise.all([
        dispatch(fetchEnvanterItemsFirstPage({ forceRefresh: false })),
        dispatch(fetchEnvanterHareketler({ forceRefresh: false, uid, role })),
      ]).catch(() => {});
      notificationService.scheduleWeekdayMotivation().catch(() => {});
    } catch (e) {
      if (__DEV__) console.error('Veri yükleme hatası:', e);
    } finally {
      setDataLoading(false);
    }
  }, [dispatch]);

  // Tek GPS watcher — tüm uygulama için paylaşımlı
  useEffect(() => {
    if (!user) return;
    let sub = null;
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== 'granted') {
          dispatch(setLocationError('Konum izni reddedildi'));
          return;
        }
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (!mounted) return;
          const inZone = calcDistance(loc.coords, GEOFENCE_CONFIG.center) <= GEOFENCE_CONFIG.radius;
          dispatch(setLocation({ coords: loc.coords, isInZone: inZone }));
        } catch (_) {}

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 15 },
          (loc) => {
            if (!mounted) return;
            const inZone = calcDistance(loc.coords, GEOFENCE_CONFIG.center) <= GEOFENCE_CONFIG.radius;
            dispatch(setLocation({ coords: loc.coords, isInZone: inZone }));
          }
        );
      } catch (_) {
        if (mounted) dispatch(setLocationError('Konum alınamadı'));
      }
    })();
    return () => { mounted = false; if (sub) try { sub.remove(); } catch (_) {} };
  }, [user, dispatch]);

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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000', gap: 16 }}>
          <ActivityIndicator size="large" color="#ffd800" />
          {dataLoading && (
            <Text style={{ color: '#555555', fontSize: 13 }}>Veriler yükleniyor...</Text>
          )}
        </View>
        {yetkisizCihazModal}
        <ForceUpdateModal
          visible={updateInfo.needsUpdate}
          latestVersion={updateInfo.latestVersion}
          message={updateInfo.message}
        />
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
      <ForceUpdateModal
        visible={updateInfo.needsUpdate}
        latestVersion={updateInfo.latestVersion}
        message={updateInfo.message}
      />
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
