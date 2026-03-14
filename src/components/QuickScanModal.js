import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';

const { height: SCREEN_H } = Dimensions.get('window');
const VF_SIZE = 240;

const TURLER_MAP = {
  'Kamera':       { icon: 'camera-alt',       renk: '#6366f1' },
  'Lens':         { icon: 'center-focus-weak', renk: '#0ea5e9' },
  'Dron':         { icon: 'flight',            renk: '#8b5cf6' },
  'Ses':          { icon: 'mic',               renk: '#10b981' },
  'Işık':         { icon: 'wb-sunny',          renk: '#f97316' },
  'Işık Ekpmanı': { icon: 'wb-incandescent',  renk: '#f59e0b' },
  'Softbox':      { icon: 'brightness-5',      renk: '#ec4899' },
  'Reflektör':    { icon: 'flare',             renk: '#14b8a6' },
  'Prompter':     { icon: 'subtitles',         renk: '#a78bfa' },
  'Tripot':       { icon: 'photo-camera',      renk: '#64748b' },
};

export default function QuickScanModal({
  visible, items, currentUser, userProfile,
  processingId, onTeslimAl, onTeslimEt, onClose, onFetchItem,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState('scan');
  const [foundItem, setFoundItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const scanLock = useRef(false);

  // Animasyonlar
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef(null);
  const panelSlide = useRef(new Animated.Value(300)).current;
  const panelFade  = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.92)).current;
  const overlayFade = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;

  // Reset
  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  // Tarama çizgisi döngüsü
  useEffect(() => {
    if (phase === 'scan') {
      startScanLine();
      startPulse();
    } else {
      stopScanLine();
    }
    return stopScanLine;
  }, [phase]);

  // Panel animasyonu
  useEffect(() => {
    if (phase === 'found') {
      panelSlide.setValue(300);
      panelFade.setValue(0);
      resultScale.setValue(0.92);
      Animated.parallel([
        Animated.spring(panelSlide, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
        Animated.timing(panelFade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(resultScale, { toValue: 1, tension: 60, friction: 11, useNativeDriver: true }),
      ]).start();
    }
    if (phase === 'notFound' || phase === 'done' || phase === 'error' || phase === 'loading') {
      overlayFade.setValue(0);
      Animated.timing(overlayFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [phase]);

  const startScanLine = () => {
    scanLineAnim.setValue(0);
    scanLineLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1, duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0, duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    scanLineLoop.current.start();
  };

  const stopScanLine = () => {
    if (scanLineLoop.current) {
      scanLineLoop.current.stop();
      scanLineLoop.current = null;
    }
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  };

  const reset = () => {
    setPhase('scan');
    setFoundItem(null);
    setErrorMsg('');
    scanLock.current = false;
    panelSlide.setValue(300);
    panelFade.setValue(0);
    overlayFade.setValue(0);
    pulseAnim.setValue(1);
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;

    console.log('[QuickScan] Okunan QR data:', data);
    console.log('[QuickScan] Cache item sayısı:', items?.length);

    // 1) Önce yüklü cache'de ara
    let item = items?.find((i) => i.id === data || i._docId === data) ?? null;
    console.log('[QuickScan] Cache sonucu:', item ? `${item.ad}` : 'YOK');

    // 2) Cache'de yoksa doğrudan Firestore'dan çek
    if (!item && onFetchItem) {
      setPhase('loading');
      item = await onFetchItem(data);
      console.log('[QuickScan] Firestore sonucu:', item ? `${item.ad}` : 'YOK');
    }

    if (item) {
      setFoundItem(item);
      setPhase('found');
    } else {
      setPhase('notFound');
      setTimeout(() => {
        overlayFade.setValue(0);
        setPhase('scan');
        scanLock.current = false;
      }, 1800);
    }
  };

  const handleRetry = () => {
    setFoundItem(null);
    overlayFade.setValue(0);
    panelSlide.setValue(300);
    panelFade.setValue(0);
    setPhase('scan');
    scanLock.current = false;
  };

  const handleAl = async () => {
    setPhase('loading');
    const result = await onTeslimAl(foundItem);
    if (result?.error) {
      setErrorMsg('Teslim alma başarısız.');
      setPhase('error');
    } else {
      setPhase('done');
      setTimeout(onClose, 1400);
    }
  };

  const handleEt = async () => {
    setPhase('loading');
    const result = await onTeslimEt(foundItem);
    if (result?.error) {
      setErrorMsg('Teslim etme başarısız.');
      setPhase('error');
    } else {
      setPhase('done');
      setTimeout(onClose, 1400);
    }
  };

  if (!visible) return null;

  // İzin yok
  if (!permission || !permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent>
        <View style={s.permWrap}>
          <View style={s.permIconWrap}>
            <MaterialIcons name="camera-alt" size={38} color="#ffd800" />
          </View>
          <Text style={s.permTitle}>Kamera İzni Gerekli</Text>
          <Text style={s.permMsg}>QR kodu taramak için kamera erişimine ihtiyaç var.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <MaterialIcons name="check" size={18} color="#0f172a" />
            <Text style={s.permBtnTxt}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={s.cancelLink}>
            <Text style={s.cancelLinkTxt}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const tur = foundItem ? (TURLER_MAP[foundItem.tur] || { icon: 'inventory', renk: '#64748b' }) : null;
  const ofiste = foundItem?.durum === 'ofiste';
  const bende   = foundItem?.kimde === currentUser?.uid;

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, VF_SIZE - 2],
  });

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={s.root}>

        {/* ── KATMAN 1: Kamera (tam ekran, her şeyin altında) ── */}
        {phase === 'scan' && (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
        )}
        {phase !== 'scan' && <View style={s.darkBg} />}

        {/* ── KATMAN 2: Scan UI (maske + viewfinder) ── */}
        {phase === 'scan' && (
          <View style={StyleSheet.absoluteFill}>
            {/* Üst maske */}
            <View style={s.maskTop} />
            {/* Orta satır */}
            <View style={s.maskRow}>
              <View style={s.maskSide} />
              <Animated.View style={[s.vfBox, { transform: [{ scale: pulseAnim }] }]}>
                <View style={[s.c, s.cTL]} /><View style={[s.c, s.cTR]} />
                <View style={[s.c, s.cBL]} /><View style={[s.c, s.cBR]} />
                <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLineY }] }]} />
              </Animated.View>
              <View style={s.maskSide} />
            </View>
            {/* Alt maske + ipucu */}
            <View style={s.maskBottom}>
              <Text style={s.hintTitle}>QR Kodu Okutun</Text>
              <Text style={s.hintSub}>Çerçeveyi ekipmandaki QR kodun üzerine getirin</Text>
            </View>
          </View>
        )}

        {/* ── KATMAN 3: Durum overlay'leri ── */}
        {phase === 'notFound' && (
          <Animated.View style={[s.stateWrap, { opacity: overlayFade }]}>
            <View style={s.stateIconWrap}>
              <MaterialIcons name="search-off" size={48} color="#ef4444" />
            </View>
            <Text style={s.stateTitle}>Kayıt Bulunamadı</Text>
            <Text style={s.stateSub}>Bu QR kodu sistemde tanımlı değil</Text>
          </Animated.View>
        )}
        {phase === 'loading' && (
          <Animated.View style={[s.stateWrap, { opacity: overlayFade }]}>
            <ActivityIndicator size="large" color="#ffd800" style={{ marginBottom: 16 }} />
            <Text style={s.stateTitle}>İşlem yapılıyor</Text>
            <Text style={s.stateSub}>Lütfen bekleyin...</Text>
          </Animated.View>
        )}
        {phase === 'done' && (
          <Animated.View style={[s.stateWrap, { opacity: overlayFade }]}>
            <View style={[s.stateIconWrap, s.stateIconGreen]}>
              <MaterialIcons name="check" size={48} color="#10b981" />
            </View>
            <Text style={[s.stateTitle, { color: '#10b981' }]}>Başarılı!</Text>
            <Text style={s.stateSub}>İşlem tamamlandı</Text>
          </Animated.View>
        )}
        {phase === 'error' && (
          <Animated.View style={[s.stateWrap, { opacity: overlayFade }]}>
            <View style={[s.stateIconWrap, s.stateIconRed]}>
              <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            </View>
            <Text style={s.stateTitle}>{errorMsg}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={handleRetry}>
              <MaterialIcons name="refresh" size={16} color="#f8fafc" />
              <Text style={s.retryBtnTxt}>Tekrar Dene</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── KATMAN 4: Header (en üstte) ── */}
        <View style={s.header}>
          <View style={s.headerBadge}>
            <MaterialIcons name="qr-code-scanner" size={16} color="#ffd800" />
            <Text style={s.headerBadgeTxt}>Hızlı Tarat</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialIcons name="close" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* ── KATMAN 5: Sonuç ekranı (tam ekran) ── */}
        {phase === 'found' && foundItem && (
          <Animated.View style={[s.resultScreen, { opacity: panelFade, transform: [{ translateY: panelSlide }] }]}>

            {/* Üst alan — büyük ikon */}
            <View style={s.resultTop}>
              <Animated.View style={[s.resultBigIconWrap, { backgroundColor: tur.renk + '18', transform: [{ scale: resultScale }] }]}>
                <View style={[s.resultBigIconInner, { backgroundColor: tur.renk + '30' }]}>
                  <MaterialIcons name={tur.icon} size={52} color={tur.renk} />
                </View>
              </Animated.View>
              <View style={[s.durumBadge, ofiste ? s.durumOfiste : s.durumDisarida, { marginTop: 16 }]}>
                <View style={[s.durumDot, ofiste ? s.dotGreen : s.dotAmber]} />
                <Text style={[s.durumBadgeTxt, ofiste ? s.txtGreen : s.txtAmber]}>
                  {ofiste ? 'Ofiste' : 'Dışarıda'}
                </Text>
              </View>
              <Text style={s.resultItemName}>{foundItem.ad}</Text>
              {foundItem.id && <Text style={s.resultItemId}>#{foundItem.id}</Text>}
            </View>

            {/* Alt alan — bilgi + butonlar */}
            <View style={s.resultBottom}>

              {/* Kimde / ne zaman */}
              {!ofiste && (
                <View style={s.infoBlok}>
                  <View style={s.infoSatir}>
                    <View style={[s.infoIkon, bende ? s.infoIkonBende : s.infoIkonNormal]}>
                      <MaterialIcons name="person" size={14} color={bende ? '#a5b4fc' : '#94a3b8'} />
                    </View>
                    <Text style={[s.infoTxt, bende && { color: '#a5b4fc' }]}>
                      {bende ? 'Sizde bulunuyor' : (foundItem.kimdeAd || 'Bilinmiyor')}
                    </Text>
                    {bende && <View style={s.benBadge}><Text style={s.benBadgeTxt}>Ben</Text></View>}
                  </View>
                  {foundItem.sonTeslimAlma && (
                    <View style={s.infoSatir}>
                      <View style={s.infoIkon}>
                        <MaterialIcons name="schedule" size={14} color="#f59e0b" />
                      </View>
                      <Text style={s.infoZaman}>{foundItem.sonTeslimAlma
                        ? new Date(foundItem.sonTeslimAlma).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '-'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Aksiyon butonları */}
              <View style={s.actionArea}>
                {ofiste ? (
                  <TouchableOpacity style={s.primaryBtn} onPress={handleAl} activeOpacity={0.85}>
                    <MaterialIcons name="add-shopping-cart" size={20} color="#0f172a" />
                    <Text style={s.primaryBtnTxt}>Teslim Al</Text>
                  </TouchableOpacity>
                ) : bende ? (
                  <TouchableOpacity style={[s.primaryBtn, s.primaryBtnRed]} onPress={handleEt} activeOpacity={0.85}>
                    <MaterialIcons name="keyboard-return" size={20} color="#fff" />
                    <Text style={[s.primaryBtnTxt, { color: '#fff' }]}>Teslim Et</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.lockedBox}>
                    <MaterialIcons name="lock-outline" size={16} color="#475569" />
                    <Text style={s.lockedTxt}>Başka bir kullanıcıda — işlem yapılamaz</Text>
                  </View>
                )}
                <TouchableOpacity style={s.secondaryBtn} onPress={handleRetry} activeOpacity={0.75}>
                  <MaterialIcons name="qr-code-scanner" size={16} color="#64748b" />
                  <Text style={s.secondaryBtnTxt}>Farklı QR Tarat</Text>
                </TouchableOpacity>
              </View>
            </View>

          </Animated.View>
        )}

      </View>
    </Modal>
  );
}

// ── Stiller ──────────────────────────────────────────────────────────────────
const CORNER_SZ = 28;
const BORDER_W  = 3;
const MASK_SIDE = (Dimensions.get('window').width - VF_SIZE) / 2;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Header — kamera üzerinde floating
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 18,
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#00000088', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: '#ffffff15',
  },
  headerBadgeTxt: { fontSize: 14, fontWeight: '700', color: '#f8fafc' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#ffffff15',
  },

  darkBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0f172a' },

  // Karartma maskeleri
  maskTop: { height: SCREEN_H * 0.35, backgroundColor: '#000000bb' },
  maskRow: { height: VF_SIZE, flexDirection: 'row' },
  maskSide: { width: MASK_SIDE, backgroundColor: '#000000bb' },
  maskBottom: {
    flex: 1, backgroundColor: '#000000bb',
    alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: 28, paddingHorizontal: 32, gap: 6,
  },
  hintTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  hintSub:   { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 19 },

  // Viewfinder
  vfBox: {
    width: VF_SIZE, height: VF_SIZE,
    position: 'relative', overflow: 'hidden',
  },
  c: { position: 'absolute', width: CORNER_SZ, height: CORNER_SZ, borderColor: '#ffd800' },
  cTL: { top: 0, left: 0, borderTopWidth: BORDER_W, borderLeftWidth: BORDER_W, borderTopLeftRadius: 6 },
  cTR: { top: 0, right: 0, borderTopWidth: BORDER_W, borderRightWidth: BORDER_W, borderTopRightRadius: 6 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: BORDER_W, borderLeftWidth: BORDER_W, borderBottomLeftRadius: 6 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: BORDER_W, borderRightWidth: BORDER_W, borderBottomRightRadius: 6 },

  // Tarama çizgisi
  scanLine: {
    position: 'absolute', left: 0, right: 0,
    height: 2,
    backgroundColor: '#ffd800',
    shadowColor: '#ffd800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },

  // Durum ekranları (loading, done, error, notFound)
  stateWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172aee',
    alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 32,
  },
  stateIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#ef444422',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  stateIconGreen: { backgroundColor: '#10b98122' },
  stateIconRed:   { backgroundColor: '#ef444422' },
  stateTitle: { fontSize: 20, fontWeight: '800', color: '#f8fafc', textAlign: 'center' },
  stateSub:   { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },

  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 16, backgroundColor: '#1e293b',
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 12, borderWidth: 1, borderColor: '#334155',
  },
  retryBtnTxt: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },

  // Sonuç tam ekran
  resultScreen: {
    ...StyleSheet.absoluteFillObject, zIndex: 20,
    backgroundColor: '#0f172a',
    flexDirection: 'column',
  },
  resultTop: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, paddingHorizontal: 32, gap: 8,
  },
  resultBigIconWrap: {
    width: 120, height: 120, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  resultBigIconInner: {
    width: 90, height: 90, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  resultItemName: {
    fontSize: 22, fontWeight: '800', color: '#f8fafc',
    textAlign: 'center', lineHeight: 28, marginTop: 4,
  },
  resultItemId: { fontSize: 13, color: '#475569', fontWeight: '600' },

  durumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  durumOfiste:  { backgroundColor: '#052e16' },
  durumDisarida: { backgroundColor: '#451a03' },
  durumDot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: '#10b981' },
  dotAmber: { backgroundColor: '#f59e0b' },
  durumBadgeTxt: { fontSize: 12, fontWeight: '700' },
  txtGreen: { color: '#10b981' },
  txtAmber: { color: '#f59e0b' },

  resultBottom: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderTopColor: '#334155',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34,
    marginBottom: 26,
    gap: 14,
  },

  // Kimde / zaman bilgi bloğu
  infoBlok: {
    backgroundColor: '#0f172a', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    gap: 8, borderWidth: 1, borderColor: '#334155',
  },
  infoSatir: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIkon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  infoIkonBende: { backgroundColor: '#312e81' },
  infoIkonNormal: { backgroundColor: '#1e293b' },
  infoTxt: { flex: 1, fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  infoZaman: { flex: 1, fontSize: 12, color: '#cbd5e1', fontWeight: '500' },
  benBadge: { backgroundColor: '#312e81', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  benBadgeTxt: { fontSize: 10, color: '#a5b4fc', fontWeight: '700' },

  // Aksiyon
  actionArea: { gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffd800', borderRadius: 14,
    paddingVertical: 15, gap: 9,
    shadowColor: '#ffd800', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  primaryBtnRed: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  primaryBtnTxt: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  lockedBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1e293b', borderRadius: 14,
    paddingVertical: 15, borderWidth: 1, borderColor: '#334155',
  },
  lockedTxt: { fontSize: 13, color: '#475569' },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  secondaryBtnTxt: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  // İzin ekranı
  permWrap: {
    flex: 1, backgroundColor: '#0f172a',
    alignItems: 'center', justifyContent: 'center',
    padding: 36, gap: 14,
  },
  permIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#ffd80018', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  permTitle: { fontSize: 20, fontWeight: '800', color: '#f8fafc', textAlign: 'center' },
  permMsg:   { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  permBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ffd800', paddingVertical: 13, paddingHorizontal: 36,
    borderRadius: 14, marginTop: 12,
  },
  permBtnTxt: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  cancelLink: { padding: 10 },
  cancelLinkTxt: { fontSize: 14, color: '#475569' },
});
