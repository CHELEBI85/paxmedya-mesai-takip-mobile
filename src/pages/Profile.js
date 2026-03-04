import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import ConfirmModal from '../components/ConfirmModal';

export default function Profile() {
  const navigation = useNavigation();
  const { user, logout, loading: authLoading } = useAuth();
  const {
    userProfile,
    loading: dbLoading,
    error,
    getProfile,
    updateProfile,
    records,
    getWorkRecords,
  } = useDatabase();

  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({ displayName: '', phone: '' });

  const MODAL_DEF = { visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Tamam', cancelText: 'İptal', destructive: false, hideCancel: false, onConfirm: null };
  const [modal, setModal] = useState(MODAL_DEF);
  const hideModal = useCallback(() => setModal((m) => ({ ...m, visible: false })), []);
  const showModal = useCallback((cfg) => setModal({ visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Tamam', cancelText: 'İptal', destructive: false, hideCancel: false, onConfirm: null, ...{ visible: true }, ...cfg }), []);
  const showInfo = useCallback((title, message, icon = 'info', iconColor = '#ef4444') =>
    showModal({ title, message, icon, iconColor, confirmText: 'Tamam', hideCancel: true }), [showModal]);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        phone: userProfile.phone || '',
      });
    }
  }, [userProfile]);

  const userRecords = useMemo(() => {
    if (!records || !user?.uid) return [];
    return records
      .filter((r) => r.userId === user.uid)
      .sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));
  }, [records, user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.uid) {
        await getProfile(user.uid);
        await getWorkRecords(user.uid);
      }
    } catch (err) {
      if (__DEV__) console.error('Yenileme hatası:', err);
    } finally {
      setRefreshing(false);
    }
  }, [user, getProfile, getWorkRecords]);

  const handleLogout = useCallback(() => {
    showModal({
      icon: 'logout',
      iconColor: '#ef4444',
      title: 'Çıkış Yap',
      message: 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      confirmText: 'Çıkış Yap',
      cancelText: 'İptal',
      destructive: true,
      onConfirm: () => { hideModal(); logout(); },
    });
  }, [showModal, hideModal, logout]);

  const handleSave = useCallback(async () => {
    if (!user?.uid) { showInfo('Hata', 'Kullanıcı bilgisi bulunamadı.'); return; }
    if (!formData.displayName.trim()) { showInfo('Hata', 'Ad Soyad boş olamaz.'); return; }
    try {
      await updateProfile(user.uid, formData);
      await new Promise((r) => setTimeout(r, 500));
      await getProfile(user.uid);
      showInfo('Başarılı', 'Profil bilgileri güncellendi.', 'check-circle', '#10b981');
      setIsEditing(false);
    } catch (err) {
      showInfo('Hata', 'Profil güncellenirken bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    }
  }, [user, formData, updateProfile, getProfile, showInfo]);

  const formatTime = useCallback((timeString) =>
    new Date(timeString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), []);

  const formatDate = useCallback((timeString) =>
    new Date(timeString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }), []);

  const calcDuration = useCallback((checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const ms = new Date(checkOut) - new Date(checkIn);
    return (ms / (1000 * 60 * 60)).toFixed(2);
  }, []);

  const totalHours = useMemo(() =>
    userRecords
      .reduce((acc, r) => acc + (parseFloat(calcDuration(r.checkInTime, r.checkOutTime)) || 0), 0)
      .toFixed(1),
    [userRecords, calcDuration]
  );

  if (dbLoading && !userProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ffd800" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" title="Yenileniyor..." titleColor="#ffd800" />
      }
    >
      <View style={styles.headerCard}>
        <MaterialIcons name="account-circle" size={72} color="#ffd800" />
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ad Soyad *</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor="#64748b"
              value={formData.displayName}
              onChangeText={(t) => setFormData({ ...formData, displayName: t })}
            />
          ) : (
            <Text style={styles.value}>{formData.displayName || '-'}</Text>
          )}
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Telefon</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              placeholder="Telefon Numarası"
              placeholderTextColor="#64748b"
              value={formData.phone}
              onChangeText={(t) => setFormData({ ...formData, phone: t })}
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.value}>{formData.phone || '-'}</Text>
          )}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <TouchableOpacity
        style={styles.bildirimlerLink}
        onPress={() => navigation.navigate('Bildirimler')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="notifications" size={22} color="#ffd800" />
        <Text style={styles.bildirimlerLinkTxt}>Bildirimler</Text>
        <MaterialIcons name="chevron-right" size={24} color="#64748b" />
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        {isEditing ? (
          <>
            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave} disabled={dbLoading}>
              {dbLoading ? <ActivityIndicator color="#fff" /> : (
                <><MaterialIcons name="check" size={18} color="#fff" /><Text style={styles.btnText}>Kaydet</Text></>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setIsEditing(false)}>
              <MaterialIcons name="close" size={18} color="#ffd800" />
              <Text style={[styles.btnText, { color: '#ffd800' }]}>İptal</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.editBtn]} onPress={() => setIsEditing(true)}>
            <MaterialIcons name="edit" size={18} color="#0f172a" />
            <Text style={[styles.btnText, { color: '#0f172a' }]}>Düzenle</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.logoutWrap}>
        <TouchableOpacity style={[styles.logoutBtn, authLoading && { opacity: 0.6 }]} onPress={handleLogout} disabled={authLoading}>
          {authLoading ? <ActivityIndicator color="#fff" /> : (
            <><MaterialIcons name="logout" size={18} color="#fff" /><Text style={styles.logoutText}>Çıkış Yap</Text></>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <MaterialIcons name="calendar-today" size={22} color="#ffd800" />
          <Text style={styles.statNum}>{userRecords.length}</Text>
          <Text style={styles.statLabel}>Giriş Kaydı</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="access-time" size={22} color="#10b981" />
          <Text style={styles.statNum}>{totalHours}</Text>
          <Text style={styles.statLabel}>Toplam Saat</Text>
        </View>
      </View>

      <View style={styles.recordsWrap}>
        <Text style={styles.sectionTitle}>Mesai Kayıtlarım</Text>
        {userRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-note" size={44} color="#334155" />
            <Text style={styles.emptyText}>Henüz mesai kaydı yok</Text>
          </View>
        ) : (
          userRecords.map((record, index) => (
            <View key={record.id || index} style={styles.recordCard}>
              <Text style={styles.recordDate}>{formatDate(record.checkInTime)}</Text>
              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <MaterialIcons name="login" size={18} color="#10b981" />
                  <View>
                    <Text style={styles.timeLabel}>Giriş</Text>
                    <Text style={styles.timeValue}>{formatTime(record.checkInTime)}</Text>
                  </View>
                </View>
                {record.checkOutTime ? (
                  <View style={styles.timeItem}>
                    <MaterialIcons name="logout" size={18} color="#ef4444" />
                    <View>
                      <Text style={styles.timeLabel}>Çıkış</Text>
                      <Text style={styles.timeValue}>{formatTime(record.checkOutTime)}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.timeItem}>
                    <MaterialIcons name="pending" size={18} color="#f59e0b" />
                    <View>
                      <Text style={styles.timeLabel}>Çıkış</Text>
                      <Text style={[styles.timeValue, { color: '#f59e0b' }]}>Bekleniyor</Text>
                    </View>
                  </View>
                )}
              </View>
              {record.checkOutTime && (
                <View style={styles.durationBadge}>
                  <MaterialIcons name="schedule" size={14} color="#6366f1" />
                  <Text style={styles.durationText}>Mesai: {calcDuration(record.checkInTime, record.checkOutTime)} saat</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      <ConfirmModal
        visible={modal.visible} icon={modal.icon} iconColor={modal.iconColor}
        title={modal.title} message={modal.message} confirmText={modal.confirmText}
        cancelText={modal.cancelText} destructive={modal.destructive}
        hideCancel={modal.hideCancel} onConfirm={modal.onConfirm} onCancel={hideModal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  headerCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 16, gap: 10 },
  email: { fontSize: 15, color: '#94a3b8', fontWeight: '500' },
  section: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#f8fafc', marginBottom: 14 },
  formGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '600', color: '#cbd5e1', marginBottom: 5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: '#334155', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#0f172a', color: '#f8fafc',
  },
  value: {
    fontSize: 14, color: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a',
  },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 6 },
  bildirimlerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  bildirimlerLinkTxt: { fontSize: 16, fontWeight: '600', color: '#f8fafc', flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 12, gap: 6 },
  editBtn: { backgroundColor: '#ffd800' },
  saveBtn: { backgroundColor: '#10b981' },
  cancelBtn: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#ffd800' },
  btnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  logoutWrap: { marginBottom: 20 },
  logoutBtn: {
    backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, paddingVertical: 13, gap: 8,
  },
  logoutText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#1e293b', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#ffd800' },
  statLabel: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  recordsWrap: { paddingBottom: 32 },
  recordCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10 },
  recordDate: { fontSize: 13, fontWeight: '600', color: '#ffd800', marginBottom: 10 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  timeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  timeLabel: { fontSize: 11, color: '#94a3b8' },
  timeValue: { fontSize: 15, fontWeight: '600', color: '#f8fafc', marginTop: 2 },
  durationBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155',
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, gap: 6,
  },
  durationText: { fontSize: 12, fontWeight: '500', color: '#ffd800' },
  emptyState: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyText: { fontSize: 15, color: '#475569' },
});
