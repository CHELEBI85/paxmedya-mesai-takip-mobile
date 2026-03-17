import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchAllWorkRecords, updateWorkRecord, deleteWorkRecord,
} from '../store/slices/databaseSlice';
import ConfirmModal from '../components/ConfirmModal';
import { InlineCalendar } from './Takvim';

// ── Helpers ──────────────────────────────────────────────────────────────────
const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const fmtSaat = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmtTarih = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${AYLAR[parseInt(m) - 1]} ${y}`;
};

const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const bugun = toDateStr(new Date());

const getWeekStart = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toDateStr(d);
};

const getMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const constructISO = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const clean = timeStr.replace(/[^0-9:]/g, '');
  const [h = '0', m = '0'] = clean.split(':');
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(parseInt(h) || 0, parseInt(m) || 0, 0, 0);
  return d.toISOString();
};

const calcSure = (giris, cikis) => {
  if (!giris || !cikis) return null;
  const diff = (new Date(cikis) - new Date(giris)) / 60000;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = Math.floor(diff % 60);
  return h > 0 ? `${h}s ${m}d` : `${m}d`;
};

const PROJE_RENKLER = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const avatarRenk = (str = '') =>
  PROJE_RENKLER[Math.abs((str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PROJE_RENKLER.length];

const DONEM_SECENEKLER = [
  { key: 'bugun', label: 'Bugün' },
  { key: 'bu_hafta', label: 'Bu Hafta' },
  { key: 'bu_ay', label: 'Bu Ay' },
  { key: 'tumu', label: 'Tümü' },
];

const EDIT_DEF = { visible: false, record: null, girisTarih: '', girisSaat: '', cikisTarih: '', cikisSaat: '', openCal: null };
const CONFIRM_DEF = { visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Tamam', cancelText: 'İptal', destructive: false, onConfirm: null };

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
export default function MesaiYonetim() {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const adminRecords = useSelector(s => s.database.adminRecords);
  const adminRecordsLoading = useSelector(s => s.database.adminRecordsLoading);

  const [refreshing, setRefreshing] = useState(false);
  const [filterDonem, setFilterDonem] = useState('bu_hafta');
  const [filterUser, setFilterUser] = useState('');

  const [editModal, setEditModal] = useState(EDIT_DEF);
  const [editSaving, setEditSaving] = useState(false);

  const [confirm, setConfirm] = useState(CONFIRM_DEF);
  const hideConfirm = useCallback(() => setConfirm(c => ({ ...c, visible: false })), []);
  const showConfirm = useCallback((cfg) => setConfirm({ ...CONFIRM_DEF, visible: true, ...cfg }), []);

  useEffect(() => {
    dispatch(fetchAllWorkRecords());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await dispatch(fetchAllWorkRecords()); } finally { setRefreshing(false); }
  }, [dispatch]);

  // Benzersiz kullanıcılar (kayıtlardan)
  const kullanicilar = useMemo(() => {
    const map = {};
    adminRecords.forEach(r => {
      if (r.userId && !map[r.userId]) {
        map[r.userId] = { uid: r.userId, displayName: r.displayName || r.userId };
      }
    });
    return Object.values(map).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }, [adminRecords]);

  // Filtreli kayıtlar
  const filtered = useMemo(() => {
    let start = null;
    if (filterDonem === 'bugun') start = bugun;
    else if (filterDonem === 'bu_hafta') start = getWeekStart();
    else if (filterDonem === 'bu_ay') start = getMonthStart();

    return adminRecords
      .filter(r => {
        if (filterUser && r.userId !== filterUser) return false;
        if (start && r.date < start) return false;
        return true;
      })
      .sort((a, b) => {
        const aDevam = !!(a.checkInTime && !a.checkOutTime);
        const bDevam = !!(b.checkInTime && !b.checkOutTime);
        if (aDevam && !bDevam) return -1;
        if (!aDevam && bDevam) return 1;
        return (b.date || '').localeCompare(a.date || '');
      });
  }, [adminRecords, filterDonem, filterUser]);

  // Özet istatistikler
  const stats = useMemo(() => {
    const toplam = filtered.length;
    const tamamlanan = filtered.filter(r => r.checkInTime && r.checkOutTime).length;
    const eksikCikis = filtered.filter(r => r.checkInTime && !r.checkOutTime).length;
    const disMesai = filtered.filter(r => r.disMesai).length;
    return { toplam, tamamlanan, eksikCikis, disMesai };
  }, [filtered]);

  // ── Edit ──
  const handleEdit = useCallback((record) => {
    const checkInDate = record.checkInTime ? toDateStr(new Date(record.checkInTime)) : (record.date || bugun);
    const checkOutDate = record.checkOutTime ? toDateStr(new Date(record.checkOutTime)) : (record.date || bugun);
    setEditModal({
      visible: true,
      record,
      girisTarih: checkInDate,
      girisSaat: fmtSaat(record.checkInTime) || '',
      cikisTarih: checkOutDate,
      cikisSaat: fmtSaat(record.checkOutTime) || '',
      openCal: null,
    });
  }, []);

  const handleEditSave = async () => {
    const { record, girisTarih, girisSaat, cikisTarih, cikisSaat } = editModal;
    if (!girisSaat) return;
    setEditSaving(true);
    try {
      const newCheckIn = constructISO(girisTarih, girisSaat);
      const newCheckOut = cikisSaat.trim() ? constructISO(cikisTarih, cikisSaat) : null;
      await dispatch(updateWorkRecord({
        recordId: record.id,
        userId: record.userId,
        data: {
          checkInTime: newCheckIn,
          checkOutTime: newCheckOut,
          date: girisTarih,
          updatedAt: new Date().toISOString(),
        },
      }));
      setEditModal(EDIT_DEF);
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = useCallback((record) => {
    showConfirm({
      icon: 'delete-forever', iconColor: '#ef4444',
      title: 'Kaydı Sil',
      message: `${record.displayName || 'Kullanıcı'} adlı kişinin ${fmtTarih(record.date)} tarihli mesai kaydı silinecek.`,
      confirmText: 'Sil', cancelText: 'İptal', destructive: true,
      onConfirm: async () => {
        hideConfirm();
        await dispatch(deleteWorkRecord({ recordId: record.id }));
      },
    });
  }, [showConfirm, hideConfirm, dispatch]);

  // ── Render kayıt kartı ──
  const renderItem = useCallback(({ item: r }) => {
    const giris = fmtSaat(r.checkInTime);
    const cikis = fmtSaat(r.checkOutTime);
    const sure = calcSure(r.checkInTime, r.checkOutTime);
    const renk = avatarRenk(r.displayName || r.userId);
    const eksik = giris && !cikis;
    const tamam = giris && cikis;

    const durumRenk = tamam ? '#10b981' : eksik ? '#f59e0b' : '#555555';
    const durumIkon = tamam ? 'check-circle' : eksik ? 'pending' : 'radio-button-unchecked';

    return (
      <View style={s.kart}>
        {/* Sol çubuk */}
        <View style={[s.serit, { backgroundColor: durumRenk }]} />

        {/* İçerik */}
        <View style={s.kartBody}>
          {/* Üst satır: avatar + isim + tarih */}
          <View style={s.kartUst}>
            <View style={[s.avatar, { backgroundColor: renk + '22' }]}>
              <Text style={[s.avatarTxt, { color: renk }]}>
                {(r.displayName || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.isim} numberOfLines={1}>{r.displayName || r.userId}</Text>
              <Text style={s.tarih}>{fmtTarih(r.date)}</Text>
            </View>
            <View style={[s.durumChip, { backgroundColor: durumRenk + '18' }]}>
              <MaterialIcons name={durumIkon} size={12} color={durumRenk} />
              <Text style={[s.durumChipTxt, { color: durumRenk }]}>
                {tamam ? 'Tamamlandı' : eksik ? 'Devam Ediyor' : 'Giriş Yok'}
              </Text>
            </View>
          </View>

          {/* Alt satır: saatler + tür + butonlar */}
          <View style={s.kartAlt}>
            {/* Giriş - Çıkış */}
            <View style={s.saatRow}>
              <MaterialIcons name="login" size={14} color="#6366f1" />
              <Text style={s.saatTxt}>{giris || '—'}</Text>
              <MaterialIcons name="arrow-forward" size={12} color="#333333" />
              <MaterialIcons name="logout" size={14} color="#10b981" />
              <Text style={s.saatTxt}>{cikis || '—'}</Text>
              {sure && <Text style={s.sureTxt}>({sure})</Text>}
            </View>

            {/* Sağ: tür + butonlar */}
            <View style={s.kartSag}>
              {r.disMesai && (
                <View style={s.disMesaiBadge}>
                  <MaterialIcons name="directions-car" size={11} color="#8b5cf6" />
                  <Text style={s.disMesaiTxt}>Dış</Text>
                </View>
              )}
              <TouchableOpacity style={s.iconBtn} onPress={() => handleEdit(r)} activeOpacity={0.75}>
                <MaterialIcons name="edit" size={16} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleDelete(r)} activeOpacity={0.75}>
                <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }, [handleEdit, handleDelete]);

  return (
    <View style={[s.root, { paddingTop: insets.top > 0 ? 0 : 0 }]}>

      {/* ── Özet istatistikler ── */}
      <View style={s.statsRow}>
        <View style={s.statKutu}>
          <Text style={[s.statSayi, { color: '#6366f1' }]}>{stats.toplam}</Text>
          <Text style={s.statEtiket}>Toplam</Text>
        </View>
        <View style={s.statKutu}>
          <Text style={[s.statSayi, { color: '#10b981' }]}>{stats.tamamlanan}</Text>
          <Text style={s.statEtiket}>Tamamlanan</Text>
        </View>
        <View style={s.statKutu}>
          <Text style={[s.statSayi, { color: '#f59e0b' }]}>{stats.eksikCikis}</Text>
          <Text style={s.statEtiket}>Devam Eden</Text>
        </View>
        <View style={s.statKutu}>
          <Text style={[s.statSayi, { color: '#8b5cf6' }]}>{stats.disMesai}</Text>
          <Text style={s.statEtiket}>Dış Mesai</Text>
        </View>
      </View>

      {/* ── Filtreler ── */}
      <View style={s.filtreWrap}>
        {/* Dönem */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtreScroll}>
          {DONEM_SECENEKLER.map(d => (
            <TouchableOpacity
              key={d.key}
              style={[s.chip, filterDonem === d.key && s.chipAktif]}
              onPress={() => setFilterDonem(d.key)}
              activeOpacity={0.75}
            >
              <Text style={[s.chipTxt, filterDonem === d.key && s.chipTxtAktif]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Kullanıcı filtresi */}
        {kullanicilar.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtreScroll}>
            <TouchableOpacity
              style={[s.chip, filterUser === '' && s.chipAktif]}
              onPress={() => setFilterUser('')}
              activeOpacity={0.75}
            >
              <Text style={[s.chipTxt, filterUser === '' && s.chipTxtAktif]}>Tüm Kişiler</Text>
            </TouchableOpacity>
            {kullanicilar.map(u => (
              <TouchableOpacity
                key={u.uid}
                style={[s.chip, filterUser === u.uid && s.chipAktif]}
                onPress={() => setFilterUser(u.uid)}
                activeOpacity={0.75}
              >
                <Text style={[s.chipTxt, filterUser === u.uid && s.chipTxtAktif]} numberOfLines={1}>
                  {(u.displayName || u.uid).split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Liste ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[s.liste, { paddingBottom: (insets.bottom || 0) + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" />}
        ListEmptyComponent={
          adminRecordsLoading ? (
            <View style={s.bosOrta}>
              <ActivityIndicator color="#ffd800" size="large" />
            </View>
          ) : (
            <View style={s.bosOrta}>
              <MaterialIcons name="event-busy" size={52} color="#1a1a1a" />
              <Text style={s.bosBuyuk}>Kayıt bulunamadı</Text>
              <Text style={s.bosKucuk}>Seçili dönem ve filtre için mesai kaydı yok</Text>
            </View>
          )
        }
      />

      {/* ── Düzenleme Modalı ── */}
      <Modal
        visible={editModal.visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setEditModal(EDIT_DEF)}
      >
        <View style={s.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setEditModal(m => ({ ...m, openCal: null })); }}>
            <View style={s.modalDismiss} />
          </TouchableWithoutFeedback>
          <View style={[s.modalSheet, { paddingBottom: (insets.bottom || 0) + 16 }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <MaterialIcons name="edit" size={18} color="#6366f1" />
              <Text style={s.modalBaslik}>Mesai Kaydını Düzenle</Text>
              <TouchableOpacity onPress={() => setEditModal(EDIT_DEF)} activeOpacity={0.75}>
                <MaterialIcons name="close" size={20} color="#555555" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {editModal.record && (
                <View style={s.modalKisiRow}>
                  <View style={[s.avatar, { backgroundColor: avatarRenk(editModal.record.displayName) + '22' }]}>
                    <Text style={[s.avatarTxt, { color: avatarRenk(editModal.record.displayName) }]}>
                      {(editModal.record.displayName || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={s.modalKisiAd}>{editModal.record.displayName}</Text>
                    <Text style={s.modalKisiTarih}>{fmtTarih(editModal.record.date)}</Text>
                  </View>
                </View>
              )}

              {/* ── Giriş bölümü ── */}
              <View style={s.modalBolum}>
                <View style={s.modalBolumBaslik}>
                  <MaterialIcons name="login" size={15} color="#6366f1" />
                  <Text style={[s.modalEtiket, { color: '#6366f1', marginBottom: 0 }]}>GİRİŞ</Text>
                </View>

                {/* Giriş tarih butonu */}
                <TouchableOpacity
                  style={[s.modalInput, { borderColor: editModal.openCal === 'giris' ? '#6366f1' : '#2a2a2a' }]}
                  onPress={() => setEditModal(m => ({ ...m, openCal: m.openCal === 'giris' ? null : 'giris' }))}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="event" size={15} color="#6366f1" />
                  <Text style={[s.modalInputTxt, { color: editModal.girisTarih ? '#e0e0e0' : '#444444' }]}>
                    {editModal.girisTarih ? fmtTarih(editModal.girisTarih) : 'Tarih seç'}
                  </Text>
                  <MaterialIcons name={editModal.openCal === 'giris' ? 'expand-less' : 'expand-more'} size={18} color="#555555" />
                </TouchableOpacity>

                {editModal.openCal === 'giris' && (
                  <InlineCalendar
                    value={editModal.girisTarih}
                    onChange={v => setEditModal(m => ({ ...m, girisTarih: v, openCal: null }))}
                  />
                )}

                {/* Giriş saat */}
                <View style={[s.modalInput, { borderColor: '#6366f150', marginTop: 8 }]}>
                  <MaterialIcons name="access-time" size={15} color="#6366f1" />
                  <TextInput
                    style={s.modalInputTxt}
                    value={editModal.girisSaat}
                    onChangeText={v => setEditModal(m => ({ ...m, girisSaat: v }))}
                    placeholder="SS:DD"
                    placeholderTextColor="#444444"
                    color="#e0e0e0"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              {/* ── Çıkış bölümü ── */}
              <View style={s.modalBolum}>
                <View style={s.modalBolumBaslik}>
                  <MaterialIcons name="logout" size={15} color="#10b981" />
                  <Text style={[s.modalEtiket, { color: '#10b981', marginBottom: 0 }]}>ÇIKIŞ</Text>
                  <Text style={s.modalOpsiyonel}>(opsiyonel)</Text>
                </View>

                {/* Çıkış tarih butonu */}
                <TouchableOpacity
                  style={[s.modalInput, { borderColor: editModal.openCal === 'cikis' ? '#10b981' : '#2a2a2a' }]}
                  onPress={() => setEditModal(m => ({ ...m, openCal: m.openCal === 'cikis' ? null : 'cikis' }))}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="event" size={15} color="#10b981" />
                  <Text style={[s.modalInputTxt, { color: editModal.cikisTarih ? '#e0e0e0' : '#444444' }]}>
                    {editModal.cikisTarih ? fmtTarih(editModal.cikisTarih) : 'Tarih seç'}
                  </Text>
                  <MaterialIcons name={editModal.openCal === 'cikis' ? 'expand-less' : 'expand-more'} size={18} color="#555555" />
                </TouchableOpacity>

                {editModal.openCal === 'cikis' && (
                  <InlineCalendar
                    value={editModal.cikisTarih}
                    onChange={v => setEditModal(m => ({ ...m, cikisTarih: v, openCal: null }))}
                  />
                )}

                {/* Çıkış saat */}
                <View style={[s.modalInput, { borderColor: '#10b98150', marginTop: 8 }]}>
                  <MaterialIcons name="access-time" size={15} color="#10b981" />
                  <TextInput
                    style={s.modalInputTxt}
                    value={editModal.cikisSaat}
                    onChangeText={v => setEditModal(m => ({ ...m, cikisSaat: v }))}
                    placeholder="SS:DD (boş bırak)"
                    placeholderTextColor="#444444"
                    color="#e0e0e0"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[s.modalKaydetBtn, (!editModal.girisSaat.trim() || editSaving) && { opacity: 0.4 }]}
                onPress={handleEditSave}
                disabled={!editModal.girisSaat.trim() || editSaving}
                activeOpacity={0.85}
              >
                {editSaving
                  ? <ActivityIndicator color="#000000" size="small" />
                  : <>
                    <MaterialIcons name="save" size={18} color="#000000" />
                    <Text style={s.modalKaydetTxt}>Kaydet</Text>
                  </>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirm.visible} icon={confirm.icon} iconColor={confirm.iconColor}
        title={confirm.title} message={confirm.message} confirmText={confirm.confirmText}
        cancelText={confirm.cancelText} destructive={confirm.destructive}
        onConfirm={confirm.onConfirm} onCancel={hideConfirm}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },

  // İstatistikler
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#111111', gap: 8,
  },
  statKutu: {
    flex: 1, backgroundColor: '#111111', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  statSayi: { fontSize: 20, fontWeight: '800' },
  statEtiket: { fontSize: 9, fontWeight: '600', color: '#444444', textAlign: 'center' },

  // Filtreler
  filtreWrap: {
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#111111', gap: 6,
  },
  filtreScroll: { paddingHorizontal: 12, gap: 6, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#222222',
  },
  chipAktif: { backgroundColor: '#ffd80015', borderColor: '#ffd80055' },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#555555' },
  chipTxtAktif: { color: '#ffd800' },

  // Liste
  liste: { paddingHorizontal: 12, paddingTop: 10, gap: 8 },

  // Kart
  kart: {
    flexDirection: 'row', backgroundColor: '#111111',
    borderRadius: 12, borderWidth: 1, borderColor: '#1e1e1e', overflow: 'hidden',
  },
  serit: { width: 3 },
  kartBody: { flex: 1, padding: 12, gap: 8 },

  kartUst: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 14, fontWeight: '800' },
  isim: { fontSize: 14, fontWeight: '700', color: '#e0e0e0' },
  tarih: { fontSize: 11, color: '#555555', marginTop: 1 },

  durumChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  durumChipTxt: { fontSize: 10, fontWeight: '700' },

  kartAlt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saatRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  saatTxt: { fontSize: 13, fontWeight: '700', color: '#e0e0e0' },
  sureTxt: { fontSize: 11, color: '#555555' },

  kartSag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  disMesaiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#8b5cf618', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  disMesaiTxt: { fontSize: 10, fontWeight: '700', color: '#8b5cf6' },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },

  // Boş durum
  bosOrta: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  bosBuyuk: { fontSize: 16, fontWeight: '700', color: '#333333' },
  bosKucuk: { fontSize: 12, color: '#2a2a2a', textAlign: 'center', paddingHorizontal: 40 },

  // Edit modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000bb' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: '#111111', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, borderWidth: 1, borderColor: '#222222', borderBottomWidth: 0,
    maxHeight: '88%',
  },
  modalBolum: {
    marginTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  modalBolumBaslik: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  modalOpsiyonel: { fontSize: 10, color: '#444444', fontStyle: 'italic' },
  modalHandle: {
    width: 36, height: 4, backgroundColor: '#2a2a2a', borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  modalBaslik: { flex: 1, fontSize: 16, fontWeight: '700', color: '#ffffff' },

  modalKisiRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  modalKisiAd: { fontSize: 14, fontWeight: '700', color: '#e0e0e0' },
  modalKisiTarih: { fontSize: 11, color: '#555555', marginTop: 2 },

  modalEtiket: { fontSize: 11, fontWeight: '700', color: '#555555', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  modalInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 11,
  },
  modalInputTxt: { flex: 1, fontSize: 14, color: '#e0e0e0' },

  modalKaydetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ffd800', borderRadius: 12, paddingVertical: 14, marginTop: 20, marginBottom: 8,
  },
  modalKaydetTxt: { fontSize: 15, fontWeight: '700', color: '#000000' },
});
