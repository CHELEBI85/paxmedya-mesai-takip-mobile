import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import CelebrationModal from '../components/CelebrationModal';
import * as Location from 'expo-location';

// Geofence Ayarları
const GEOFENCE_CENTER = {
  latitude: 39.90022219885123,
  longitude: 32.85887139306502,
};
const GEOFENCE_RADIUS = 100; // metre

// Haversine Formülü ile Mesafe Hesapla
const calculateDistance = (point1, point2) => {
  const earthRadiusKm = 6371;
  const degToRad = Math.PI / 180;

  const dLat = (point2.latitude - point1.latitude) * degToRad;
  const dLon = (point2.longitude - point1.longitude) * degToRad;

  const lat1Rad = point1.latitude * degToRad;
  const lat2Rad = point2.latitude * degToRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1Rad) *
      Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c * 1000; // metre cinsinden
};

const isWithinRadius = (userLocation, center, radiusInMeters) => {
  const distance = calculateDistance(userLocation, center);
  return distance <= radiusInMeters;
};

export default function Home() {
  const { user } = useAuth();
  const { userProfile, loading: dbLoading, getProfile, addRecord, updateRecord, records, getWorkRecords } = useDatabase();
  const mapRef = React.useRef(null); // Harita ref'i

  const [location, setLocation] = useState(null);
  const [isInZone, setIsInZone] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [isUserDragging, setIsUserDragging] = useState(false); // Kullanıcı haritayı kaydırıyor mu?
  const [checkInStatus, setCheckInStatus] = useState('idle'); // idle, checked-in, checked-out
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordId, setRecordId] = useState(null); // Dokument ID'sini sakla
  const [hasShownAutoCheckoutAlert, setHasShownAutoCheckoutAlert] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationType, setCelebrationType] = useState('check-in');

  // Profil bilgisini yükle
  useEffect(() => {
    if (user?.uid) {
      getProfile(user.uid);
      getWorkRecords(user.uid); // Bugünün kaydını getir
    }
  }, [user]);

  // Bugünün kaydını kontrol et ve önceki günün eksik kaydını kontrol et
  useEffect(() => {
    if (user?.uid && records && !hasShownAutoCheckoutAlert) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Kullanıcının kendi kayıtlarını filtrele
      const userRecords = records.filter(record => record.userId === user.uid);
      
      // Önceki günün eksik kaydını kontrol et (çıkış yapılmamış)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayRecord = userRecords.find(
        record => record.date === yesterdayStr && !record.checkOutTime
      );
      
      // Eğer önceki günün eksik kaydı varsa, otomatik olarak gece yarısında çıkış yap (18:30 olarak kaydet)
      if (yesterdayRecord) {
        setHasShownAutoCheckoutAlert(true);
        
        // Çıkış saati olarak 18:30'u kullan
        const checkoutTime = new Date(yesterday);
        checkoutTime.setHours(18, 30, 0, 0); // 18:30
        
        // Otomatik çıkış yap (alert göstermeden)
        updateRecord(yesterdayRecord.id, {
          checkOutTime: checkoutTime.toISOString(),
          checkOutLocation: yesterdayRecord.checkInLocation || null,
          autoCheckOut: true, // Otomatik çıkış olduğunu belirt
        })
        .then(() => {
          // Kayıtları yeniden yükle
          getWorkRecords(user.uid);
        })
        .catch((error) => {
          // Hata durumunda sessizce devam et
          if (__DEV__) {
            console.error('Otomatik çıkış hatası:', error);
          }
        });
      }
      
      // Bugünün kaydını ara
      const todayRecord = userRecords.find(record => record.date === today);
      
      if (todayRecord) {
        // Bugün giriş yapılmış
        setCheckInTime(new Date(todayRecord.checkInTime));
        
        if (todayRecord.checkOutTime) {
          // Çıkış da yapılmış
          setCheckOutTime(new Date(todayRecord.checkOutTime));
          setCheckInStatus('checked-out');
          setRecordId(todayRecord.id);
        } else {
          // Sadece giriş yapılmış
          setCheckInStatus('checked-in');
          setRecordId(todayRecord.id);
        }
      } else {
        // Bugün henüz giriş yapılmamış
        setCheckInStatus('idle');
        setCheckInTime(null);
        setCheckOutTime(null);
        setRecordId(null);
      }
    }
  }, [records, user]);

  // Konum İzni ve Takibi Başlat
  useEffect(() => {
    let subscription = null;
    let isMounted = true;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;
        
        if (status !== 'granted') {
          setLocationError('Konum izni reddedildi');
          setLocationLoading(false);
          return;
        }

        // Önce hızlıca mevcut konumu al (kullanıcı hemen görsün)
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          
          if (!isMounted) return;
          
          setLocation(currentLocation.coords);
          const inZone = isWithinRadius(
            {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            },
            GEOFENCE_CENTER,
            GEOFENCE_RADIUS
          );
          setIsInZone(inZone);
          setLocationLoading(false);
          setLocationError(null);
        } catch (getLocationError) {
          // İlk konum alınamazsa devam et, watchPositionAsync dener
          if (__DEV__) {
            console.error('İlk konum alınamadı:', getLocationError);
          }
        }

        // Sonra gerçek zamanlı konum takibini başlat
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // 5 saniyede bir güncelle
            distanceInterval: 10, // 10 metre değişimde güncelle
          },
          (loc) => {
            if (!isMounted) return;
            
            try {
              setLocation(loc.coords);
              const inZone = isWithinRadius(
                {
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                },
                GEOFENCE_CENTER,
                GEOFENCE_RADIUS
              );
              setIsInZone(inZone);
              setLocationLoading(false);
              setLocationError(null);
            } catch (err) {
              // Hata durumunda sessizce devam et
              if (isMounted) {
                setLocationLoading(false);
              }
            }
          }
        );
      } catch (error) {
        if (isMounted) {
          setLocationError('Konum alınamadı. Lütfen uygulama ayarlarından konum iznini kontrol edin.');
          setLocationLoading(false);
        }
      }
    };

    startLocationTracking();

    // Cleanup function
    return () => {
      isMounted = false;
      if (subscription) {
        try {
          subscription.remove();
        } catch (err) {
          // Sessizce devam et
        }
      }
    };
  }, []);

  // Konum veya isInZone değiştiğinde haritayı güncelle (sadece marker, otomatik odaklama yok)
  useEffect(() => {
    if (location && mapRef.current) {
      const fillColor = isInZone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      const strokeColor = isInZone ? '#10b981' : '#ef4444';
      
      const script = `
        if (window.map) {
          // Kullanıcı marker'ı güncelle
          var userMarker = window.userMarker;
          if (userMarker) {
            userMarker.setLatLng([${location.latitude}, ${location.longitude}]);
          } else {
            var userIcon = L.icon({
              iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMxMGI5ODEiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            window.userMarker = L.marker([${location.latitude}, ${location.longitude}], { icon: userIcon })
              .addTo(window.map)
              .bindPopup('Bulunduğunuz Yer');
          }
          
          // Geofence circle'ı güncelle
          if (window.geofenceCircle) {
            window.geofenceCircle.setStyle({
              color: '${strokeColor}',
              fillColor: '${fillColor}'
            });
          }
          
          // Sadece kullanıcı haritayı kaydırmıyorsa otomatik odakla
          if (!window.isUserDragging) {
            window.map.setView([${location.latitude}, ${location.longitude}], 15);
          }
        }
      `;
      mapRef.current.injectJavaScript(script);
    }
  }, [location, isInZone]);

  // Konumuma git - haritayı mevcut konuma odakla
  const handleGoToMyLocation = () => {
    if (location && mapRef.current) {
      setIsUserDragging(false); // Otomatik takibi tekrar aktif et
      const script = `
        if (window.map && window.map.setView) {
          window.isUserDragging = false;
          window.map.setView([${location.latitude}, ${location.longitude}], 15);
        }
      `;
      mapRef.current.injectJavaScript(script);
    }
  };

  // Leaflet + OpenStreetMap HTML
  const getMapHTML = () => {
    if (!location) return '';
    
    const centerLat = location.latitude;
    const centerLng = location.longitude;
    const geofenceLat = GEOFENCE_CENTER.latitude;
    const geofenceLng = GEOFENCE_CENTER.longitude;
    const radius = GEOFENCE_RADIUS;
    const fillColor = isInZone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    const strokeColor = isInZone ? '#10b981' : '#ef4444';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([${centerLat}, ${centerLng}], 15);
            window.map = map;
            window.isUserDragging = false; // Kullanıcı haritayı kaydırıyor mu?
            
            // Kullanıcı haritayı kaydırdığında otomatik takibi durdur
            map.on('dragstart', function() {
              window.isUserDragging = true;
            });
            
            // Kullanıcı haritayı bıraktığında (otomatik takip devam etmez, sadece marker güncellenir)
            map.on('dragend', function() {
              // dragend'de false yapmıyoruz, böylece kullanıcı haritayı kaydırdıktan sonra
              // otomatik takip devam etmez. Sadece "Konumuma Git" butonuna basıldığında
              // otomatik takip tekrar aktif olur.
            });
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            // Geofence Circle
            window.geofenceCircle = L.circle([${geofenceLat}, ${geofenceLng}], {
              color: '${strokeColor}',
              fillColor: '${fillColor}',
              fillOpacity: 0.3,
              radius: ${radius}
            }).addTo(map);

            // Merkez Marker
            var centerIcon = L.icon({
              iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmZmQ4MDAiLz48dGV4dCB4PSIyMCIgeT0iMjUiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwZjE3MmEiPk08L3RleHQ+PC9zdmc+',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            });
            L.marker([${geofenceLat}, ${geofenceLng}], { icon: centerIcon })
              .addTo(map)
              .bindPopup('Merkez Noktası');

            // Kullanıcı Marker
            var userIcon = L.icon({
              iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMxMGI5ODEiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            window.userMarker = L.marker([${centerLat}, ${centerLng}], { icon: userIcon })
              .addTo(map)
              .bindPopup('Bulunduğunuz Yer');
          </script>
        </body>
      </html>
    `;
  };

  const handleCheckIn = async () => {
    if (!user?.uid || !userProfile?.displayName) {
      Alert.alert('Hata', 'Profil bilgileri eksik. Lütfen Profile gidin.');
      return;
    }

    if (!isInZone) {
      Alert.alert('Hata', 'Alan dışındasınız. Giriş yapılamaz.');
      return;
    }

    // Bugün zaten giriş yaptı mı kontrol et
    if (checkInStatus !== 'idle') {
      Alert.alert('Hata', 'Bugün zaten giriş yaptınız. Lütfen çıkış yapın.');
      return;
    }

    // Önceki günün eksik kaydını kontrol et
    if (records && user?.uid) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const userRecords = records.filter(record => record.userId === user.uid);
      const yesterdayRecord = userRecords.find(
        record => record.date === yesterdayStr && !record.checkOutTime
      );
      
      if (yesterdayRecord) {
        Alert.alert(
          'Eksik Kayıt Var',
          `Dün (${yesterday.toLocaleDateString('tr-TR')}) giriş yaptınız ancak çıkış yapmadınız. Önce önceki günün kaydını tamamlamanız gerekiyor.`,
          [
            {
              text: 'İptal',
              style: 'cancel',
            },
            {
              text: 'Otomatik Çıkış Yap',
              onPress: async () => {
                try {
                  // Çıkış saati olarak 18:30'u kullan
                  const checkoutTime = new Date(yesterday);
                  checkoutTime.setHours(18, 30, 0, 0); // 18:30
                  
                  await updateRecord(yesterdayRecord.id, {
                    checkOutTime: checkoutTime.toISOString(),
                    checkOutLocation: yesterdayRecord.checkInLocation || null,
                    autoCheckOut: true,
                  });
                  
                  // Kayıtları yeniden yükle ve giriş işlemine devam et
                  await getWorkRecords(user.uid);
                  
                  // Giriş işlemine devam et
                  proceedWithCheckIn();
                } catch (error) {
                  if (__DEV__) {
                    console.error('Otomatik çıkış hatası:', error);
                  }
                  // Production'da sessizce devam et
                }
              },
            },
          ]
        );
        return;
      }
    }

    // Giriş işlemini gerçekleştir
    proceedWithCheckIn();
  };

  const proceedWithCheckIn = async () => {
    // Onay dialog'u
    Alert.alert(
      'Giriş Yapmak İstiyor musunuz?',
      `${new Date().toLocaleTimeString('tr-TR')} saatinde giriş yapılacaktır.`,
      [
        {
          text: 'İptal',
          onPress: () => {
            if (__DEV__) console.log('Giriş iptal edildi');
          },
          style: 'cancel',
        },
        {
          text: 'Evet, Giriş Yap',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const now = new Date();
              const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

              const recordData = {
                userId: user.uid,
                displayName: userProfile.displayName,
                date: dateStr,
                checkInTime: now.toISOString(),
                checkInLocation: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                },
              };

              const result = await addRecord(user.uid, recordData);
              
              // Dokument ID'sini result.payload.id'den al
              const newRecordId = result.payload?.id;
              if (newRecordId) {
                setRecordId(newRecordId);
              }

              setCheckInTime(now);
              setCheckInStatus('checked-in');
              setCelebrationType('check-in');
              setCelebrationVisible(true);
            } catch (error) {
              if (__DEV__) {
                console.error('Giriş hatası:', error);
              }
              Alert.alert('Hata', 'Giriş yapılamadı: ' + (error?.message || 'Bilinmeyen hata'));
            } finally {
              setIsProcessing(false);
            }
          },
          style: 'default',
        },
      ]
    );
  };

  const handleCheckOut = async () => {
    if (!checkInTime) {
      Alert.alert('Hata', 'Giriş kaydı bulunamadı');
      return;
    }

    if (!recordId) {
      Alert.alert('Hata', 'Kayıt ID bulunamadı');
      return;
    }

    // Zaten çıkış yapılmış mı kontrol et
    if (checkOutTime) {
      Alert.alert('Hata', 'Bugün zaten çıkış yaptınız. İşlem tamamlandı.');
      return;
    }

    // Alan içinde olma kontrolü - Çıkış yapmak için alan içinde olmalı
    if (!isInZone) {
      Alert.alert(
        'Uyarı',
        'Çıkış yapmak için alan içinde olmalısınız. Lütfen belirlenen alana girin.'
      );
      return;
    }

    // Onay dialog'u
    Alert.alert(
      'Çıkış Yapmak İstiyor musunuz?',
      `${new Date().toLocaleTimeString('tr-TR')} saatinde çıkış yapılacaktır.`,
      [
        {
          text: 'İptal',
          onPress: () => {
            if (__DEV__) console.log('Çıkış iptal edildi');
          },
          style: 'cancel',
        },
        {
          text: 'Evet, Çıkış Yap',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const now = new Date();
              
              // Firebase'e çıkış zamanını güncelle
              await updateRecord(recordId, {
                checkOutTime: now.toISOString(),
                checkOutLocation: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                },
              });

              setCheckOutTime(now);
              setCheckInStatus('checked-out');
              setCelebrationType('check-out');
              setCelebrationVisible(true);
            } catch (error) {
              if (__DEV__) {
                console.error('Çıkış hatası:', error);
              }
              Alert.alert('Hata', 'Çıkış yapılamadı: ' + (error?.message || 'Bilinmeyen hata'));
            } finally {
              setIsProcessing(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (locationLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ffd800" />
        <Text style={styles.loadingText}>Konum Alınıyor...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="location-off" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Konum Hatası</Text>
        <Text style={styles.errorMessage}>{locationError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={startLocationTracking}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/paxLogoHv4.png')}
          style={styles.logo}
          resizeMode="contain"
        />

      </View>

      {/* Harita - OpenStreetMap with Leaflet */}
      {location && (
        <View style={styles.mapContainer}>
          <WebView
            ref={mapRef}
            source={{ html: getMapHTML() }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
          {/* Konumuma Git Butonu */}
          <TouchableOpacity
            style={styles.goToLocationButton}
            onPress={handleGoToMyLocation}
          >
            <MaterialIcons name="my-location" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>
      )}

      {/* Kullanıcı Kartı */}
      <View style={styles.userCard}>
        <MaterialIcons name="account-circle" size={50} color="#ffd800" />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userProfile?.displayName || 'Yükleniyor...'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Konum Durumu */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <MaterialIcons
            name="location-on"
            size={20}
            color={isInZone ? '#10b981' : '#ef4444'}
          />
          <Text
            style={[
              styles.statusText,
              { color: isInZone ? '#10b981' : '#ef4444' },
            ]}
          >
            {isInZone ? 'Alan İçinde' : 'Alan Dışında'}
          </Text>
        </View>
        {location && (
          <Text style={styles.coordinatesText}>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Giriş/Çıkış Zamanları */}
      {(checkInStatus === 'checked-in' || checkInStatus === 'checked-out') && (
        <>
          {checkInTime && (
            <View style={styles.timeCard}>
              <MaterialIcons name="login" size={20} color="#10b981" />
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>Giriş Saati</Text>
                <Text style={styles.timeValue}>
                  {checkInTime.toLocaleTimeString('tr-TR')}
                </Text>
              </View>
            </View>
          )}

          {checkOutTime && (
            <View style={styles.timeCard}>
              <MaterialIcons name="logout" size={20} color="#ef4444" />
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>Çıkış Saati</Text>
                <Text style={styles.timeValue}>
                  {checkOutTime.toLocaleTimeString('tr-TR')}
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* Aksiyon Butonu */}
      <View style={styles.actionContainer}>
        {!isInZone && checkInStatus === 'idle' && (
          <Text style={styles.disabledMessage}>
            Giriş yapmak için alan içinde olmalısınız
          </Text>
        )}

        {isInZone && checkInStatus === 'idle' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.checkInButton]}
            onPress={handleCheckIn}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Giriş Yap</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {checkInStatus === 'checked-in' && (
          <>
            {!isInZone && (
              <Text style={styles.disabledMessage}>
                Çıkış yapmak için alan içinde olmalısınız
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.checkOutButton,
                !isInZone && styles.actionButtonDisabled,
              ]}
              onPress={handleCheckOut}
              disabled={isProcessing || !isInZone}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="logout" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Çıkış Yap</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {checkInStatus === 'checked-out' && (
          <View style={styles.completedMessage}>
            <MaterialIcons name="check-circle" size={24} color="#ffd800" />
            <Text style={styles.completedText}>Bugünkü mesai tamamlandı</Text>
          </View>
        )}
      </View>

      {/* Celebration Modal */}
      <CelebrationModal
        visible={celebrationVisible}
        type={celebrationType}
        userName={userProfile?.displayName || ''}
        onClose={() => setCelebrationVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  goToLocationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#ffd800',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffd800',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 4,
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  userEmail: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  timeCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 4,
  },
  actionContainer: {
    marginHorizontal: 16,
    marginVertical: 24,
  },
  actionButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkInButton: {
    backgroundColor: '#10b981',
  },
  checkOutButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  disabledMessage: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  completedMessage: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffd800',
  },
  completedText: {
    color: '#ffd800',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#cbd5e1',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  markerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    width: 40,
    height: 40,
  },
  userMarkerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
