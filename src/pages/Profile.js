import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  RefreshControl,
  ScrollView,
  Image,
  InteractionManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { useEnvanter } from '../hooks/useEnvanter';
import ConfirmModal from '../components/ConfirmModal';


const TUR_IKONLAR = {
  'Kamera': { icon: 'camera-alt', renk: '#888888' },
  'Lens': { icon: 'center-focus-weak', renk: '#888888' },
  'Dron': { icon: 'flight', renk: '#888888' },
  'Ses': { icon: 'mic', renk: '#888888' },
  'Işık': { icon: 'wb-sunny', renk: '#888888' },
  'Işık Ekpmanı': { icon: 'wb-incandescent', renk: '#888888' },
  'Softbox': { icon: 'brightness-5', renk: '#888888' },
  'Reflektör': { icon: 'flare', renk: '#888888' },
  'Prompter': { icon: 'subtitles', renk: '#888888' },
  'Tripot': { icon: 'photo-camera', renk: '#888888' },
};

const fmtSaat = (iso) => iso
  ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  : '--:--';

const fmtTarih = (iso) => iso
  ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '-';

const fmtTarihUzun = (iso) => iso
  ? new Date(iso).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })
  : '-';

const fmtSure = (baslangic, bitis) => {
  if (!baslangic) return null;
  const ms = (bitis ? new Date(bitis) : new Date()) - new Date(baslangic);
  const toplamDk = Math.floor(ms / 60000);
  const gun = Math.floor(toplamDk / 1440);
  const saat = Math.floor((toplamDk % 1440) / 60);
  const dk = toplamDk % 60;
  if (gun > 0) return `${gun}g ${saat}s`;
  if (saat > 0) return `${saat}s ${dk}dk`;
  return `${dk}dk`;
};

// ── Mesai Kartı ───────────────────────────────────────────────────────────────
const MesaiKart = React.memo(function MesaiKart({ record }) {
  const sure = fmtSure(record.checkInTime, record.checkOutTime);
  return (
    <View style={s.kart}>
      <View style={[s.kartSerit, { backgroundColor: record.checkOutTime ? '#555555' : '#888888' }]} />
      <View style={s.kartBody}>
        <View style={s.kartUstRow}>
          <Text style={s.kartTarih}>{fmtTarihUzun(record.checkInTime)}</Text>
          {record.disMesai && (
            <View style={s.sahaBadge}>
              <MaterialIcons name="work-outline" size={10} color="#888888" />
              <Text style={s.sahaBadgeTxt}>Saha</Text>
            </View>
          )}
          {!record.checkOutTime && (
            <View style={s.bekleyenBadge}>
              <Text style={s.bekleyenBadgeTxt}>Devam ediyor</Text>
            </View>
          )}
        </View>
        <View style={s.zamanRow}>
          <View style={s.zamanBlok}>
            <View style={[s.zamanIkon, { backgroundColor: '#ffffff0a' }]}>
              <MaterialIcons name="login" size={14} color="#cccccc" />
            </View>
            <View>
              <Text style={s.zamanEtiket}>Giriş</Text>
              <Text style={[s.zamanDeger, { color: '#e0e0e0' }]}>{fmtSaat(record.checkInTime)}</Text>
            </View>
          </View>
          <MaterialIcons name="arrow-forward" size={14} color="#333333" />
          <View style={s.zamanBlok}>
            <View style={[s.zamanIkon, { backgroundColor: record.checkOutTime ? '#ff444415' : '#ffffff08' }]}>
              <MaterialIcons name="logout" size={14} color={record.checkOutTime ? '#ff4444' : '#666666'} />
            </View>
            <View>
              <Text style={s.zamanEtiket}>Çıkış</Text>
              <Text style={[s.zamanDeger, { color: record.checkOutTime ? '#ff4444' : '#666666' }]}>
                {record.checkOutTime ? fmtSaat(record.checkOutTime) : 'Bekleniyor'}
              </Text>
            </View>
          </View>
          {sure && (
            <View style={s.sureBadge}>
              <MaterialIcons name="schedule" size={12} color="#6366f1" />
              <Text style={s.sureTxt}>{sure}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

// ── Ekipman Geçmiş Kartı ──────────────────────────────────────────────────────
const EkipmanKart = React.memo(function EkipmanKart({ hareket }) {
  const teslimEdildi = !!hareket.teslimEtme;
  const tur = TUR_IKONLAR[hareket.itemTur] || { icon: 'inventory', renk: '#64748b' };
  const sure = fmtSure(hareket.teslimAlma, hareket.teslimEtme);
  const durumRenk = teslimEdildi ? '#10b981' : '#f59e0b';

  return (
    <View style={s.kart}>
      <View style={[s.kartSerit, { backgroundColor: tur.renk }]} />
      <View style={s.kartBody}>
        <View style={s.kartUstRow}>
          <View style={[s.turIkon, { backgroundColor: tur.renk + '22' }]}>
            <MaterialIcons name={tur.icon} size={15} color={tur.renk} />
          </View>
          <Text style={s.ekipmanAd} numberOfLines={1}>{hareket.itemAd}</Text>
          <View style={[s.durumPill, { backgroundColor: durumRenk + '18', borderColor: durumRenk + '44' }]}>
            <View style={[s.durumDot, { backgroundColor: durumRenk }]} />
            <Text style={[s.durumTxt, { color: durumRenk }]}>
              {teslimEdildi ? 'İade edildi' : 'Üzerimde'}
            </Text>
          </View>
        </View>
        <View style={s.zamanRow}>
          <View style={s.zamanBlok}>
            <View style={[s.zamanIkon, { backgroundColor: '#10b98118' }]}>
              <MaterialIcons name="login" size={14} color="#10b981" />
            </View>
            <View>
              <Text style={s.zamanEtiket}>Alındı</Text>
              <Text style={s.zamanDeger}>{fmtTarih(hareket.teslimAlma)} {fmtSaat(hareket.teslimAlma)}</Text>
            </View>
          </View>
          {teslimEdildi && (
            <>
              <MaterialIcons name="arrow-forward" size={14} color="#334155" />
              <View style={s.zamanBlok}>
                <View style={[s.zamanIkon, { backgroundColor: '#ef444418' }]}>
                  <MaterialIcons name="logout" size={14} color="#ef4444" />
                </View>
                <View>
                  <Text style={s.zamanEtiket}>İade</Text>
                  <Text style={s.zamanDeger}>{fmtTarih(hareket.teslimEtme)} {fmtSaat(hareket.teslimEtme)}</Text>
                </View>
              </View>
            </>
          )}
        </View>
        {sure && (
          <View style={[s.sureBadge, { backgroundColor: durumRenk + '12', borderColor: durumRenk + '30', alignSelf: 'flex-start', marginTop: 4 }]}>
            <MaterialIcons name="schedule" size={12} color={durumRenk} />
            <Text style={[s.sureTxt, { color: durumRenk }]}>
              {teslimEdildi ? `${sure} tutuldu` : `${sure} süredir üzerimde`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ photoURL, initials, size = 72 }) {
  const [imgErr, setImgErr] = useState(false);
  const radius = size / 2;


  return (
      <Image
        source={{ uri: photoURL || 'https://paxmedya.com.tr/wp-content/uploads/2026/03/logo.png' }}
        style={{ width: size, height: size, borderRadius: radius }}
        onError={() => setImgErr(true)}
      />
  );
}

// ── Profil Sekmesi ────────────────────────────────────────────────────────────
function ProfilSekmesi({ user, userProfile, photoURL, initials, dbLoading, authLoading, error, onLogout, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    phone: userProfile?.phone || '',
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({ displayName: userProfile.displayName || '', phone: userProfile.phone || '' });
    }
  }, [userProfile]);

  return (
    <ScrollView style={s.sekmeScroll} contentContainerStyle={{ paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>

      {/* Profil özeti kartı */}
      <View style={s.profilOzetKart}>
        <View style={s.profilOzetAvatarWrap}>
          <Avatar photoURL={photoURL} initials={initials} size={64} />
        </View>
        <View style={s.profilOzetMetin}>
          <Text style={s.profilOzetAd} numberOfLines={1}>
            {userProfile?.displayName || user?.displayName || '—'}
          </Text>
          <Text style={s.profilOzetEmail} numberOfLines={1}>{user?.email}</Text>
          {userProfile?.phone ? (
            <View style={s.profilOzetTelRow}>
              <MaterialIcons name="phone" size={11} color="#555555" />
              <Text style={s.profilOzetTel}>{userProfile.phone}</Text>
            </View>
          ) : null}
        </View>
        {!isEditing && (
          <TouchableOpacity style={s.duzenleIkonBtn} onPress={() => setIsEditing(true)}>
            <MaterialIcons name="edit" size={16} color="#ffd800" />
          </TouchableOpacity>
        )}
      </View>

      {/* Bilgi kartı */}
      <View style={s.bilgiKart}>
        <Text style={s.bilgiBaslik}>Kişisel Bilgiler</Text>

        <View style={s.bilgiSatir}>
          <View style={s.bilgiIkonWrap}><MaterialIcons name="email" size={15} color="#555555" /></View>
          <View style={s.bilgiIcerik}>
            <Text style={s.bilgiEtiket}>E-posta</Text>
            <Text style={s.bilgiDeger}>{user?.email || '-'}</Text>
          </View>
        </View>
        <View style={s.bilgiAyrac} />

        <View style={s.bilgiSatir}>
          <View style={s.bilgiIkonWrap}><MaterialIcons name="person" size={15} color="#555555" /></View>
          <View style={s.bilgiIcerik}>
            <Text style={s.bilgiEtiket}>Ad Soyad</Text>
            {isEditing ? (
              <TextInput
                style={s.bilgiInput}
                value={formData.displayName}
                onChangeText={(t) => setFormData((f) => ({ ...f, displayName: t }))}
                placeholder="Ad Soyad"
                placeholderTextColor="#444444"
                color="#e0e0e0"
              />
            ) : (
              <Text style={s.bilgiDeger}>{formData.displayName || '-'}</Text>
            )}
          </View>
        </View>
        <View style={s.bilgiAyrac} />

        <View style={s.bilgiSatir}>
          <View style={s.bilgiIkonWrap}><MaterialIcons name="phone" size={15} color="#555555" /></View>
          <View style={s.bilgiIcerik}>
            <Text style={s.bilgiEtiket}>Telefon</Text>
            {isEditing ? (
              <TextInput
                style={s.bilgiInput}
                value={formData.phone}
                onChangeText={(t) => setFormData((f) => ({ ...f, phone: t }))}
                placeholder="Telefon numarası"
                placeholderTextColor="#444444"
                keyboardType="phone-pad"
                color="#e0e0e0"
              />
            ) : (
              <Text style={s.bilgiDeger}>{formData.phone || '-'}</Text>
            )}
          </View>
        </View>

        {userProfile?.role ? (
          <>
            <View style={s.bilgiAyrac} />
            <View style={s.bilgiSatir}>
              <View style={s.bilgiIkonWrap}><MaterialIcons name="verified-user" size={15} color="#555555" /></View>
              <View style={s.bilgiIcerik}>
                <Text style={s.bilgiEtiket}>Rol</Text>
                <View style={s.rolRow}>
                  <Text style={s.bilgiDeger}>
                    {userProfile.role === "admin"
                      ? "Admin"
                      : userProfile.role === "manager"
                      ? "Yönetici"
                      : "Kullanıcı"}
                  </Text>
                  {userProfile.role === 'admin' && (
                    <View style={s.adminBadge}>
                      <MaterialIcons name="star" size={10} color="#ffd800" />
                      <Text style={s.adminBadgeTxt}>Admin</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </>
        ) : null}

        {error ? (
          <View style={s.hataSatir}>
            <MaterialIcons name="error-outline" size={13} color="#ff4444" />
            <Text style={s.hataMetni}>{error}</Text>
          </View>
        ) : null}
      </View>

      {/* Düzenle / Kaydet butonları */}
      {isEditing && (
        <View style={s.btnSatir}>
          <TouchableOpacity style={[s.aksiBtn, s.kaydetBtn]} onPress={() => onSave(formData, setIsEditing)} disabled={dbLoading}>
            {dbLoading
              ? <ActivityIndicator color="#000000" size="small" />
              : <><MaterialIcons name="check" size={17} color="#000000" /><Text style={s.aksiTxt}>Kaydet</Text></>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.aksiBtn, s.iptalBtn]} onPress={() => setIsEditing(false)}>
            <MaterialIcons name="close" size={17} color="#888888" />
            <Text style={[s.aksiTxt, { color: '#888888' }]}>İptal</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Çıkış */}
      <TouchableOpacity style={[s.cikisBtn, authLoading && { opacity: 0.6 }]} onPress={onLogout} disabled={authLoading} activeOpacity={0.85}>
        {authLoading
          ? <ActivityIndicator color="#ff4444" size="small" />
          : <><MaterialIcons name="logout" size={18} color="#ff4444" /><Text style={s.cikisTxt}>Çıkış Yap</Text></>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, logout, loading: authLoading } = useAuth();
  const {
    userProfile, loading: dbLoading, recordsLoading, error,
    records, recordsCursor, recordsHasMore, loadingMore: recordsLoadingMore,
    getProfile, updateProfile,
    getWorkRecordsFirstPage, getWorkRecordsFirstPageIfNeeded, getWorkRecordsNextPage,
  } = useDatabase();

  const {
    equipmentHistory, equipmentHistoryHasMore,
    equipmentHistoryLoading, equipmentHistoryLoadingMore,
    getEquipmentHistory, getEquipmentHistoryIfNeeded, getEquipmentHistoryNextPage,
  } = useEnvanter();

  const [aktifSekme, setAktifSekme] = useState('profil');
  const [refreshing, setRefreshing] = useState(false);

  const MODAL_DEF = { visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Tamam', cancelText: 'İptal', destructive: false, hideCancel: false, onConfirm: null };
  const [modal, setModal] = useState(MODAL_DEF);
  const hideModal = useCallback(() => setModal((m) => ({ ...m, visible: false })), []);
  const showModal = useCallback((cfg) => setModal({ ...MODAL_DEF, visible: true, ...cfg }), []);
  const showInfo = useCallback((title, message, icon = 'info', iconColor = '#ef4444') =>
    showModal({ title, message, icon, iconColor, confirmText: 'Tamam', hideCancel: true }), [showModal]);

  const photoURL = userProfile?.photoURL || user?.photoURL || null;

  const initials = useMemo(() => {
    const name = userProfile?.displayName || user?.displayName || user?.email || '';
    if (!name) return '?';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }, [userProfile, user]);

  useEffect(() => {
    if (!user?.uid) return;
    const task = InteractionManager.runAfterInteractions(() => {
      getWorkRecordsFirstPageIfNeeded(user.uid);
      getEquipmentHistoryIfNeeded(user.uid);
    });
    return () => task.cancel();
  }, [user?.uid, getWorkRecordsFirstPageIfNeeded, getEquipmentHistoryIfNeeded]);

  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      await Promise.all([
        getProfile(user.uid),
        getWorkRecordsFirstPage(user.uid),
        getEquipmentHistory(user.uid),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [user, getProfile, getWorkRecordsFirstPage, getEquipmentHistory]);

  const handleLogout = useCallback(() => {
    showModal({
      icon: 'logout', iconColor: '#ef4444',
      title: 'Çıkış Yap',
      message: 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      confirmText: 'Çıkış Yap', cancelText: 'İptal', destructive: true,
      onConfirm: () => { hideModal(); logout(); },
    });
  }, [showModal, hideModal, logout]);

  const handleSave = useCallback(async (formData, setIsEditing) => {
    if (!user?.uid) { showInfo('Hata', 'Kullanıcı bilgisi bulunamadı.'); return; }
    if (!formData.displayName.trim()) { showInfo('Hata', 'Ad Soyad boş olamaz.'); return; }
    try {
      await updateProfile(user.uid, formData);
      await getProfile(user.uid);
      showInfo('Başarılı', 'Profil güncellendi.', 'check-circle', '#10b981');
      setIsEditing(false);
    } catch (err) {
      showInfo('Hata', 'Profil güncellenemedi: ' + (err?.message || 'Bilinmeyen hata'));
    }
  }, [user, updateProfile, getProfile, showInfo]);

  const userRecords = useMemo(() =>
    [...records].sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime)),
    [records]
  );

  const toplamSaat = useMemo(() =>
    userRecords.reduce((acc, r) => {
      if (!r.checkInTime || !r.checkOutTime) return acc;
      return acc + (new Date(r.checkOutTime) - new Date(r.checkInTime)) / 3600000;
    }, 0).toFixed(1),
    [userRecords]
  );

  const renderMesai = useCallback(({ item }) => <MesaiKart record={item} />, []);
  const renderEkipman = useCallback(({ item }) => <EkipmanKart hareket={item} />, []);
  const mesaiKey = useCallback((item, i) => item.id || String(i), []);
  const ekipmanKey = useCallback((item) => item._hareketId, []);

  const onMesaiEndReached = useCallback(() => {
    if (!recordsHasMore || recordsLoadingMore || !user?.uid) return;
    getWorkRecordsNextPage(user.uid, recordsCursor);
  }, [recordsHasMore, recordsLoadingMore, user, recordsCursor, getWorkRecordsNextPage]);

  const onEkipmanEndReached = useCallback(() => {
    if (!equipmentHistoryHasMore || equipmentHistoryLoadingMore || !user?.uid) return;
    getEquipmentHistoryNextPage(user.uid);
  }, [equipmentHistoryHasMore, equipmentHistoryLoadingMore, user, getEquipmentHistoryNextPage]);

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" />,
    [refreshing, onRefresh]
  );

  const MesaiFooter = useMemo(() => {
    if (!recordsLoadingMore) return <View style={{ height: 32 }} />;
    return (
      <View style={s.listeFooter}>
        <ActivityIndicator size="small" color="#ffd800" />
        <Text style={s.listeFooterTxt}>Yükleniyor...</Text>
      </View>
    );
  }, [recordsLoadingMore]);

  const EkipmanFooter = useMemo(() => {
    if (!equipmentHistoryLoadingMore) return <View style={{ height: 32 }} />;
    return (
      <View style={s.listeFooter}>
        <ActivityIndicator size="small" color="#ffd800" />
        <Text style={s.listeFooterTxt}>Yükleniyor...</Text>
      </View>
    );
  }, [equipmentHistoryLoadingMore]);

  const MesaiHeader = useMemo(() => (
    <View style={s.statsRow}>
      <View style={s.statKart}>
        <MaterialIcons name="calendar-today" size={20} color="#ffd800" />
        <Text style={s.statSayi}>{userRecords.length}{recordsHasMore ? '+' : ''}</Text>
        <Text style={s.statEtiket}>Giriş Kaydı</Text>
      </View>
      <View style={s.statKart}>
        <MaterialIcons name="access-time" size={20} color="#10b981" />
        <Text style={[s.statSayi, { color: '#10b981' }]}>{toplamSaat}</Text>
        <Text style={s.statEtiket}>Toplam Saat</Text>
      </View>
    </View>
  ), [userRecords.length, recordsHasMore, toplamSaat]);

  const EkipmanHeader = useMemo(() => (
    <View style={s.statsRow}>
      <View style={s.statKart}>
        <MaterialIcons name="inventory-2" size={20} color="#6366f1" />
        <Text style={[s.statSayi, { color: '#6366f1' }]}>
          {equipmentHistory.length}{equipmentHistoryHasMore ? '+' : ''}
        </Text>
        <Text style={s.statEtiket}>Toplam İşlem</Text>
      </View>
      <View style={s.statKart}>
        <MaterialIcons name="directions-walk" size={20} color="#f59e0b" />
        <Text style={[s.statSayi, { color: '#f59e0b' }]}>
          {equipmentHistory.filter((h) => !h.teslimEtme).length}
        </Text>
        <Text style={s.statEtiket}>Üzerimdeki</Text>
      </View>
    </View>
  ), [equipmentHistory]);

  const SEKMELER = [
    { key: 'profil', label: 'Profil', icon: 'person' },
    { key: 'mesai', label: 'Mesai', icon: 'access-time', sayi: userRecords.length, hasMore: recordsHasMore },
    { key: 'ekipman', label: 'Ekipman', icon: 'inventory-2', sayi: equipmentHistory.length, hasMore: equipmentHistoryHasMore },
  ];

  return (
    <View style={s.root}>

      {/* ── Profil Hero ── */}
      <View style={s.profilHero}>
        <View style={s.avatarDis}>
          <Avatar photoURL={photoURL} initials={initials} size={68} />
        </View>
        <View style={s.heroMetin}>
          <Text style={s.heroAd} numberOfLines={1}>
            {userProfile?.displayName || user?.displayName || '—'}
          </Text>
          <Text style={s.heroEmail} numberOfLines={1}>{user?.email}</Text>
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <View style={s.tabBar}>
        {SEKMELER.map((sk) => {
          const aktif = aktifSekme === sk.key;
          return (
            <TouchableOpacity
              key={sk.key}
              style={[s.tabBtn, aktif && s.tabBtnAktif]}
              onPress={() => setAktifSekme(sk.key)}
              activeOpacity={0.75}
            >
              <MaterialIcons name={sk.icon} size={14} color={aktif ? '#000000' : '#555555'} />
              <Text style={[s.tabTxt, aktif && s.tabTxtAktif]} numberOfLines={1}>{sk.label}</Text>
              {sk.sayi > 0 && (
                <View style={[s.tabSayi, aktif && s.tabSayiAktif]}>
                  <Text style={[s.tabSayiTxt, aktif && s.tabSayiTxtAktif]}>
                    {sk.sayi}{sk.hasMore ? '+' : ''}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Tab İçerikleri ── */}
      {aktifSekme === 'profil' && (
        <ProfilSekmesi
          user={user}
          userProfile={userProfile}
          photoURL={photoURL}
          initials={initials}
          dbLoading={dbLoading}
          authLoading={authLoading}
          error={error}
          onLogout={handleLogout}
          onSave={handleSave}
        />
      )}

      {aktifSekme === 'mesai' && (
        <FlatList
          data={userRecords}
          keyExtractor={mesaiKey}
          renderItem={renderMesai}
          ListHeaderComponent={MesaiHeader}
          ListEmptyComponent={
            recordsLoading
              ? <View style={s.bosOrta}><ActivityIndicator color="#ffd800" size="large" /></View>
              : <View style={s.bosOrta}><MaterialIcons name="event-note" size={48} color="#1e293b" /><Text style={s.bosMetin}>Mesai kaydı yok</Text></View>
          }
          ListFooterComponent={MesaiFooter}
          onEndReached={onMesaiEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={refreshControl}
          contentContainerStyle={s.liste}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
        />
      )}

      {aktifSekme === 'ekipman' && (
        <FlatList
          data={equipmentHistory}
          keyExtractor={ekipmanKey}
          renderItem={renderEkipman}
          ListHeaderComponent={EkipmanHeader}
          ListEmptyComponent={
            equipmentHistoryLoading
              ? <View style={s.bosOrta}><ActivityIndicator color="#ffd800" size="large" /></View>
              : <View style={s.bosOrta}><MaterialIcons name="inventory-2" size={48} color="#1e293b" /><Text style={s.bosMetin}>Ekipman geçmişi yok</Text></View>
          }
          ListFooterComponent={EkipmanFooter}
          onEndReached={onEkipmanEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={refreshControl}
          contentContainerStyle={s.liste}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
        />
      )}

      <ConfirmModal
        visible={modal.visible} icon={modal.icon} iconColor={modal.iconColor}
        title={modal.title} message={modal.message} confirmText={modal.confirmText}
        cancelText={modal.cancelText} destructive={modal.destructive}
        hideCancel={modal.hideCancel} onConfirm={modal.onConfirm} onCancel={hideModal}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },

  // ── Profil Hero ──
  profilHero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#111111',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  avatarDis: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: '#ffd80044',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontWeight: '800', color: '#ffd800', letterSpacing: 1 },
  heroMetin: { flex: 1 },
  heroAd: { fontSize: 17, fontWeight: '700', color: '#ffffff', marginBottom: 3 },
  heroEmail: { fontSize: 12, color: '#555555' },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    marginHorizontal: 12, marginTop: 10, marginBottom: 10,
    borderRadius: 10, padding: 4,
    height: 46,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 38, paddingHorizontal: 4, borderRadius: 7, gap: 4,
  },
  tabBtnAktif: { backgroundColor: '#ffd800' },
  tabTxt: { fontSize: 12, fontWeight: '600', color: '#555555' },
  tabTxtAktif: { color: '#000000' },
  tabSayi: {
    backgroundColor: '#222222', borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  tabSayiAktif: { backgroundColor: '#000000' },
  tabSayiTxt: { fontSize: 10, fontWeight: '700', color: '#666666' },
  tabSayiTxtAktif: { color: '#ffffff' },

  // ── Profil Sekmesi ──
  sekmeScroll: { flex: 1, paddingHorizontal: 12, paddingTop: 2 },

  profilOzetKart: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#141414', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#2a2a2a',
    marginTop: 10,
  },
  profilOzetAvatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: '#ffd80033',
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  profilOzetMetin: { flex: 1, gap: 3 },
  profilOzetAd: { fontSize: 15, fontWeight: '700', color: '#e0e0e0' },
  profilOzetEmail: { fontSize: 12, color: '#555555' },
  profilOzetTelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  profilOzetTel: { fontSize: 12, color: '#555555' },
  duzenleIkonBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ffd80012', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#ffd80033',
  },

  bilgiKart: {
    backgroundColor: '#141414', borderRadius: 14,
    borderWidth: 1, borderColor: '#2a2a2a', overflow: 'hidden',
  },
  bilgiBaslik: {
    fontSize: 11, fontWeight: '700', color: '#444444',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  bilgiSatir: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  bilgiIkonWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#ffffff08', alignItems: 'center', justifyContent: 'center',
  },
  bilgiIcerik: { flex: 1, gap: 3 },
  bilgiEtiket: { fontSize: 10, color: '#555555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  bilgiDeger: { fontSize: 14, color: '#e0e0e0', fontWeight: '500' },
  bilgiInput: {
    fontSize: 14,
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#0d0d0d',
  },
  bilgiAyrac: { height: 1, backgroundColor: '#1a1a1a', marginHorizontal: 14 },
  rolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ffd80015', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#ffd80033',
  },
  adminBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#ffd800' },
  hataSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4,
  },
  hataMetni: { fontSize: 12, color: '#ff4444' },

  btnSatir: { flexDirection: 'row', gap: 10 },
  aksiBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 14, gap: 6,
  },
  duzenleBtn: { backgroundColor: '#ffd800' },
  kaydetBtn: { backgroundColor: '#ffd800' },
  iptalBtn: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a' },
  aksiTxt: { fontSize: 14, fontWeight: '700', color: '#000000' },

  cikisBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#141414', borderRadius: 12, paddingVertical: 14, gap: 8,
    borderWidth: 1, borderColor: '#ff444433',
  },
  cikisTxt: { fontSize: 14, fontWeight: '700', color: '#ff4444' },

  // ── Liste ──
  liste: { paddingHorizontal: 12, paddingBottom: 24, gap: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statKart: {
    flex: 1, backgroundColor: '#141414', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  statSayi: { fontSize: 22, fontWeight: '800', color: '#ffd800' },
  statEtiket: { fontSize: 10, color: '#555555', textAlign: 'center' },

  kart: {
    backgroundColor: '#141414', borderRadius: 12,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  kartSerit: { width: 3 },
  kartBody: { flex: 1, padding: 12, gap: 8 },
  kartUstRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kartTarih: { flex: 1, fontSize: 13, fontWeight: '600', color: '#cccccc' },
  sahaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#222222', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  sahaBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#888888' },
  bekleyenBadge: {
    backgroundColor: '#1a1a1a', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  bekleyenBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#888888' },

  zamanRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  zamanBlok: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  zamanIkon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  zamanEtiket: { fontSize: 9, color: '#444444', textTransform: 'uppercase', fontWeight: '700' },
  zamanDeger: { fontSize: 12, fontWeight: '600', color: '#cccccc' },
  sureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1a1a1a', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  sureTxt: { fontSize: 11, fontWeight: '600', color: '#888888' },

  turIkon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
  ekipmanAd: { flex: 1, fontSize: 14, fontWeight: '600', color: '#e0e0e0' },
  durumPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  durumDot: { width: 5, height: 5, borderRadius: 3 },
  durumTxt: { fontSize: 10, fontWeight: '700' },

  bosOrta: { alignItems: 'center', paddingTop: 60, gap: 12 },
  bosMetin: { fontSize: 15, color: '#333333', fontWeight: '500' },

  listeFooter: { paddingVertical: 16, alignItems: 'center', gap: 6, flexDirection: 'row', justifyContent: 'center' },
  listeFooterTxt: { fontSize: 13, color: '#555555' },
});
