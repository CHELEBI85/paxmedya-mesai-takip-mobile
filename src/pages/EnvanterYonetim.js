import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEnvanter } from '../hooks/useEnvanter';
import { useAuth } from '../hooks/useAuth';
import { useSelector } from 'react-redux';
import ConfirmModal from '../components/ConfirmModal';
import QRScannerModal from '../components/QRScannerModal';
import QuickScanModal from '../components/QuickScanModal';
import * as Location from 'expo-location';
import { GEOFENCE_CONFIG } from '../config/appConfig';

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

const TURLER = [
  { key: 'Tümü',          icon: 'apps',             renk: '#ffd800' },
  { key: 'Kamera',        icon: 'camera-alt',       renk: '#6366f1' },
  { key: 'Lens',          icon: 'center-focus-weak',renk: '#0ea5e9' },
  { key: 'Dron',          icon: 'flight',            renk: '#8b5cf6' },
  { key: 'Ses',           icon: 'mic',               renk: '#10b981' },
  { key: 'Işık',          icon: 'wb-sunny',          renk: '#f97316' },
  { key: 'Işık Ekpmanı', icon: 'wb-incandescent',  renk: '#f59e0b' },
  { key: 'Softbox',       icon: 'brightness-5',      renk: '#ec4899' },
  { key: 'Reflektör',     icon: 'flare',             renk: '#14b8a6' },
  { key: 'Prompter',      icon: 'subtitles',         renk: '#a78bfa' },
  { key: 'Tripot',        icon: 'photo-camera',      renk: '#64748b' },
];

const TUR_MAP = Object.fromEntries(TURLER.map((t) => [t.key, t]));

const DURUM_FILTRELER = [
  { key: 'Tümü',    icon: 'list',        renk: '#94a3b8' },
  { key: 'Ofiste',  icon: 'store',       renk: '#10b981' },
  { key: 'Dışarıda',icon: 'directions-walk', renk: '#f59e0b' },
];

const fmtDT = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

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

const nezaman = (iso) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const gun = Math.floor(ms / 86400000);
  const saat = Math.floor(ms / 3600000);
  if (gun > 0) return `${gun} gün önce`;
  if (saat > 0) return `${saat} saat önce`;
  return 'Az önce';
};

const TurChip = React.memo(function TurChip({ tur, secili, sayi, onSec }) {
  const aktif = secili === tur.key;
  const renk = tur.renk;
  return (
    <TouchableOpacity
      onPress={() => onSec(tur.key)}
      style={[
        s.turChip,
        aktif ? { backgroundColor: renk, borderColor: renk } : { borderColor: renk + '44' },
      ]}
      activeOpacity={0.75}
    >
      <MaterialIcons name={tur.icon} size={18} color={aktif ? '#0f172a' : renk} />
      <Text style={[s.turChipTxt, aktif && { color: '#0f172a' }]}>{tur.key}</Text>
      {sayi > 0 && (
        <View style={[s.turChipSayi, aktif ? { backgroundColor: '#0f172a33' } : { backgroundColor: renk + '22' }]}>
          <Text style={[s.turChipSayiTxt, { color: aktif ? '#0f172a' : renk }]}>{sayi}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const EnvanterKart = React.memo(function EnvanterKart({ item, currentUser, processingId, onTeslimAl, onTeslimEt }) {
  const ofiste = item.durum === 'ofiste';
  const bende = item.kimde === currentUser?.uid;
  const tur = TUR_MAP[item.tur] || TUR_MAP['Tümü'];
  const renk = tur?.renk || '#64748b';
  const isLoading = processingId === item._docId;

  return (
    <View style={s.kart}>
      <View style={[s.kartSerit, { backgroundColor: renk }]} />
      <View style={s.kartBody}>
        <View style={s.kartUst}>
          <View style={[s.turIkonWrap, { backgroundColor: renk + '22' }]}>
            <MaterialIcons name={tur?.icon || 'inventory'} size={18} color={renk} />
          </View>
          <View style={s.kartAdWrap}>
            <Text style={s.kartAd} numberOfLines={2}>{item.ad}</Text>
            {item.id && <Text style={s.kartId}>#{item.id}</Text>}
          </View>
          <View style={[s.durumPill, ofiste ? s.durumPillOfiste : s.durumPillDisarida]}>
            <View style={[s.durumDot, ofiste ? s.dotOfiste : s.dotDisarida]} />
            <Text style={[s.durumPillTxt, ofiste ? s.durumTxtOfiste : s.durumTxtDisarida]}>
              {ofiste ? 'Ofiste' : 'Dışarıda'}
            </Text>
          </View>
        </View>

        {!ofiste && (
          <View style={s.disaridaBlok}>
            <View style={s.disaridaSatir}>
              <View style={[s.disaridaIkonKutu, bende ? s.disaridaIkonBende : s.disaridaIkonDiger]}>
                <MaterialIcons name="person" size={13} color={bende ? '#a5b4fc' : '#94a3b8'} />
              </View>
              <Text style={[s.disaridaKisi, bende && { color: '#a5b4fc' }]} numberOfLines={1}>
                {bende ? 'Sizde bulunuyor' : item.kimdeAd || 'Bilinmiyor'}
              </Text>
              {bende && <View style={s.bendeBadge}><Text style={s.bendeBadgeTxt}>Ben</Text></View>}
            </View>
            {item.sonTeslimAlma && (
              <View style={s.disaridaSatir}>
                <View style={s.disaridaIkonKutu}><MaterialIcons name="schedule" size={13} color="#f59e0b" /></View>
                <Text style={s.disaridaZaman}>{fmtDT(item.sonTeslimAlma)}</Text>
                <Text style={s.disaridaNezaman}> · {nezaman(item.sonTeslimAlma)}</Text>
              </View>
            )}
          </View>
        )}

        {ofiste && item.sonTeslimEtme && (
          <View style={s.kimdeRow}>
            <MaterialIcons name="history" size={14} color="#475569" />
            <Text style={s.kimdeZaman}>Son teslim: {fmtDT(item.sonTeslimEtme)}</Text>
          </View>
        )}

        <View style={s.kartDivider} />

        {ofiste ? (
          <TouchableOpacity
            style={[s.alBtn, isLoading && s.btnDis, { borderColor: renk + '66' }]}
            onPress={() => onTeslimAl(item)}
            disabled={isLoading || !!processingId}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={renk} />
            ) : (
              <><MaterialIcons name="add-shopping-cart" size={17} color={renk} /><Text style={[s.alBtnTxt, { color: renk }]}>Teslim Al</Text></>
            )}
          </TouchableOpacity>
        ) : bende ? (
          <TouchableOpacity
            style={[s.etBtn, isLoading && s.btnDis]}
            onPress={() => onTeslimEt(item)}
            disabled={isLoading || !!processingId}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <><MaterialIcons name="keyboard-return" size={17} color="#fff" /><Text style={s.etBtnTxt}>Teslim Et</Text></>
            )}
          </TouchableOpacity>
        ) : (
          <View style={s.pasifBtn}>
            <MaterialIcons name="lock-outline" size={15} color="#475569" />
            <Text style={s.pasifBtnTxt}>{item.kimdeAd || 'Bilinmiyor'} üzerinde</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const BendeKart = React.memo(function BendeKart({ item, processingId, onTeslimEt }) {
  const tur = TUR_MAP[item.tur];
  const renk = tur?.renk || '#64748b';
  const isLoading = processingId === item._docId;

  return (
    <View style={s.bendeKart}>
      <View style={[s.kartSerit, { backgroundColor: renk }]} />
      <View style={s.kartBody}>
        <View style={s.kartUst}>
          <View style={[s.turIkonWrap, { backgroundColor: renk + '22' }]}>
            <MaterialIcons name={tur?.icon || 'inventory'} size={18} color={renk} />
          </View>
          <View style={s.kartAdWrap}>
            <Text style={s.kartAd} numberOfLines={2}>{item.ad}</Text>
            {item.id && <Text style={s.kartId}>#{item.id}</Text>}
          </View>
        </View>
        <View style={s.disaridaBlok}>
          <View style={s.disaridaSatir}>
            <View style={[s.disaridaIkonKutu, s.disaridaIkonBende]}>
              <MaterialIcons name="person" size={13} color="#a5b4fc" />
            </View>
            <Text style={[s.disaridaKisi, { color: '#a5b4fc' }]}>Sizde bulunuyor</Text>
            <View style={s.bendeBadge}><Text style={s.bendeBadgeTxt}>Ben</Text></View>
          </View>
          {item.sonTeslimAlma && (
            <View style={s.disaridaSatir}>
              <View style={s.disaridaIkonKutu}><MaterialIcons name="schedule" size={13} color="#f59e0b" /></View>
              <Text style={s.disaridaZaman}>{fmtDT(item.sonTeslimAlma)}</Text>
              <Text style={s.disaridaNezaman}> · {nezaman(item.sonTeslimAlma)}</Text>
            </View>
          )}
        </View>
        <View style={s.kartDivider} />
        <TouchableOpacity
          style={[s.etBtn, isLoading && s.btnDis]}
          onPress={() => onTeslimEt(item)}
          disabled={isLoading || !!processingId}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <><MaterialIcons name="keyboard-return" size={17} color="#fff" /><Text style={s.etBtnTxt}>Teslim Et</Text></>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const HareketKart = React.memo(function HareketKart({ hareket }) {
  const teslimEdildi = !!hareket.teslimEtme;
  const sure = fmtSure(hareket.teslimAlma, hareket.teslimEtme);
  const tur = TUR_MAP[hareket.itemTur];
  const renk = tur?.renk || '#64748b';
  const durumRenk = teslimEdildi ? '#10b981' : '#f59e0b';

  return (
    <View style={s.hKart}>
      <View style={[s.hKartSerit, { backgroundColor: renk }]} />
      <View style={s.hKartBody}>
        <View style={s.hKartUst}>
          <View style={[s.hTurIkon, { backgroundColor: renk + '22' }]}>
            <MaterialIcons name={tur?.icon || 'inventory'} size={16} color={renk} />
          </View>
          <Text style={s.hKartAd} numberOfLines={1}>{hareket.itemAd}</Text>
          <View style={[s.hDurumPill, { backgroundColor: durumRenk + '18', borderColor: durumRenk + '44' }]}>
            <View style={[s.hDurumDot, { backgroundColor: durumRenk }]} />
            <Text style={[s.hDurumTxt, { color: durumRenk }]}>
              {teslimEdildi ? 'Teslim edildi' : 'Üzerinde'}
            </Text>
          </View>
        </View>
        <View style={s.hKullaniciRow}>
          <View style={s.hKullaniciIkon}><MaterialIcons name="person" size={12} color="#a5b4fc" /></View>
          <Text style={s.hKullaniciAd}>{hareket.kullaniciAd}</Text>
        </View>
        <View style={s.hDivider} />
        <View style={s.hZamanRow}>
          <View style={s.hZamanBlok}>
            <View style={[s.hZamanIkonWrap, { backgroundColor: '#10b98118' }]}>
              <MaterialIcons name="login" size={13} color="#10b981" />
            </View>
            <View style={s.hZamanMetin}>
              <Text style={s.hZamanEtiket}>Alındı</Text>
              <Text style={s.hZamanDeger}>{fmtDT(hareket.teslimAlma)}</Text>
            </View>
          </View>
          <View style={s.hZamanOk}><MaterialIcons name="arrow-forward" size={13} color="#334155" /></View>
          <View style={s.hZamanBlok}>
            <View style={[s.hZamanIkonWrap, { backgroundColor: teslimEdildi ? '#ef444418' : '#f59e0b18' }]}>
              <MaterialIcons name="logout" size={13} color={teslimEdildi ? '#ef4444' : '#f59e0b'} />
            </View>
            <View style={s.hZamanMetin}>
              <Text style={s.hZamanEtiket}>Verildi</Text>
              <Text style={[s.hZamanDeger, !teslimEdildi && { color: '#f59e0b' }]}>
                {teslimEdildi ? fmtDT(hareket.teslimEtme) : 'Henüz verilmedi'}
              </Text>
            </View>
          </View>
        </View>
        {sure && (
          <View style={[s.hSureBadge, { backgroundColor: durumRenk + '12', borderColor: durumRenk + '30' }]}>
            <MaterialIcons name="schedule" size={12} color={durumRenk} />
            <Text style={[s.hSureTxt, { color: durumRenk }]}>
              {teslimEdildi ? `${sure} tutuldu` : `${sure} süredir üzerinde`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

export default function EnvanterYonetim() {
  const { user } = useAuth();
  const userProfile = useSelector((st) => st.database.userProfile);
  const {
    items, hareketler, loading, hareketlerLoading, processingId, error,
    getItems, getHareketler, handleTeslimAl, handleTeslimEt,
  } = useEnvanter();

  const [aktifSekme, setAktifSekme] = useState('ekipmanlar');
  const [refreshing, setRefreshing] = useState(false);
  const [secilenTur, setSecilenTur] = useState('Tümü');
  const [durumFiltre, setDurumFiltre] = useState('Tümü');
  const [aramaMetni, setAramaMetni] = useState('');
  const [gecmisArama, setGecmisArama] = useState('');
  const [isInZone, setIsInZone] = useState(null);

  useEffect(() => {
    let sub = null;
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted || status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 6000, distanceInterval: 15 },
        (loc) => {
          if (!mounted) return;
          const dist = calcDistance(
            { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
            GEOFENCE_CONFIG.center
          );
          setIsInZone(dist <= GEOFENCE_CONFIG.radius);
        }
      );
    })();
    return () => { mounted = false; if (sub) try { sub.remove(); } catch (_) {} };
  }, []);

  const [qrScanner, setQrScanner] = useState({ visible: false, item: null, mode: null });
  const [quickScan, setQuickScan] = useState(false);

  const MODAL_DEF = { visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Onayla', cancelText: 'İptal', destructive: false, hideCancel: false, onConfirm: null };
  const [modal, setModal] = useState(MODAL_DEF);
  const hideModal = useCallback(() => setModal((m) => ({ ...m, visible: false })), []);
  const showModal = useCallback((cfg) => setModal({ visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Onayla', cancelText: 'İptal', destructive: false, hideCancel: false, onConfirm: null, ...{ visible: true }, ...cfg }), []);
  const showInfo = useCallback((title, message, icon = 'info', iconColor = '#ef4444') =>
    showModal({ title, message, icon, iconColor, confirmText: 'Tamam', hideCancel: true }), [showModal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([getItems(), getHareketler()]);
    setRefreshing(false);
  }, [getItems, getHareketler]);

  const onTeslimAl = useCallback((item) => {
    if (!isInZone) {
      showInfo('Alan Dışındasınız', 'Ekipman teslim almak için ofis alanında olmanız gerekiyor.', 'location-off', '#ef4444');
      return;
    }
    showModal({
      icon: 'add-shopping-cart',
      iconColor: TUR_MAP[item.tur]?.renk || '#ffd800',
      title: 'Teslim Al',
      message: `"${item.ad}" adlı ekipmanı teslim almak istiyor musunuz?`,
      confirmText: 'Teslim Al',
      onConfirm: () => {
        hideModal();
        setQrScanner({ visible: true, item, mode: 'al' });
      },
    });
  }, [isInZone, showInfo, showModal, hideModal]);

  const onTeslimEt = useCallback((item) => {
    if (!isInZone) {
      showInfo('Alan Dışındasınız', 'Ekipman teslim etmek için ofis alanında olmanız gerekiyor.', 'location-off', '#ef4444');
      return;
    }
    showModal({
      icon: 'keyboard-return',
      iconColor: '#ef4444',
      title: 'Teslim Et',
      message: `"${item.ad}" adlı ekipmanı teslim etmek istiyor musunuz?`,
      confirmText: 'Teslim Et',
      destructive: true,
      onConfirm: () => {
        hideModal();
        setQrScanner({ visible: true, item, mode: 'et' });
      },
    });
  }, [isInZone, showInfo, showModal, hideModal]);

  const handleQRSuccess = useCallback(async () => {
    const { item, mode } = qrScanner;
    setQrScanner({ visible: false, item: null, mode: null });
    if (mode === 'al') {
      const displayName = userProfile?.displayName || user?.email || 'Bilinmiyor';
      const result = await handleTeslimAl(item._docId, user.uid, displayName, item.ad, item.tur);
      if (result.error) showInfo('Hata', 'Teslim alma başarısız.', 'error-outline', '#ef4444');
    } else {
      const result = await handleTeslimEt(item._docId, item.aktifHareketId);
      if (result.error) showInfo('Hata', 'Teslim etme başarısız.', 'error-outline', '#ef4444');
    }
  }, [qrScanner, userProfile, user, handleTeslimAl, handleTeslimEt, showInfo]);

  const bendeOlanlar = useMemo(() => items.filter((i) => i.kimde === user?.uid), [items, user]);

  const turSayilari = useMemo(() => {
    const map = {};
    items.forEach((i) => { map[i.tur] = (map[i.tur] || 0) + 1; });
    return map;
  }, [items]);

  const filtreliEkipmanlar = useMemo(() => {
    let list = [...items];
    if (secilenTur !== 'Tümü') list = list.filter((i) => i.tur === secilenTur);
    if (durumFiltre === 'Ofiste') list = list.filter((i) => i.durum === 'ofiste');
    else if (durumFiltre === 'Dışarıda') list = list.filter((i) => i.durum === 'disarida');
    if (aramaMetni.trim()) {
      const q = aramaMetni.toLowerCase();
      list = list.filter((i) => i.ad?.toLowerCase().includes(q) || i.id?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));
  }, [items, secilenTur, durumFiltre, aramaMetni]);

  const filtreliHareketler = useMemo(() => {
    if (!gecmisArama.trim()) return hareketler;
    const q = gecmisArama.toLowerCase();
    return hareketler.filter(
      (h) => h.itemAd?.toLowerCase().includes(q) || h.kullaniciAd?.toLowerCase().includes(q) || h.itemTur?.toLowerCase().includes(q)
    );
  }, [hareketler, gecmisArama]);

  const toplamOfiste = useMemo(() => items.filter((i) => i.durum === 'ofiste').length, [items]);
  const toplamDisarida = useMemo(() => items.filter((i) => i.durum === 'disarida').length, [items]);

  const renderEkipmanItem = useCallback(({ item }) => (
    <EnvanterKart item={item} currentUser={user} processingId={processingId} onTeslimAl={onTeslimAl} onTeslimEt={onTeslimEt} />
  ), [user, processingId, onTeslimAl, onTeslimEt]);

  const renderBendeItem = useCallback(({ item }) => (
    <BendeKart item={item} processingId={processingId} onTeslimEt={onTeslimEt} />
  ), [processingId, onTeslimEt]);

  const renderHareketItem = useCallback(({ item }) => (
    <HareketKart hareket={item} />
  ), []);

  const ekipmanKeyExtractor = useCallback((item) => item._docId, []);
  const hareketKeyExtractor = useCallback((item) => item._hareketId, []);

  const onQuickTeslimAl = useCallback(async (item) => {
    const displayName = userProfile?.displayName || user?.email || 'Bilinmiyor';
    return await handleTeslimAl(item._docId, user.uid, displayName, item.ad, item.tur);
  }, [userProfile, user, handleTeslimAl]);

  const onQuickTeslimEt = useCallback(async (item) => {
    return await handleTeslimEt(item._docId, item.aktifHareketId);
  }, [handleTeslimEt]);

  if (loading && items.length === 0) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#ffd800" />
        <Text style={s.loadingTxt}>Envanter yükleniyor...</Text>
      </View>
    );
  }

  const SEKMELER = [
    { key: 'ekipmanlar', label: 'Ekipmanlar', icon: 'inventory-2', sayi: items.length },
    { key: 'bende', label: 'Bende', icon: 'person-pin', sayi: bendeOlanlar.length, vurgu: bendeOlanlar.length > 0 },
    { key: 'gecmis', label: 'Geçmiş', icon: 'history', sayi: hareketler.length },
  ];

  const EkipmanlarHeader = (
    <>
      <View style={s.statsRow}>
        {[
          { icon: 'inventory', renk: '#ffd800', sayi: items.length, etiket: 'Toplam' },
          { icon: 'store', renk: '#10b981', sayi: toplamOfiste, etiket: 'Ofiste' },
          { icon: 'directions-walk', renk: '#f59e0b', sayi: toplamDisarida, etiket: 'Dışarıda' },
        ].map((st) => (
          <View key={st.etiket} style={s.statCard}>
            <MaterialIcons name={st.icon} size={18} color={st.renk} />
            <Text style={[s.statNum, { color: st.renk }]}>{st.sayi}</Text>
            <Text style={s.statLbl}>{st.etiket}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.taratBtn} onPress={() => setQuickScan(true)} activeOpacity={0.75}>
        <View style={s.taratSerit} />
        <View style={s.taratIkonKutu}><MaterialIcons name="qr-code-scanner" size={26} color="#ffd800" /></View>
        <View style={s.taratMetin}>
          <Text style={s.taratBaslik}>Hızlı Tarat</Text>
          <Text style={s.taratAlt}>QR okutarak ekipmanı bul ve işlem yap</Text>
        </View>
        <View style={s.taratOkKutu}><MaterialIcons name="chevron-right" size={22} color="#ffd800" /></View>
      </TouchableOpacity>

      <Text style={s.bolumBaslik}>Kategoriler</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.turScroll}>
        {TURLER.map((tur) => (
          <TurChip
            key={tur.key}
            tur={tur}
            secili={secilenTur}
            sayi={tur.key === 'Tümü' ? items.length : (turSayilari[tur.key] || 0)}
            onSec={(k) => { setSecilenTur(k); setAramaMetni(''); }}
          />
        ))}
      </ScrollView>

      <View style={s.durumFiltreSatir}>
        {DURUM_FILTRELER.map((f) => {
          const aktif = durumFiltre === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.durumFilterBtn, aktif && { backgroundColor: f.renk + '22', borderColor: f.renk }]}
              onPress={() => setDurumFiltre(f.key)}
            >
              <MaterialIcons name={f.icon} size={14} color={aktif ? f.renk : '#475569'} />
              <Text style={[s.durumFilterTxt, aktif && { color: f.renk }]}>{f.key}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={s.aramaWrapInline}>
          <MaterialIcons name="search" size={15} color="#64748b" />
          <TextInput style={s.aramaInputInline} placeholder="Ara..." placeholderTextColor="#475569" value={aramaMetni} onChangeText={setAramaMetni} />
          {aramaMetni.length > 0 && (
            <TouchableOpacity onPress={() => setAramaMetni('')}>
              <MaterialIcons name="close" size={15} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.sonucRow}>
        <Text style={s.sonucTxt}>
          {secilenTur !== 'Tümü' ? `${secilenTur} · ` : ''}{filtreliEkipmanlar.length} ekipman
        </Text>
      </View>

      {error && (
        <View style={s.errorBox}>
          <MaterialIcons name="error-outline" size={15} color="#ef4444" />
          <Text style={s.errorTxt}>{error}</Text>
        </View>
      )}
    </>
  );

  const EkipmanlarEmpty = (
    <View style={s.bos}>
      <MaterialIcons name="inventory-2" size={48} color="#1e293b" />
      <Text style={s.bosTxt}>Bu kategoride ekipman yok</Text>
    </View>
  );

  const BendeEmpty = (
    <View style={s.bosOrta}>
      <MaterialIcons name="check-circle" size={64} color="#1e293b" />
      <Text style={s.bosBuyuk}>Şu an üzerinizde ekipman yok</Text>
      <Text style={s.bosKucuk}>Ekipman almak için "Ekipmanlar" sekmesine gidin</Text>
    </View>
  );

  const GecmisHeader = (
    <>
      <View style={s.gecmisHeader}>
        <View>
          <Text style={s.gecmisBaslik}>Son 1 Ay</Text>
          <Text style={s.gecmisAlt}>{hareketler.length} hareket kaydı</Text>
        </View>
        {hareketlerLoading && <ActivityIndicator size="small" color="#ffd800" />}
      </View>
      <View style={s.aramaWrap}>
        <MaterialIcons name="search" size={17} color="#64748b" style={{ marginLeft: 10 }} />
        <TextInput style={s.aramaInput} placeholder="Ekipman veya kişi ara..." placeholderTextColor="#475569" value={gecmisArama} onChangeText={setGecmisArama} />
        {gecmisArama.length > 0 && (
          <TouchableOpacity onPress={() => setGecmisArama('')} style={{ marginRight: 10 }}>
            <MaterialIcons name="close" size={17} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const GecmisEmpty = hareketlerLoading ? (
    <View style={s.center}><ActivityIndicator size="large" color="#ffd800" /></View>
  ) : (
    <View style={s.bosOrta}>
      <MaterialIcons name="history" size={56} color="#1e293b" />
      <Text style={s.bosBuyuk}>Hareket kaydı bulunamadı</Text>
      <Text style={s.bosKucuk}>Son 1 ay içinde işlem yapılmamış</Text>
    </View>
  );

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" />;

  return (
    <View style={s.wrapper}>
      {isInZone !== null && (
        <View style={[s.konumBant, isInZone ? s.konumBantAlan : s.konumBantDisi]}>
          <MaterialIcons name={isInZone ? 'location-on' : 'location-off'} size={13} color={isInZone ? '#10b981' : '#ef4444'} />
          <Text style={[s.konumBantTxt, { color: isInZone ? '#10b981' : '#ef4444' }]}>
            {isInZone ? 'Alan içindesiniz — teslim al/et aktif' : 'Alan dışındasınız — teslim al/et pasif'}
          </Text>
        </View>
      )}

      <View style={s.sekmeCubugu}>
        {SEKMELER.map((sk) => {
          const aktif = aktifSekme === sk.key;
          return (
            <TouchableOpacity key={sk.key} style={[s.sekmeBtn, aktif && s.sekmeBtnAktif]} onPress={() => setAktifSekme(sk.key)}>
              <MaterialIcons name={sk.icon} size={14} color={aktif ? '#0f172a' : '#64748b'} />
              <Text style={[s.sekmeTxt, aktif && s.sekmeTxtAktif]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{sk.label}</Text>
              {sk.sayi > 0 && (
                <View style={[s.sayi, aktif ? s.sayiAktif : sk.vurgu ? s.sayiVurgu : s.sayiNormal]}>
                  <Text style={[s.sayiTxt, aktif ? s.sayiTxtAktif : sk.vurgu ? s.sayiTxtVurgu : s.sayiTxtNormal]}>{sk.sayi}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {aktifSekme === 'ekipmanlar' && (
        <FlatList
          data={filtreliEkipmanlar}
          renderItem={renderEkipmanItem}
          keyExtractor={ekipmanKeyExtractor}
          ListHeaderComponent={EkipmanlarHeader}
          ListEmptyComponent={EkipmanlarEmpty}
          refreshControl={refreshControl}
          contentContainerStyle={s.liste}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
        />
      )}

      {aktifSekme === 'bende' && (
        <FlatList
          data={bendeOlanlar}
          renderItem={renderBendeItem}
          keyExtractor={ekipmanKeyExtractor}
          ListHeaderComponent={
            bendeOlanlar.length > 0 ? (
              <View style={s.bendeBaslik}>
                <MaterialIcons name="info-outline" size={14} color="#64748b" />
                <Text style={s.bendeBaslikTxt}>{bendeOlanlar.length} ekipman üzerinizdedir</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={BendeEmpty}
          refreshControl={refreshControl}
          contentContainerStyle={s.liste}
          initialNumToRender={10}
          removeClippedSubviews
        />
      )}

      {aktifSekme === 'gecmis' && (
        <FlatList
          data={filtreliHareketler}
          renderItem={renderHareketItem}
          keyExtractor={hareketKeyExtractor}
          ListHeaderComponent={GecmisHeader}
          ListEmptyComponent={GecmisEmpty}
          refreshControl={refreshControl}
          contentContainerStyle={[s.liste, { paddingLeft: 8 }]}
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
      <QuickScanModal
        visible={quickScan} items={items} currentUser={user} userProfile={userProfile}
        processingId={processingId} onTeslimAl={onQuickTeslimAl} onTeslimEt={onQuickTeslimEt}
        onClose={() => setQuickScan(false)}
      />
      <QRScannerModal
        visible={qrScanner.visible} item={qrScanner.item} mode={qrScanner.mode}
        onSuccess={handleQRSuccess}
        onCancel={() => setQrScanner({ visible: false, item: null, mode: null })}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  konumBant: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7 },
  konumBantAlan: { backgroundColor: '#052e1688' },
  konumBantDisi: { backgroundColor: '#7f1d1d44' },
  konumBantTxt: { fontSize: 12, fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#0f172a', paddingTop: 40 },
  loadingTxt: { fontSize: 14, color: '#64748b' },
  sekmeCubugu: { flexDirection: 'row', backgroundColor: '#1e293b', margin: 12, borderRadius: 12, padding: 4 },
  sekmeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 4, borderRadius: 9, gap: 4, overflow: 'hidden' },
  sekmeBtnAktif: { backgroundColor: '#ffd800' },
  sekmeTxt: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  sekmeTxtAktif: { color: '#0f172a' },
  sayi: { borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  sayiAktif: { backgroundColor: '#0f172a' },
  sayiVurgu: { backgroundColor: '#312e81' },
  sayiNormal: { backgroundColor: '#334155' },
  sayiTxt: { fontSize: 10, fontWeight: '700' },
  sayiTxtAktif: { color: '#ffd800' },
  sayiTxtVurgu: { color: '#a5b4fc' },
  sayiTxtNormal: { color: '#94a3b8' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, paddingVertical: 12, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLbl: { fontSize: 10, color: '#64748b', textAlign: 'center' },
  taratBtn: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 14,
    backgroundColor: '#1e293b', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ffd80033',
  },
  taratSerit: { width: 4, alignSelf: 'stretch', backgroundColor: '#ffd800' },
  taratIkonKutu: {
    width: 52, height: 52, margin: 12, backgroundColor: '#ffd80015', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffd80033',
  },
  taratMetin: { flex: 1, gap: 3, paddingVertical: 14 },
  taratBaslik: { fontSize: 15, fontWeight: '800', color: '#f8fafc' },
  taratAlt: { fontSize: 12, color: '#64748b', fontWeight: '400' },
  taratOkKutu: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffd80015',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  bolumBaslik: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 16, marginBottom: 8 },
  turScroll: { paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
  turChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, backgroundColor: '#1e293b',
  },
  turChipTxt: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },
  turChipSayi: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  turChipSayiTxt: { fontSize: 11, fontWeight: '700' },
  durumFiltreSatir: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6, marginBottom: 10 },
  durumFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b',
  },
  durumFilterTxt: { fontSize: 12, color: '#475569', fontWeight: '500' },
  aramaWrapInline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 8, paddingVertical: 5,
  },
  aramaInputInline: { flex: 1, fontSize: 12, color: '#f8fafc', padding: 0 },
  aramaWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', marginHorizontal: 12, borderRadius: 10, marginBottom: 12 },
  aramaInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#f8fafc', fontSize: 14 },
  sonucRow: { paddingHorizontal: 16, paddingBottom: 8 },
  sonucTxt: { fontSize: 12, color: '#475569' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7f1d1d22', marginHorizontal: 12, borderRadius: 8, padding: 10, gap: 8, marginBottom: 10 },
  errorTxt: { color: '#ef4444', fontSize: 13 },
  liste: { paddingHorizontal: 12, paddingBottom: 24, gap: 10 },
  bos: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  bosTxt: { fontSize: 14, color: '#334155' },
  bosOrta: { alignItems: 'center', paddingTop: 60, gap: 14, paddingHorizontal: 32 },
  bosBuyuk: { fontSize: 16, color: '#475569', fontWeight: '600', textAlign: 'center' },
  bosKucuk: { fontSize: 13, color: '#334155', textAlign: 'center' },
  kart: { backgroundColor: '#1e293b', borderRadius: 14, flexDirection: 'row', overflow: 'hidden' },
  kartSerit: { width: 4 },
  kartBody: { flex: 1, padding: 14, gap: 10 },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  turIkonWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kartAdWrap: { flex: 1 },
  kartAd: { fontSize: 15, fontWeight: '600', color: '#f8fafc', lineHeight: 20 },
  kartId: { fontSize: 11, color: '#475569', marginTop: 2 },
  kartDivider: { height: 1, backgroundColor: '#334155' },
  durumPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  durumPillOfiste: { backgroundColor: '#052e16' },
  durumPillDisarida: { backgroundColor: '#451a03' },
  durumDot: { width: 6, height: 6, borderRadius: 3 },
  dotOfiste: { backgroundColor: '#10b981' },
  dotDisarida: { backgroundColor: '#f59e0b' },
  durumPillTxt: { fontSize: 11, fontWeight: '600' },
  durumTxtOfiste: { color: '#10b981' },
  durumTxtDisarida: { color: '#f59e0b' },
  kimdeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0f172a', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8 },
  kimdeZaman: { fontSize: 11, color: '#475569' },
  disaridaBlok: {
    backgroundColor: '#0f172a', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, gap: 6,
    borderWidth: 1, borderColor: '#1e293b',
  },
  disaridaSatir: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  disaridaIkonKutu: { width: 22, height: 22, borderRadius: 6, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  disaridaIkonBende: { backgroundColor: '#312e81' },
  disaridaIkonDiger: { backgroundColor: '#1e293b' },
  disaridaKisi: { flex: 1, fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  disaridaZaman: { fontSize: 11, color: '#cbd5e1', fontWeight: '500' },
  disaridaNezaman: { fontSize: 11, color: '#475569' },
  bendeBadge: { backgroundColor: '#312e81', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  bendeBadgeTxt: { fontSize: 10, color: '#a5b4fc', fontWeight: '700' },
  alBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 9, gap: 7, borderWidth: 1.5, backgroundColor: '#0f172a',
  },
  alBtnTxt: { fontSize: 14, fontWeight: '700' },
  etBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 9, gap: 7, backgroundColor: '#ef4444',
  },
  etBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pasifBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 9, gap: 6, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
  },
  pasifBtnTxt: { fontSize: 12, color: '#475569' },
  btnDis: { opacity: 0.5 },
  bendeKart: { backgroundColor: '#1e293b', borderRadius: 14, flexDirection: 'row', overflow: 'hidden' },
  bendeBaslik: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  bendeBaslikTxt: { fontSize: 12, color: '#64748b' },
  gecmisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  gecmisBaslik: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  gecmisAlt: { fontSize: 12, color: '#64748b', marginTop: 2 },
  hKart: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 14, overflow: 'hidden' },
  hKartSerit: { width: 4 },
  hKartBody: { flex: 1, padding: 13, gap: 9 },
  hKartUst: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  hTurIkon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  hKartAd: { flex: 1, fontSize: 14, fontWeight: '700', color: '#f8fafc' },
  hDurumPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  hDurumDot: { width: 5, height: 5, borderRadius: 3 },
  hDurumTxt: { fontSize: 10, fontWeight: '700' },
  hKullaniciRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#0f172a', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10,
  },
  hKullaniciIkon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#312e81', alignItems: 'center', justifyContent: 'center' },
  hKullaniciAd: { fontSize: 12, color: '#a5b4fc', fontWeight: '600' },
  hDivider: { height: 1, backgroundColor: '#334155' },
  hZamanRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hZamanBlok: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  hZamanIkonWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  hZamanMetin: { flex: 1, gap: 2 },
  hZamanEtiket: { fontSize: 9, color: '#475569', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  hZamanDeger: { fontSize: 11, color: '#cbd5e1', fontWeight: '500', lineHeight: 15 },
  hZamanOk: { paddingTop: 6 },
  hSureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1,
  },
  hSureTxt: { fontSize: 11, fontWeight: '600' },
});
