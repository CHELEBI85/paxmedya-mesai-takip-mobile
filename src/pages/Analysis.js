import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';

export default function Analysis() {
  const { user } = useAuth();
  const { records, loading, getWorkRecords } = useDatabase();
  const [refreshing, setRefreshing] = useState(false);
  const [userRecords, setUserRecords] = useState([]);

  // Verileri yükle
  useEffect(() => {
    if (user?.uid) {
      getWorkRecords(user.uid);
    }
  }, [user]);

  // Kullanıcının kendi kayıtlarını filtrele
  useEffect(() => {
    if (records && user?.uid) {
      const filtered = records.filter(record => record.userId === user.uid);
      // Tarihe göre sırala (en yeni önce)
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.checkInTime);
        const dateB = new Date(b.checkInTime);
        return dateB - dateA;
      });
      setUserRecords(sorted);
    }
  }, [records, user]);

  // Yenileme işlevi
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (user?.uid) {
        await getWorkRecords(user.uid);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Saati biçimlendir
  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Tarihi biçimlendir
  const formatDate = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Mesai süresini hesapla
  const calculateWorkDuration = (checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return null;

    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    const durationMs = checkOut - checkIn;
    const durationHours = durationMs / (1000 * 60 * 60);

    return durationHours.toFixed(2);
  };

  if (loading && userRecords.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ffd800" />
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#ffd800"
          title="Yenileniyor..."
          titleColor="#ffd800"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesai Analizi</Text>
        <Text style={styles.headerSubtitle}>Günlük mesai kayıtlarınız</Text>
      </View>

      {/* İstatistikler */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialIcons name="calendar-today" size={24} color="#ffd800" />
          <Text style={styles.statNumber}>{userRecords.length}</Text>
          <Text style={styles.statLabel}>Giriş Kaydı</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialIcons name="access-time" size={24} color="#10b981" />
          <Text style={styles.statNumber}>
            {userRecords.reduce((acc, record) => {
              const duration = calculateWorkDuration(
                record.checkInTime,
                record.checkOutTime
              );
              return acc + (duration ? parseFloat(duration) : 0);
            }, 0).toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Toplam Saat</Text>
        </View>
      </View>

      {/* Kayıtlar Listesi */}
      <View style={styles.recordsContainer}>
        <Text style={styles.sectionTitle}>Kayıtlarım</Text>

        {userRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-note" size={48} color="#ddd" />
            <Text style={styles.emptyStateText}>Henüz mesai kaydı yok</Text>
          </View>
        ) : (
          userRecords.map((record, index) => (
            <View key={index} style={styles.recordCard}>
              {/* Tarih */}
              <Text style={styles.recordDate}>
                {formatDate(record.checkInTime)}
              </Text>

              {/* Giriş Saati */}
              <View style={styles.recordRow}>
                <View style={styles.timeItem}>
                  <MaterialIcons name="login" size={20} color="#10b981" />
                  <View style={styles.timeContent}>
                    <Text style={styles.timeLabel}>Giriş</Text>
                    <Text style={styles.timeValue}>
                      {formatTime(record.checkInTime)}
                    </Text>
                  </View>
                </View>

                {/* Çıkış Saati */}
                {record.checkOutTime ? (
                  <View style={styles.timeItem}>
                    <MaterialIcons name="logout" size={20} color="#ef4444" />
                    <View style={styles.timeContent}>
                      <Text style={styles.timeLabel}>Çıkış</Text>
                      <Text style={styles.timeValue}>
                        {formatTime(record.checkOutTime)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.timeItem}>
                    <MaterialIcons name="pending" size={20} color="#f59e0b" />
                    <View style={styles.timeContent}>
                      <Text style={styles.timeLabel}>Çıkış</Text>
                      <Text style={styles.timeValue}>Bekleniyor...</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Mesai Süresi */}
              {record.checkOutTime && (
                <View style={styles.durationContainer}>
                  <MaterialIcons name="schedule" size={16} color="#6366f1" />
                  <Text style={styles.durationText}>
                    Mesai: {calculateWorkDuration(record.checkInTime, record.checkOutTime)} saat
                  </Text>
                </View>
              )}

              {/* Konum */}
              {record.checkInLocation && (
                <View style={styles.locationContainer}>
                  <MaterialIcons name="location-on" size={16} color="#9ca3af" />
                  <Text style={styles.locationText}>
                    {record.checkInLocation.latitude.toFixed(4)}, {record.checkInLocation.longitude.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          ))
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#cbd5e1',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffd800',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd800',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  recordsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  recordCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffd800',
    marginBottom: 12,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginRight: 8,
  },
  timeContent: {
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
    marginTop: 2,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffd800',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
  },
});
