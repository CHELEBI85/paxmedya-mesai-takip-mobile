import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NOTIFICATION_CONFIG } from '../config/appConfig';

// Sabit liste: uygulamanın planladığı bildirimler (Expo'dan listeleyemiyoruz)
const SAATLIK_BILDIRIMLER = [
  { id: 'm1', saat: '09:15', baslik: 'Mesai Girişi', aciklama: 'Mesai giriş saati yaklaşıyor. Giriş yapmayı unutmayın!', tur: 'mesai' },
  { id: 'm2', saat: '09:45', baslik: 'Mesai Girişi', aciklama: 'Henüz giriş yapmadıysanız, lütfen giriş yapın!', tur: 'mesai' },
  { id: 'm3', saat: '18:15', baslik: 'Mesai Çıkışı', aciklama: 'Çıkış saati yaklaşıyor. Çıkış yapmayı unutmayın!', tur: 'mesai' },
  { id: 'm4', saat: '18:45', baslik: 'Mesai Çıkışı', aciklama: 'Henüz çıkış yapmadıysanız, lütfen çıkış yapın!', tur: 'mesai' },
];

const MOTIVASYON_BILDIRIM = {
  id: 'mot1',
  baslik: 'Saatlik motivasyon',
  aciklama: 'Hafta içi (Pzt–Cuma) her saat başı motivasyon mesajı gönderilir. Uygulama açıldığında günün kalan saatleri için planlanır.',
  tur: 'motivasyon',
};

const DIGER_BILDIRIMLER = [
  {
    id: 'eq1',
    baslik: 'Ekipman Hatırlatması',
    aciklama: `Teslim aldığınız ekipman ${NOTIFICATION_CONFIG.equipmentReminderHours} saat sonra hatırlatılır. "Teslim etmeyi unutmayın!" mesajı gönderilir.`,
    tur: 'ekipman',
  },
];

function filtrele(liste, arama) {
  if (!arama || !arama.trim()) return liste;
  const q = arama.trim().toLowerCase();
  return liste.filter(
    (b) =>
      (b.baslik && b.baslik.toLowerCase().includes(q)) ||
      (b.aciklama && b.aciklama.toLowerCase().includes(q)) ||
      (b.saat && b.saat.includes(q))
  );
}

export default function Bildirimler() {
  const [arama, setArama] = useState('');

  const saatlikFiltreli = useMemo(() => filtrele(SAATLIK_BILDIRIMLER, arama), [arama]);
  const digerFiltreli = useMemo(() => filtrele([MOTIVASYON_BILDIRIM, ...DIGER_BILDIRIMLER], arama), [arama]);

  const renderSaatlikItem = useCallback((item) => (
    <View key={item.id} style={s.kart}>
      <View style={s.saatBadge}>
        <MaterialIcons name="schedule" size={14} color="#6366f1" />
        <Text style={s.saatTxt}>{item.saat}</Text>
      </View>
      <Text style={s.baslik}>{item.baslik}</Text>
      <Text style={s.aciklama}>{item.aciklama}</Text>
    </View>
  ), []);

  const renderDigerItem = useCallback((item) => (
    <View key={item.id} style={s.kart}>
      <View style={[s.turBadge, item.tur === 'motivasyon' && s.turBadgeMotivasyon]}>
        <MaterialIcons
          name={item.tur === 'motivasyon' ? 'favorite' : 'inventory'}
          size={14}
          color={item.tur === 'motivasyon' ? '#ec4899' : '#10b981'}
        />
        <Text style={[s.turTxt, item.tur === 'motivasyon' && { color: '#ec4899' }]}>{item.tur}</Text>
      </View>
      <Text style={s.baslik}>{item.baslik}</Text>
      <Text style={s.aciklama}>{item.aciklama}</Text>
    </View>
  ), []);

  return (
    <View style={s.container}>
      <View style={s.aramaWrap}>
        <MaterialIcons name="search" size={20} color="#64748b" />
        <TextInput
          style={s.aramaInput}
          placeholder="Bildirim ara (başlık, saat, açıklama)..."
          placeholderTextColor="#64748b"
          value={arama}
          onChangeText={setArama}
        />
        {arama.length > 0 && (
          <TouchableOpacity onPress={() => setArama('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialIcons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.bolum}>
          <View style={s.bolumBaslik}>
            <MaterialIcons name="notifications-active" size={20} color="#6366f1" />
            <Text style={s.bolumBaslikTxt}>Saatlik bildirimler</Text>
          </View>
          <Text style={s.bolumAciklama}>Mesai giriş/çıkış hatırlatmaları. Giriş yaptığınız gün bu saatlerde tetiklenir.</Text>
          {saatlikFiltreli.length === 0 ? (
            <Text style={s.bosTxt}>Arama sonucu yok</Text>
          ) : (
            saatlikFiltreli.map(renderSaatlikItem)
          )}
        </View>

        <View style={s.bolum}>
          <View style={s.bolumBaslik}>
            <MaterialIcons name="category" size={20} color="#10b981" />
            <Text style={s.bolumBaslikTxt}>Diğer bildirimler</Text>
          </View>
          <Text style={s.bolumAciklama}>Ekipman ve diğer hatırlatmalar.</Text>
          {digerFiltreli.length === 0 ? (
            <Text style={s.bosTxt}>Arama sonucu yok</Text>
          ) : (
            digerFiltreli.map(renderDigerItem)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  aramaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  aramaInput: {
    flex: 1,
    fontSize: 15,
    color: '#f1f5f9',
    paddingVertical: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  bolum: { marginBottom: 24 },
  bolumBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bolumBaslikTxt: { fontSize: 17, fontWeight: '700', color: '#f1f5f9' },
  bolumAciklama: { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
  kart: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#334155',
  },
  saatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#6366f133',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  saatTxt: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  turBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#10b98133',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  turBadgeMotivasyon: { backgroundColor: '#ec489933' },
  turTxt: { fontSize: 13, fontWeight: '600', color: '#10b981' },
  baslik: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', marginBottom: 4 },
  aciklama: { fontSize: 13, color: '#94a3b8', lineHeight: 20 },
  bosTxt: { fontSize: 14, color: '#64748b', fontStyle: 'italic', paddingVertical: 12 },
});
