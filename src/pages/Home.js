import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { useEnvanter } from '../hooks/useEnvanter';
import { useSelector } from 'react-redux';
import CelebrationModal from '../components/CelebrationModal';
import ConfirmModal from '../components/ConfirmModal';
import QuickScanModal from '../components/QuickScanModal';
import CardButton from '../components/CardButton';
import { useLocation } from '../hooks/useLocation';
import notificationService from '../services/notificationService';
import { useTakvim } from '../hooks/useTakvim';
import { toDateStr, getWeekStart, gorevHaftaStr, getGorevDurum, DURUM_CONFIG } from './Takvim';


const fmtSaat = (date) =>
  date ? new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

const MODAL_DEF = {
  visible: false, icon: null, iconColor: '#ffd800',
  title: '', message: '', confirmText: 'Tamam',
  cancelText: 'İptal', destructive: false, hideCancel: false,
  onConfirm: null, onCancel: null, onBackdropPress: null,
  secondaryText: null, secondaryColor: '#8b5cf6', onSecondary: null,
};

export default function Home() {
  const { user } = useAuth();
  const userProfile = useSelector((st) => st.database.userProfile);
  const { userProfile: dbProfile, loading: dbLoading, getProfile, addRecord, updateRecord, records, getWorkRecordsFirstPage, getWorkRecordsFirstPageIfNeeded } = useDatabase();
  const { items, getItemsFirstPageIfNeeded, handleTeslimAl, handleTeslimEt, getItemByQRData } = useEnvanter();

  const { coords: location, isInZone, loading: locationLoading, error: locationError, refreshLocation } = useLocation();
  const { gorevler, loading: gorevlerLoading, getGorevler, getGorevlerIfNeeded } = useTakvim();
  const role = userProfile?.role;
  // Ref ile location'ı takip ediyoruz — GPS her 10sn güncellense bile callback'ler yeniden oluşturulmuyor
  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);
  const [locationRefreshing, setLocationRefreshing] = useState(false);
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

  const hideModal = useCallback(() => setModal((m) => ({ ...m, visible: false, onCancel: null })), []);
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
      if (user?.uid) await Promise.all([
        getProfile(user.uid),
        getWorkRecordsFirstPage(user.uid),
        getGorevler(user.uid, role),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [user, role, getProfile, getWorkRecordsFirstPage, getGorevler]);

  const handleRefreshLocation = useCallback(async () => {
    setLocationRefreshing(true);
    try {
      await refreshLocation();
    } finally {
      setLocationRefreshing(false);
    }
  }, [refreshLocation]);

  useEffect(() => {
    if (!user?.uid) return;
    const task = InteractionManager.runAfterInteractions(() => {
      getWorkRecordsFirstPageIfNeeded(user.uid);
    });
    return () => task.cancel();
  }, [user?.uid, getWorkRecordsFirstPageIfNeeded]);

  useEffect(() => {
    if (quickScan) getItemsFirstPageIfNeeded();
  }, [quickScan, getItemsFirstPageIfNeeded]);

  useEffect(() => {
    if (user?.uid) getGorevlerIfNeeded(user.uid, role);
  }, [user?.uid, role]);

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
        }, user.uid).then(() => getWorkRecordsFirstPageIfNeeded(user.uid)).catch(() => {});
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


  // Tek giriş mantığı — tür: 'normal' | 'dis'
  const performCheckIn = useCallback(async (type) => {
    setIsProcessing(type);
    try {
      const now = new Date();
      const loc = locationRef.current;
      const recordData = {
        userId: user.uid, displayName,
        date: now.toISOString().split('T')[0],
        checkInTime: now.toISOString(),
        ...(type === 'dis' ? { disMesai: true } : {}),
        ...(loc ? { checkInLocation: { latitude: loc.latitude, longitude: loc.longitude } } : {}),
      };
      const result = await addRecord(user.uid, recordData);
      if (result.payload?.id) setRecordId(result.payload.id);
      setCheckInTime(now);
      setCheckInStatus('checked-in');
      if (type === 'dis') setIsDisMesai(true);
      setCelebrationType('check-in');
      setCelebrationVisible(true);
      notificationService.scheduleWorkReminders().catch(() => {});
    } catch (err) {
      showInfo('Hata', 'Giriş yapılamadı: ' + (err?.message || 'Bilinmeyen hata'));
    } finally { setIsProcessing(null); }
  }, [user, displayName, locationRef, addRecord, showInfo]);

  const handleGirisSecim = useCallback(() => {
    if (!displayName) { showInfo('Hata', 'Profil bilgileri eksik.'); return; }
    if (checkInStatus !== 'idle') { showInfo('Hata', 'Bugün zaten giriş yaptınız.'); return; }

    showModal({
      icon: 'login', iconColor: '#ffd800',
      title: 'Giriş Türü Seçin',
      message: isInZone
        ? 'Ofis girişi mi yoksa saha görevi girişi mi yapacaksınız?'
        : 'Alan dışındasınız. Ofis girişi için alan içinde olmanız gerekir.',
      confirmText: 'Ofis Girişi',
      secondaryText: 'Saha Görevi',
      secondaryColor: '#8b5cf6',
      cancelText: 'İptal',
      onBackdropPress: hideModal,
      onCancel: hideModal,
      onSecondary: () => { hideModal(); performCheckIn('dis'); },
      onConfirm: () => {
        hideModal();
        if (!isInZone) { showInfo('Hata', 'Alan dışındasınız. Giriş yapılamaz.'); return; }
        if (records && user?.uid) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          const yesterdayRecord = records
            .filter(r => r.userId === user.uid)
            .find(r => r.date === yesterdayStr && !r.checkOutTime);
          if (yesterdayRecord) {
            showModal({
              icon: 'warning', iconColor: '#f59e0b', title: 'Eksik Kayıt Var',
              message: `Dün (${yesterday.toLocaleDateString('tr-TR')}) çıkış yapılmamış. Otomatik çıkış yapılsın mı?`,
              confirmText: 'Otomatik Çıkış Yap', cancelText: 'İptal',
              onConfirm: async () => {
                hideModal();
                const co = new Date(yesterday); co.setHours(18, 30, 0, 0);
                await updateRecord(yesterdayRecord.id, { checkOutTime: co.toISOString(), autoCheckOut: true }, user?.uid);
                await getWorkRecordsFirstPageIfNeeded(user.uid);
                performCheckIn('normal');
              },
            });
            return;
          }
        }
        performCheckIn('normal');
      },
    });
  }, [displayName, checkInStatus, isInZone, showModal, hideModal, showInfo, records, user, updateRecord, getWorkRecordsFirstPageIfNeeded, performCheckIn]);

  const handleCheckOut = useCallback(async () => {
    if (!checkInTime || !recordId) { showInfo('Hata', 'Giriş kaydı bulunamadı.'); return; }
    if (checkOutTime) { showInfo('Hata', 'Bugün zaten çıkış yaptınız.'); return; }
    if (!isDisMesai && !isInZone) { showInfo('Uyarı', 'Çıkış için alan içinde olmalısınız.', 'warning', '#f59e0b'); return; }

    showModal({
      icon: 'logout', iconColor: '#ef4444',
      title: isDisMesai ? 'Saha Görevi Çıkışı' : 'Çıkış Onayı',
      message: `${new Date().toLocaleTimeString('tr-TR')} saatinde ${isDisMesai ? 'saha görevi ' : ''}çıkış yapılacak.`,
      confirmText: 'Çıkış Yap', cancelText: 'İptal', destructive: true,
      onConfirm: async () => {
        hideModal();
        setIsProcessing('out');
        try {
          const now = new Date();
          const loc = locationRef.current;
          const updateData = { checkOutTime: now.toISOString() };
          if (loc) updateData.checkOutLocation = { latitude: loc.latitude, longitude: loc.longitude };
          await updateRecord(recordId, updateData, user?.uid);
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
  }, [checkInTime, recordId, checkOutTime, isInZone, isDisMesai, showModal, hideModal, updateRecord, showInfo]);

  const onQuickTeslimAl = useCallback(async (item) => {
    const name = userProfile?.displayName || user?.email || 'Bilinmiyor';
    return await handleTeslimAl(item._docId, user.uid, name, item.ad, item.tur);
  }, [userProfile, user, handleTeslimAl]);

  const onQuickTeslimEt = useCallback(async (item) => {
    return await handleTeslimEt(item._docId, item.aktifHareketId, user?.uid, item.tur);
  }, [handleTeslimEt, user]);

  const isCheckedIn  = checkInStatus === 'checked-in';
  const isCheckedOut = checkInStatus === 'checked-out';
  const isIdle       = checkInStatus === 'idle';

  const AYLAR_KISA_H = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const fmtGunAyH = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate()} ${AYLAR_KISA_H[d.getMonth()]}`;
  };
  const PROJE_RENKLER_H = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
  const projeRenkH = (str = '') =>
    PROJE_RENKLER_H[Math.abs((str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PROJE_RENKLER_H.length];

  const buHaftaStr = toDateStr(getWeekStart(new Date()));
  const buHaftaGorevleri = useMemo(() =>
    gorevler.filter(g => gorevHaftaStr(g) === buHaftaStr),
    [gorevler, buHaftaStr]
  );

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />}
    >
      <View style={s.mainContent}>

        {/* ── Bu Haftaki Görevler (EN ÜSTTE) ── */}
        <View style={s.gorevKart}>
          <View style={s.gorevKartBaslik}>
            <View style={s.gorevKartBaslikSol}>
              <View style={s.gorevKartIkon}>
                <MaterialIcons name="calendar-today" size={15} color="#ffd800" />
              </View>
              <View>
                <Text style={s.gorevKartBaslikTxt}>Bu Haftaki Görevler</Text>
                {!gorevlerLoading && (
                  <Text style={s.gorevKartAltTxt}>
                    {buHaftaGorevleri.length === 0
                      ? 'Bu hafta görev yok'
                      : `${buHaftaGorevleri.filter(g => getGorevDurum(g) === 'tamamlandi').length}/${buHaftaGorevleri.length} tamamlandı`}
                  </Text>
                )}
              </View>
            </View>
            {!gorevlerLoading && buHaftaGorevleri.length > 0 && (
              <View style={s.gorevSayiBadge}>
                <Text style={s.gorevSayiTxt}>{buHaftaGorevleri.length}</Text>
              </View>
            )}
          </View>

          {gorevlerLoading ? (
            <View style={s.gorevYukleniyor}>
              <ActivityIndicator size="small" color="#ffd800" />
            </View>
          ) : buHaftaGorevleri.length === 0 ? (
            <View style={s.gorevBos}>
              <MaterialIcons name="event-available" size={22} color="#333333" />
              <Text style={s.gorevBosTxt}>Bu hafta için görev atanmadı</Text>
            </View>
          ) : (
            <>
              {/* Progress bar */}
              <View style={s.gorevProgressWrap}>
                <View style={[s.gorevProgressBar, {
                  width: `${(buHaftaGorevleri.filter(g => getGorevDurum(g) === 'tamamlandi').length / buHaftaGorevleri.length) * 100}%`
                }]} />
              </View>

              {buHaftaGorevleri.slice(0, 4).map(g => {
                const durum = getGorevDurum(g);
                const durumCfg = DURUM_CONFIG[durum] || DURUM_CONFIG.beklemede;
                const renk = durumCfg.color;
                const isTamamlandi = durum === 'tamamlandi';
                return (
                  <View key={g.id} style={[s.gorevSatir, isTamamlandi && { opacity: 0.55 }]}>
                    <View style={[s.gorevSerit, { backgroundColor: renk }]} />
                    <View style={s.gorevSatirIcerik}>
                      <View style={s.gorevSatirUst}>
                        <View style={[s.gorevProjeBadge, { backgroundColor: renk + '18' }]}>
                          <Text style={[s.gorevProje, { color: renk }]} numberOfLines={1}>{g.proje}</Text>
                        </View>
                        <View style={s.gorevDurumBadge}>
                          <MaterialIcons name={durumCfg.icon} size={12} color={renk} />
                          <Text style={[s.gorevDurumTxt, { color: renk }]}>{durumCfg.label}</Text>
                        </View>
                      </View>
                      <Text style={[s.gorevIs, isTamamlandi && { textDecorationLine: 'line-through' }]} numberOfLines={1}>{g.is}</Text>
                      {g.sorumlular?.length > 0 && (
                        <View style={s.gorevSorumluRow}>
                          {g.sorumlular.slice(0, 3).map(sr => (
                            <View key={sr.uid} style={[s.gorevSorumluChip, { backgroundColor: projeRenkH(sr.displayName) + '18' }]}>
                              <Text style={[s.gorevSorumluTxt, { color: projeRenkH(sr.displayName) }]}>
                                {(sr.displayName || '').split(' ')[0]}
                              </Text>
                            </View>
                          ))}
                          {g.sorumlular.length > 3 && <Text style={s.gorevSorumluFazla}>+{g.sorumlular.length - 3}</Text>}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {buHaftaGorevleri.length > 4 && (
                <View style={s.gorevFazlaRow}>
                  <MaterialIcons name="more-horiz" size={14} color="#444444" />
                  <Text style={s.gorevFazla}>{buHaftaGorevleri.length - 4} görev daha</Text>
                </View>
              )}
            </>
          )}
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
              <View style={s.zamanIkon}><MaterialIcons name="login" size={13} color="#10b981" /></View>
              <Text style={s.zamanEtiket}>Giriş</Text>
              <Text style={[s.zamanSaat, { color: checkInTime ? '#ffffff' : '#333333' }]}>{fmtSaat(checkInTime)}</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={14} color="#333333" />
            <View style={[s.zamanKutu, s.zamanKutuCikis]}>
              <View style={s.zamanIkon}><MaterialIcons name="logout" size={13} color="#888888" /></View>
              <Text style={s.zamanEtiket}>Çıkış</Text>
              <Text style={[s.zamanSaat, { color: checkOutTime ? '#ff4444' : '#333333' }]}>{fmtSaat(checkOutTime)}</Text>
            </View>
          </View>
          {isCheckedOut && (
            <View style={s.tamamRow}>
              <MaterialIcons name="check-circle" size={16} color="#ffd800" />
              <Text style={s.tamamTxt}>Bugünkü mesai tamamlandı</Text>
            </View>
          )}
        </View>

        <CardButton
          onPress={handleRefreshLocation}
          disabled={locationRefreshing || locationLoading}
          stripeColor={locationLoading ? '#888888' : locationError || !isInZone ? '#ff4444' : '#ffd800'}
          borderColor={locationLoading ? '#33333366' : locationError || !isInZone ? '#ff444433' : '#ffd80033'}
          iconBgColor={locationLoading ? '#ffffff0a' : locationError || !isInZone ? '#ff444415' : '#ffd80012'}
          iconBorderColor={locationLoading ? '#33333344' : locationError || !isInZone ? '#ff444433' : '#ffd80033'}
          iconElement={
            locationLoading
              ? <ActivityIndicator size="small" color="#888888" />
              : <MaterialIcons name={isInZone && !locationError ? 'location-on' : 'location-off'} size={24} color={locationError || !isInZone ? '#ff4444' : '#ffd800'} />
          }
          title={locationLoading ? 'Konum Alınıyor...' : locationError ? 'Konum Hatası' : isInZone ? 'Alan İçindesiniz' : 'Alan Dışındasınız'}
          titleColor={locationLoading ? '#888888' : locationError || !isInZone ? '#ff4444' : '#e0e0e0'}
          subtitle={locationLoading ? 'Lütfen bekleyin' : locationError ? locationError : isInZone ? 'Giriş/çıkış işlemi yapabilirsiniz' : 'Ofis alanına geliniz'}
          rightElement={
            <View style={[s.konumOkKutu, { backgroundColor: locationError || !isInZone ? '#ff444415' : '#ffd80012' }]}>
              {locationRefreshing
                ? <ActivityIndicator size="small" color="#ffd800" />
                : <MaterialIcons name="my-location" size={20} color={isInZone && !locationError ? '#ffd800' : '#ff4444'} />}
            </View>
          }
        />

        <CardButton
          onPress={() => setQuickScan(true)}
          icon="qr-code-scanner"
          iconSize={26}
          title="Hızlı Tarat"
          subtitle="QR okutarak ekipmanı bul ve işlem yap"
        />

        {isIdle && (
          <CardButton
            onPress={handleGirisSecim}
            disabled={!!isProcessing}
            loading={isProcessing === 'normal' || isProcessing === 'dis'}
            icon="login"
            title="Giriş Yap"
            subtitle="Ofis veya saha görevi girişi"
          />
        )}

        {isCheckedIn && (
          <CardButton
            style={!isDisMesai && !isInZone ? s.btnDisabled : undefined}
            onPress={handleCheckOut}
            disabled={!!isProcessing || (!isDisMesai && !isInZone)}
            loading={isProcessing === 'out'}
            loadingColor="#ff4444"
            stripeColor="#ff4444"
            borderColor="#ff444433"
            icon="logout"
            iconColor="#ff4444"
            iconBgColor="#ff444415"
            iconBorderColor="#ff444433"
            title={isDisMesai ? 'Saha Görevi Çıkış Yap' : 'Çıkış Yap'}
            subtitle={isDisMesai ? 'Saha görevi bitiş kaydı yapılacak' : !isInZone ? 'Çıkış için ofis alanına geliniz' : 'Bugünkü mesai sonlandırılacak'}
            titleColor={!isDisMesai && !isInZone ? '#555555' : '#e0e0e0'}
            rightIconColor="#ff4444"
            rightBgColor="#ff444415"
          />
        )}

      </View>

      {celebrationVisible && (
        <CelebrationModal
          visible={celebrationVisible}
          type={celebrationType}
          userName={displayName}
          userId={user?.uid}
          onClose={() => setCelebrationVisible(false)}
        />
      )}
      <ConfirmModal
        visible={modal.visible} icon={modal.icon} iconColor={modal.iconColor}
        title={modal.title} message={modal.message} confirmText={modal.confirmText}
        cancelText={modal.cancelText} destructive={modal.destructive}
        hideCancel={modal.hideCancel} onConfirm={modal.onConfirm} onCancel={modal.onCancel || hideModal}
        onBackdropPress={modal.onBackdropPress || hideModal}
        secondaryText={modal.secondaryText} secondaryColor={modal.secondaryColor} onSecondary={modal.onSecondary}
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
        onFetchItem={getItemByQRData}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000', gap: 12 },
  centerTxt: { fontSize: 14, color: '#555555' },
  errTitle: { fontSize: 18, fontWeight: '700', color: '#ff4444', marginTop: 8 },
  errMsg: { fontSize: 13, color: '#555555', textAlign: 'center', paddingHorizontal: 32, marginTop: 4 },
  mainContent: {
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, gap: 12,
  },
  gorevKart: {
    backgroundColor: '#111111', borderRadius: 16,
    borderWidth: 1, borderColor: '#ffd80022', overflow: 'hidden',
  },
  gorevKartBaslik: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12,
  },
  gorevKartBaslikSol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gorevKartIkon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#ffd80015', borderWidth: 1, borderColor: '#ffd80030',
    alignItems: 'center', justifyContent: 'center',
  },
  gorevKartBaslikTxt: { fontSize: 13, fontWeight: '700', color: '#e0e0e0' },
  gorevKartAltTxt: { fontSize: 11, color: '#555555', marginTop: 1 },
  gorevSayiBadge: {
    backgroundColor: '#ffd80018', borderRadius: 10, borderWidth: 1, borderColor: '#ffd80033',
    paddingHorizontal: 10, paddingVertical: 4,
  },
  gorevSayiTxt: { fontSize: 13, fontWeight: '800', color: '#ffd800' },
  gorevProgressWrap: {
    height: 2, backgroundColor: '#1e1e1e', marginHorizontal: 14, marginBottom: 4, borderRadius: 1,
  },
  gorevProgressBar: { height: 2, backgroundColor: '#10b981', borderRadius: 1 },
  gorevSatir: {
    flexDirection: 'row', alignItems: 'stretch',
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
  },
  gorevSerit: { width: 3 },
  gorevSatirIcerik: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 5 },
  gorevSatirUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  gorevProjeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, maxWidth: '60%' },
  gorevProje: { fontSize: 11, fontWeight: '700' },
  gorevTarih: { fontSize: 11, color: '#444444' },
  gorevDurumBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gorevDurumTxt: { fontSize: 10, fontWeight: '700' },
  gorevIs: { fontSize: 13, color: '#888888', lineHeight: 18 },
  gorevSorumluRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  gorevSorumluChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  gorevSorumluTxt: { fontSize: 10, fontWeight: '700' },
  gorevSorumluFazla: { fontSize: 10, color: '#444444' },
  gorevFazlaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1a1a1a',
  },
  gorevFazla: { fontSize: 12, color: '#444444' },
  gorevYukleniyor: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  gorevBos: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 20 },
  gorevBosTxt: { fontSize: 12, color: '#444444' },
  konumOkKutu: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  mesaiKart: {
    backgroundColor: '#141414', borderRadius: 14, padding: 12, gap: 10, borderWidth: 1, borderColor: '#2a2a2a',
  },
  mesaiBaslik: { fontSize: 10, fontWeight: '700', color: '#888888', textTransform: 'uppercase', letterSpacing: 0.5 },
  zamanRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zamanKutu: {
    flex: 1, alignItems: 'center', borderRadius: 8, paddingVertical: 8, gap: 3, borderWidth: 1,
  },
  zamanKutuGiris: { backgroundColor: '#ffffff08', borderColor: '#22222288' },
  zamanKutuCikis: { backgroundColor: '#ffffff08', borderColor: '#22222288' },
  zamanIkon: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center',
  },
  zamanEtiket: { fontSize: 9, color: '#555555', fontWeight: '700', textTransform: 'uppercase' },
  zamanSaat: { fontSize: 17, fontWeight: '800' },
  tamamRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, backgroundColor: '#ffd80012', borderRadius: 8,
    paddingVertical: 8, borderWidth: 1, borderColor: '#ffd80033',
  },
  tamamTxt: { fontSize: 13, color: '#ffd800', fontWeight: '600' },
  btnDisabled: { opacity: 0.45 },
  mesaiBaslikRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disMesaiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ffffff0a', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#33333344',
  },
  disMesaiBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#888888' },
});
