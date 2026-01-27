import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Provider } from 'react-redux';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Redux Store
import { store } from './src/store/store';
import { auth, db } from './src/config/firebase';
import { getDeviceId } from './src/utils/deviceUtils';

// Pages
import Login from './src/pages/Login';
import Register from './src/pages/Register';
import Home from './src/pages/Home';
import Analysis from './src/pages/Analysis';
import Profile from './src/pages/Profile';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Bottom Tab Navigator
function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home';
          } else if (route.name === 'Analysis') {
            iconName = focused ? 'bar-chart' : 'bar-chart';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ffd800',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#ffd800',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
          color: '#ffd800',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          title: 'Ana Sayfa',
          tabBarLabel: 'Ana Sayfa',
        }}
      />
      <Tab.Screen
        name="Analysis"
        component={Analysis}
        options={{
          title: 'Analiz',
          tabBarLabel: 'Analiz',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Component
function AppContent() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Auto-login: Listen to auth state changes
  useEffect(() => {
    let unsubscribe;

    const checkAuthState = async () => {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Kullanıcı oturum açmış - Cihaz kontrolü yap
          try {
            const currentDeviceId = await getDeviceId();
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              const registeredDeviceId = userData.deviceId;
              
              // Eğer cihaz ID kayıtlıysa ve farklıysa - Çıkış yap!
              if (registeredDeviceId && registeredDeviceId !== currentDeviceId) {
                // Farklı cihaz - Hemen çıkış yap
                await signOut(auth);
                Alert.alert(
                  'Yetkisiz Cihaz',
                  'Bu hesap sadece kayıtlı cihazdan giriş yapabilir. Lütfen yetkili cihazınızı kullanın.',
                  [{ text: 'Tamam' }]
                );
                setUser(null);
                setInitializing(false);
                return;
              }
            }
            
            // Cihaz kontrolü başarılı - Kullanıcıyı ayarla
            setUser(firebaseUser);
          } catch (error) {
            console.error('Cihaz kontrolü hatası:', error);
            // Hata durumunda da çıkış yap (güvenlik için)
            await signOut(auth);
            setUser(null);
          }
        } else {
          // Kullanıcı oturum açmamış
          setUser(null);
        }
        setInitializing(false);
      });
    };

    checkAuthState();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Loading ekranı
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#ffd800" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Eğer oturum açmışsa - Tabs göster
          <Stack.Screen 
            name="MainApp" 
            component={BottomTabNavigator}
            options={{
              animationEnabled: false,
            }}
          />
        ) : (
          // Eğer oturum açmamışsa - Auth Stack
          <>
            <Stack.Screen 
              name="Login" 
              component={Login}
              options={{
                animationEnabled: false,
              }}
            />
            <Stack.Screen 
              name="Register" 
              component={Register}
              options={{
                animationEnabled: true,
                headerShown: true,
                headerTitle: 'Kayıt Ol',
                headerStyle: {
                  backgroundColor: '#1e293b',
                },
                headerTintColor: '#ffd800',
                headerTitleStyle: {
                  color: '#ffd800',
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
