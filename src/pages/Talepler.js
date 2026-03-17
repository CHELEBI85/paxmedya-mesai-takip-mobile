import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useSelector } from 'react-redux';
import { useTalepler } from '../hooks/useTalepler';
import { InlineCalendar } from './Takvim';
import ConfirmModal from '../components/ConfirmModal';

// ── Sabitler ─────────────────────────────────────────────────────────────────
const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const fmtGunAy = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return `${d.getDate()} ${AYLAR_KISA[d.getMonth()]} ${d.getFullYear()}`;
};

const dateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const diffGun = (bas, bit) => {
  if (!bas || !bit) return 0;
  const ms = new Date(bit + 'T00:00:00') - new Date(bas + 'T00:00:00');
  return Math.max(0, Math.round(ms / 86400000) + 1);
};

// Talep sabitleri (Profile'dan taşındı)
const T_AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const T_AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const T_GUNLER = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const tDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const tFmtGunAy = (str) => { if (!str) return ''; const d = new Date(str + 'T00:00:00'); return `${d.getDate()} ${T_AYLAR_KISA[d.getMonth()]} ${d.getFullYear()}`; };

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
const KATEGORI_ALT_SECENEKLER = {
  'Prodüksiyon Talebi': [
    { key: 'Kameraman', type: 'check' }, { key: 'Yönetmen', type: 'check' },
    { key: 'Kurgu – Montaj', type: 'check' }, { key: 'Drone', type: 'check' },
    { key: 'Işık – Ses', type: 'check' }, { key: 'Fotoğrafçı', type: 'check' },
    { key: 'Diğer', type: 'check_text', placeholder: 'Açıklayın...' },
  ],
  'Cast / Oyuncu Talebi': [
    { key: 'Kadın', type: 'check' }, { key: 'Erkek', type: 'check' }, { key: 'Çocuk', type: 'check' },
    { key: 'Yaş Aralığı', type: 'text', placeholder: 'Örn: 25–35' },
    { key: 'Rol Tanımı', type: 'text', placeholder: 'Rolü kısaca tanımlayın' },
    { key: 'Diğer', type: 'check_text', placeholder: 'Açıklayın...' },
  ],
  'Ekipman / Malzeme Talebi': [
    { key: 'Kamera', type: 'check' }, { key: 'Lens', type: 'check' }, { key: 'Işık Seti', type: 'check' },
    { key: 'Ses Kayıt', type: 'check' }, { key: 'Tripod – Gimbal', type: 'check' },
    { key: 'Monitör', type: 'check' }, { key: 'Depolama (SD / SSD)', type: 'check' },
  ],
  'Ofis / Personel İhtiyacı': [
    { key: 'Bilgisayar', type: 'check' }, { key: 'Monitör', type: 'check' },
    { key: 'Klavye – Mouse', type: 'check' }, { key: 'Sarf Malzeme', type: 'check' },
    { key: 'Masa – Sandalye', type: 'check' },
    { key: 'Diğer', type: 'check_text', placeholder: 'Açıklayın...' },
  ],
  'Saha Çekimi / Lokasyon Talebi': [
    { key: 'Lokasyon Ayarlama', type: 'check' }, { key: 'İzin Belgesi', type: 'check' },
    { key: 'Araç / Nakliye', type: 'check' }, { key: 'Tarih – Saat Planlama', type: 'check' },
    { key: 'Diğer', type: 'check_text', placeholder: 'Açıklayın...' },
  ],
  'Diğer Genel Talepler': [
    { key: 'Talep Açıklaması', type: 'text', placeholder: 'Talebinizi detaylıca açıklayın' },
  ],
};
const BOSH_TALEP = { firmaDepartman: '', adSoyad: '', gorevUnvan: '', kategori: '', altSecenekler: [], altSeceneklerMetin: {}, talepAciklamasi: '', teslimTarihi: '', oncelik: '' };
const ONCELIK_RENK = { 'Normal': '#6366f1', 'Acil': '#f59e0b', 'Çok Acil': '#ef4444' };
const DURUM_RENK_T = { 'Beklemede': '#888888', 'İnceleniyor': '#f59e0b', 'Onaylandı': '#10b981', 'Reddedildi': '#ef4444' };
const DURUM_IKON_T = { 'Beklemede': 'hourglass-empty', 'İnceleniyor': 'visibility', 'Onaylandı': 'check-circle', 'Reddedildi': 'cancel' };
const KATEGORI_IKON = { 'Prodüksiyon Talebi': 'movie', 'Cast / Oyuncu Talebi': 'people', 'Ekipman / Malzeme Talebi': 'build', 'Ofis / Personel İhtiyacı': 'business', 'Saha Çekimi / Lokasyon Talebi': 'location-on', 'Diğer Genel Talepler': 'more-horiz' };

// İzin sabitleri
const IZIN_TURLERI = [
  { key: 'yillik', label: 'Yıllık İzin', icon: 'beach-access', color: '#6366f1' },
  { key: 'hastalik', label: 'Hastalık İzni', icon: 'local-hospital', color: '#ef4444' },
  { key: 'ucretsiz', label: 'Ücretsiz İzin', icon: 'money-off', color: '#f59e0b' },
  { key: 'diger', label: 'Diğer', icon: 'more-horiz', color: '#888888' },
];
const DURUM_RENK_I = { 'Beklemede': '#888888', 'Onaylandı': '#10b981', 'Reddedildi': '#ef4444' };
const DURUM_IKON_I = { 'Beklemede': 'hourglass-empty', 'Onaylandı': 'check-circle', 'Reddedildi': 'cancel' };

const CONFIRM_DEF = { visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Tamam', cancelText: 'İptal', destructive: false, onConfirm: null };

// ── Mini Takvim ───────────────────────────────────────────────────────────────
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
        <TouchableOpacity onPress={prev} style={tf.calNav} activeOpacity={0.7}><MaterialIcons name="chevron-left" size={20} color="#888888" /></TouchableOpacity>
        <Text style={tf.calHdrTxt}>{T_AYLAR[vm]} {vy}</Text>
        <TouchableOpacity onPress={next} style={tf.calNav} activeOpacity={0.7}><MaterialIcons name="chevron-right" size={20} color="#888888" /></TouchableOpacity>
      </View>
      <View style={tf.calGunRow}>{T_GUNLER.map(g => <Text key={g} style={tf.calGunTxt}>{g}</Text>)}</View>
      <View style={tf.calGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={tf.calHucre} />;
          const str = `${vy}-${String(vm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const sel = str === value; const isToday = str === todayStr; const dis = !!(minDate && str < minDate);
          return (
            <TouchableOpacity key={str} style={[tf.calHucre, sel && tf.calSec, isToday && !sel && tf.calBugun]} onPress={() => !dis && onChange(str)} activeOpacity={0.7} disabled={dis}>
              <Text style={[tf.calHucreTxt, sel && tf.calSecTxt, isToday && !sel && tf.calBugunTxt, dis && tf.calDis]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Talep Kartı ───────────────────────────────────────────────────────────────
function TalepKart({ talep, onPress }) {
  const oncelikRenk = ONCELIK_RENK[talep.oncelik] || '#6366f1';
  const ikon = KATEGORI_IKON[talep.kategori] || 'assignment';
  const durum = talep.durum || 'Beklemede';
  const durumRenk = DURUM_RENK_T[durum] || '#888888';
  const durumIkon = DURUM_IKON_T[durum] || 'hourglass-empty';
  return (
    <TouchableOpacity style={tf.talepKart} onPress={onPress} activeOpacity={0.8}>
      <View style={[tf.talepKartSerit, { backgroundColor: durumRenk }]} />
      <View style={tf.talepKartBody}>
        <View style={tf.talepKartUst}>
          <View style={tf.talepIkonWrap}><MaterialIcons name={ikon} size={16} color="#888888" /></View>
          <Text style={tf.talepKategori} numberOfLines={1}>{talep.kategori}</Text>
          <View style={[tf.talepDurum, { backgroundColor: durumRenk + '18', borderColor: durumRenk + '44' }]}>
            <MaterialIcons name={durumIkon} size={11} color={durumRenk} />
            <Text style={[tf.talepDurumTxt, { color: durumRenk }]}>{durum}</Text>
          </View>
        </View>
        {talep.altSecenekler?.length > 0 && <Text style={tf.talepAltSec} numberOfLines={1}>{talep.altSecenekler.join(' · ')}</Text>}
        {!!talep.talepAciklamasi && <Text style={tf.talepAciklama} numberOfLines={2}>{talep.talepAciklamasi}</Text>}
        <View style={tf.talepAlt}>
          <MaterialIcons name="event" size={12} color="#444444" />
          <Text style={tf.talepTarihTxt}>{tFmtGunAy(talep.tarih)}</Text>
          {!!talep.teslimTarihi && (<><MaterialIcons name="arrow-forward" size={11} color="#333333" style={{ marginLeft: 4 }} /><MaterialIcons name="event-available" size={12} color="#ef4444" /><Text style={[tf.talepTarihTxt, { color: '#ef4444' }]}>{tFmtGunAy(talep.teslimTarihi)}</Text></>)}
          {!!talep.displayName && <Text style={tf.talepKisi} numberOfLines={1}>{talep.displayName}</Text>}
          <View style={{ flex: 1 }} />
          <View style={[tf.talepOncelikKucuk, { backgroundColor: oncelikRenk + '18', borderColor: oncelikRenk + '44' }]}>
            <Text style={[tf.talepOncelikKucukTxt, { color: oncelikRenk }]}>{talep.oncelik}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── İzin Kartı ────────────────────────────────────────────────────────────────
function IzinKart({ izin, onPress }) {
  const tur = IZIN_TURLERI.find(t => t.key === izin.izinTuru) || IZIN_TURLERI[0];
  const durum = izin.durum || 'Beklemede';
  const durumRenk = DURUM_RENK_I[durum] || '#888888';
  const durumIkon = DURUM_IKON_I[durum] || 'hourglass-empty';
  return (
    <TouchableOpacity style={tf.talepKart} onPress={onPress} activeOpacity={0.8}>
      <View style={[tf.talepKartSerit, { backgroundColor: tur.color }]} />
      <View style={tf.talepKartBody}>
        <View style={tf.talepKartUst}>
          <View style={[tf.talepIkonWrap, { backgroundColor: tur.color + '18' }]}><MaterialIcons name={tur.icon} size={16} color={tur.color} /></View>
          <Text style={tf.talepKategori} numberOfLines={1}>{tur.label}</Text>
          <View style={[tf.talepDurum, { backgroundColor: durumRenk + '18', borderColor: durumRenk + '44' }]}>
            <MaterialIcons name={durumIkon} size={11} color={durumRenk} />
            <Text style={[tf.talepDurumTxt, { color: durumRenk }]}>{durum}</Text>
          </View>
        </View>
        {!!izin.aciklama && <Text style={tf.talepAciklama} numberOfLines={1}>{izin.aciklama}</Text>}
        <View style={tf.talepAlt}>
          <MaterialIcons name="date-range" size={12} color="#444444" />
          <Text style={tf.talepTarihTxt}>{fmtGunAy(izin.baslangicTarihi)}</Text>
          <MaterialIcons name="arrow-forward" size={11} color="#333333" style={{ marginLeft: 4 }} />
          <Text style={tf.talepTarihTxt}>{fmtGunAy(izin.bitisTarihi)}</Text>
          {!!izin.displayName && <Text style={tf.talepKisi} numberOfLines={1}>{izin.displayName}</Text>}
          <View style={{ flex: 1 }} />
          <View style={[tf.talepOncelikKucuk, { backgroundColor: tur.color + '18', borderColor: tur.color + '44' }]}>
            <Text style={[tf.talepOncelikKucukTxt, { color: tur.color }]}>{izin.gunSayisi} gün</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Kullanıcı Talepler Bölümü ─────────────────────────────────────────────────
function KullaniciTalepleri({ user, userProfile }) {
  const { talepler, taleplerLoading, taleplerLoadingMore, taleplerHasMore, getTaleplerIfNeeded, getTalepler, getTaleplerNextPage, talepEkle, talepGuncelle } = useTalepler();
  const [gorunum, setGorunum] = useState('liste');
  const [secilenTalep, setSecilenTalep] = useState(null);
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [adim, setAdim] = useState(1);
  const [form, setForm] = useState({ ...BOSH_TALEP, tarih: tDateStr(new Date()) });
  const [acikCal, setAcikCal] = useState(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => { if (user?.uid) getTaleplerIfNeeded(user.uid); }, [user?.uid, getTaleplerIfNeeded]);
  useEffect(() => { setForm(f => ({ ...f, adSoyad: userProfile?.displayName || '' })); }, [userProfile]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleAlt = (s) => { const l = form.altSecenekler || []; set('altSecenekler', l.includes(s) ? l.filter(x => x !== s) : [...l, s]); };
  const setAltMetin = (key, val) => setForm(f => ({ ...f, altSeceneklerMetin: { ...f.altSeceneklerMetin, [key]: val } }));

  const adimGecerli = () => {
    if (adim === 1 && (!form.firmaDepartman.trim() || !form.adSoyad.trim() || !form.gorevUnvan.trim())) { setHata('Lütfen tüm alanları doldurun.'); return false; }
    if (adim === 2 && !form.kategori) { setHata('Lütfen bir kategori seçin.'); return false; }
    if (adim === 3) {
      const altlar = KATEGORI_ALT_SECENEKLER[form.kategori] || [];
      const sadecText = altlar.every(a => a.type === 'text');
      if (!sadecText && (!form.altSecenekler || form.altSecenekler.length === 0)) { setHata('Lütfen en az bir seçenek işaretleyin.'); return false; }
    }
    if (adim === 4 && (!form.talepAciklamasi.trim() || !form.oncelik)) { setHata('Lütfen talep açıklaması ve öncelik seçin.'); return false; }
    setHata(''); return true;
  };

  const ileri = () => { if (adimGecerli()) setAdim(a => Math.min(a + 1, 4)); };
  const geri = () => { setHata(''); setAdim(a => Math.max(a - 1, 1)); };

  const gonder = async () => {
    if (!adimGecerli()) return;
    setGonderiliyor(true);
    try {
      const payload = { ...form, firmaDepartman: form.firmaDepartman.trim(), adSoyad: form.adSoyad.trim(), gorevUnvan: form.gorevUnvan.trim(), talepAciklamasi: form.talepAciklamasi.trim(), altSeceneklerMetin: form.altSeceneklerMetin || {} };
      if (duzenlenenId) {
        const { olusturanId, durum, createdAt, ...gunc } = payload;
        await talepGuncelle(duzenlenenId, gunc, user?.uid);
      } else {
        await talepEkle(user?.uid || '', userProfile?.displayName || '', payload);
      }
      setGonderildi(true);
    } catch (e) { setHata((duzenlenenId ? 'Güncellenemedi: ' : 'Gönderilemedi: ') + (e?.message || 'Bir hata oluştu')); }
    finally { setGonderiliyor(false); }
  };

  const yeniTalep = () => { setForm({ ...BOSH_TALEP, tarih: tDateStr(new Date()), adSoyad: userProfile?.displayName || '', altSeceneklerMetin: {} }); setDuzenlenenId(null); setAdim(1); setHata(''); setGonderildi(false); setAcikCal(null); setGorunum('form'); };
  const duzenle = (talep) => { setForm({ tarih: talep.tarih || tDateStr(new Date()), firmaDepartman: talep.firmaDepartman || '', adSoyad: talep.adSoyad || '', gorevUnvan: talep.gorevUnvan || '', kategori: talep.kategori || '', altSecenekler: talep.altSecenekler || [], altSeceneklerMetin: talep.altSeceneklerMetin || {}, talepAciklamasi: talep.talepAciklamasi || '', teslimTarihi: talep.teslimTarihi || '', oncelik: talep.oncelik || '' }); setDuzenlenenId(talep.id); setSecilenTalep(null); setAdim(1); setHata(''); setGonderildi(false); setAcikCal(null); setGorunum('form'); };
  const listeyeDon = () => { setGonderildi(false); setHata(''); setAdim(1); setAcikCal(null); setSecilenTalep(null); setDuzenlenenId(null); setGorunum('liste'); if (user?.uid) getTalepler(user.uid); };

  // Liste görünümü
  if (gorunum === 'liste') {
    return (
      <View style={{ flex: 1 }}>
        <View style={tf.listeBaslikRow}>
          <Text style={tf.listeBaslik}>Taleplerim</Text>
          <TouchableOpacity style={tf.yeniTalepBtn} onPress={yeniTalep} activeOpacity={0.85}>
            <MaterialIcons name="add" size={16} color="#000000" />
            <Text style={tf.yeniTalepBtnTxt}>Yeni Talep</Text>
          </TouchableOpacity>
        </View>
        {taleplerLoading && talepler.length === 0 ? (
          <View style={tf.listeYukleniyor}><ActivityIndicator color="#ffd800" /></View>
        ) : talepler.length === 0 ? (
          <View style={tf.listeBos}>
            <MaterialIcons name="assignment" size={42} color="#2a2a2a" />
            <Text style={tf.listeBosBaslik}>Henüz talep yok</Text>
            <Text style={tf.listeBosAlt}>Yeni talep oluşturmak için butona bas</Text>
          </View>
        ) : (
          <FlatList data={talepler} keyExtractor={t => t.id} renderItem={({ item }) => (<TalepKart talep={item} onPress={() => setSecilenTalep(item)} />)} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} onRefresh={() => user?.uid && getTalepler(user.uid)} refreshing={taleplerLoading} onEndReached={() => user?.uid && taleplerHasMore && getTaleplerNextPage(user.uid)} onEndReachedThreshold={0.3} ListFooterComponent={taleplerLoadingMore ? <ActivityIndicator color="#ffd800" style={{ marginVertical: 16 }} /> : null} />
        )}
        {!!secilenTalep && (
          <View style={tf.detayModal}>
            <View style={tf.detayModalIcerik}>
              <View style={tf.detayModalBaslikRow}>
                <Text style={tf.detayModalBaslik} numberOfLines={1}>{secilenTalep.kategori}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {(!secilenTalep.durum || secilenTalep.durum === 'Beklemede') && (
                    <TouchableOpacity style={tf.duzenleBtn} onPress={() => duzenle(secilenTalep)} activeOpacity={0.8}>
                      <MaterialIcons name="edit" size={13} color="#000000" /><Text style={tf.duzenleBtnTxt}>Düzenle</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setSecilenTalep(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={20} color="#888888" />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {(() => { const d = secilenTalep.durum || 'Beklemede'; const dr = DURUM_RENK_T[d] || '#888888'; const di = DURUM_IKON_T[d] || 'hourglass-empty'; return (<View style={[tf.detayRow, { alignItems: 'center' }]}><Text style={tf.detayEtiket}>Durum</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><MaterialIcons name={di} size={14} color={dr} /><Text style={[tf.detayDeger, { color: dr, fontWeight: '700' }]}>{d}</Text></View></View>); })()}
                {[['Tarih', tFmtGunAy(secilenTalep.tarih)], ['Firma / Departman', secilenTalep.firmaDepartman], ['Ad Soyad', secilenTalep.adSoyad], ['Görev / Ünvan', secilenTalep.gorevUnvan], ['Öncelik', secilenTalep.oncelik], secilenTalep.teslimTarihi ? ['Teslim Tarihi', tFmtGunAy(secilenTalep.teslimTarihi)] : null, secilenTalep.altSecenekler?.length > 0 ? ['Seçilenler', secilenTalep.altSecenekler.join(', ')] : null, secilenTalep.talepAciklamasi ? ['Açıklama', secilenTalep.talepAciklamasi] : null].filter(Boolean).map(([lbl, val]) => (<View key={lbl} style={tf.detayRow}><Text style={tf.detayEtiket}>{lbl}</Text><Text style={tf.detayDeger}>{val}</Text></View>))}
                {secilenTalep.altSeceneklerMetin && Object.entries(secilenTalep.altSeceneklerMetin).map(([k, v]) => v ? (<View key={k} style={tf.detayRow}><Text style={tf.detayEtiket}>{k}</Text><Text style={tf.detayDeger}>{v}</Text></View>) : null)}
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
        <View style={tf.basariIkon}><MaterialIcons name="check-circle" size={56} color="#10b981" /></View>
        <Text style={tf.basariBaslik}>{duzenlenenId ? 'Talep Güncellendi!' : 'Talep Gönderildi!'}</Text>
        <Text style={tf.basariAlt}>{duzenlenenId ? 'Talebiniz başarıyla güncellendi.' : 'Talebiniz başarıyla iletildi.'}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[tf.yeniBtn, { flex: 1, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' }]} onPress={listeyeDon} activeOpacity={0.85}><MaterialIcons name="list" size={18} color="#888888" /><Text style={[tf.yeniBtnTxt, { color: '#888888' }]}>Taleplerime Dön</Text></TouchableOpacity>
          <TouchableOpacity style={[tf.yeniBtn, { flex: 1 }]} onPress={yeniTalep} activeOpacity={0.85}><MaterialIcons name="add-circle-outline" size={18} color="#000000" /><Text style={tf.yeniBtnTxt}>Yeni Talep</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={tf.formBaslikRow}>
        <TouchableOpacity onPress={listeyeDon} style={tf.formGeriBtn} activeOpacity={0.75}><MaterialIcons name="arrow-back" size={18} color="#888888" /></TouchableOpacity>
        <Text style={tf.formBaslikTxt}>{duzenlenenId ? 'Talebi Düzenle' : 'Yeni Talep Oluştur'}</Text>
      </View>
      <ScrollView style={tf.scroll} contentContainerStyle={tf.icerik} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={tf.adimBar}>
          {TALEP_ADIMLAR.map((lbl, i) => { const n = i + 1; const aktif = adim === n; const tam = adim > n; return (<View key={n} style={{ flex: 1, alignItems: 'center' }}><View style={[tf.adimDaire, aktif && tf.adimDaireAktif, tam && tf.adimDaireTam]}>{tam ? <MaterialIcons name="check" size={14} color="#000000" /> : <Text style={[tf.adimNo, (aktif || tam) && tf.adimNoAktif]}>{n}</Text>}</View><Text style={[tf.adimLbl, aktif && tf.adimLblAktif]} numberOfLines={1}>{lbl}</Text>{n < 3 && <View style={[tf.adimCizgi, tam && tf.adimCizgiTam]} />}</View>); })}
        </View>

        {adim === 1 && (
          <View style={tf.adimPanel}>
            <Text style={tf.panelBaslik}>Talep Bilgileri</Text>
            <Text style={tf.etiket}>Tarih</Text>
            <TouchableOpacity style={[tf.alanBtn, acikCal === 'tarih' && tf.alanBtnAktif]} onPress={() => setAcikCal(acikCal === 'tarih' ? null : 'tarih')} activeOpacity={0.75}>
              <MaterialIcons name="event" size={16} color={form.tarih ? '#ffd800' : '#555555'} />
              <Text style={[tf.alanBtnTxt, form.tarih && { color: '#ffd800' }]}>{form.tarih ? tFmtGunAy(form.tarih) : 'Tarih seçin'}</Text>
              <MaterialIcons name={acikCal === 'tarih' ? 'expand-less' : 'expand-more'} size={18} color="#444444" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            {acikCal === 'tarih' && <TalepCalendar value={form.tarih} onChange={v => { set('tarih', v); setAcikCal(null); }} />}
            <Text style={tf.etiket}>Firma / Departman</Text>
            <View style={tf.inputWrap}><MaterialIcons name="business" size={16} color="#555555" /><TextInput style={tf.input} value={form.firmaDepartman} onChangeText={t => set('firmaDepartman', t)} placeholder="Örn: Arabica Maestro / Grafik Tasarım" placeholderTextColor="#444444" color="#e0e0e0" /></View>
            <Text style={tf.etiket}>Ad Soyad</Text>
            <View style={tf.inputWrap}><MaterialIcons name="person" size={16} color="#555555" /><TextInput style={tf.input} value={form.adSoyad} onChangeText={t => set('adSoyad', t)} placeholder="Ad Soyad" placeholderTextColor="#444444" color="#e0e0e0" /></View>
            <Text style={tf.etiket}>Görev / Ünvan</Text>
            <View style={tf.inputWrap}><MaterialIcons name="work" size={16} color="#555555" /><TextInput style={tf.input} value={form.gorevUnvan} onChangeText={t => set('gorevUnvan', t)} placeholder="Örn: Sosyal Medya Sorumlusu" placeholderTextColor="#444444" color="#e0e0e0" /></View>
          </View>
        )}

        {adim === 2 && (
          <View style={tf.adimPanel}>
            <Text style={tf.panelBaslik}>Talep Kategorisi</Text>
            <Text style={tf.panelAlt}>Talebinize en uygun kategoriyi seçin</Text>
            {TALEP_KATEGORILER.map(({ label, icon }) => { const secili = form.kategori === label; return (<TouchableOpacity key={label} style={[tf.kategoriBtn, secili ? tf.kategoriBtnSecili : tf.kategoriBtnNormal]} onPress={() => { set('kategori', label); set('altSecenekler', []); set('altSeceneklerMetin', {}); }} activeOpacity={0.75}><View style={[tf.kategoriBtnSerit, secili && tf.kategoriBtnSeritSecili]} /><View style={[tf.kategoriIkonWrap, secili && tf.kategoriIkonWrapSecili]}><MaterialIcons name={icon} size={20} color={secili ? '#ffd800' : '#555555'} /></View><Text style={[tf.kategoriTxt, secili && tf.kategoriTxtSecili]} numberOfLines={2}>{label}</Text><View style={[tf.radio, secili && tf.radioSecili]}>{secili && <View style={tf.radioDot} />}</View></TouchableOpacity>); })}
          </View>
        )}

        {adim === 3 && (
          <View style={tf.adimPanel}>
            <Text style={tf.panelBaslik}>{form.kategori}</Text>
            <Text style={tf.panelAlt}>İlgili seçenekleri işaretleyin</Text>
            <View style={tf.altSecGrid}>
              {(KATEGORI_ALT_SECENEKLER[form.kategori] || []).map((item) => {
                if (item.type === 'check') { const s = (form.altSecenekler || []).includes(item.key); return (<TouchableOpacity key={item.key} style={[tf.altSecChip, s && tf.altSecChipSecili]} onPress={() => toggleAlt(item.key)} activeOpacity={0.75}><View style={[tf.altSecCheck, s && tf.altSecCheckSecili]}>{s && <MaterialIcons name="check" size={12} color="#000000" />}</View><Text style={[tf.altSecTxt, s && tf.altSecTxtSecili]}>{item.key}</Text></TouchableOpacity>); }
                if (item.type === 'check_text') { const s = (form.altSecenekler || []).includes(item.key); return (<View key={item.key} style={{ width: '100%' }}><TouchableOpacity style={[tf.altSecChip, s && tf.altSecChipSecili]} onPress={() => toggleAlt(item.key)} activeOpacity={0.75}><View style={[tf.altSecCheck, s && tf.altSecCheckSecili]}>{s && <MaterialIcons name="check" size={12} color="#000000" />}</View><Text style={[tf.altSecTxt, s && tf.altSecTxtSecili]}>{item.key}</Text></TouchableOpacity>{s && <TextInput style={tf.altSecExpInput} value={form.altSeceneklerMetin?.[item.key] || ''} onChangeText={v => setAltMetin(item.key, v)} placeholder={item.placeholder || 'Açıklayın...'} placeholderTextColor="#444444" color="#e0e0e0" multiline />}</View>); }
                if (item.type === 'text') { return (<View key={item.key} style={tf.altSecTextRow}><Text style={tf.altSecTextLbl}>{item.key}</Text><TextInput style={tf.altSecTextInput} value={form.altSeceneklerMetin?.[item.key] || ''} onChangeText={v => setAltMetin(item.key, v)} placeholder={item.placeholder || ''} placeholderTextColor="#444444" color="#e0e0e0" /></View>); }
                return null;
              })}
            </View>
            {(form.altSecenekler?.length || 0) > 0 && (<View style={tf.altSecOzet}><MaterialIcons name="check-circle" size={13} color="#10b981" /><Text style={tf.altSecOzetTxt}>{form.altSecenekler.length} seçenek seçildi: {form.altSecenekler.join(', ')}</Text></View>)}
          </View>
        )}

        {adim === 4 && (
          <View style={tf.adimPanel}>
            <Text style={tf.panelBaslik}>Talep Detayı</Text>
            <Text style={tf.etiket}>Talep Açıklaması</Text>
            <View style={[tf.inputWrap, { alignItems: 'flex-start', paddingTop: 12 }]}><MaterialIcons name="assignment" size={16} color="#555555" /><TextInput style={[tf.input, { minHeight: 100, textAlignVertical: 'top' }]} value={form.talepAciklamasi} onChangeText={t => set('talepAciklamasi', t)} placeholder="Talep detayını yazınız..." placeholderTextColor="#444444" color="#e0e0e0" multiline numberOfLines={4} /></View>
            <Text style={tf.etiket}>Teslim / Uygulama Tarihi <Text style={{ color: '#444444', fontWeight: '400' }}>(isteğe bağlı)</Text></Text>
            <TouchableOpacity style={[tf.alanBtn, acikCal === 'teslim' && tf.alanBtnAktif]} onPress={() => setAcikCal(acikCal === 'teslim' ? null : 'teslim')} activeOpacity={0.75}>
              <MaterialIcons name="event" size={16} color={form.teslimTarihi ? '#ef4444' : '#555555'} />
              <Text style={[tf.alanBtnTxt, form.teslimTarihi && { color: '#ef4444' }]}>{form.teslimTarihi ? tFmtGunAy(form.teslimTarihi) : 'Tarih seçin'}</Text>
              {form.teslimTarihi && <TouchableOpacity onPress={() => { set('teslimTarihi', ''); setAcikCal(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><MaterialIcons name="close" size={15} color="#444444" /></TouchableOpacity>}
              <MaterialIcons name={acikCal === 'teslim' ? 'expand-less' : 'expand-more'} size={18} color="#444444" style={{ marginLeft: form.teslimTarihi ? 0 : 'auto' }} />
            </TouchableOpacity>
            {acikCal === 'teslim' && <TalepCalendar value={form.teslimTarihi} onChange={v => { set('teslimTarihi', v); setAcikCal(null); }} minDate={form.tarih || undefined} />}
            <Text style={tf.etiket}>Öncelik Durumu</Text>
            <View style={tf.oncelikRow}>
              {TALEP_ONCELIKLER.map(({ label, renk, icon }) => { const s = form.oncelik === label; return (<TouchableOpacity key={label} style={[tf.oncelikChip, { borderColor: s ? renk : '#2a2a2a', backgroundColor: s ? renk + '18' : '#141414' }]} onPress={() => set('oncelik', label)} activeOpacity={0.8}><MaterialIcons name={icon} size={15} color={s ? renk : '#444444'} /><Text style={[tf.oncelikTxt, { color: s ? renk : '#555555' }]}>{label}</Text></TouchableOpacity>); })}
            </View>
          </View>
        )}

        {!!hata && (<View style={tf.hataKutu}><MaterialIcons name="error-outline" size={15} color="#ef4444" /><Text style={tf.hataTxt}>{hata}</Text></View>)}

        <View style={tf.btnRow}>
          {adim > 1 && (<TouchableOpacity style={tf.geriBtn} onPress={geri} activeOpacity={0.8}><MaterialIcons name="chevron-left" size={18} color="#888888" /><Text style={tf.geriBtnTxt}>Geri</Text></TouchableOpacity>)}
          {adim < 4 ? (<TouchableOpacity style={[tf.ileriBtn, adim === 1 && { flex: 1 }]} onPress={ileri} activeOpacity={0.85}><Text style={tf.ileriBtnTxt}>İleri</Text><MaterialIcons name="chevron-right" size={18} color="#000000" /></TouchableOpacity>) : (<TouchableOpacity style={[tf.gonderBtn, gonderiliyor && { opacity: 0.7 }]} onPress={gonder} activeOpacity={0.85} disabled={gonderiliyor}>{gonderiliyor ? <ActivityIndicator color="#000000" size="small" /> : <><MaterialIcons name={duzenlenenId ? 'save' : 'send'} size={17} color="#000000" /><Text style={tf.gonderBtnTxt}>{duzenlenenId ? 'Güncelle' : 'Talebi Gönder'}</Text></>}</TouchableOpacity>)}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Kullanıcı İzin Talepleri Bölümü ──────────────────────────────────────────
function KullaniciIzinler({ user, userProfile }) {
  const { izinler, izinlerLoading, izinlerLoadingMore, izinlerHasMore, getIzinlerIfNeeded, getIzinler, getIzinlerNextPage, izinEkle } = useTalepler();
  const [gorunum, setGorunum] = useState('liste');
  const [secilenIzin, setSecilenIzin] = useState(null);
  const [form, setForm] = useState({ izinTuru: '', baslangicTarihi: '', bitisTarihi: '', aciklama: '' });
  const [acikCal, setAcikCal] = useState(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => { if (user?.uid) getIzinlerIfNeeded(user.uid); }, [user?.uid, getIzinlerIfNeeded]);

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const gunSayisi = diffGun(form.baslangicTarihi, form.bitisTarihi);

  const gonder = async () => {
    if (!form.izinTuru) { setHata('İzin türü seçin.'); return; }
    if (!form.baslangicTarihi || !form.bitisTarihi) { setHata('Başlangıç ve bitiş tarihi seçin.'); return; }
    if (form.bitisTarihi < form.baslangicTarihi) { setHata('Bitiş tarihi başlangıçtan önce olamaz.'); return; }
    setHata(''); setGonderiliyor(true);
    try {
      await izinEkle(user.uid, userProfile?.displayName || '', {
        izinTuru: form.izinTuru,
        baslangicTarihi: form.baslangicTarihi,
        bitisTarihi: form.bitisTarihi,
        gunSayisi,
        aciklama: form.aciklama.trim(),
      });
      setGonderildi(true);
    } catch (e) { setHata('Gönderilemedi: ' + (e?.message || 'Bir hata oluştu')); }
    finally { setGonderiliyor(false); }
  };

  const yeni = () => { setForm({ izinTuru: '', baslangicTarihi: '', bitisTarihi: '', aciklama: '' }); setHata(''); setGonderildi(false); setAcikCal(null); setGorunum('form'); };
  const listeyeDon = () => { setGonderildi(false); setHata(''); setAcikCal(null); setSecilenIzin(null); setGorunum('liste'); if (user?.uid) getIzinler(user.uid); };

  if (gorunum === 'liste') {
    return (
      <View style={{ flex: 1 }}>
        <View style={tf.listeBaslikRow}>
          <Text style={tf.listeBaslik}>İzin Taleplerim</Text>
          <TouchableOpacity style={tf.yeniTalepBtn} onPress={yeni} activeOpacity={0.85}>
            <MaterialIcons name="add" size={16} color="#000000" />
            <Text style={tf.yeniTalepBtnTxt}>İzin Talebi</Text>
          </TouchableOpacity>
        </View>
        {izinlerLoading && izinler.length === 0 ? (
          <View style={tf.listeYukleniyor}><ActivityIndicator color="#ffd800" /></View>
        ) : izinler.length === 0 ? (
          <View style={tf.listeBos}>
            <MaterialIcons name="beach-access" size={42} color="#2a2a2a" />
            <Text style={tf.listeBosBaslik}>Henüz izin talebi yok</Text>
            <Text style={tf.listeBosAlt}>Yeni izin talebi oluşturmak için butona bas</Text>
          </View>
        ) : (
          <FlatList data={izinler} keyExtractor={i => i.id} renderItem={({ item }) => (<IzinKart izin={item} onPress={() => setSecilenIzin(item)} />)} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} onRefresh={() => user?.uid && getIzinler(user.uid)} refreshing={izinlerLoading} onEndReached={() => user?.uid && izinlerHasMore && getIzinlerNextPage(user.uid)} onEndReachedThreshold={0.3} ListFooterComponent={izinlerLoadingMore ? <ActivityIndicator color="#ffd800" style={{ marginVertical: 16 }} /> : null} />
        )}
        {!!secilenIzin && (
          <View style={tf.detayModal}>
            <View style={tf.detayModalIcerik}>
              <View style={tf.detayModalBaslikRow}>
                <Text style={tf.detayModalBaslik}>{IZIN_TURLERI.find(t => t.key === secilenIzin.izinTuru)?.label || 'İzin Talebi'}</Text>
                <TouchableOpacity onPress={() => setSecilenIzin(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><MaterialIcons name="close" size={20} color="#888888" /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {(() => { const d = secilenIzin.durum || 'Beklemede'; const dr = DURUM_RENK_I[d] || '#888888'; const di = DURUM_IKON_I[d] || 'hourglass-empty'; return (<View style={[tf.detayRow, { alignItems: 'center' }]}><Text style={tf.detayEtiket}>Durum</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><MaterialIcons name={di} size={14} color={dr} /><Text style={[tf.detayDeger, { color: dr, fontWeight: '700' }]}>{d}</Text></View></View>); })()}
                {[['Başlangıç', fmtGunAy(secilenIzin.baslangicTarihi)], ['Bitiş', fmtGunAy(secilenIzin.bitisTarihi)], ['Süre', `${secilenIzin.gunSayisi} gün`], secilenIzin.aciklama ? ['Açıklama', secilenIzin.aciklama] : null, secilenIzin.adminNotu ? ['Admin Notu', secilenIzin.adminNotu] : null].filter(Boolean).map(([lbl, val]) => (<View key={lbl} style={tf.detayRow}><Text style={tf.detayEtiket}>{lbl}</Text><Text style={tf.detayDeger}>{val}</Text></View>))}
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
        <View style={tf.basariIkon}><MaterialIcons name="check-circle" size={56} color="#10b981" /></View>
        <Text style={tf.basariBaslik}>İzin Talebi Gönderildi!</Text>
        <Text style={tf.basariAlt}>Talebiniz admin onayına iletildi.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[tf.yeniBtn, { flex: 1, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' }]} onPress={listeyeDon} activeOpacity={0.85}><MaterialIcons name="list" size={18} color="#888888" /><Text style={[tf.yeniBtnTxt, { color: '#888888' }]}>Listeme Dön</Text></TouchableOpacity>
          <TouchableOpacity style={[tf.yeniBtn, { flex: 1 }]} onPress={yeni} activeOpacity={0.85}><MaterialIcons name="add-circle-outline" size={18} color="#000000" /><Text style={tf.yeniBtnTxt}>Yeni İzin</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={tf.formBaslikRow}>
        <TouchableOpacity onPress={listeyeDon} style={tf.formGeriBtn} activeOpacity={0.75}><MaterialIcons name="arrow-back" size={18} color="#888888" /></TouchableOpacity>
        <Text style={tf.formBaslikTxt}>Yeni İzin Talebi</Text>
      </View>
      <ScrollView contentContainerStyle={[tf.icerik, { padding: 16 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={tf.panelBaslik}>İzin Türü</Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {IZIN_TURLERI.map(tur => { const s = form.izinTuru === tur.key; return (<TouchableOpacity key={tur.key} style={[tf.kategoriBtn, s ? tf.kategoriBtnSecili : tf.kategoriBtnNormal]} onPress={() => setF('izinTuru', tur.key)} activeOpacity={0.75}><View style={[tf.kategoriBtnSerit, s && { backgroundColor: tur.color }]} /><View style={[tf.kategoriIkonWrap, s && { backgroundColor: tur.color + '20' }]}><MaterialIcons name={tur.icon} size={20} color={s ? tur.color : '#555555'} /></View><Text style={[tf.kategoriTxt, s && { color: tur.color }]}>{tur.label}</Text><View style={[tf.radio, s && { borderColor: tur.color, backgroundColor: tur.color + '20' }]}>{s && <View style={[tf.radioDot, { backgroundColor: tur.color }]} />}</View></TouchableOpacity>); })}
        </View>

        <Text style={tf.panelBaslik}>İzin Tarihleri</Text>
        <Text style={tf.etiket}>Başlangıç Tarihi</Text>
        <TouchableOpacity style={[tf.alanBtn, acikCal === 'bas' && tf.alanBtnAktif]} onPress={() => setAcikCal(acikCal === 'bas' ? null : 'bas')} activeOpacity={0.75}>
          <MaterialIcons name="event" size={16} color={form.baslangicTarihi ? '#6366f1' : '#555555'} />
          <Text style={[tf.alanBtnTxt, form.baslangicTarihi && { color: '#6366f1' }]}>{form.baslangicTarihi ? fmtGunAy(form.baslangicTarihi) : 'Başlangıç seçin'}</Text>
          <MaterialIcons name={acikCal === 'bas' ? 'expand-less' : 'expand-more'} size={18} color="#444444" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        {acikCal === 'bas' && <TalepCalendar value={form.baslangicTarihi} onChange={v => { setF('baslangicTarihi', v); setAcikCal(null); }} />}

        <Text style={[tf.etiket, { marginTop: 12 }]}>Bitiş Tarihi</Text>
        <TouchableOpacity style={[tf.alanBtn, acikCal === 'bit' && tf.alanBtnAktif]} onPress={() => setAcikCal(acikCal === 'bit' ? null : 'bit')} activeOpacity={0.75}>
          <MaterialIcons name="event-available" size={16} color={form.bitisTarihi ? '#10b981' : '#555555'} />
          <Text style={[tf.alanBtnTxt, form.bitisTarihi && { color: '#10b981' }]}>{form.bitisTarihi ? fmtGunAy(form.bitisTarihi) : 'Bitiş seçin'}</Text>
          <MaterialIcons name={acikCal === 'bit' ? 'expand-less' : 'expand-more'} size={18} color="#444444" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        {acikCal === 'bit' && <TalepCalendar value={form.bitisTarihi} onChange={v => { setF('bitisTarihi', v); setAcikCal(null); }} minDate={form.baslangicTarihi || undefined} />}

        {gunSayisi > 0 && (
          <View style={[tf.altSecOzet, { marginTop: 12 }]}><MaterialIcons name="date-range" size={13} color="#6366f1" /><Text style={[tf.altSecOzetTxt, { color: '#6366f1' }]}>{gunSayisi} gün izin</Text></View>
        )}

        <Text style={[tf.panelBaslik, { marginTop: 20 }]}>Açıklama <Text style={{ color: '#444444', fontWeight: '400', fontSize: 12 }}>(isteğe bağlı)</Text></Text>
        <View style={[tf.inputWrap, { alignItems: 'flex-start', paddingTop: 12 }]}><MaterialIcons name="notes" size={16} color="#555555" /><TextInput style={[tf.input, { minHeight: 80, textAlignVertical: 'top' }]} value={form.aciklama} onChangeText={v => setF('aciklama', v)} placeholder="İzin nedeninizi kısaca açıklayın..." placeholderTextColor="#444444" color="#e0e0e0" multiline /></View>

        {!!hata && (<View style={tf.hataKutu}><MaterialIcons name="error-outline" size={15} color="#ef4444" /><Text style={tf.hataTxt}>{hata}</Text></View>)}

        <TouchableOpacity style={[tf.gonderBtn, { marginTop: 20 }, gonderiliyor && { opacity: 0.7 }]} onPress={gonder} activeOpacity={0.85} disabled={gonderiliyor}>
          {gonderiliyor ? <ActivityIndicator color="#000000" size="small" /> : <><MaterialIcons name="send" size={17} color="#000000" /><Text style={tf.gonderBtnTxt}>İzin Talebini Gönder</Text></>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Admin Tüm Talepler ────────────────────────────────────────────────────────
function AdminTaleplerBolumu() {
  const { allTalepler: talepler, allTaleplerLoading: yukleniyor, allTaleplerLoadingMore: dahaFazlaYukleniyor, allTaleplerHasMore: dahaFazlaVar, getAllTaleplerIfNeeded, getAllTalepler, getAllTaleplerNextPage, talepDurumGuncelle } = useTalepler();
  const [refreshing, setRefreshing] = useState(false);
  const [secilenTalep, setSecilenTalep] = useState(null);
  const [islemYapiliyor, setIslemYapiliyor] = useState(false);
  const [confirm, setConfirm] = useState(CONFIRM_DEF);
  const hideConfirm = useCallback(() => setConfirm(c => ({ ...c, visible: false })), []);

  useEffect(() => { getAllTaleplerIfNeeded(); }, [getAllTaleplerIfNeeded]);
  const onRefresh = useCallback(async () => { setRefreshing(true); try { await getAllTalepler(); } finally { setRefreshing(false); } }, [getAllTalepler]);

  const durumGuncelle = async (talep, yeniDurum) => {
    setIslemYapiliyor(true);
    try {
      await talepDurumGuncelle(talep.id, yeniDurum);
      setSecilenTalep(t => t ? { ...t, durum: yeniDurum } : t);
    } catch (e) { if (__DEV__) console.warn('Durum güncellenemedi:', e?.message); }
    finally { setIslemYapiliyor(false); }
  };

  const onaylaConfirm = (talep) => setConfirm({ visible: true, icon: 'check-circle', iconColor: '#10b981', title: 'Talebi Onayla', message: `${talep.adSoyad || talep.displayName} adlı kişinin talebini onaylıyor musunuz?`, confirmText: 'Onayla', cancelText: 'İptal', destructive: false, onConfirm: () => { hideConfirm(); durumGuncelle(talep, 'Onaylandı'); } });
  const reddetConfirm = (talep) => setConfirm({ visible: true, icon: 'cancel', iconColor: '#ef4444', title: 'Talebi Reddet', message: `${talep.adSoyad || talep.displayName} adlı kişinin talebini reddedeceksiniz.`, confirmText: 'Reddet', cancelText: 'İptal', destructive: true, onConfirm: () => { hideConfirm(); durumGuncelle(talep, 'Reddedildi'); } });

  const bekleyenSayi = talepler.filter(t => t.durum === 'Beklemede').length;

  return (
    <View style={{ flex: 1 }}>
      <View style={tf.listeBaslikRow}>
        <Text style={tf.listeBaslik}>Tüm Talepler</Text>
        {bekleyenSayi > 0 && <View style={tf.bekleyenBadge}><Text style={tf.bekleyenBadgeTxt}>{bekleyenSayi} bekleyen</Text></View>}
      </View>
      {yukleniyor && talepler.length === 0 ? (
        <View style={tf.listeYukleniyor}><ActivityIndicator color="#ffd800" /></View>
      ) : talepler.length === 0 ? (
        <View style={tf.listeBos}><MaterialIcons name="assignment" size={42} color="#2a2a2a" /><Text style={tf.listeBosBaslik}>Talep yok</Text></View>
      ) : (
        <FlatList data={talepler} keyExtractor={t => t.id} renderItem={({ item }) => (<TalepKart talep={item} onPress={() => setSecilenTalep(item)} />)} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" />} onEndReached={() => dahaFazlaVar && getAllTaleplerNextPage()} onEndReachedThreshold={0.3} ListFooterComponent={dahaFazlaYukleniyor ? <ActivityIndicator color="#ffd800" style={{ marginVertical: 16 }} /> : null} />
      )}

      {!!secilenTalep && (
        <View style={tf.detayModal}>
          <View style={tf.detayModalIcerik}>
            <View style={tf.detayModalBaslikRow}>
              <Text style={tf.detayModalBaslik} numberOfLines={1}>{secilenTalep.kategori}</Text>
              <TouchableOpacity onPress={() => setSecilenTalep(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><MaterialIcons name="close" size={20} color="#888888" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(() => { const d = secilenTalep.durum || 'Beklemede'; const dr = DURUM_RENK_T[d] || '#888888'; const di = DURUM_IKON_T[d] || 'hourglass-empty'; return (<View style={[tf.detayRow, { alignItems: 'center' }]}><Text style={tf.detayEtiket}>Durum</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><MaterialIcons name={di} size={14} color={dr} /><Text style={[tf.detayDeger, { color: dr, fontWeight: '700' }]}>{d}</Text></View></View>); })()}
              {[['Gönderen', secilenTalep.adSoyad || secilenTalep.displayName], ['Tarih', tFmtGunAy(secilenTalep.tarih)], ['Firma / Departman', secilenTalep.firmaDepartman], ['Görev / Ünvan', secilenTalep.gorevUnvan], ['Öncelik', secilenTalep.oncelik], secilenTalep.teslimTarihi ? ['Teslim Tarihi', tFmtGunAy(secilenTalep.teslimTarihi)] : null, secilenTalep.altSecenekler?.length > 0 ? ['Seçilenler', secilenTalep.altSecenekler.join(', ')] : null, secilenTalep.talepAciklamasi ? ['Açıklama', secilenTalep.talepAciklamasi] : null].filter(Boolean).map(([lbl, val]) => (<View key={lbl} style={tf.detayRow}><Text style={tf.detayEtiket}>{lbl}</Text><Text style={tf.detayDeger}>{val}</Text></View>))}
              <View style={{ height: 8 }} />
              {secilenTalep.durum === 'Beklemede' && (
                <View style={tf.adminBtnRow}>
                  <TouchableOpacity style={tf.adminOnaylaBtn} onPress={() => onaylaConfirm(secilenTalep)} disabled={islemYapiliyor} activeOpacity={0.85}>
                    {islemYapiliyor ? <ActivityIndicator color="#ffffff" size="small" /> : <><MaterialIcons name="check" size={16} color="#ffffff" /><Text style={tf.adminOnaylaBtnTxt}>Onayla</Text></>}
                  </TouchableOpacity>
                  <TouchableOpacity style={tf.adminReddetBtn} onPress={() => reddetConfirm(secilenTalep)} disabled={islemYapiliyor} activeOpacity={0.85}>
                    <MaterialIcons name="close" size={16} color="#ffffff" /><Text style={tf.adminReddetBtnTxt}>Reddet</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      )}
      <ConfirmModal visible={confirm.visible} icon={confirm.icon} iconColor={confirm.iconColor} title={confirm.title} message={confirm.message} confirmText={confirm.confirmText} cancelText={confirm.cancelText} destructive={confirm.destructive} onConfirm={confirm.onConfirm} onCancel={hideConfirm} />
    </View>
  );
}

// ── Admin Tüm İzin Talepleri ──────────────────────────────────────────────────
function AdminIzinlerBolumu() {
  const { allIzinler: izinler, allIzinlerLoading: yukleniyor, allIzinlerLoadingMore: dahaFazlaYukleniyor, allIzinlerHasMore: dahaFazlaVar, getAllIzinlerIfNeeded, getAllIzinler, getAllIzinlerNextPage, izinDurumGuncelle } = useTalepler();
  const [refreshing, setRefreshing] = useState(false);
  const [secilenIzin, setSecilenIzin] = useState(null);
  const [islemYapiliyor, setIslemYapiliyor] = useState(false);
  const [confirm, setConfirm] = useState(CONFIRM_DEF);
  const hideConfirm = useCallback(() => setConfirm(c => ({ ...c, visible: false })), []);

  useEffect(() => { getAllIzinlerIfNeeded(); }, [getAllIzinlerIfNeeded]);
  const onRefresh = useCallback(async () => { setRefreshing(true); try { await getAllIzinler(); } finally { setRefreshing(false); } }, [getAllIzinler]);

  const durumGuncelle = async (izin, yeniDurum, adminNotu = '') => {
    setIslemYapiliyor(true);
    try {
      await izinDurumGuncelle(izin.id, yeniDurum, adminNotu);
      setSecilenIzin(i => i ? { ...i, durum: yeniDurum, adminNotu } : i);
    } catch (e) { if (__DEV__) console.warn('İzin durum güncellenemedi:', e?.message); }
    finally { setIslemYapiliyor(false); }
  };

  const onaylaConfirm = (izin) => setConfirm({ visible: true, icon: 'check-circle', iconColor: '#10b981', title: 'İzni Onayla', message: `${izin.displayName} adlı kişinin ${IZIN_TURLERI.find(t => t.key === izin.izinTuru)?.label || 'izin'} talebini onaylıyor musunuz?`, confirmText: 'Onayla', cancelText: 'İptal', destructive: false, onConfirm: () => { hideConfirm(); durumGuncelle(izin, 'Onaylandı'); } });
  const reddetConfirm = (izin) => setConfirm({ visible: true, icon: 'cancel', iconColor: '#ef4444', title: 'İzni Reddet', message: `${izin.displayName} adlı kişinin izin talebini reddedeceksiniz.`, confirmText: 'Reddet', cancelText: 'İptal', destructive: true, onConfirm: () => { hideConfirm(); durumGuncelle(izin, 'Reddedildi'); } });

  const bekleyenSayi = izinler.filter(i => i.durum === 'Beklemede').length;

  return (
    <View style={{ flex: 1 }}>
      <View style={tf.listeBaslikRow}>
        <Text style={tf.listeBaslik}>Tüm İzin Talepleri</Text>
        {bekleyenSayi > 0 && <View style={tf.bekleyenBadge}><Text style={tf.bekleyenBadgeTxt}>{bekleyenSayi} bekleyen</Text></View>}
      </View>
      {yukleniyor && izinler.length === 0 ? (
        <View style={tf.listeYukleniyor}><ActivityIndicator color="#ffd800" /></View>
      ) : izinler.length === 0 ? (
        <View style={tf.listeBos}><MaterialIcons name="beach-access" size={42} color="#2a2a2a" /><Text style={tf.listeBosBaslik}>İzin talebi yok</Text></View>
      ) : (
        <FlatList data={izinler} keyExtractor={i => i.id} renderItem={({ item }) => (<IzinKart izin={item} onPress={() => setSecilenIzin(item)} />)} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" />} onEndReached={() => dahaFazlaVar && getAllIzinlerNextPage()} onEndReachedThreshold={0.3} ListFooterComponent={dahaFazlaYukleniyor ? <ActivityIndicator color="#ffd800" style={{ marginVertical: 16 }} /> : null} />
      )}

      {!!secilenIzin && (
        <View style={tf.detayModal}>
          <View style={tf.detayModalIcerik}>
            <View style={tf.detayModalBaslikRow}>
              <Text style={tf.detayModalBaslik}>{IZIN_TURLERI.find(t => t.key === secilenIzin.izinTuru)?.label || 'İzin'}</Text>
              <TouchableOpacity onPress={() => setSecilenIzin(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><MaterialIcons name="close" size={20} color="#888888" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(() => { const d = secilenIzin.durum || 'Beklemede'; const dr = DURUM_RENK_I[d] || '#888888'; const di = DURUM_IKON_I[d] || 'hourglass-empty'; return (<View style={[tf.detayRow, { alignItems: 'center' }]}><Text style={tf.detayEtiket}>Durum</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><MaterialIcons name={di} size={14} color={dr} /><Text style={[tf.detayDeger, { color: dr, fontWeight: '700' }]}>{d}</Text></View></View>); })()}
              {[['Kişi', secilenIzin.displayName], ['İzin Türü', IZIN_TURLERI.find(t => t.key === secilenIzin.izinTuru)?.label || secilenIzin.izinTuru], ['Başlangıç', fmtGunAy(secilenIzin.baslangicTarihi)], ['Bitiş', fmtGunAy(secilenIzin.bitisTarihi)], ['Süre', `${secilenIzin.gunSayisi} gün`], secilenIzin.aciklama ? ['Açıklama', secilenIzin.aciklama] : null, secilenIzin.adminNotu ? ['Admin Notu', secilenIzin.adminNotu] : null].filter(Boolean).map(([lbl, val]) => (<View key={lbl} style={tf.detayRow}><Text style={tf.detayEtiket}>{lbl}</Text><Text style={tf.detayDeger}>{val}</Text></View>))}
              <View style={{ height: 8 }} />
              {secilenIzin.durum === 'Beklemede' && (
                <View style={tf.adminBtnRow}>
                  <TouchableOpacity style={tf.adminOnaylaBtn} onPress={() => onaylaConfirm(secilenIzin)} disabled={islemYapiliyor} activeOpacity={0.85}>
                    {islemYapiliyor ? <ActivityIndicator color="#ffffff" size="small" /> : <><MaterialIcons name="check" size={16} color="#ffffff" /><Text style={tf.adminOnaylaBtnTxt}>Onayla</Text></>}
                  </TouchableOpacity>
                  <TouchableOpacity style={tf.adminReddetBtn} onPress={() => reddetConfirm(secilenIzin)} disabled={islemYapiliyor} activeOpacity={0.85}>
                    <MaterialIcons name="close" size={16} color="#ffffff" /><Text style={tf.adminReddetBtnTxt}>Reddet</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      )}
      <ConfirmModal visible={confirm.visible} icon={confirm.icon} iconColor={confirm.iconColor} title={confirm.title} message={confirm.message} confirmText={confirm.confirmText} cancelText={confirm.cancelText} destructive={confirm.destructive} onConfirm={confirm.onConfirm} onCancel={hideConfirm} />
    </View>
  );
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
export default function Talepler() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const userProfile = useSelector(s => s.database.userProfile);
  const role = userProfile?.role;
  const isAdmin = role === 'admin';

  const [activeTab, setActiveTab] = useState(0);

  const tabs = isAdmin
    ? [{ label: 'Tüm Talepler', icon: 'assignment' }, { label: 'İzin Talepleri', icon: 'beach-access' }]
    : [{ label: 'Taleplerim', icon: 'assignment' }, { label: 'İzinlerim', icon: 'beach-access' }];

  return (
    <View style={[s.root, { paddingBottom: insets.bottom > 0 ? 0 : 0 }]}>
      {/* Tab Bar */}
      <View style={s.tabBar}>
        {tabs.map((tab, i) => {
          const aktif = activeTab === i;
          return (
            <TouchableOpacity key={i} style={[s.tabBtn, aktif && s.tabBtnAktif]} onPress={() => setActiveTab(i)} activeOpacity={0.75}>
              <MaterialIcons name={tab.icon} size={16} color={aktif ? '#ffd800' : '#555555'} />
              <Text style={[s.tabTxt, aktif && s.tabTxtAktif]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* İçerik */}
      {isAdmin ? (
        <>
          {activeTab === 0 && <AdminTaleplerBolumu />}
          {activeTab === 1 && <AdminIzinlerBolumu />}
        </>
      ) : (
        <>
          {activeTab === 0 && <KullaniciTalepleri user={user} userProfile={userProfile} />}
          {activeTab === 1 && <KullaniciIzinler user={user} userProfile={userProfile} />}
        </>
      )}
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  tabBar: { flexDirection: 'row', backgroundColor: '#111111', borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnAktif: { borderBottomColor: '#ffd800' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#555555' },
  tabTxtAktif: { color: '#ffd800' },
});

const tf = StyleSheet.create({
  // Liste
  listeBaslikRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  listeBaslik: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  yeniTalepBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ffd800', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  yeniTalepBtnTxt: { fontSize: 13, fontWeight: '700', color: '#000000' },
  listeYukleniyor: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listeBos: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  listeBosBaslik: { fontSize: 16, fontWeight: '700', color: '#333333' },
  listeBosAlt: { fontSize: 12, color: '#2a2a2a', textAlign: 'center', paddingHorizontal: 40 },

  // Kart
  talepKart: { flexDirection: 'row', backgroundColor: '#111111', borderRadius: 12, borderWidth: 1, borderColor: '#1e1e1e', overflow: 'hidden', marginHorizontal: 0, marginBottom: 0 },
  talepKartSerit: { width: 3 },
  talepKartBody: { flex: 1, padding: 12, gap: 6 },
  talepKartUst: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  talepIkonWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' },
  talepKategori: { flex: 1, fontSize: 13, fontWeight: '700', color: '#e0e0e0' },
  talepDurum: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  talepDurumTxt: { fontSize: 10, fontWeight: '700' },
  talepAltSec: { fontSize: 11, color: '#888888' },
  talepAciklama: { fontSize: 12, color: '#666666', lineHeight: 17 },
  talepAlt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  talepTarihTxt: { fontSize: 11, color: '#555555' },
  talepKisi: { fontSize: 11, color: '#6366f1', fontWeight: '600', marginLeft: 4 },
  talepOncelikKucuk: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  talepOncelikKucukTxt: { fontSize: 10, fontWeight: '700' },

  // Bekleyen badge
  bekleyenBadge: { backgroundColor: '#ffd80020', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ffd80040' },
  bekleyenBadgeTxt: { fontSize: 12, fontWeight: '700', color: '#ffd800' },

  // Admin butonlar
  adminBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  adminOnaylaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10b981', borderRadius: 10, paddingVertical: 11 },
  adminOnaylaBtnTxt: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  adminReddetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 11 },
  adminReddetBtnTxt: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  // Detay modal
  detayModal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000cc', justifyContent: 'flex-end' },
  detayModalIcerik: { backgroundColor: '#111111', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: '#1e1e1e', borderBottomWidth: 0 },
  detayModalBaslikRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  detayModalBaslik: { flex: 1, fontSize: 16, fontWeight: '700', color: '#ffffff', marginRight: 12 },
  detayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  detayEtiket: { fontSize: 12, color: '#555555', flex: 1 },
  detayDeger: { fontSize: 12, color: '#e0e0e0', flex: 2, textAlign: 'right' },
  duzenleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffd800', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  duzenleBtnTxt: { fontSize: 12, fontWeight: '700', color: '#000000' },

  // Form
  formBaslikRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  formGeriBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', borderRadius: 8 },
  formBaslikTxt: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  scroll: { flex: 1 },
  icerik: { padding: 16, paddingBottom: 40 },
  adimBar: { flexDirection: 'row', marginBottom: 20, position: 'relative' },
  adimDaire: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  adimDaireAktif: { borderColor: '#ffd800', backgroundColor: '#ffd80020' },
  adimDaireTam: { borderColor: '#ffd800', backgroundColor: '#ffd800' },
  adimNo: { fontSize: 11, fontWeight: '700', color: '#444444' },
  adimNoAktif: { color: '#ffd800' },
  adimLbl: { fontSize: 9, color: '#444444', marginTop: 4, textAlign: 'center' },
  adimLblAktif: { color: '#ffd800' },
  adimCizgi: { position: 'absolute', top: 14, left: '50%', right: '-50%', height: 2, backgroundColor: '#2a2a2a', zIndex: 0 },
  adimCizgiTam: { backgroundColor: '#ffd800' },
  adimPanel: { backgroundColor: '#111111', borderRadius: 14, padding: 16, gap: 4, borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 12 },
  panelBaslik: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  panelAlt: { fontSize: 12, color: '#555555', marginBottom: 12 },
  etiket: { fontSize: 12, fontWeight: '600', color: '#888888', marginTop: 10, marginBottom: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 11 },
  input: { flex: 1, fontSize: 14, color: '#e0e0e0' },
  alanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 11 },
  alanBtnAktif: { borderColor: '#ffd80055' },
  alanBtnTxt: { flex: 1, fontSize: 14, color: '#555555' },
  kategoriBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingRight: 14, overflow: 'hidden', marginBottom: 6 },
  kategoriBtnNormal: { backgroundColor: '#111111', borderColor: '#1e1e1e' },
  kategoriBtnSecili: { backgroundColor: '#ffd80008', borderColor: '#ffd80040' },
  kategoriBtnSerit: { width: 3, height: '100%', backgroundColor: '#1e1e1e', alignSelf: 'stretch' },
  kategoriBtnSeritSecili: { backgroundColor: '#ffd800' },
  kategoriIkonWrap: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  kategoriIkonWrapSecili: { backgroundColor: '#ffd80020' },
  kategoriTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: '#888888' },
  kategoriTxtSecili: { color: '#ffd800' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#333333', alignItems: 'center', justifyContent: 'center' },
  radioSecili: { borderColor: '#ffd800', backgroundColor: '#ffd80020' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffd800' },
  altSecGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  altSecChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' },
  altSecChipSecili: { backgroundColor: '#ffd80015', borderColor: '#ffd80055' },
  altSecCheck: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: '#444444', alignItems: 'center', justifyContent: 'center' },
  altSecCheckSecili: { backgroundColor: '#ffd800', borderColor: '#ffd800' },
  altSecTxt: { fontSize: 12, fontWeight: '600', color: '#666666' },
  altSecTxtSecili: { color: '#ffd800' },
  altSecExpInput: { backgroundColor: '#1a1a1a', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 8, color: '#e0e0e0', fontSize: 13, marginTop: 4, width: '100%' },
  altSecTextRow: { width: '100%', marginBottom: 4 },
  altSecTextLbl: { fontSize: 12, color: '#888888', marginBottom: 4 },
  altSecTextInput: { backgroundColor: '#1a1a1a', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 8, color: '#e0e0e0', fontSize: 13 },
  altSecOzet: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b98115', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  altSecOzetTxt: { fontSize: 12, color: '#10b981' },
  oncelikRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  oncelikChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  oncelikTxt: { fontSize: 12, fontWeight: '700' },
  hataKutu: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef444415', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  hataTxt: { flex: 1, fontSize: 13, color: '#ef4444' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  geriBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 10, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' },
  geriBtnTxt: { fontSize: 14, fontWeight: '600', color: '#888888' },
  ileriBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 13, borderRadius: 10, backgroundColor: '#ffd800' },
  ileriBtnTxt: { fontSize: 14, fontWeight: '700', color: '#000000' },
  gonderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#ffd800' },
  gonderBtnTxt: { fontSize: 15, fontWeight: '700', color: '#000000' },
  basariEkran: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  basariIkon: { width: 88, height: 88, borderRadius: 22, backgroundColor: '#10b98118', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  basariBaslik: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  basariAlt: { fontSize: 14, color: '#555555', textAlign: 'center' },
  yeniBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ffd800', borderRadius: 12, paddingVertical: 13 },
  yeniBtnTxt: { fontSize: 14, fontWeight: '700', color: '#000000' },

  // Takvim
  calBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#2a2a2a' },
  calHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 6 },
  calNav: { padding: 4 },
  calHdrTxt: { fontSize: 13, fontWeight: '700', color: '#e0e0e0' },
  calGunRow: { flexDirection: 'row', marginBottom: 4 },
  calGunTxt: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: '#444444' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calHucre: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calSec: { backgroundColor: '#ffd800', borderRadius: 8 },
  calBugun: { borderWidth: 1, borderColor: '#ffd80066', borderRadius: 8 },
  calHucreTxt: { fontSize: 12, color: '#e0e0e0' },
  calSecTxt: { color: '#000000', fontWeight: '800' },
  calBugunTxt: { color: '#ffd800' },
  calDis: { color: '#2a2a2a' },
});
