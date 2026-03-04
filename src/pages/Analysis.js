import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';

const RecordCard = React.memo(function RecordCard({ record, formatTime, formatDate, calculateWorkDuration }) {
  return (
    <View style={styles.recordCard}>
      <Text style={styles.recordDate}>{formatDate(record.checkInTime)}</Text>
      <View style={styles.recordRow}>
        <View style={styles.timeItem}>
          <MaterialIcons name="login" size={20} color="#10b981" />
          <View style={styles.timeContent}>
            <Text style={styles.timeLabel}>Giriş</Text>
            <Text style={styles.timeValue}>{formatTime(record.checkInTime)}</Text>
          </View>
        </View>
        {record.checkOutTime ? (
          <View style={styles.timeItem}>
            <MaterialIcons name="logout" size={20} color="#ef4444" />
            <View style={styles.timeContent}>
              <Text style={styles.timeLabel}>Çıkış</Text>
              <Text style={styles.timeValue}>{formatTime(record.checkOutTime)}</Text>
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
      {record.checkOutTime && (
        <View style={styles.durationContainer}>
          <MaterialIcons name="schedule" size={16} color="#6366f1" />
          <Text style={styles.durationText}>
            Mesai: {calculateWorkDuration(record.checkInTime, record.checkOutTime)} saat
          </Text>
        </View>
      )}
      {record.checkInLocation && (
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#9ca3af" />
          <Text style={styles.locationText}>
            {record.checkInLocation.latitude.toFixed(4)}, {record.checkInLocation.longitude.toFixed(4)}
          </Text>
        </View>
      )}
    </View>
  );
});

export default function Analysis() {
  const { user } = useAuth();
  const { records, loading, getWorkRecords } = useDatabase();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.uid) getWorkRecords(user.uid);
  }, [user]);

  const userRecords = useMemo(() => {
    if (!records || !user?.uid) return [];
    return records
      .filter((r) => r.userId === user.uid)
      .sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));
  }, [records, user]);

  const totalHours = useMemo(() => {
    return userRecords.reduce((acc, r) => {
      const dur = calculateWorkDuration(r.checkInTime, r.checkOutTime);
      return acc + (dur ? parseFloat(dur) : 0);
    }, 0).toFixed(1);
  }, [userRecords]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.uid) await getWorkRecords(user.uid);
    } finally {
      setRefreshing(false);
    }
  }, [user, getWorkRecords]);

  const formatTime = useCallback((timeString) => {
    return new Date(timeString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatDate = useCallback((timeString) => {
    return new Date(timeString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  const renderItem = useCallback(({ item }) => (
    <RecordCard
      record={item}
      formatTime={formatTime}
      formatDate={formatDate}
      calculateWorkDuration={calculateWorkDuration}
    />
  ), [formatTime, formatDate]);

  const keyExtractor = useCallback((item, index) => item.id || index.toString(), []);

  if (loading && userRecords.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ffd800" />
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
      </View>
    );
  }

  const ListHeader = (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesai Analizi</Text>
        <Text style={styles.headerSubtitle}>Günlük mesai kayıtlarınız</Text>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialIcons name="calendar-today" size={24} color="#ffd800" />
          <Text style={styles.statNumber}>{userRecords.length}</Text>
          <Text style={styles.statLabel}>Giriş Kaydı</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="access-time" size={24} color="#10b981" />
          <Text style={styles.statNumber}>{totalHours}</Text>
          <Text style={styles.statLabel}>Toplam Saat</Text>
        </View>
      </View>
      <View style={styles.recordsContainer}>
        <Text style={styles.sectionTitle}>Kayıtlarım</Text>
      </View>
    </>
  );

  const ListEmpty = (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-note" size={48} color="#334155" />
      <Text style={styles.emptyStateText}>Henüz mesai kaydı yok</Text>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={userRecords}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" title="Yenileniyor..." titleColor="#ffd800" />
      }
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

function calculateWorkDuration(checkInTime, checkOutTime) {
  if (!checkInTime || !checkOutTime) return null;
  const ms = new Date(checkOutTime) - new Date(checkInTime);
  return (ms / (1000 * 60 * 60)).toFixed(2);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#cbd5e1' },
  header: { backgroundColor: '#1e293b', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffd800' },
  headerSubtitle: { fontSize: 14, color: '#cbd5e1', marginTop: 4 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#1e293b', paddingVertical: 16, paddingHorizontal: 12,
    borderRadius: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#ffd800', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
  recordsContainer: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12 },
  recordCard: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  recordDate: { fontSize: 14, fontWeight: '600', color: '#ffd800', marginBottom: 12 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  timeItem: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginRight: 8 },
  timeContent: { flex: 1 },
  timeLabel: { fontSize: 12, color: '#94a3b8' },
  timeValue: { fontSize: 16, fontWeight: '600', color: '#f8fafc', marginTop: 2 },
  durationContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, gap: 8,
  },
  durationText: { fontSize: 13, fontWeight: '500', color: '#ffd800' },
  locationContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 8,
  },
  locationText: { fontSize: 12, color: '#94a3b8' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 16, color: '#94a3b8', marginTop: 12 },
});
