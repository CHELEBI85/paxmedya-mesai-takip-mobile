import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * QRScannerModal — QR kod ile ekipman doğrulama
 *
 * Props:
 *  visible   boolean
 *  item      { _docId, id, ad, tur }
 *  mode      'al' | 'et'
 *  onSuccess () => void  — QR eşleşti
 *  onCancel  () => void  — kullanıcı iptal etti
 */
export default function QRScannerModal({ visible, item, mode, onSuccess, onCancel }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState('idle'); // idle | success | wrong
  const scanLock = useRef(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Modal kapanınca state sıfırla
  useEffect(() => {
    if (!visible) {
      setScanState('idle');
      scanLock.current = false;
      overlayOpacity.setValue(0);
    }
  }, [visible]);

  const showOverlay = (color, nextState) => {
    Animated.sequence([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setScanState(nextState);
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanLock.current || !item) return;
    scanLock.current = true;

    console.log('[QRScanner] Okunan QR data:', data);
    console.log('[QRScanner] item.id:', item.id);
    console.log('[QRScanner] item._docId:', item._docId);
    console.log('[QRScanner] Eşleşme:', data === item.id, '|', data === item._docId);

    const matched = data === item.id || data === item._docId;

    if (matched) {
      showOverlay('success', 'success');
      setTimeout(() => {
        onSuccess();
      }, 800);
    } else {
      showOverlay('wrong', 'wrong');
      setTimeout(() => {
        setScanState('idle');
        scanLock.current = false;
        overlayOpacity.setValue(0);
      }, 1500);
    }
  };

  const modeLabel = mode === 'al' ? 'Teslim Al' : 'Teslim Et';
  const modeColor = mode === 'al' ? '#ffd800' : '#ef4444';

  if (!visible) return null;

  // İzin ekranı
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent>
        <View style={s.permissionWrap}>
          <MaterialIcons name="camera-alt" size={56} color="#64748b" />
          <Text style={s.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={s.permissionMsg}>QR kod taramak için kamera erişimine ihtiyaç var.</Text>
          <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
            <Text style={s.permissionBtnTxt}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelLink} onPress={onCancel}>
            <Text style={s.cancelLinkTxt}>İptal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent>
        <View style={s.permissionWrap}>
          <MaterialIcons name="no-photography" size={56} color="#ef4444" />
          <Text style={s.permissionTitle}>Kamera İzni Yok</Text>
          <Text style={s.permissionMsg}>Ayarlardan kamera iznini etkinleştirin.</Text>
          <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
            <Text style={s.permissionBtnTxt}>Tekrar Dene</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelLink} onPress={onCancel}>
            <Text style={s.cancelLinkTxt}>İptal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const overlayColor =
    scanState === 'success' ? '#10b98166' :
    scanState === 'wrong'   ? '#ef444466' : 'transparent';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={s.container}>
        {/* Üst şerit */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={[s.modeBadge, { backgroundColor: modeColor + '22', borderColor: modeColor + '55' }]}>
              <MaterialIcons
                name={mode === 'al' ? 'add-shopping-cart' : 'keyboard-return'}
                size={14}
                color={modeColor}
              />
              <Text style={[s.modeBadgeTxt, { color: modeColor }]}>{modeLabel}</Text>
            </View>
            <Text style={s.headerItemAd} numberOfLines={1}>{item?.ad || ''}</Text>
          </View>
          <TouchableOpacity onPress={onCancel} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="close" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Kamera */}
        <View style={s.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanState === 'idle' ? handleBarCodeScanned : undefined}
          />

          {/* Overlay (success/wrong) */}
          {scanState !== 'idle' && (
            <Animated.View
              style={[s.stateOverlay, { backgroundColor: overlayColor, opacity: overlayOpacity }]}
            >
              {scanState === 'success' && (
                <View style={s.stateBox}>
                  <MaterialIcons name="check-circle" size={64} color="#10b981" />
                  <Text style={[s.stateTxt, { color: '#10b981' }]}>Doğrulandı</Text>
                </View>
              )}
              {scanState === 'wrong' && (
                <View style={s.stateBox}>
                  <MaterialIcons name="cancel" size={64} color="#ef4444" />
                  <Text style={[s.stateTxt, { color: '#ef4444' }]}>Yanlış Ekipman</Text>
                  <Text style={s.stateAlt}>Tekrar Deneyin</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Viewfinder */}
          {scanState === 'idle' && (
            <View style={s.viewfinderWrap}>
              <View style={s.viewfinder}>
                {/* Köşe çizgileri */}
                <View style={[s.corner, s.cornerTL]} />
                <View style={[s.corner, s.cornerTR]} />
                <View style={[s.corner, s.cornerBL]} />
                <View style={[s.corner, s.cornerBR]} />
              </View>
              <Text style={s.hintTxt}>QR kodu çerçeve içine getirin</Text>
            </View>
          )}
        </View>

        {/* Alt bilgi */}
        <View style={s.footer}>
          <MaterialIcons name="qr-code-scanner" size={18} color="#64748b" />
          <Text style={s.footerTxt}>
            {item?.id ? `Beklenen: #${item.id}` : 'QR kodu okutun'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const CORNER = 28;
const BORDER = 3;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  // Üst şerit
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  headerLeft: { flex: 1, gap: 4 },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeBadgeTxt: { fontSize: 12, fontWeight: '700' },
  headerItemAd: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Kamera
  cameraWrap: {
    flex: 1,
    position: 'relative',
  },
  stateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateBox: { alignItems: 'center', gap: 12 },
  stateTxt: { fontSize: 24, fontWeight: '800' },
  stateAlt: { fontSize: 16, color: '#ef4444', fontWeight: '500' },

  // Viewfinder
  viewfinderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  viewfinder: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#ffd800',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 6 },
  hintTxt: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: '#00000077',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // Alt
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  footerTxt: { fontSize: 13, color: '#64748b' },

  // İzin ekranı
  permissionWrap: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', textAlign: 'center' },
  permissionMsg: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  permissionBtn: {
    backgroundColor: '#ffd800',
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionBtnTxt: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cancelLink: { padding: 8 },
  cancelLinkTxt: { fontSize: 14, color: '#64748b' },
});
