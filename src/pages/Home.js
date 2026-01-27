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
import MapView, { Marker, Circle } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
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
  const [checkInStatus, setCheckInStatus] = useState('idle'); // idle, checked-in, checked-out
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordId, setRecordId] = useState(null); // Dokument ID'sini sakla

  // Profil bilgisini yükle
  useEffect(() => {
    if (user?.uid) {
      getProfile(user.uid);
      getWorkRecords(user.uid); // Bugünün kaydını getir
    }
  }, [user]);

  // Bugünün kaydını kontrol et ve önceki günün eksik kaydını kontrol et
  useEffect(() => {
    if (user?.uid && records) {
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
        // Çıkış saati olarak 18:30'u kullan
        const checkoutTime = new Date(yesterday);
        checkoutTime.setHours(18, 30, 0, 0); // 18:30
        
        Alert.alert(
          'Eksik Kayıt Tespit Edildi',
          `Dün (${yesterday.toLocaleDateString('tr-TR')}) giriş yaptınız ancak çıkış yapmadınız. Otomatik olarak 18:30'da çıkış yapılacak.`,
          [
            {
              text: 'Tamam',
              onPress: async () => {
                try {
                  await updateRecord(yesterdayRecord.id, {
                    checkOutTime: checkoutTime.toISOString(),
                    checkOutLocation: yesterdayRecord.checkInLocation || null,
                    autoCheckOut: true, // Otomatik çıkış olduğunu belirt
                  });
                  // Kayıtları yeniden yükle
                  getWorkRecords(user.uid);
                } catch (error) {
                  console.error('Otomatik çıkış hatası:', error);
                  Alert.alert('Hata', 'Otomatik çıkış yapılamadı: ' + error.message);
                }
              },
            },
          ]
        );
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
    startLocationTracking();
  }, []);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Konum izni reddedildi');
        setLocationLoading(false);
        return;
      }

      // Gerçek zamanlı konum takibi
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 saniyede bir güncelle
          distanceInterval: 10, // 10 metre değişimde güncelle
        },
        (loc) => {
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
        }
      );

      return () => {
        subscription.remove();
      };
    } catch (error) {
      console.error('Konum hatası:', error);
      setLocationError('Konum alınamadı: ' + error.message);
      setLocationLoading(false);
    }
  };

  // Konumuma git - haritayı mevcut konuma odakla
  const handleGoToMyLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000 // 1 saniye animasyon
      );
    }
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
                  console.error('Otomatik çıkış hatası:', error);
                  Alert.alert('Hata', 'Otomatik çıkış yapılamadı: ' + error.message);
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
          onPress: () => console.log('Giriş iptal edildi'),
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
              Alert.alert('Başarılı', `Giriş yapıldı - ${now.toLocaleTimeString('tr-TR')}`);
            } catch (error) {
              console.error('Giriş hatası:', error);
              Alert.alert('Hata', 'Giriş yapılamadı: ' + error.message);
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
          onPress: () => console.log('Çıkış iptal edildi'),
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
              Alert.alert('Başarılı', `Çıkış yapıldı - ${now.toLocaleTimeString('tr-TR')}`);
            } catch (error) {
              console.error('Çıkış hatası:', error);
              Alert.alert('Hata', 'Çıkış yapılamadı: ' + error.message);
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

      {/* Harita */}
      {location && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            region={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {/* Geofence Dairesi */}
            <Circle
              center={{
                latitude: GEOFENCE_CENTER.latitude,
                longitude: GEOFENCE_CENTER.longitude,
              }}
              radius={GEOFENCE_RADIUS}
              fillColor={isInZone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
              strokeColor={isInZone ? '#10b981' : '#ef4444'}
              strokeWidth={3}
            />

            {/* Merkez Marker */}
            <Marker
              coordinate={{
                latitude: GEOFENCE_CENTER.latitude,
                longitude: GEOFENCE_CENTER.longitude,
              }}
              title="Merkez Noktası"
              image={require('../../assets/paxLogoHv4.png')}
            />

            {/* Kullanıcı Marker */}
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="Bulunduğunuz Yer"
              pinColor="#10b981"
            />
          </MapView>

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
});
