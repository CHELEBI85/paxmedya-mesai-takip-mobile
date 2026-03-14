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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { useEnvanter } from '../hooks/useEnvanter';
import ConfirmModal from '../components/ConfirmModal';

// ─── Talep Formu Yardımcıları ──────────────────────────────────────────────────
const T_AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const T_AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const T_GUNLER = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

const tDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const tFmtGunAy = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return `${d.getDate()} ${T_AYLAR_KISA[d.getMonth()]} ${d.getFullYear()}`;
};

const TALEP_KATEGORILER = [
  { label: 'Prodüksiyon Talebi', icon: 'movie' },
  { label: 'Cast / Oyuncu Talebi', icon: 'people' },
  { label: 'Ekipman / Malzeme Talebi', icon: 'build' },
  { label: 'Ofis / Personel İhtiyacı', icon: 'business' },
  { label: 'Saha Çekimi / Lokasyon Talebi', icon: 'location-on' },
  { label: 'Diğer Genel Talepler', icon: 'more-horiz' },
];

const TALEP_ONCELIKLER = [
  { label: 'Normal', renk: '#6366f1', icon: 'radio-button-unchecked' },
  { label: 'Acil', renk: '#f59e0b', icon: 'priority-high' },
  { label: 'Çok Acil', renk: '#ef4444', icon: 'warning' },
];

const TALEP_ADIMLAR = ['Talep Bilgileri', 'Kategori', 'Alt Seçenekler', 'Talep Detayı'];

// type: 'check' = checkbox, 'check_text' = checkbox + text input açılır, 'text' = her zaman görünen input
const KATEGORI_ALT_SECENEKLER = {
  'Prodüksiyon Talebi': [
    { key: 'Kameraman', type: 'check' },
    { key: 'Yönetmen', type: 'check' },
    { key: 'Kurgu – Montaj', type: 'check' },
    { key: 'Drone', type: 'check' },
    { key: 'Işık – Ses', type: 'check' },
    { key: 'Fotoğrafçı', type: 'check' },
    { key: 'Diğer', type: 'check_text', placeholder: 'Açıklayın...' },
  ],
  'Cast / Oyuncu Talebi': [
    { key: 'Kadın', type: 'check' },
    { key: 'Erkek', type: 'check' },
    { key: 'Çocuk', type: 'check' },
    { key: 'Yaş Aralığı', type: 'text', placeholder: 'Örn: 25–35' },
    { key: 'Rol Tanımı', type: 'text', placeholder: 'Rolü kısaca tanımlayın' },
    { key: 'Diğer', type: 'check_text', placeholder: 'Açıklayın...' },
  ],
  'Ekipman / Malzeme Talebi': [
    { key: 'Kamera', type: 'check' },
    { key: 'Lens', type: 'check' },
    { key: 'Işık Seti', type: 'check' },
    { key: 'Ses Kayıt', type: 'check' },
    { key: 'Tripod – Gimbal', type: 'check' },
    { key: 'Monitör', type: 'check' },
    { key: 'Depolama (SD / SSD)', type: 'check' },
  ],
  'Ofis / Personel İhtiyacı': [
    { key: 'Bilgisayar', type: 'check' },
    { key: 'Monitör', type: 'check' },
    { key: 'Klavye – Mouse', type: 'check' },
    { key: 'Sarf Malzeme', type: 'check' },
    { key: 'Masa – Sandalye', type: 'check' },
    { key: 'Diğer', type: 'check_text', placeholder: 'Açıklayın...' },
  ],
  'Saha Çekimi / Lokasyon Talebi': [
    { key: 'Lokasyon Ayarlama', type: 'check' },
    { key: 'İzin Belgesi', type: 'check' },
    { key: 'Araç / Nakliye', type: 'check' },
    { key: 'Tarih – Saat Planlama', type: 'check' },
    { key: 'Diğer', type: 'check_text', placeholder: 'Açıklayın...' },
  ],
  'Diğer Genel Talepler': [
    { key: 'Talep Açıklaması', type: 'text', placeholder: 'Talebinizi detaylıca açıklayın' },
  ],
};

// ─── Mini Takvim (Talep formu için) ──────────────────────────────────────────
function TalepCalendar({ value, onChange, minDate }) {
  const init = value ? new Date(value + 'T00:00:00') : new Date();
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());
  const todayStr = tDateStr(new Date());
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const firstDay = new Date(vy, vm, 1).getDay();
  const pad = (firstDay + 6) % 7;
  const cells = [...Array(pad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const prev = () => vm === 0 ? (setVy(y => y - 1), setVm(11)) : setVm(m => m - 1);
  const next = () => vm === 11 ? (setVy(y => y + 1), setVm(0)) : setVm(m => m + 1);
  return (
    <View style={tf.calBox}>
      <View style={tf.calHdr}>
        <TouchableOpacity onPress={prev} style={tf.calNav} activeOpacity={0.7}>
          <MaterialIcons name="chevron-left" size={20} color="#888888" />
        </TouchableOpacity>
        <Text style={tf.calHdrTxt}>{T_AYLAR[vm]} {vy}</Text>
        <TouchableOpacity onPress={next} style={tf.calNav} activeOpacity={0.7}>
          <MaterialIcons name="chevron-right" size={20} color="#888888" />
        </TouchableOpacity>
      </View>
      <View style={tf.calGunRow}>
        {T_GUNLER.map(g => <Text key={g} style={tf.calGunTxt}>{g}</Text>)}
      </View>
      <View style={tf.calGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={tf.calHucre} />;
          const str = `${vy}-${String(vm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const sel = str === value;
          const isToday = str === todayStr;
          const dis = !!(minDate && str < minDate);
          return (
            <TouchableOpacity key={str} style={[tf.calHucre, sel && tf.calSec, isToday && !sel && tf.calBugun]}
              onPress={() => !dis && onChange(str)} activeOpacity={0.7} disabled={dis}>
              <Text style={[tf.calHucreTxt, sel && tf.calSecTxt, isToday && !sel && tf.calBugunTxt, dis && tf.calDis]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Talep Formu Sekmesi ──────────────────────────────────────────────────────
const BOSH_TALEP = { firmaDepartman: '', adSoyad: '', gorevUnvan: '', kategori: '', altSecenekler: [], altSeceneklerMetin: {}, talepAciklamasi: '', teslimTarihi: '', oncelik: '' };

const ONCELIK_RENK = { 'Normal': '#6366f1', 'Acil': '#f59e0b', 'Çok Acil': '#ef4444' };
const DURUM_RENK = { 'Beklemede': '#888888', 'İnceleniyor': '#f59e0b', 'Onaylandı': '#10b981', 'Reddedildi': '#ef4444' };
const DURUM_IKON = { 'Beklemede': 'hourglass-empty', 'İnceleniyor': 'visibility', 'Onaylandı': 'check-circle', 'Reddedildi': 'cancel' };
const KATEGORI_IKON = {
  'Prodüksiyon Talebi': 'movie',
  'Cast / Oyuncu Talebi': 'people',
  'Ekipman / Malzeme Talebi': 'build',
  'Ofis / Personel İhtiyacı': 'business',
  'Saha Çekimi / Lokasyon Talebi': 'location-on',
  'Diğer Genel Talepler': 'more-horiz',
};

function TalepKart({ talep, onPress }) {
  const oncelikRenk = ONCELIK_RENK[talep.oncelik] || '#6366f1';
  const ikon = KATEGORI_IKON[talep.kategori] || 'assignment';
  const durum = talep.durum || 'Beklemede';
  const durumRenk = DURUM_RENK[durum] || '#888888';
  const durumIkon = DURUM_IKON[durum] || 'hourglass-empty';
  return (
    <TouchableOpacity style={tf.talepKart} onPress={onPress} activeOpacity={0.8}>
      <View style={[tf.talepKartSerit, { backgroundColor: durumRenk }]} />
      <View style={tf.talepKartBody}>
        <View style={tf.talepKartUst}>
          <View style={tf.talepIkonWrap}>
            <MaterialIcons name={ikon} size={16} color="#888888" />
          </View>
          <Text style={tf.talepKategori} numberOfLines={1}>{talep.kategori}</Text>
          <View style={[tf.talepDurum, { backgroundColor: durumRenk + '18', borderColor: durumRenk + '44' }]}>
            <MaterialIcons name={durumIkon} size={11} color={durumRenk} />
            <Text style={[tf.talepDurumTxt, { color: durumRenk }]}>{durum}</Text>
          </View>
        </View>
        {talep.altSecenekler?.length > 0 && (
          <Text style={tf.talepAltSec} numberOfLines={1}>
            {talep.altSecenekler.join(' · ')}
          </Text>
        )}
        {!!talep.talepAciklamasi && (
          <Text style={tf.talepAciklama} numberOfLines={2}>{talep.talepAciklamasi}</Text>
        )}
        <View style={tf.talepAlt}>
          <MaterialIcons name="event" size={12} color="#444444" />
          <Text style={tf.talepTarihTxt}>{tFmtGunAy(talep.tarih)}</Text>
          {!!talep.teslimTarihi && (
            <>
              <MaterialIcons name="arrow-forward" size={11} color="#333333" style={{ marginLeft: 4 }} />
              <MaterialIcons name="event-available" size={12} color="#ef4444" />
              <Text style={[tf.talepTarihTxt, { color: '#ef4444' }]}>{tFmtGunAy(talep.teslimTarihi)}</Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          <View style={[tf.talepOncelikKucuk, { backgroundColor: oncelikRenk + '18', borderColor: oncelikRenk + '44' }]}>
            <Text style={[tf.talepOncelikKucukTxt, { color: oncelikRenk }]}>{talep.oncelik}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TalepFormuSekmesi({ user, userProfile }) {
  const [gorununum, setGorununum] = useState('liste'); // 'liste' | 'form'
  const [talepler, setTalepler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secilenTalep, setSecilenTalep] = useState(null);
  const [duzenlenenId, setDuzenlenenId] = useState(null); // düzenleme modunda talep id
  const [adim, setAdim] = useState(1);
  const [form, setForm] = useState({ ...BOSH_TALEP, tarih: tDateStr(new Date()) });
  const [acikCal, setAcikCal] = useState(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);
  const [hata, setHata] = useState('');

  const talepleriFetch = useCallback(async () => {
    if (!user?.uid) return;
    setYukleniyor(true);
    try {
      const q = query(
        collection(db, 'talepler'),
        where('olusturanId', '==', user.uid),
      );
      const snap = await getDocs(q);
      const liste = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      liste.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setTalepler(liste);
    } catch (e) {
      console.warn('Talepler yüklenemedi:', e?.message || e);
    } finally {
      setYukleniyor(false);
    }
  }, [user?.uid]);

  useEffect(() => { talepleriFetch(); }, [talepleriFetch]);

  useEffect(() => {
    setForm(f => ({ ...f, adSoyad: userProfile?.displayName || '' }));
  }, [userProfile]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const adimGecerli = () => {
    if (adim === 1) {
      if (!form.firmaDepartman.trim() || !form.adSoyad.trim() || !form.gorevUnvan.trim()) {
        setHata('Lütfen tüm alanları doldurun.');
        return false;
      }
    }
    if (adim === 2) {
      if (!form.kategori) { setHata('Lütfen bir kategori seçin.'); return false; }
    }
    if (adim === 3) {
      const altlar = KATEGORI_ALT_SECENEKLER[form.kategori] || [];
      const sadecText = altlar.every(a => a.type === 'text');
      if (!sadecText && (!form.altSecenekler || form.altSecenekler.length === 0)) {
        setHata('Lütfen en az bir seçenek işaretleyin.');
        return false;
      }
    }
    if (adim === 4) {
      if (!form.talepAciklamasi.trim() || !form.oncelik) {
        setHata('Lütfen talep açıklaması ve öncelik seçin.');
        return false;
      }
    }
    setHata('');
    return true;
  };

  const ileri = () => { if (adimGecerli()) setAdim(a => Math.min(a + 1, 4)); };
  const geri = () => { setHata(''); setAdim(a => Math.max(a - 1, 1)); };

  const toggleAltSecim = (secenek) => {
    const liste = form.altSecenekler || [];
    const yeni = liste.includes(secenek)
      ? liste.filter(s => s !== secenek)
      : [...liste, secenek];
    set('altSecenekler', yeni);
  };

  const setAltMetin = (key, val) =>
    setForm(f => ({ ...f, altSeceneklerMetin: { ...f.altSeceneklerMetin, [key]: val } }));

  const gonder = async () => {
    if (!adimGecerli()) return;
    setGonderiliyor(true);
    try {
      const payload = {
        ...form,
        firmaDepartman: form.firmaDepartman.trim(),
        adSoyad: form.adSoyad.trim(),
        gorevUnvan: form.gorevUnvan.trim(),
        talepAciklamasi: form.talepAciklamasi.trim(),
        altSeceneklerMetin: form.altSeceneklerMetin || {},
      };
      if (duzenlenenId) {
        // Güncelleme — durum ve createdAt korunur
        const { olusturanId, durum, createdAt, ...guncellenecek } = payload;
        await updateDoc(doc(db, 'talepler', duzenlenenId), {
          ...guncellenecek,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Yeni talep
        await addDoc(collection(db, 'talepler'), {
          ...payload,
          olusturanId: user?.uid || '',
          durum: 'Beklemede',
          createdAt: new Date().toISOString(),
        });
      }
      setGonderildi(true);
    } catch (e) {
      setHata((duzenlenenId ? 'Güncellenemedi: ' : 'Gönderilemedi: ') + (e?.message || 'Bir hata oluştu'));
    } finally {
      setGonderiliyor(false);
    }
  };

  const yeniTalep = () => {
    setForm({ ...BOSH_TALEP, tarih: tDateStr(new Date()), adSoyad: userProfile?.displayName || '', altSeceneklerMetin: {} });
    setDuzenlenenId(null);
    setAdim(1); setHata(''); setGonderildi(false); setAcikCal(null);
    setGorununum('form');
  };

  const duzenle = (talep) => {
    setForm({
      tarih: talep.tarih || tDateStr(new Date()),
      firmaDepartman: talep.firmaDepartman || '',
      adSoyad: talep.adSoyad || '',
      gorevUnvan: talep.gorevUnvan || '',
      kategori: talep.kategori || '',
      altSecenekler: talep.altSecenekler || [],
      altSeceneklerMetin: talep.altSeceneklerMetin || {},
      talepAciklamasi: talep.talepAciklamasi || '',
      teslimTarihi: talep.teslimTarihi || '',
      oncelik: talep.oncelik || '',
    });
    setDuzenlenenId(talep.id);
    setSecilenTalep(null);
    setAdim(1); setHata(''); setGonderildi(false); setAcikCal(null);
    setGorununum('form');
  };

  const listeyeDon = () => {
    setGonderildi(false); setHata(''); setAdim(1); setAcikCal(null);
    setSecilenTalep(null); setDuzenlenenId(null);
    setGorununum('liste');
    talepleriFetch();
  };

  // ── Liste görünümü ──
  if (gorununum === 'liste') {
    return (
      <View style={{ flex: 1 }}>
        {/* Başlık + Yeni Talep butonu */}
        <View style={tf.listeBaslikRow}>
          <Text style={tf.listeBaslik}>Taleplerim</Text>
          <TouchableOpacity
            style={tf.yeniTalepBtn}
            onPress={() => {
              setForm({ ...BOSH_TALEP, tarih: tDateStr(new Date()), adSoyad: userProfile?.displayName || '', altSeceneklerMetin: {} });
              setAdim(1); setHata(''); setGonderildi(false); setAcikCal(null);
              setGorununum('form');
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={16} color="#000000" />
            <Text style={tf.yeniTalepBtnTxt}>Yeni Talep</Text>
          </TouchableOpacity>
        </View>

        {yukleniyor ? (
          <View style={tf.listeYukleniyor}>
            <ActivityIndicator color="#ffd800" />
            <Text style={tf.listeYukleniyorTxt}>Yükleniyor...</Text>
          </View>
        ) : talepler.length === 0 ? (
          <View style={tf.listeBos}>
            <MaterialIcons name="assignment" size={42} color="#2a2a2a" />
            <Text style={tf.listeBosBaslik}>Henüz talep yok</Text>
            <Text style={tf.listeBosAlt}>Yeni talep oluşturmak için butona bas</Text>
          </View>
        ) : (
          <FlatList
            data={talepler}
            keyExtractor={t => t.id}
            renderItem={({ item }) => (
              <TalepKart talep={item} onPress={() => setSecilenTalep(item)} />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            onRefresh={talepleriFetch}
            refreshing={yukleniyor}
          />
        )}

        {/* Talep Detay Modal */}
        {!!secilenTalep && (
          <View style={tf.detayModal}>
            <View style={tf.detayModalIcerik}>
              <View style={tf.detayModalBaslikRow}>
                <Text style={tf.detayModalBaslik} numberOfLines={1}>{secilenTalep.kategori}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {/* Sadece Beklemede olanlar düzenlenebilir */}
                  {(!secilenTalep.durum || secilenTalep.durum === 'Beklemede') && (
                    <TouchableOpacity
                      style={tf.duzenleBtn}
                      onPress={() => duzenle(secilenTalep)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="edit" size={13} color="#000000" />
                      <Text style={tf.duzenleBtnTxt}>Düzenle</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setSecilenTalep(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={20} color="#888888" />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Durum satırı — renkli */}
                {(() => {
                  const d = secilenTalep.durum || 'Beklemede';
                  const dr = DURUM_RENK[d] || '#888888';
                  const di = DURUM_IKON[d] || 'hourglass-empty';
                  return (
                    <View style={[tf.detayRow, { alignItems: 'center' }]}>
                      <Text style={tf.detayEtiket}>Durum</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <MaterialIcons name={di} size={14} color={dr} />
                        <Text style={[tf.detayDeger, { color: dr, fontWeight: '700' }]}>{d}</Text>
                      </View>
                    </View>
                  );
                })()}
                {[
                  ['Tarih', tFmtGunAy(secilenTalep.tarih)],
                  ['Firma / Departman', secilenTalep.firmaDepartman],
                  ['Ad Soyad', secilenTalep.adSoyad],
                  ['Görev / Ünvan', secilenTalep.gorevUnvan],
                  ['Öncelik', secilenTalep.oncelik],
                  secilenTalep.teslimTarihi ? ['Teslim Tarihi', tFmtGunAy(secilenTalep.teslimTarihi)] : null,
                  secilenTalep.altSecenekler?.length > 0 ? ['Seçilenler', secilenTalep.altSecenekler.join(', ')] : null,
                  secilenTalep.talepAciklamasi ? ['Açıklama', secilenTalep.talepAciklamasi] : null,
                ].filter(Boolean).map(([lbl, val]) => (
                  <View key={lbl} style={tf.detayRow}>
                    <Text style={tf.detayEtiket}>{lbl}</Text>
                    <Text style={tf.detayDeger}>{val}</Text>
                  </View>
                ))}
                {secilenTalep.altSeceneklerMetin && Object.keys(secilenTalep.altSeceneklerMetin).length > 0 && (
                  Object.entries(secilenTalep.altSeceneklerMetin).map(([k, v]) => v ? (
                    <View key={k} style={tf.detayRow}>
                      <Text style={tf.detayEtiket}>{k}</Text>
                      <Text style={tf.detayDeger}>{v}</Text>
                    </View>
                  ) : null)
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (gonderildi) {
    return (
      <View style={tf.basariEkran}>
        <View style={tf.basariIkon}>
          <MaterialIcons name="check-circle" size={56} color="#10b981" />
        </View>
        <Text style={tf.basariBaslik}>{duzenlenenId ? 'Talep Güncellendi!' : 'Talep Gönderildi!'}</Text>
        <Text style={tf.basariAlt}>{duzenlenenId ? 'Talebiniz başarıyla güncellendi.' : 'Talebiniz başarıyla iletildi. En kısa sürede değerlendirilecektir.'}</Text>
        <View style={tf.basariDetay}>
          <View style={tf.detayRow}>
            <Text style={tf.detayEtiket}>Kategori</Text>
            <Text style={tf.detayDeger}>{form.kategori}</Text>
          </View>
          {form.altSecenekler?.length > 0 && (
            <View style={tf.detayRow}>
              <Text style={tf.detayEtiket}>Seçilenler</Text>
              <Text style={[tf.detayDeger, { color: '#aaaaaa' }]} numberOfLines={3}>
                {form.altSecenekler.join(', ')}
              </Text>
            </View>
          )}
          <View style={[tf.detayRow, { borderBottomWidth: 0 }]}>
            <Text style={tf.detayEtiket}>Öncelik</Text>
            <Text style={[tf.detayDeger, { color: TALEP_ONCELIKLER.find(o => o.label === form.oncelik)?.renk || '#e0e0e0' }]}>
              {form.oncelik}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[tf.yeniBtn, { flex: 1, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' }]} onPress={listeyeDon} activeOpacity={0.85}>
            <MaterialIcons name="list" size={18} color="#888888" />
            <Text style={[tf.yeniBtnTxt, { color: '#888888' }]}>Taleplerime Dön</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[tf.yeniBtn, { flex: 1 }]} onPress={yeniTalep} activeOpacity={0.85}>
            <MaterialIcons name="add-circle-outline" size={18} color="#000000" />
            <Text style={tf.yeniBtnTxt}>Yeni Talep</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      {/* Form başlığı + geri butonu */}
      <View style={tf.formBaslikRow}>
        <TouchableOpacity onPress={listeyeDon} style={tf.formGeriBtn} activeOpacity={0.75}>
          <MaterialIcons name="arrow-back" size={18} color="#888888" />
        </TouchableOpacity>
        <Text style={tf.formBaslikTxt}>{duzenlenenId ? 'Talebi Düzenle' : 'Yeni Talep Oluştur'}</Text>
      </View>
      <ScrollView
        style={tf.scroll}
        contentContainerStyle={tf.icerik}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Adım Göstergesi ── */}
        <View style={tf.adimBar}>
          {TALEP_ADIMLAR.map((lbl, i) => {
            const n = i + 1;
            const aktif = adim === n;
            const tamamlandi = adim > n;
            return (
              <View key={n} style={{ flex: 1, alignItems: 'center' }}>
                <View style={[tf.adimDaire, aktif && tf.adimDaireAktif, tamamlandi && tf.adimDaireTam]}>
                  {tamamlandi
                    ? <MaterialIcons name="check" size={14} color="#000000" />
                    : <Text style={[tf.adimNo, (aktif || tamamlandi) && tf.adimNoAktif]}>{n}</Text>}
                </View>
                <Text style={[tf.adimLbl, aktif && tf.adimLblAktif]} numberOfLines={1}>{lbl}</Text>
                {n < 3 && <View style={[tf.adimCizgi, tamamlandi && tf.adimCizgiTam]} />}
              </View>
            );
          })}
        </View>

        {/* ── Adım 1: Talep Bilgileri ── */}
        {adim === 1 && (
          <View style={tf.adimPanel}>
            <Text style={tf.panelBaslik}>Talep Bilgileri</Text>

            {/* Tarih */}
            <Text style={tf.etiket}>Tarih</Text>
            <TouchableOpacity
              style={[tf.alanBtn, acikCal === 'tarih' && tf.alanBtnAktif]}
              onPress={() => setAcikCal(acikCal === 'tarih' ? null : 'tarih')}
              activeOpacity={0.75}
            >
              <MaterialIcons name="event" size={16} color={form.tarih ? '#ffd800' : '#555555'} />
              <Text style={[tf.alanBtnTxt, form.tarih && { color: '#ffd800' }]}>
                {form.tarih ? tFmtGunAy(form.tarih) : 'Tarih seçin'}
              </Text>
              <MaterialIcons name={acikCal === 'tarih' ? 'expand-less' : 'expand-more'} size={18} color="#444444" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            {acikCal === 'tarih' && (
              <TalepCalendar value={form.tarih} onChange={v => { set('tarih', v); setAcikCal(null); }} />
            )}

            {/* Firma / Departman */}
            <Text style={tf.etiket}>Firma / Departman</Text>
            <View style={tf.inputWrap}>
              <MaterialIcons name="business" size={16} color="#555555" />
              <TextInput
                style={tf.input}
                value={form.firmaDepartman}
                onChangeText={t => set('firmaDepartman', t)}
                placeholder="Örn: Arabica Maestro / Grafik Tasarım"
                placeholderTextColor="#444444"
                color="#e0e0e0"
              />
            </View>

            {/* Ad Soyad */}
            <Text style={tf.etiket}>Ad Soyad</Text>
            <View style={tf.inputWrap}>
              <MaterialIcons name="person" size={16} color="#555555" />
              <TextInput
                style={tf.input}
                value={form.adSoyad}
                onChangeText={t => set('adSoyad', t)}
                placeholder="Ad Soyad"
                placeholderTextColor="#444444"
                color="#e0e0e0"
              />
            </View>

            {/* Görev / Ünvan */}
            <Text style={tf.etiket}>Görev / Ünvan</Text>
            <View style={tf.inputWrap}>
              <MaterialIcons name="work" size={16} color="#555555" />
              <TextInput
                style={tf.input}
                value={form.gorevUnvan}
                onChangeText={t => set('gorevUnvan', t)}
                placeholder="Örn: Sosyal Medya Sorumlusu"
                placeholderTextColor="#444444"
                color="#e0e0e0"
              />
            </View>
          </View>
        )}

        {/* ── Adım 2: Kategori ── */}
        {adim === 2 && (
          <View style={tf.adimPanel}>
            <Text style={tf.panelBaslik}>Talep Kategorisi</Text>
            <Text style={tf.panelAlt}>Talebinize en uygun kategoriyi seçin</Text>
            {TALEP_KATEGORILER.map(({ label, icon }) => {
              const secili = form.kategori === label;
              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    tf.kategoriBtn,
                    secili ? tf.kategoriBtnSecili : tf.kategoriBtnNormal,
                  ]}
                  onPress={() => { set('kategori', label); set('altSecenekler', []); set('altSeceneklerMetin', {}); }}
                  activeOpacity={0.75}
                >
                  {/* Sol renkli çizgi */}
                  <View style={[tf.kategoriBtnSerit, secili && tf.kategoriBtnSeritSecili]} />

                  {/* İkon */}
                  <View style={[tf.kategoriIkonWrap, secili && tf.kategoriIkonWrapSecili]}>
                    <MaterialIcons
                      name={icon}
                      size={20}
                      color={secili ? '#ffd800' : '#555555'}
                    />
                  </View>

                  {/* Etiket */}
                  <Text style={[tf.kategoriTxt, secili && tf.kategoriTxtSecili]} numberOfLines={2}>
                    {label}
                  </Text>

                  {/* Radio göstergesi */}
                  <View style={[tf.radio, secili && tf.radioSecili]}>
                    {secili && <View style={tf.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Adım 3: Alt Seçenekler ── */}
        {adim === 3 && (
          <View style={tf.adimPanel}>
            <Text style={tf.panelBaslik}>{form.kategori}</Text>
            <Text style={tf.panelAlt}>İlgili seçenekleri işaretleyin (birden fazla seçebilirsiniz)</Text>
            <View style={tf.altSecGrid}>
              {(KATEGORI_ALT_SECENEKLER[form.kategori] || []).map((item) => {
                if (item.type === 'check') {
                  const secili = (form.altSecenekler || []).includes(item.key);
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[tf.altSecChip, secili && tf.altSecChipSecili]}
                      onPress={() => toggleAltSecim(item.key)}
                      activeOpacity={0.75}
                    >
                      <View style={[tf.altSecCheck, secili && tf.altSecCheckSecili]}>
                        {secili && <MaterialIcons name="check" size={12} color="#000000" />}
                      </View>
                      <Text style={[tf.altSecTxt, secili && tf.altSecTxtSecili]}>{item.key}</Text>
                    </TouchableOpacity>
                  );
                }
                if (item.type === 'check_text') {
                  const secili = (form.altSecenekler || []).includes(item.key);
                  return (
                    <View key={item.key} style={{ width: '100%' }}>
                      <TouchableOpacity
                        style={[tf.altSecChip, secili && tf.altSecChipSecili]}
                        onPress={() => toggleAltSecim(item.key)}
                        activeOpacity={0.75}
                      >
                        <View style={[tf.altSecCheck, secili && tf.altSecCheckSecili]}>
                          {secili && <MaterialIcons name="check" size={12} color="#000000" />}
                        </View>
                        <Text style={[tf.altSecTxt, secili && tf.altSecTxtSecili]}>{item.key}</Text>
                      </TouchableOpacity>
                      {secili && (
                        <TextInput
                          style={tf.altSecExpInput}
                          value={form.altSeceneklerMetin?.[item.key] || ''}
                          onChangeText={v => setAltMetin(item.key, v)}
                          placeholder={item.placeholder || 'Açıklayın...'}
                          placeholderTextColor="#444444"
                          color="#e0e0e0"
                          multiline
                        />
                      )}
                    </View>
                  );
                }
                if (item.type === 'text') {
                  return (
                    <View key={item.key} style={tf.altSecTextRow}>
                      <Text style={tf.altSecTextLbl}>{item.key}</Text>
                      <TextInput
                        style={tf.altSecTextInput}
                        value={form.altSeceneklerMetin?.[item.key] || ''}
                        onChangeText={v => setAltMetin(item.key, v)}
                        placeholder={item.placeholder || ''}
                        placeholderTextColor="#444444"
                        color="#e0e0e0"
                      />
                    </View>
                  );
                }
                return null;
              })}
            </View>
            {(form.altSecenekler?.length || 0) > 0 && (
              <View style={tf.altSecOzet}>
                <MaterialIcons name="check-circle" size={13} color="#10b981" />
                <Text style={tf.altSecOzetTxt}>
                  {form.altSecenekler.length} seçenek seçildi: {form.altSecenekler.join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Adım 4: Talep Detayı ── */}
        {adim === 4 && (
          <View style={tf.adimPanel}>
            <Text style={tf.panelBaslik}>Talep Detayı</Text>

            {/* Açıklama */}
            <Text style={tf.etiket}>Talep Açıklaması</Text>
            <View style={[tf.inputWrap, { alignItems: 'flex-start', paddingTop: 12 }]}>
              <MaterialIcons name="assignment" size={16} color="#555555" />
              <TextInput
                style={[tf.input, { minHeight: 100, textAlignVertical: 'top' }]}
                value={form.talepAciklamasi}
                onChangeText={t => set('talepAciklamasi', t)}
                placeholder="Talep detayını yazınız..."
                placeholderTextColor="#444444"
                color="#e0e0e0"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Teslim Tarihi */}
            <Text style={tf.etiket}>Teslim / Uygulama Tarihi <Text style={{ color: '#444444', fontWeight: '400' }}>(isteğe bağlı)</Text></Text>
            <TouchableOpacity
              style={[tf.alanBtn, acikCal === 'teslim' && tf.alanBtnAktif]}
              onPress={() => setAcikCal(acikCal === 'teslim' ? null : 'teslim')}
              activeOpacity={0.75}
            >
              <MaterialIcons name="event" size={16} color={form.teslimTarihi ? '#ef4444' : '#555555'} />
              <Text style={[tf.alanBtnTxt, form.teslimTarihi && { color: '#ef4444' }]}>
                {form.teslimTarihi ? tFmtGunAy(form.teslimTarihi) : 'Tarih seçin'}
              </Text>
              {form.teslimTarihi && (
                <TouchableOpacity onPress={() => { set('teslimTarihi', ''); setAcikCal(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={15} color="#444444" />
                </TouchableOpacity>
              )}
              <MaterialIcons name={acikCal === 'teslim' ? 'expand-less' : 'expand-more'} size={18} color="#444444" style={{ marginLeft: form.teslimTarihi ? 0 : 'auto' }} />
            </TouchableOpacity>
            {acikCal === 'teslim' && (
              <TalepCalendar
                value={form.teslimTarihi}
                onChange={v => { set('teslimTarihi', v); setAcikCal(null); }}
                minDate={form.tarih || undefined}
              />
            )}

            {/* Öncelik */}
            <Text style={tf.etiket}>Öncelik Durumu</Text>
            <View style={tf.oncelikRow}>
              {TALEP_ONCELIKLER.map(({ label, renk, icon }) => {
                const secili = form.oncelik === label;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[tf.oncelikChip, { borderColor: secili ? renk : '#2a2a2a', backgroundColor: secili ? renk + '18' : '#141414' }]}
                    onPress={() => set('oncelik', label)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name={icon} size={15} color={secili ? renk : '#444444'} />
                    <Text style={[tf.oncelikTxt, { color: secili ? renk : '#555555' }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Hata ── */}
        {!!hata && (
          <View style={tf.hataKutu}>
            <MaterialIcons name="error-outline" size={15} color="#ef4444" />
            <Text style={tf.hataTxt}>{hata}</Text>
          </View>
        )}

        {/* ── Navigasyon Butonları ── */}
        <View style={tf.btnRow}>
          {adim > 1 && (
            <TouchableOpacity style={tf.geriBtn} onPress={geri} activeOpacity={0.8}>
              <MaterialIcons name="chevron-left" size={18} color="#888888" />
              <Text style={tf.geriBtnTxt}>Geri</Text>
            </TouchableOpacity>
          )}
          {adim < 4 ? (
            <TouchableOpacity style={[tf.ileriBtn, adim === 1 && { flex: 1 }]} onPress={ileri} activeOpacity={0.85}>
              <Text style={tf.ileriBtnTxt}>İleri</Text>
              <MaterialIcons name="chevron-right" size={18} color="#000000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[tf.gonderBtn, gonderiliyor && { opacity: 0.7 }]}
              onPress={gonder}
              activeOpacity={0.85}
              disabled={gonderiliyor}
            >
              {gonderiliyor
                ? <ActivityIndicator color="#000000" size="small" />
                : <><MaterialIcons name={duzenlenenId ? 'save' : 'send'} size={17} color="#000000" /><Text style={tf.gonderBtnTxt}>{duzenlenenId ? 'Güncelle' : 'Talebi Gönder'}</Text></>}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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
    { key: 'talep', label: 'Talep', icon: 'assignment' },
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

      {aktifSekme === 'talep' && (
        <TalepFormuSekmesi user={user} userProfile={userProfile} />
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

// ── Talep Formu Stiller ────────────────────────────────────────────────────────
const tf = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#000000' },
  icerik: { paddingHorizontal: 14, paddingTop: 12, gap: 6 },

  // Adım göstergesi
  adimBar: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#111111', borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  adimDaire: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1e1e1e', borderWidth: 1.5, borderColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center', marginBottom: 5,
  },
  adimDaireAktif: { backgroundColor: '#ffd800', borderColor: '#ffd800' },
  adimDaireTam: { backgroundColor: '#10b981', borderColor: '#10b981' },
  adimNo: { fontSize: 12, fontWeight: '800', color: '#555555' },
  adimNoAktif: { color: '#000000' },
  adimLbl: { fontSize: 9, color: '#444444', textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  adimLblAktif: { color: '#ffd800' },
  adimCizgi: {
    position: 'absolute', top: 14, right: -20, left: '60%',
    height: 1.5, backgroundColor: '#1e1e1e',
  },
  adimCizgiTam: { backgroundColor: '#10b981' },

  // Panel
  adimPanel: {
    backgroundColor: '#111111', borderRadius: 14,
    borderWidth: 1, borderColor: '#1e1e1e',
    padding: 16, gap: 4,
  },
  panelBaslik: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  panelAlt: { fontSize: 12, color: '#444444', marginBottom: 10 },

  // Alan etiketi
  etiket: {
    fontSize: 11, fontWeight: '700', color: '#555555',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginTop: 12, marginBottom: 6,
  },

  // Text input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 14, color: '#e0e0e0' },

  // Tarih butonu
  alanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  alanBtnAktif: { borderColor: '#ffd80055' },
  alanBtnTxt: { fontSize: 13, fontWeight: '600', color: '#555555', flex: 1 },

  // Mini takvim
  calBox: {
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    marginTop: 4, paddingVertical: 10, paddingHorizontal: 8,
  },
  calHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  calNav: { padding: 6 },
  calHdrTxt: { fontSize: 13, fontWeight: '700', color: '#e0e0e0' },
  calGunRow: { flexDirection: 'row', marginBottom: 4 },
  calGunTxt: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#444444', textTransform: 'uppercase' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calHucre: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calSec: { backgroundColor: '#ffd800', borderRadius: 20 },
  calBugun: { borderWidth: 1.5, borderColor: '#ffd80055', borderRadius: 20 },
  calHucreTxt: { fontSize: 12, fontWeight: '600', color: '#888888' },
  calSecTxt: { color: '#000000' },
  calBugunTxt: { color: '#ffd800' },
  calDis: { color: '#2a2a2a' },

  // Kategori
  kategoriBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1,
    paddingVertical: 13, paddingRight: 13, marginTop: 8,
    overflow: 'hidden',
  },
  kategoriBtnNormal: {
    backgroundColor: '#141414', borderColor: '#252525',
  },
  kategoriBtnSecili: {
    backgroundColor: '#1c1900', borderColor: '#ffd800',
  },
  kategoriBtnSerit: {
    width: 3, alignSelf: 'stretch', backgroundColor: 'transparent',
  },
  kategoriBtnSeritSecili: {
    backgroundColor: '#ffd800',
  },
  kategoriIkonWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e1e1e',
  },
  kategoriIkonWrapSecili: { backgroundColor: '#ffd80025' },
  kategoriTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: '#555555' },
  kategoriTxtSecili: { color: '#ffd800', fontWeight: '700' },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#333333',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSecili: { borderColor: '#ffd800' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffd800' },

  // Alt Seçenekler (adım 3)
  altSecGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12,
  },
  altSecChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1a1a', borderRadius: 10,
    borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  altSecChipSecili: {
    backgroundColor: '#1c1900', borderColor: '#ffd800',
  },
  altSecCheck: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#333333',
    alignItems: 'center', justifyContent: 'center',
  },
  altSecCheckSecili: {
    backgroundColor: '#ffd800', borderColor: '#ffd800',
  },
  altSecTxt: { fontSize: 13, fontWeight: '600', color: '#666666' },
  altSecTxtSecili: { color: '#ffd800' },
  altSecOzet: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    marginTop: 14, padding: 10, borderRadius: 10,
    backgroundColor: '#10b98110', borderWidth: 1, borderColor: '#10b98130',
  },
  altSecOzetTxt: { flex: 1, fontSize: 12, color: '#10b981', lineHeight: 18 },

  // check_text genişleyen input
  altSecExpInput: {
    backgroundColor: '#1a1a1a', borderRadius: 8, borderWidth: 1, borderColor: '#ffd80050',
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#e0e0e0',
    marginTop: 6, marginBottom: 4, minHeight: 52, textAlignVertical: 'top',
    width: '100%',
  },

  // text tipi satır
  altSecTextRow: {
    width: '100%', marginBottom: 10,
  },
  altSecTextLbl: {
    fontSize: 12, color: '#888888', fontWeight: '600', marginBottom: 5, marginLeft: 2,
  },
  altSecTextInput: {
    backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#e0e0e0',
  },

  // Öncelik
  oncelikRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  oncelikChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1.5,
  },
  oncelikTxt: { fontSize: 12, fontWeight: '700' },

  // Hata
  hataKutu: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#ef444412', borderRadius: 10, borderWidth: 1, borderColor: '#ef444430',
    padding: 12,
  },
  hataTxt: { fontSize: 13, color: '#ef4444', flex: 1 },

  // Butonlar
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  geriBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a',
  },
  geriBtnTxt: { fontSize: 14, fontWeight: '600', color: '#888888' },
  ileriBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#ffd800',
  },
  ileriBtnTxt: { fontSize: 14, fontWeight: '700', color: '#000000' },
  gonderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#ffd800',
  },
  gonderBtnTxt: { fontSize: 14, fontWeight: '700', color: '#000000' },

  // Başarı ekranı
  basariEkran: { flex: 1, alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 12 },
  basariIkon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#10b98115', borderWidth: 2, borderColor: '#10b98130',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  basariBaslik: { fontSize: 22, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  basariAlt: { fontSize: 13, color: '#555555', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  basariDetay: {
    width: '100%', backgroundColor: '#111111', borderRadius: 14,
    borderWidth: 1, borderColor: '#1e1e1e', overflow: 'hidden',
  },
  detayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  detayEtiket: { fontSize: 12, color: '#555555', fontWeight: '600' },
  detayDeger: { fontSize: 13, color: '#e0e0e0', fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
  yeniBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ffd800', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
    width: '100%', marginTop: 8,
  },
  yeniBtnTxt: { fontSize: 15, fontWeight: '700', color: '#000000' },

  // ── Taleplerim listesi ──
  listeBaslikRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  listeBaslik: { fontSize: 17, fontWeight: '700', color: '#e0e0e0' },
  yeniTalepBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ffd800', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  yeniTalepBtnTxt: { fontSize: 13, fontWeight: '700', color: '#000000' },
  listeYukleniyor: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  listeYukleniyorTxt: { fontSize: 13, color: '#555555' },
  listeBos: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  listeBosBaslik: { fontSize: 15, fontWeight: '600', color: '#444444' },
  listeBosAlt: { fontSize: 13, color: '#333333' },

  // Talep kartı
  talepKart: {
    flexDirection: 'row', backgroundColor: '#141414',
    borderRadius: 12, borderWidth: 1, borderColor: '#1e1e1e',
    marginBottom: 10, overflow: 'hidden',
  },
  talepKartSerit: { width: 3 },
  talepKartBody: { flex: 1, padding: 12, gap: 5 },
  talepKartUst: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  talepIkonWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center',
  },
  talepKategori: { flex: 1, fontSize: 13, fontWeight: '700', color: '#cccccc' },
  talepDurum: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  talepDurumTxt: { fontSize: 11, fontWeight: '700' },
  talepOncelikKucuk: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1,
  },
  talepOncelikKucukTxt: { fontSize: 10, fontWeight: '700' },
  talepOncelik: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  talepOncelikTxt: { fontSize: 11, fontWeight: '700' },
  talepAltSec: { fontSize: 12, color: '#555555' },
  talepAciklama: { fontSize: 12, color: '#666666', lineHeight: 17 },
  talepAlt: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  talepTarihTxt: { fontSize: 11, color: '#444444' },

  // Detay modal (overlay)
  detayModal: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000cc', justifyContent: 'flex-end',
  },
  detayModalIcerik: {
    backgroundColor: '#141414', borderTopLeftRadius: 18, borderTopRightRadius: 18,
    padding: 20, maxHeight: '80%',
  },
  detayModalBaslikRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  detayModalBaslik: { fontSize: 15, fontWeight: '700', color: '#e0e0e0', flex: 1, marginRight: 8 },

  // Form başlık çubuğu
  formBaslikRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  formGeriBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#1a1a1a',
    borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center',
  },
  formBaslikTxt: { fontSize: 16, fontWeight: '700', color: '#e0e0e0' },
  duzenleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ffd800', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  duzenleBtnTxt: { fontSize: 12, fontWeight: '700', color: '#000000' },
});
