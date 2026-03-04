import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { useEnvanter } from '../hooks/useEnvanter';
import { useSelector } from 'react-redux';
import CelebrationModal from '../components/CelebrationModal';
import ConfirmModal from '../components/ConfirmModal';
import QuickScanModal from '../components/QuickScanModal';
import * as Location from 'expo-location';
import { GEOFENCE_CONFIG } from '../config/appConfig';
import notificationService from '../services/notificationService';

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

const fmtSaat = (date) =>
  date ? new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

const MODAL_DEF = {
  visible: false, icon: null, iconColor: '#ffd800',
  title: '', message: '', confirmText: 'Tamam',
  cancelText: 'İptal', destructive: false, hideCancel: false, onConfirm: null,
};

export default function Home() {
  const { user } = useAuth();
  const userProfile = useSelector((st) => st.database.userProfile);
  const { userProfile: dbProfile, loading: dbLoading, getProfile, addRecord, updateRecord, records, getWorkRecords } = useDatabase();
  const { items, handleTeslimAl, handleTeslimEt } = useEnvanter();

  const [location, setLocation] = useState(null);
  const [isInZone, setIsInZone] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationRefreshing, setLocationRefreshing] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState('idle');
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [isProcessing, setIsProcessing] = useState(null); // null | 'normal' | 'dis' | 'out'
  const [recordId, setRecordId] = useState(null);
  const [hasShownAutoCheckoutAlert, setHasShownAutoCheckoutAlert] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationType, setCelebrationType] = useState('check-in');
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(MODAL_DEF);
  const [quickScan, setQuickScan] = useState(false);
  const [isDisMesai, setIsDisMesai] = useState(false);

  const hideModal = useCallback(() => setModal((m) => ({ ...m, visible: false })), []);
  const showModal = useCallback((cfg) => setModal({ ...MODAL_DEF, visible: true, onConfirm: () => setModal((m) => ({ ...m, visible: false })), ...cfg }), []);
  const showInfo = useCallback((title, message, icon = 'info', iconColor = '#ef4444') =>
    showModal({ title, message, icon, iconColor, confirmText: 'Tamam', hideCancel: true }), [showModal]);

  const displayName = useMemo(
    () => userProfile?.displayName || dbProfile?.displayName || user?.email || '',
    [userProfile, dbProfile, user]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.uid) await Promise.all([getProfile(user.uid), getWorkRecords(user.uid)]);
    } finally {
      setRefreshing(false);
    }
  }, [user, getProfile, getWorkRecords]);

  const handleRefreshLocation = useCallback(async () => {
    setLocationRefreshing(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      setIsInZone(calcDistance(loc.coords, GEOFENCE_CONFIG.center) <= GEOFENCE_CONFIG.radius);
      setLocationError(null);
    } catch (_) {}
    finally { setLocationRefreshing(false); }
  }, []);

  useEffect(() => {
    if (user?.uid && records && !hasShownAutoCheckoutAlert) {
      const today = new Date().toISOString().split('T')[0];
      const userRecords = records.filter(r => r.userId === user.uid);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayRecord = userRecords.find(r => r.date === yesterdayStr && !r.checkOutTime);

      if (yesterdayRecord) {
        setHasShownAutoCheckoutAlert(true);
        const co = new Date(yesterday);
        co.setHours(18, 30, 0, 0);
        updateRecord(yesterdayRecord.id, {
          checkOutTime: co.toISOString(),
          checkOutLocation: yesterdayRecord.checkInLocation || null,
          autoCheckOut: true,
        }).then(() => getWorkRecords(user.uid)).catch(() => {});
      }

      const todayRecord = userRecords.find(r => r.date === today);
      if (todayRecord) {
        setCheckInTime(new Date(todayRecord.checkInTime));
        setIsDisMesai(!!todayRecord.disMesai);
        if (todayRecord.checkOutTime) {
          setCheckOutTime(new Date(todayRecord.checkOutTime));
          setCheckInStatus('checked-out');
        } else {
          setCheckInStatus('checked-in');
        }
        setRecordId(todayRecord.id);
      } else {
        setCheckInStatus('idle');
        setCheckInTime(null);
        setCheckOutTime(null);
        setRecordId(null);
        setIsDisMesai(false);
      }
    }
  }, [records, user]);

  useEffect(() => {
    let sub = null;
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted || status !== 'granted') {
          setLocationError('Konum izni reddedildi');
          setLocationLoading(false);
          return;
        }
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          if (!mounted) return;
          setLocation(loc.coords);
          setIsInZone(calcDistance(loc.coords, GEOFENCE_CONFIG.center) <= GEOFENCE_CONFIG.radius);
          setLocationLoading(false);
        } catch (_) {}

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (loc) => {
            if (!mounted) return;
            setLocation(loc.coords);
            setIsInZone(calcDistance(loc.coords, GEOFENCE_CONFIG.center) <= GEOFENCE_CONFIG.radius);
            setLocationLoading(false);
          }
        );
      } catch (_) {
        if (mounted) { setLocationError('Konum alınamadı'); setLocationLoading(false); }
      }
    })();
    return () => { mounted = false; if (sub) try { sub.remove(); } catch (_) {} };
  }, []);

  const proceedWithCheckIn = useCallback(() => {
    showModal({
      icon: 'login', iconColor: '#10b981', title: 'Giriş Onayı',
      message: `${new Date().toLocaleTimeString('tr-TR')} saatinde giriş yapılacak.`,
      confirmText: 'Giriş Yap', cancelText: 'İptal',
      onConfirm: async () => {
        hideModal();
        setIsProcessing('normal');
        try {
          const now = new Date();
          const result = await addRecord(user.uid, {
            userId: user.uid, displayName,
            date: now.toISOString().split('T')[0],
            checkInTime: now.toISOString(),
            checkInLocation: { latitude: location.latitude, longitude: location.longitude },
          });
          if (result.payload?.id) setRecordId(result.payload.id);
          setCheckInTime(now);
          setCheckInStatus('checked-in');
          setCelebrationType('check-in');
          setCelebrationVisible(true);
          notificationService.scheduleWorkReminders().catch(() => {});
        } catch (err) {
          showInfo('Hata', 'Giriş yapılamadı: ' + (err?.message || 'Bilinmeyen hata'));
        } finally { setIsProcessing(null); }
      },
    });
  }, [showModal, hideModal, addRecord, user, displayName, location, showInfo]);

  const handleDisMesaiCheckIn = useCallback(() => {
    if (!displayName) { showInfo('Hata', 'Profil bilgileri eksik.'); return; }
    if (checkInStatus !== 'idle') { showInfo('Hata', 'Bugün zaten giriş yaptınız.'); return; }

    showModal({
      icon: 'work-outline', iconColor: '#8b5cf6', title: 'Saha Görevi Girişi',
      message: `${new Date().toLocaleTimeString('tr-TR')} saatinde saha görevi girişi yapılacak.\n\nSaha görevi kaydı ofis dışı çalışma olarak işaretlenecektir.`,
      confirmText: 'Saha Görevi Giriş Yap', cancelText: 'İptal',
      onConfirm: async () => {
        hideModal();
        setIsProcessing('dis');
        try {
          const now = new Date();
          const recordData = {
            userId: user.uid, displayName,
            date: now.toISOString().split('T')[0],
            checkInTime: now.toISOString(),
            disMesai: true,
          };
          if (location) {
            recordData.checkInLocation = { latitude: location.latitude, longitude: location.longitude };
          }
          const result = await addRecord(user.uid, recordData);
          if (result.payload?.id) setRecordId(result.payload.id);
          setCheckInTime(now);
          setCheckInStatus('checked-in');
          setIsDisMesai(true);
          setCelebrationType('check-in');
          setCelebrationVisible(true);
          notificationService.scheduleWorkReminders().catch(() => {});
        } catch (err) {
          showInfo('Hata', 'Giriş yapılamadı: ' + (err?.message || 'Bilinmeyen hata'));
        } finally { setIsProcessing(null); }
      },
    });
  }, [displayName, checkInStatus, showModal, hideModal, addRecord, user, location, showInfo]);

  const handleCheckIn = useCallback(async () => {
    if (!displayName) { showInfo('Hata', 'Profil bilgileri eksik.'); return; }
    if (!isInZone) { showInfo('Hata', 'Alan dışındasınız. Giriş yapılamaz.'); return; }
    if (checkInStatus !== 'idle') { showInfo('Hata', 'Bugün zaten giriş yaptınız.'); return; }

    if (records && user?.uid) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const userRecords = records.filter(r => r.userId === user.uid);
      const yesterdayRecord = userRecords.find(r => r.date === yesterdayStr && !r.checkOutTime);

      if (yesterdayRecord) {
        showModal({
          icon: 'warning', iconColor: '#f59e0b', title: 'Eksik Kayıt Var',
          message: `Dün (${yesterday.toLocaleDateString('tr-TR')}) çıkış yapılmamış. Otomatik çıkış yapılsın mı?`,
          confirmText: 'Otomatik Çıkış Yap', cancelText: 'İptal',
          onConfirm: async () => {
            hideModal();
            const co = new Date(yesterday); co.setHours(18, 30, 0, 0);
            await updateRecord(yesterdayRecord.id, { checkOutTime: co.toISOString(), autoCheckOut: true });
            await getWorkRecords(user.uid);
            proceedWithCheckIn();
          },
        });
        return;
      }
    }
    proceedWithCheckIn();
  }, [displayName, isInZone, checkInStatus, records, user, showInfo, showModal, hideModal, updateRecord, getWorkRecords, proceedWithCheckIn]);

  const handleCheckOut = useCallback(async () => {
    if (!checkInTime || !recordId) { showInfo('Hata', 'Giriş kaydı bulunamadı.'); return; }
    if (checkOutTime) { showInfo('Hata', 'Bugün zaten çıkış yaptınız.'); return; }
    if (!isDisMesai && !isInZone) { showInfo('Uyarı', 'Çıkış için alan içinde olmalısınız.', 'warning', '#f59e0b'); return; }

    const title = isDisMesai ? 'Saha Görevi Çıkışı' : 'Çıkış Onayı';
    showModal({
      icon: 'logout', iconColor: '#ef4444', title,
      message: `${new Date().toLocaleTimeString('tr-TR')} saatinde ${isDisMesai ? 'saha görevi ' : ''}çıkış yapılacak.`,
      confirmText: 'Çıkış Yap', cancelText: 'İptal', destructive: true,
      onConfirm: async () => {
        hideModal();
        setIsProcessing('out');
        try {
          const now = new Date();
          const updateData = { checkOutTime: now.toISOString() };
          if (location) {
            updateData.checkOutLocation = { latitude: location.latitude, longitude: location.longitude };
          }
          await updateRecord(recordId, updateData);
          setCheckOutTime(now);
          setCheckInStatus('checked-out');
          setCelebrationType('check-out');
          setCelebrationVisible(true);
          notificationService.cancelWorkReminders().catch(() => {});
        } catch (err) {
          showInfo('Hata', 'Çıkış yapılamadı: ' + (err?.message || 'Bilinmeyen hata'));
        } finally { setIsProcessing(null); }
      },
    });
  }, [checkInTime, recordId, checkOutTime, isInZone, isDisMesai, showModal, hideModal, updateRecord, location, showInfo]);

  const onQuickTeslimAl = useCallback(async (item) => {
    const name = userProfile?.displayName || user?.email || 'Bilinmiyor';
    return await handleTeslimAl(item._docId, user.uid, name, item.ad, item.tur);
  }, [userProfile, user, handleTeslimAl]);

  const onQuickTeslimEt = useCallback(async (item) => {
    return await handleTeslimEt(item._docId, item.aktifHareketId);
  }, [handleTeslimEt]);

  if (locationLoading) {
    return (
      <View style={s.centerWrap}>
        <ActivityIndicator size="large" color="#ffd800" />
        <Text style={s.centerTxt}>Konum alınıyor...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={s.centerWrap}>
        <MaterialIcons name="location-off" size={48} color="#ef4444" />
        <Text style={s.errTitle}>Konum Hatası</Text>
        <Text style={s.errMsg}>{locationError}</Text>
      </View>
    );
  }

  const isCheckedIn  = checkInStatus === 'checked-in';
  const isCheckedOut = checkInStatus === 'checked-out';
  const isIdle       = checkInStatus === 'idle';

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" />}
    >
      <View style={s.header}>
        <Image source={require('../../assets/paxLogoHv4.png')} style={s.logo} resizeMode="contain" />
        <TouchableOpacity style={s.taratBtn} onPress={() => setQuickScan(true)} activeOpacity={0.8}>
          <MaterialIcons name="qr-code-scanner" size={18} color="#0f172a" />
          <Text style={s.taratBtnTxt}>Tarat</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.konumKart, isInZone ? s.konumKartIcinde : s.konumKartDisinda]}>
        <View style={s.konumSol}>
          <View style={[s.konumIkonWrap, { backgroundColor: isInZone ? '#10b98122' : '#ef444422' }]}>
            <MaterialIcons name={isInZone ? 'location-on' : 'location-off'} size={20} color={isInZone ? '#10b981' : '#ef4444'} />
          </View>
          <View>
            <Text style={[s.konumDurum, { color: isInZone ? '#10b981' : '#ef4444' }]}>
              {isInZone ? 'Alan İçindesiniz' : 'Alan Dışındasınız'}
            </Text>
            <Text style={s.konumAlt}>
              {isInZone ? 'Giriş/çıkış işlemi yapabilirsiniz' : 'Ofis alanına geliniz'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={s.konumYenileBtn} onPress={handleRefreshLocation} disabled={locationRefreshing}>
          {locationRefreshing
            ? <ActivityIndicator size="small" color="#ffd800" />
            : <MaterialIcons name="my-location" size={20} color="#ffd800" />}
        </TouchableOpacity>
      </View>

      <View style={s.mesaiKart}>
        <View style={s.mesaiBaslikRow}>
          <Text style={s.mesaiBaslik}>Bugünkü Mesai</Text>
          {isDisMesai && (
            <View style={s.disMesaiBadge}>
              <MaterialIcons name="work-outline" size={11} color="#8b5cf6" />
              <Text style={s.disMesaiBadgeTxt}>Saha Görevi</Text>
            </View>
          )}
        </View>
        <View style={s.zamanRow}>
          <View style={[s.zamanKutu, s.zamanKutuGiris]}>
            <View style={s.zamanIkon}><MaterialIcons name="login" size={16} color="#10b981" /></View>
            <Text style={s.zamanEtiket}>Giriş</Text>
            <Text style={[s.zamanSaat, { color: checkInTime ? '#10b981' : '#334155' }]}>{fmtSaat(checkInTime)}</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={18} color="#334155" />
          <View style={[s.zamanKutu, s.zamanKutuCikis]}>
            <View style={s.zamanIkon}><MaterialIcons name="logout" size={16} color="#ef4444" /></View>
            <Text style={s.zamanEtiket}>Çıkış</Text>
            <Text style={[s.zamanSaat, { color: checkOutTime ? '#ef4444' : '#334155' }]}>{fmtSaat(checkOutTime)}</Text>
          </View>
        </View>
        {isCheckedOut && (
          <View style={s.tamamRow}>
            <MaterialIcons name="check-circle" size={16} color="#ffd800" />
            <Text style={s.tamamTxt}>Bugünkü mesai tamamlandı</Text>
          </View>
        )}
      </View>

      <View style={s.aksiyonWrap}>
        {isIdle && !isInZone && (
          <View style={s.uyariKutu}>
            <MaterialIcons name="info-outline" size={16} color="#94a3b8" />
            <Text style={s.uyariTxt}>Giriş için ofis alanına geliniz</Text>
          </View>
        )}
        {isIdle && isInZone && (
          <TouchableOpacity style={s.girisBtn} onPress={handleCheckIn} disabled={!!isProcessing} activeOpacity={0.85}>
            {isProcessing === 'normal'
              ? <ActivityIndicator color="#fff" />
              : <><MaterialIcons name="login" size={22} color="#fff" /><Text style={s.aksiyonBtnTxt}>Giriş Yap</Text></>}
          </TouchableOpacity>
        )}

        {isIdle && (
          <TouchableOpacity style={s.disMesaiBtn} onPress={handleDisMesaiCheckIn} disabled={!!isProcessing} activeOpacity={0.85}>
            {isProcessing === 'dis'
              ? <ActivityIndicator color="#8b5cf6" />
              : <>
                  <View style={s.disMesaiIkonWrap}>
                    <MaterialIcons name="work-outline" size={18} color="#8b5cf6" />
                  </View>
                  <View style={s.disMesaiBtnMetin}>
                    <Text style={s.disMesaiBtnTxt}>Saha Görevi Giriş Yap</Text>
                    <Text style={s.disMesaiBtnAlt}>Ofis dışı çalışma için alan kontrolü gerekmez</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#8b5cf6" />
                </>}
          </TouchableOpacity>
        )}

        {isCheckedIn && (
          <>
            {!isDisMesai && !isInZone && (
              <View style={s.uyariKutu}>
                <MaterialIcons name="info-outline" size={16} color="#94a3b8" />
                <Text style={s.uyariTxt}>Çıkış için ofis alanına geliniz</Text>
              </View>
            )}
            <TouchableOpacity
              style={[s.cikisBtn, !isDisMesai && !isInZone && s.btnDisabled]}
              onPress={handleCheckOut}
              disabled={!!isProcessing || (!isDisMesai && !isInZone)}
              activeOpacity={0.85}
            >
              {isProcessing === 'out'
                ? <ActivityIndicator color="#fff" />
                : <><MaterialIcons name="logout" size={22} color="#fff" /><Text style={s.aksiyonBtnTxt}>{isDisMesai ? 'Saha Görevi Çıkış Yap' : 'Çıkış Yap'}</Text></>}
            </TouchableOpacity>
          </>
        )}
      </View>

      <CelebrationModal
        visible={celebrationVisible}
        type={celebrationType}
        userName={displayName}
        userId={user?.uid}
        onClose={() => setCelebrationVisible(false)}
      />
      <ConfirmModal
        visible={modal.visible} icon={modal.icon} iconColor={modal.iconColor}
        title={modal.title} message={modal.message} confirmText={modal.confirmText}
        cancelText={modal.cancelText} destructive={modal.destructive}
        hideCancel={modal.hideCancel} onConfirm={modal.onConfirm} onCancel={hideModal}
      />
      <QuickScanModal
        visible={quickScan}
        items={items}
        currentUser={user}
        userProfile={userProfile}
        processingId={null}
        onTeslimAl={onQuickTeslimAl}
        onTeslimEt={onQuickTeslimEt}
        onClose={() => setQuickScan(false)}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', gap: 12 },
  centerTxt: { fontSize: 14, color: '#64748b' },
  errTitle: { fontSize: 18, fontWeight: '700', color: '#ef4444', marginTop: 8 },
  errMsg: { fontSize: 13, color: '#64748b', textAlign: 'center', paddingHorizontal: 32, marginTop: 4 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1e293b', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  logo: { width: 140, height: 52 },
  taratBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffd800', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14,
  },
  taratBtnTxt: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  konumKart: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 14, marginTop: 10, borderRadius: 14, padding: 14, borderWidth: 1,
  },
  konumKartIcinde: { backgroundColor: '#052e1622', borderColor: '#10b98133' },
  konumKartDisinda: { backgroundColor: '#7f1d1d22', borderColor: '#ef444433' },
  konumSol: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  konumIkonWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  konumDurum: { fontSize: 14, fontWeight: '700' },
  konumAlt: { fontSize: 11, color: '#64748b', marginTop: 2 },
  konumYenileBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  mesaiKart: {
    backgroundColor: '#1e293b', marginHorizontal: 14, marginTop: 10,
    borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: '#334155',
  },
  mesaiBaslik: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  zamanRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  zamanKutu: {
    flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 12, gap: 5, borderWidth: 1,
  },
  zamanKutuGiris: { backgroundColor: '#10b98110', borderColor: '#10b98130' },
  zamanKutuCikis: { backgroundColor: '#ef444410', borderColor: '#ef444430' },
  zamanIkon: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center',
  },
  zamanEtiket: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  zamanSaat: { fontSize: 20, fontWeight: '800' },
  tamamRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, backgroundColor: '#ffd80012', borderRadius: 8,
    paddingVertical: 8, borderWidth: 1, borderColor: '#ffd80030',
  },
  tamamTxt: { fontSize: 13, color: '#ffd800', fontWeight: '600' },
  aksiyonWrap: { marginHorizontal: 14, marginTop: 10, gap: 10 },
  uyariKutu: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1e293b', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1, borderColor: '#334155',
  },
  uyariTxt: { fontSize: 13, color: '#64748b' },
  girisBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 16, gap: 10,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  cikisBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 16, gap: 10,
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.45 },
  aksiyonBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  mesaiBaslikRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disMesaiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#8b5cf615', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#8b5cf633',
  },
  disMesaiBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#8b5cf6' },
  disMesaiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    justifyContent: 'center',
    backgroundColor: '#1e293b', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: '#8b5cf633',
  },
  disMesaiIkonWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#8b5cf615', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#8b5cf633',
  },
  disMesaiBtnMetin: { flex: 1, gap: 2 },
  disMesaiBtnTxt: { fontSize: 14, fontWeight: '700', color: '#8b5cf6' },
  disMesaiBtnAlt: { fontSize: 11, color: '#64748b' },
});
