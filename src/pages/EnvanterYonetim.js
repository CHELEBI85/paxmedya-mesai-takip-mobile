import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  InteractionManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEnvanter } from '../hooks/useEnvanter';
import { useAuth } from '../hooks/useAuth';
import { useSelector } from 'react-redux';
import ConfirmModal from '../components/ConfirmModal';
import FilterBottomSheet from '../components/FilterBottomSheet';
import QuickScanModal from '../components/QuickScanModal';
import QRScannerModal from '../components/QRScannerModal';
import { useLocation } from '../hooks/useLocation';


const TURLER = [
  { key: 'Tümü',          icon: 'apps',              renk: '#888888' },
  { key: 'Kamera',        icon: 'camera-alt',        renk: '#888888' },
  { key: 'Lens',          icon: 'center-focus-weak', renk: '#888888' },
  { key: 'Dron',          icon: 'flight',            renk: '#888888' },
  { key: 'Ses',           icon: 'mic',               renk: '#888888' },
  { key: 'Işık',          icon: 'wb-sunny',          renk: '#888888' },
  { key: 'Işık Ekpmanı', icon: 'wb-incandescent',  renk: '#888888' },
  { key: 'Softbox',       icon: 'brightness-5',      renk: '#888888' },
  { key: 'Reflektör',     icon: 'flare',             renk: '#888888' },
  { key: 'Prompter',      icon: 'subtitles',         renk: '#888888' },
  { key: 'Tripot',        icon: 'photo-camera',      renk: '#888888' },
];

const TUR_MAP = Object.fromEntries(TURLER.map((t) => [t.key, t]));


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


const EnvanterKart = React.memo(function EnvanterKart({ item, currentUser, isLoading, anyProcessing, onTeslimAl, onTeslimEt }) {
  const ofiste = item.durum === 'ofiste';
  const bende = item.kimde === currentUser?.uid;
  const tur = TUR_MAP[item.tur] || TUR_MAP['Tümü'];
  const renk = tur?.renk || '#64748b';

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
            style={[s.alBtn, isLoading && s.btnDis]}
            onPress={() => onTeslimAl(item)}
            disabled={isLoading || anyProcessing}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={renk} />
            ) : (
              <><MaterialIcons name="add-shopping-cart" size={17} color="#000" /><Text style={s.alBtnTxt}>Teslim Al</Text></>
            )}
          </TouchableOpacity>
        ) : bende ? (
          <TouchableOpacity
            style={[s.etBtn, isLoading && s.btnDis]}
            onPress={() => onTeslimEt(item)}
            disabled={isLoading || anyProcessing}
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

const BendeKart = React.memo(function BendeKart({ item, isLoading, anyProcessing, onTeslimEt }) {
  const tur = TUR_MAP[item.tur];
  const renk = tur?.renk || '#64748b';

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
          disabled={isLoading || anyProcessing}
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
  const renk = tur?.renk || '#555555';
  const durumRenk = teslimEdildi ? '#888888' : '#cccccc';

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
          <View style={s.hSureBadge}>
            <MaterialIcons name="schedule" size={12} color="#888888" />
            <Text style={s.hSureTxt}>
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
    items, hareketler, loading, loadingMore, hareketlerLoading, processingId, error,
    itemsHasMore, counts, countsLoading,
    getItemsFirstPage, getItemsFirstPageIfNeeded, getItemsNextPageForActiveTur,
    getHareketler, getHareketlerIfNeeded, getCounts, handleTeslimAl, handleTeslimEt,
    getItemByQRData,
  } = useEnvanter();

  const [aktifSekme, setAktifSekme] = useState('ekipmanlar');
  const [refreshing, setRefreshing] = useState(false);
  const [secilenTur, setSecilenTur] = useState('Tümü');
  const [durumFiltre, setDurumFiltre] = useState('Tümü');
  const [aramaMetni, setAramaMetni] = useState('');
  const [gecmisArama, setGecmisArama] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [pendingTur, setPendingTur] = useState('Tümü');
  const [pendingDurum, setPendingDurum] = useState('Tümü');
  const { isInZone, loading: locationLoading, refreshLocation } = useLocation();
  const isInZoneRef = useRef(isInZone);
  useEffect(() => { isInZoneRef.current = isInZone; }, [isInZone]);

  const [quickScan, setQuickScan] = useState(false);
  const [qrScan, setQrScan] = useState({ visible: false, item: null, mode: 'al', onSuccess: null });

  const MODAL_DEF = { visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Onayla', cancelText: 'İptal', destructive: false, hideCancel: false, onConfirm: null };
  const [modal, setModal] = useState(MODAL_DEF);
  const hideModal = useCallback(() => setModal((m) => ({ ...m, visible: false })), []);
  const showModal = useCallback((cfg) => setModal({ visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Onayla', cancelText: 'İptal', destructive: false, hideCancel: false, onConfirm: null, ...{ visible: true }, ...cfg }), []);
  const showInfo = useCallback((title, message, icon = 'info', iconColor = '#ef4444') =>
    showModal({ title, message, icon, iconColor, confirmText: 'Tamam', hideCancel: true }), [showModal]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      getItemsFirstPageIfNeeded(secilenTur);
      getHareketlerIfNeeded();
      getCounts();
    });
    return () => task.cancel();
  }, [secilenTur, getItemsFirstPageIfNeeded, getHareketlerIfNeeded, getCounts]);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([getItemsFirstPage(secilenTur), getHareketler(), getCounts(true)]);
    setRefreshing(false);
  }, [secilenTur, getItemsFirstPage, getHareketler, getCounts]);

  const onTeslimAl = useCallback((item) => {
    if (!isInZoneRef.current) {
      showInfo('Alan Dışındasınız', 'Ekipman teslim almak için ofis alanında olmanız gerekiyor.', 'location-off', '#ef4444');
      return;
    }
    setQrScan({
      visible: true,
      item,
      mode: 'al',
      onSuccess: async () => {
        setQrScan((q) => ({ ...q, visible: false }));
        const displayName = userProfile?.displayName || user?.email || 'Bilinmiyor';
        const result = await handleTeslimAl(item._docId, user.uid, displayName, item.ad, item.tur);
        if (result.error) showInfo('Hata', result.error || 'Teslim alma başarısız.', 'error-outline', '#ef4444');
      },
    });
  }, [showInfo, userProfile, user, handleTeslimAl]);

  const onTeslimEt = useCallback((item) => {
    if (!isInZoneRef.current) {
      showInfo('Alan Dışındasınız', 'Ekipman teslim etmek için ofis alanında olmanız gerekiyor.', 'location-off', '#ef4444');
      return;
    }
    setQrScan({
      visible: true,
      item,
      mode: 'et',
      onSuccess: async () => {
        setQrScan((q) => ({ ...q, visible: false }));
        const result = await handleTeslimEt(item._docId, item.aktifHareketId, user?.uid, item.tur);
        if (result.error) showInfo('Hata', result.error || 'Teslim etme başarısız.', 'error-outline', '#ef4444');
      },
    });
  }, [showInfo, handleTeslimEt, user]);

  const bendeOlanlar = useMemo(() => items.filter((i) => i.kimde === user?.uid), [items, user]);

  const turSayilari = useMemo(() => {
    const map = {};
    items.forEach((i) => { map[i.tur] = (map[i.tur] || 0) + 1; });
    return map;
  }, [items]);

  const filtreliEkipmanlar = useMemo(() => {
    // Tur filtresi artık sunucu taraflı — sadece durum ve arama client-side
    let list = [...items];
    if (durumFiltre === 'Ofiste') list = list.filter((i) => i.durum === 'ofiste');
    else if (durumFiltre === 'Dışarıda') list = list.filter((i) => i.durum === 'disarida');
    if (aramaMetni.trim()) {
      const q = aramaMetni.toLowerCase();
      list = list.filter((i) => i.ad?.toLowerCase().includes(q) || i.id?.toLowerCase().includes(q));
    }
    return list;
  }, [items, durumFiltre, aramaMetni]);

  const filtreliHareketler = useMemo(() => {
    if (!gecmisArama.trim()) return hareketler;
    const q = gecmisArama.toLowerCase();
    return hareketler.filter(
      (h) => h.itemAd?.toLowerCase().includes(q) || h.kullaniciAd?.toLowerCase().includes(q) || h.itemTur?.toLowerCase().includes(q)
    );
  }, [hareketler, gecmisArama]);

  const renderEkipmanItem = useCallback(({ item }) => (
    <EnvanterKart item={item} currentUser={user} isLoading={processingId === item._docId} anyProcessing={!!processingId} onTeslimAl={onTeslimAl} onTeslimEt={onTeslimEt} />
  ), [user, processingId, onTeslimAl, onTeslimEt]);

  const renderBendeItem = useCallback(({ item }) => (
    <BendeKart item={item} isLoading={processingId === item._docId} anyProcessing={!!processingId} onTeslimEt={onTeslimEt} />
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
    return await handleTeslimEt(item._docId, item.aktifHareketId, user?.uid, item.tur);
  }, [handleTeslimEt, user]);

  const onEkipmanEndReached = useCallback(() => {
    if (!itemsHasMore || loadingMore) return;
    getItemsNextPageForActiveTur();
  }, [itemsHasMore, loadingMore, getItemsNextPageForActiveTur]);

  const EkipmanListFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={s.footerLoader}>
        <ActivityIndicator size="small" color="#ffd800" />
        <Text style={s.footerLoaderTxt}>Yükleniyor...</Text>
      </View>
    );
  }, [loadingMore]);

  const SEKMELER = useMemo(() => [
    { key: 'ekipmanlar', label: 'Ekipmanlar', icon: 'inventory-2', sayi: items.length },
    { key: 'bende', label: 'Bende', icon: 'person-pin', sayi: bendeOlanlar.length, vurgu: bendeOlanlar.length > 0 },
    { key: 'gecmis', label: 'Geçmiş', icon: 'history', sayi: hareketler.length },
  ], [items.length, bendeOlanlar.length, hareketler.length]);

  const activeFilterCount = (secilenTur !== 'Tümü' ? 1 : 0) + (durumFiltre !== 'Tümü' ? 1 : 0);

  const EkipmanlarHeader = useMemo(() => (
    <>
      <View style={s.statsRow}>
        {[
          { icon: 'inventory', renk: '#ffd800', sayi: counts.total, etiket: 'Toplam' },
          { icon: 'store', renk: '#e0e0e0', sayi: counts.ofiste, etiket: 'Ofiste' },
          { icon: 'directions-walk', renk: '#888888', sayi: counts.disarida, etiket: 'Dışarıda' },
        ].map((st) => (
          <View key={st.etiket} style={s.statCard}>
            <MaterialIcons name={st.icon} size={18} color={st.renk} />
            {st.sayi === null
              ? <ActivityIndicator size="small" color={st.renk} style={{ marginVertical: 4 }} />
              : <Text style={[s.statNum, { color: st.renk }]}>{st.sayi}</Text>}
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

      {/* Arama + Filtre satırı */}
      <View style={s.aramaFiltreSatir}>
        <View style={s.aramaKutu}>
          <MaterialIcons name="search" size={17} color="#555555" />
          <TextInput
            style={s.aramaInputInline}
            placeholder="Ekipman ara..."
            placeholderTextColor="#444444"
            value={aramaMetni}
            onChangeText={setAramaMetni}
          />
          {aramaMetni.length > 0 && (
            <TouchableOpacity onPress={() => setAramaMetni('')}>
              <MaterialIcons name="close" size={15} color="#555555" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.filtreBtn, activeFilterCount > 0 && s.filtreBtnAktif]}
          onPress={() => { setPendingTur(secilenTur); setPendingDurum(durumFiltre); setFilterVisible(true); }}
          activeOpacity={0.75}
        >
          <MaterialIcons name="tune" size={18} color={activeFilterCount > 0 ? '#000000' : '#888888'} />
          {activeFilterCount > 0 && (
            <View style={s.filtreBadge}>
              <Text style={s.filtreBadgeTxt}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Aktif filtre etiketleri */}
      {activeFilterCount > 0 && (
        <View style={s.aktifFiltreSatir}>
          {secilenTur !== 'Tümü' && (
            <TouchableOpacity style={s.aktifFilteChip} onPress={() => { setSecilenTur('Tümü'); setAramaMetni(''); }} activeOpacity={0.75}>
              <Text style={s.aktifFilteChipTxt}>{secilenTur}</Text>
              <MaterialIcons name="close" size={12} color="#ffd800" />
            </TouchableOpacity>
          )}
          {durumFiltre !== 'Tümü' && (
            <TouchableOpacity style={s.aktifFilteChip} onPress={() => setDurumFiltre('Tümü')} activeOpacity={0.75}>
              <Text style={s.aktifFilteChipTxt}>{durumFiltre}</Text>
              <MaterialIcons name="close" size={12} color="#ffd800" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={s.sonucRow}>
        <Text style={s.sonucTxt}>{filtreliEkipmanlar.length} ekipman</Text>
      </View>

      {error && (
        <View style={s.errorBox}>
          <MaterialIcons name="error-outline" size={15} color="#ef4444" />
          <Text style={s.errorTxt}>{error}</Text>
        </View>
      )}
    </>
  ), [counts, aramaMetni, secilenTur, durumFiltre, activeFilterCount, filtreliEkipmanlar.length, error]);

  const EkipmanlarEmpty = useMemo(() => (
    <View style={s.bos}>
      <MaterialIcons name="inventory-2" size={48} color="#1e293b" />
      <Text style={s.bosTxt}>Bu kategoride ekipman yok</Text>
    </View>
  ), []);

  const BendeEmpty = useMemo(() => (
    <View style={s.bosOrta}>
      <MaterialIcons name="check-circle" size={64} color="#1e293b" />
      <Text style={s.bosBuyuk}>Şu an üzerinizde ekipman yok</Text>
      <Text style={s.bosKucuk}>Ekipman almak için "Ekipmanlar" sekmesine gidin</Text>
    </View>
  ), []);

  const GecmisHeader = useMemo(() => (
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
  ), [hareketler.length, hareketlerLoading, gecmisArama]);

  const GecmisEmpty = useMemo(() => hareketlerLoading ? (
    <View style={s.center}><ActivityIndicator size="large" color="#ffd800" /></View>
  ) : (
    <View style={s.bosOrta}>
      <MaterialIcons name="history" size={56} color="#1e293b" />
      <Text style={s.bosBuyuk}>Hareket kaydı bulunamadı</Text>
      <Text style={s.bosKucuk}>Son 1 ay içinde işlem yapılmamış</Text>
    </View>
  ), [hareketlerLoading]);

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" />,
    [refreshing, onRefresh]
  );

  if (loading && items.length === 0) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#ffd800" />
        <Text style={s.loadingTxt}>Envanter yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={s.wrapper}>
      <View style={[s.konumBant, isInZone ? s.konumBantAlan : s.konumBantDisi]}>
        <MaterialIcons name={isInZone ? 'location-on' : 'location-off'} size={13} color={isInZone ? '#ffffff' : '#ff4444'} />
        <Text style={[s.konumBantTxt, { flex: 1, color: isInZone ? '#ffffff' : '#ff4444' }]}>
          {isInZone ? 'Alan içindesiniz — teslim al/et aktif' : 'Alan dışındasınız — teslim al/et pasif'}
        </Text>
        <TouchableOpacity onPress={refreshLocation} disabled={locationLoading} style={s.konumTekrarBtn} activeOpacity={0.7}>
          {locationLoading
            ? <ActivityIndicator size="small" color="#64748b" />
            : <><MaterialIcons name="refresh" size={13} color="#64748b" /><Text style={s.konumTekrarTxt}>Tekrar</Text></>
          }
        </TouchableOpacity>
      </View>

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
          ListFooterComponent={EkipmanListFooter}
          refreshControl={refreshControl}
          onEndReached={onEkipmanEndReached}
          onEndReachedThreshold={0.3}
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

      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        turler={TURLER}
        secilenTur={pendingTur}
        durumFiltre={pendingDurum}
        onApply={(tur, durum) => {
          if (tur !== secilenTur) { setSecilenTur(tur); setAramaMetni(''); }
          setDurumFiltre(durum);
        }}
      />
      <ConfirmModal
        visible={modal.visible} icon={modal.icon} iconColor={modal.iconColor}
        title={modal.title} message={modal.message} confirmText={modal.confirmText}
        cancelText={modal.cancelText} destructive={modal.destructive}
        hideCancel={modal.hideCancel} onConfirm={modal.onConfirm} onCancel={hideModal}
      />
      <QuickScanModal
        visible={quickScan} items={items} currentUser={user} userProfile={userProfile}
        processingId={processingId} onTeslimAl={onQuickTeslimAl} onTeslimEt={onQuickTeslimEt}
        onClose={() => setQuickScan(false)} onFetchItem={getItemByQRData}
      />
      <QRScannerModal
        visible={qrScan.visible}
        item={qrScan.item}
        mode={qrScan.mode}
        onSuccess={qrScan.onSuccess}
        onCancel={() => setQrScan((q) => ({ ...q, visible: false }))}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#000000' },
  konumBant: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  konumBantAlan: { backgroundColor: '#111111' },
  konumBantDisi: { backgroundColor: '#111111' },
  konumBantTxt: { fontSize: 12, fontWeight: '500' },
  konumTekrarBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#1e1e1e' },
  konumTekrarTxt: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#000000', paddingTop: 40 },
  loadingTxt: { fontSize: 14, color: '#555555' },
  footerLoader: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  footerLoaderTxt: { fontSize: 13, color: '#555555' },
  sekmeCubugu: { flexDirection: 'row', backgroundColor: '#111111', margin: 12, borderRadius: 10, padding: 4 },
  sekmeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 4, borderRadius: 7, gap: 4, overflow: 'hidden' },
  sekmeBtnAktif: { backgroundColor: '#ffd800' },
  sekmeTxt: { fontSize: 12, fontWeight: '600', color: '#555555' },
  sekmeTxtAktif: { color: '#000000' },
  sayi: { borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  sayiAktif: { backgroundColor: '#000000' },
  sayiVurgu: { backgroundColor: '#2a2a2a' },
  sayiNormal: { backgroundColor: '#222222' },
  sayiTxt: { fontSize: 10, fontWeight: '700' },
  sayiTxtAktif: { color: '#ffffff' },
  sayiTxtVurgu: { color: '#cccccc' },
  sayiTxtNormal: { color: '#888888' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#141414', borderRadius: 10, paddingVertical: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#2a2a2a' },
  statNum: { fontSize: 20, fontWeight: '700' },
  statLbl: { fontSize: 10, color: '#555555', textAlign: 'center' },
  taratBtn: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 14,
    backgroundColor: '#141414', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ffd80033',
  },
  taratSerit: { width: 3, alignSelf: 'stretch', backgroundColor: '#ffd800' },
  taratIkonKutu: {
    width: 48, height: 48, margin: 12, backgroundColor: '#ffd80012', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffd80033',
  },
  taratMetin: { flex: 1, gap: 3, paddingVertical: 14 },
  taratBaslik: { fontSize: 14, fontWeight: '700', color: '#e0e0e0' },
  taratAlt: { fontSize: 12, color: '#555555', fontWeight: '400' },
  taratOkKutu: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffd80012',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  aramaFiltreSatir: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, marginBottom: 10 },
  aramaKutu: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#141414', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  aramaInputInline: { flex: 1, fontSize: 14, color: '#ffffff', padding: 0 },
  filtreBtn: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: '#141414',
    borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center',
  },
  filtreBtnAktif: { backgroundColor: '#ffd800', borderColor: '#ffd800' },
  filtreBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center',
  },
  filtreBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#ffd800' },
  aktifFiltreSatir: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  aktifFilteChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffd80015', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#ffd80033',
  },
  aktifFilteChipTxt: { fontSize: 12, fontWeight: '600', color: '#ffd800' },
  sonucRow: { paddingHorizontal: 16, paddingBottom: 8 },
  sonucTxt: { fontSize: 12, color: '#444444' },
  aramaWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', marginHorizontal: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#222222' },
  aramaInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#ffffff', fontSize: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ff444411', marginHorizontal: 12, borderRadius: 8, padding: 10, gap: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ff444433' },
  errorTxt: { color: '#ff4444', fontSize: 13 },
  liste: { paddingHorizontal: 12, paddingBottom: 24, gap: 10 },
  bos: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  bosTxt: { fontSize: 14, color: '#333333' },
  bosOrta: { alignItems: 'center', paddingTop: 60, gap: 14, paddingHorizontal: 32 },
  bosBuyuk: { fontSize: 16, color: '#555555', fontWeight: '600', textAlign: 'center' },
  bosKucuk: { fontSize: 13, color: '#333333', textAlign: 'center' },
  kart: { backgroundColor: '#141414', borderRadius: 12, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a2a' },
  kartSerit: { width: 3, color: '#ffd800' },
  kartBody: { flex: 1, padding: 14, gap: 10 },
  kartUst: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  turIkonWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
  kartAdWrap: { flex: 1 },
  kartAd: { fontSize: 15, fontWeight: '600', color: '#ffffff', lineHeight: 20 },
  kartId: { fontSize: 11, color: '#444444', marginTop: 2 },
  kartDivider: { height: 1, backgroundColor: '#1e1e1e' },
  durumPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4, borderWidth: 1 },
  durumPillOfiste: { backgroundColor: '#ffffff0a', borderColor: '#33333388' },
  durumPillDisarida: { backgroundColor: '#ffffff0a', borderColor: '#33333388' },
  durumDot: { width: 6, height: 6, borderRadius: 3 },
  dotOfiste: { backgroundColor: '#ffffff' },
  dotDisarida: { backgroundColor: '#888888' },
  durumPillTxt: { fontSize: 11, fontWeight: '600' },
  durumTxtOfiste: { color: '#ffffff' },
  durumTxtDisarida: { color: '#888888' },
  kimdeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#000000', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8 },
  kimdeZaman: { fontSize: 11, color: '#444444' },
  disaridaBlok: {
    backgroundColor: '#000000', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, gap: 6,
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  disaridaSatir: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  disaridaIkonKutu: { width: 22, height: 22, borderRadius: 6, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  disaridaIkonBende: { backgroundColor: '#2a2a2a' },
  disaridaIkonDiger: { backgroundColor: '#1a1a1a' },
  disaridaKisi: { flex: 1, fontSize: 12, color: '#888888', fontWeight: '600' },
  disaridaZaman: { fontSize: 11, color: '#cccccc', fontWeight: '500' },
  disaridaNezaman: { fontSize: 11, color: '#444444' },
  bendeBadge: { backgroundColor: '#2a2a2a', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  bendeBadgeTxt: { fontSize: 10, color: '#cccccc', fontWeight: '700' },
  alBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 7, borderWidth: 1, borderColor: '#3a3a3a', backgroundColor: '#ffd800',
  },
  alBtnTxt: { fontSize: 14, fontWeight: '600', color: '#000' },
  etBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 7, backgroundColor: '#ba1717',
  },
  etBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pasifBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 6, backgroundColor: '#000000', borderWidth: 1, borderColor: '#1e1e1e',
  },
  pasifBtnTxt: { fontSize: 12, color: '#444444' },
  btnDis: { opacity: 0.5},
  bendeKart: { backgroundColor: '#141414', borderRadius: 12, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a2a' },
  bendeBaslik: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  bendeBaslikTxt: { fontSize: 12, color: '#555555' },
  gecmisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  gecmisBaslik: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  gecmisAlt: { fontSize: 12, color: '#555555', marginTop: 2 },
  hKart: { flexDirection: 'row', backgroundColor: '#141414', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a2a' },
  hKartSerit: { width: 3 },
  hKartBody: { flex: 1, padding: 13, gap: 9 },
  hKartUst: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  hTurIkon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
  hKartAd: { flex: 1, fontSize: 14, fontWeight: '700', color: '#ffffff' },
  hDurumPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  hDurumDot: { width: 5, height: 5, borderRadius: 3 },
  hDurumTxt: { fontSize: 10, fontWeight: '700' },
  hKullaniciRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#000000', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10,
  },
  hKullaniciIkon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#222222', alignItems: 'center', justifyContent: 'center' },
  hKullaniciAd: { fontSize: 12, color: '#888888', fontWeight: '600' },
  hDivider: { height: 1, backgroundColor: '#1e1e1e' },
  hZamanRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hZamanBlok: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  hZamanIkonWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: '#1a1a1a' },
  hZamanMetin: { flex: 1, gap: 2 },
  hZamanEtiket: { fontSize: 9, color: '#444444', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  hZamanDeger: { fontSize: 11, color: '#cccccc', fontWeight: '500', lineHeight: 15 },
  hZamanOk: { paddingTop: 6 },
  hSureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1,
    backgroundColor: '#ffffff08', borderColor: '#22222288',
  },
  hSureTxt: { fontSize: 11, fontWeight: '600', color: '#888888' },
});
