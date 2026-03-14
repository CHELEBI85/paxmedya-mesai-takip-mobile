import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const DURUMLAR = [
  { key: 'Tümü', icon: 'list' },
  { key: 'Ofiste', icon: 'store' },
  { key: 'Dışarıda', icon: 'directions-walk' },
];

export default function FilterBottomSheet({ visible, onClose, turler, secilenTur, durumFiltre, onApply }) {
  const [localTur, setLocalTur] = useState(secilenTur);
  const [localDurum, setLocalDurum] = useState(durumFiltre);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLocalTur(secilenTur);
      setLocalDurum(durumFiltre);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[fs.backdrop, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[fs.sheet, { transform: [{ translateY: slideAnim }] }]}>
              {/* Handle */}
              <View style={fs.handle} />

              {/* Başlık */}
              <View style={fs.header}>
                <Text style={fs.headerTxt}>Filtrele</Text>
                <TouchableOpacity onPress={onClose} style={fs.closeBtn}>
                  <MaterialIcons name="close" size={20} color="#555555" />
                </TouchableOpacity>
              </View>

              {/* Kategori */}
              <Text style={fs.sectionTitle}>Kategori</Text>
              <View style={fs.chipGrid}>
                {turler.map((tur) => {
                  const aktif = localTur === tur.key;
                  return (
                    <TouchableOpacity
                      key={tur.key}
                      style={[fs.chip, aktif && fs.chipAktif]}
                      onPress={() => setLocalTur(tur.key)}
                      activeOpacity={0.75}
                    >
                      <MaterialIcons name={tur.icon} size={16} color={aktif ? '#000000' : '#555555'} />
                      <Text style={[fs.chipTxt, aktif && fs.chipTxtAktif]}>{tur.key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Durum */}
              <Text style={fs.sectionTitle}>Durum</Text>
              <View style={fs.durumRow}>
                {DURUMLAR.map((d) => {
                  const aktif = localDurum === d.key;
                  return (
                    <TouchableOpacity
                      key={d.key}
                      style={[fs.durumBtn, aktif && fs.durumBtnAktif]}
                      onPress={() => setLocalDurum(d.key)}
                      activeOpacity={0.75}
                    >
                      <MaterialIcons name={d.icon} size={16} color={aktif ? '#000000' : '#555555'} />
                      <Text style={[fs.durumTxt, aktif && fs.durumTxtAktif]}>{d.key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Butonlar */}
              <View style={fs.btnRow}>
                <TouchableOpacity
                  style={fs.sifirlaBtn}
                  onPress={() => { setLocalTur('Tümü'); setLocalDurum('Tümü'); }}
                  activeOpacity={0.75}
                >
                  <Text style={fs.sifirlaTxt}>Sıfırla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={fs.uygula}
                  onPress={() => { onApply(localTur, localDurum); onClose(); }}
                  activeOpacity={0.85}
                >
                  <Text style={fs.uygulaText}>Uygula</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const fs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end', marginBottom:30 },
  sheet: {
    backgroundColor: '#111111', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: 32, borderWidth: 1, borderColor: '#222222',
    borderBottomWidth: 0,
  },
  handle: { width: 36, height: 4, backgroundColor: '#333333', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  headerTxt: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#555555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  chipAktif: { backgroundColor: '#ffd800', borderColor: '#ffd800' },
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#555555' },
  chipTxtAktif: { color: '#000000' },
  durumRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  durumBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 10, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  durumBtnAktif: { backgroundColor: '#ffd800', borderColor: '#ffd800' },
  durumTxt: { fontSize: 13, fontWeight: '600', color: '#555555' },
  durumTxtAktif: { color: '#000000' },
  btnRow: { flexDirection: 'row', gap: 10 },
  sifirlaBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  sifirlaTxt: { fontSize: 14, fontWeight: '600', color: '#888888' },
  uygula: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#ffd800' },
  uygulaText: { fontSize: 14, fontWeight: '700', color: '#000000' },
});
