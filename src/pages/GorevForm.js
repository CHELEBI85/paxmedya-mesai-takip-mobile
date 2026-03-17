import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { useTakvim } from '../hooks/useTakvim';
import {
  ONCELIK_CONFIG, toDateStr, InlineCalendar,
  AYLAR_KISA, GUNLER_KISA, PROJE_RENKLER, projeRenk, fmtGunAy, ROL_ETIKET,
} from './Takvim';

const EMPTY_FORM = {
  proje: '', is: '', aciklama: '', baslangic: '', teslim: '',
  sorumluUidler: [], sorumlular: [], maddeler: [], oncelik: 'orta',
};

export default function GorevForm() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { gorevId, defaultWeekStart } = route.params || {};

  const { user } = useAuth();
  const userProfile = useSelector(s => s.database.userProfile);
  const role = userProfile?.role;

  const gorevler = useSelector(s => s.takvim.gorevler);
  const initialData = gorevId ? gorevler.find(g => g.id === gorevId) : null;
  const isEdit = !!initialData;

  const { gorevEkle, gorevGuncelle, kullanicilar, kullanicilarLoading, getKullanicilarIfNeeded, getGorevler } = useTakvim();

  const [form, setForm] = useState(EMPTY_FORM);
  const [openSection, setOpenSection] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getKullanicilarIfNeeded();
  }, []);

  useEffect(() => {
    setForm(initialData
      ? {
        proje: initialData.proje || '',
        is: initialData.is || '',
        aciklama: initialData.aciklama || '',
        baslangic: initialData.baslangic || '',
        teslim: initialData.teslim || '',
        sorumluUidler: initialData.sorumluUidler || [],
        sorumlular: initialData.sorumlular || [],
        maddeler: initialData.maddeler || [],
        oncelik: initialData.oncelik || 'orta',
      }
      : { ...EMPTY_FORM, baslangic: defaultWeekStart || '' }
    );
    setOpenSection(null);
  }, [gorevId]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleSection = (sec) => setOpenSection(prev => prev === sec ? null : sec);

  const toggleUser = (u) => {
    if (form.sorumluUidler.includes(u.uid)) {
      set('sorumluUidler', form.sorumluUidler.filter(id => id !== u.uid));
      set('sorumlular', form.sorumlular.filter(s => s.uid !== u.uid));
    } else {
      set('sorumluUidler', [...form.sorumluUidler, u.uid]);
      set('sorumlular', [...form.sorumlular, { uid: u.uid, displayName: u.displayName || u.email || u.uid }]);
    }
  };

  const valid = !!(form.proje.trim() && form.is.trim() && form.baslangic && form.teslim && form.sorumluUidler.length > 0);

  const handleSave = useCallback(async () => {
    if (!valid || saving) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      const payload = {
        proje: form.proje.trim(),
        is: form.is.trim(),
        aciklama: form.aciklama?.trim() || '',
        baslangic: form.baslangic,
        teslim: form.teslim,
        sorumluUidler: form.sorumluUidler,
        sorumlular: form.sorumlular,
        maddeler: (form.maddeler || []).filter(m => m.metin.trim()),
        oncelik: form.oncelik || 'orta',
        olusturanId: user.uid,
        olusturanAd: userProfile?.displayName || user?.displayName || '',
        olusturanRole: role || 'admin',
        ...(!isEdit ? { durum: 'beklemede', tamamlandi: false } : {}),
      };
      if (isEdit) await gorevGuncelle(gorevId, payload);
      else await gorevEkle(payload);
      // Kayıt sonrası Firestore'dan taze veri çek
      getGorevler(user.uid, role);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }, [form, valid, saving, isEdit, gorevId, user, userProfile, role, gorevEkle, gorevGuncelle, getGorevler, navigation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.root}
    >
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.geriBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <MaterialIcons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={s.headerTxt}>{isEdit ? 'Görevi Düzenle' : 'Yeni Görev'}</Text>
        <TouchableOpacity
          style={[s.kaydetHBtn, !valid && { opacity: 0.35 }]}
          onPress={handleSave}
          disabled={!valid || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#000000" size="small" style={{ width: 52 }} />
            : <Text style={s.kaydetHTxt}>{isEdit ? 'Kaydet' : 'Ekle'}</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Form İçeriği ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.icerik, { paddingBottom: (insets.bottom || 0) + 32 }]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >

        {/* Proje */}
        <Text style={s.etiket}>Proje</Text>
        <View style={s.inputWrap}>
          <MaterialIcons name="folder" size={17} color="#555555" />
          <TextInput
            style={s.input}
            value={form.proje}
            onChangeText={t => set('proje', t)}
            placeholder="Proje adı"
            placeholderTextColor="#444444"
            color="#e0e0e0"
          />
        </View>

        {/* Görev Başlığı */}
        <Text style={s.etiket}>Görev Başlığı</Text>
        <View style={s.inputWrap}>
          <MaterialIcons name="assignment" size={17} color="#555555" />
          <TextInput
            style={s.input}
            value={form.is}
            onChangeText={t => set('is', t)}
            placeholder="Kısa görev başlığı"
            placeholderTextColor="#444444"
            color="#e0e0e0"
          />
        </View>

        {/* Açıklama */}
        <Text style={s.etiket}>Açıklama <Text style={{ color: '#333333', fontWeight: '400' }}>(opsiyonel)</Text></Text>
        <View style={[s.inputWrap, { alignItems: 'flex-start', paddingTop: 12 }]}>
          <MaterialIcons name="notes" size={17} color="#555555" style={{ marginTop: 2 }} />
          <TextInput
            style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={form.aciklama}
            onChangeText={t => set('aciklama', t)}
            placeholder="Detaylı açıklama, notlar..."
            placeholderTextColor="#444444"
            color="#e0e0e0"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Öncelik — sadece admin/manager */}
        {(role === 'admin' || role === 'manager') && (
          <>
            <Text style={s.etiket}>Öncelik</Text>
            <View style={s.oncelikRow}>
              {Object.entries(ONCELIK_CONFIG).map(([key, cfg]) => {
                const secili = form.oncelik === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.oncelikChip, secili && { backgroundColor: cfg.color + '22', borderColor: cfg.color }]}
                    onPress={() => set('oncelik', key)}
                    activeOpacity={0.75}
                  >
                    <MaterialIcons name={cfg.icon} size={16} color={secili ? cfg.color : '#444444'} />
                    <Text style={[s.oncelikChipTxt, secili && { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Tarihler */}
        <View style={s.tarihRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.etiket}>Başlangıç</Text>
            <TouchableOpacity
              style={[s.tarihBtn, openSection === 'baslangic' && s.tarihBtnAktif]}
              onPress={() => toggleSection('baslangic')}
              activeOpacity={0.75}
            >
              <MaterialIcons name="event" size={16} color={form.baslangic ? '#ffd800' : '#555555'} />
              <Text style={[s.tarihTxt, form.baslangic && { color: '#ffd800' }]}>
                {form.baslangic ? fmtGunAy(form.baslangic) : 'Seç'}
              </Text>
            </TouchableOpacity>
          </View>
          <MaterialIcons name="arrow-forward" size={16} color="#333333" style={{ marginTop: 24 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.etiket}>Teslim</Text>
            <TouchableOpacity
              style={[s.tarihBtn, openSection === 'teslim' && s.tarihBtnAktif]}
              onPress={() => toggleSection('teslim')}
              activeOpacity={0.75}
            >
              <MaterialIcons name="event" size={16} color={form.teslim ? '#ef4444' : '#555555'} />
              <Text style={[s.tarihTxt, form.teslim && { color: '#ef4444' }]}>
                {form.teslim ? fmtGunAy(form.teslim) : 'Seç'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {openSection === 'baslangic' && (
          <InlineCalendar
            value={form.baslangic}
            onChange={v => { set('baslangic', v); if (form.teslim && v > form.teslim) set('teslim', ''); setOpenSection(null); }}
          />
        )}
        {openSection === 'teslim' && (
          <InlineCalendar
            value={form.teslim}
            onChange={v => { set('teslim', v); setOpenSection(null); }}
            minDate={form.baslangic || undefined}
          />
        )}

        {/* Sorumlu Kişiler */}
        <Text style={s.etiket}>Sorumlu Kişiler</Text>
        <TouchableOpacity
          style={[s.sorumluBtn, openSection === 'users' && s.sorumluBtnAktif]}
          onPress={() => toggleSection('users')}
          activeOpacity={0.75}
        >
          <MaterialIcons name="group" size={17} color={form.sorumluUidler.length > 0 ? '#ffd800' : '#555555'} />
          {form.sorumlular.length === 0 ? (
            <Text style={s.placeholder}>Kişi seç...</Text>
          ) : (
            <View style={s.chipRow}>
              {form.sorumlular.slice(0, 4).map(sr => (
                <View key={sr.uid} style={[s.chip, { backgroundColor: projeRenk(sr.displayName) + '22' }]}>
                  <Text style={[s.chipTxt, { color: projeRenk(sr.displayName) }]}>
                    {(sr.displayName || sr.uid || '?').split(' ')[0]}
                  </Text>
                </View>
              ))}
              {form.sorumlular.length > 4 && (
                <Text style={s.chipFazla}>+{form.sorumlular.length - 4}</Text>
              )}
            </View>
          )}
          <MaterialIcons name={openSection === 'users' ? 'expand-less' : 'expand-more'} size={18} color="#444444" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {openSection === 'users' && (
          <View style={s.userListBox}>
            {kullanicilarLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator color="#ffd800" size="small" />
              </View>
            ) : kullanicilar.length === 0 ? (
              <Text style={s.userBos}>Kullanıcı bulunamadı</Text>
            ) : (
              kullanicilar
                .filter(u => !(role === 'manager' && u.role === 'admin'))
                .map(u => {
                  const checked = form.sorumluUidler.includes(u.uid);
                  const renk = projeRenk(u.displayName || u.uid);
                  return (
                    <TouchableOpacity
                      key={u.uid}
                      style={[s.userSatir, checked && s.userSatirSecili]}
                      onPress={() => toggleUser(u)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.userAvatar, { backgroundColor: renk + '25' }]}>
                        <Text style={[s.userAvatarTxt, { color: renk }]}>
                          {(u.displayName || u.email || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.userAd}>{u.displayName || u.email || u.uid}</Text>
                        {u.role ? (
                          <Text style={s.userRol}>{ROL_ETIKET[u.role] || u.role}</Text>
                        ) : null}
                      </View>
                      <View style={[s.checkbox, checked && s.checkboxSecili]}>
                        {checked && <MaterialIcons name="check" size={13} color="#000000" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
            )}
          </View>
        )}

        {/* Maddeler */}
        <Text style={s.etiket}>Görev Maddeleri <Text style={{ color: '#333333', fontWeight: '400' }}>(opsiyonel)</Text></Text>
        {form.maddeler.map((madde, idx) => (
          <View key={madde.id} style={s.maddeRow}>
            <View style={s.maddeNumara}>
              <Text style={s.maddeNumeraTxt}>{idx + 1}</Text>
            </View>
            <TextInput
              style={s.maddeInput}
              value={madde.metin}
              onChangeText={t => set('maddeler', form.maddeler.map(m => m.id === madde.id ? { ...m, metin: t } : m))}
              placeholder="Madde açıklaması..."
              placeholderTextColor="#444444"
              color="#e0e0e0"
            />
            <TouchableOpacity
              style={s.maddeSilBtn}
              onPress={() => set('maddeler', form.maddeler.filter(m => m.id !== madde.id))}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={16} color="#555555" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={s.maddeEkleBtn}
          onPress={() => set('maddeler', [...form.maddeler, { id: String(Date.now() + Math.random()), metin: '', tamamlandi: false }])}
          activeOpacity={0.75}
        >
          <MaterialIcons name="add" size={16} color="#6366f1" />
          <Text style={s.maddeEkleTxt}>Madde Ekle</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: '#111111',
    borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
    gap: 12,
  },
  geriBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center',
  },
  headerTxt: { flex: 1, fontSize: 17, fontWeight: '700', color: '#ffffff' },
  kaydetHBtn: {
    backgroundColor: '#ffd800', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 52,
  },
  kaydetHTxt: { fontSize: 14, fontWeight: '700', color: '#000000' },

  icerik: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },

  etiket: { fontSize: 11, fontWeight: '700', color: '#555555', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 12, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 14, color: '#e0e0e0' },

  oncelikRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  oncelikChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    borderColor: '#2a2a2a', backgroundColor: '#111111',
  },
  oncelikChipTxt: { fontSize: 13, fontWeight: '700', color: '#444444' },

  tarihRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tarihBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 11,
  },
  tarihBtnAktif: { borderColor: '#ffd80055' },
  tarihTxt: { fontSize: 13, fontWeight: '600', color: '#555555' },

  sorumluBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 11, minHeight: 46,
  },
  sorumluBtnAktif: { borderColor: '#ffd80055' },
  placeholder: { fontSize: 13, color: '#444444', flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  chipTxt: { fontSize: 12, fontWeight: '600' },
  chipFazla: { fontSize: 12, color: '#555555', alignSelf: 'center' },

  userListBox: {
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    marginTop: 4, overflow: 'hidden',
  },
  userSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#222222',
  },
  userSatirSecili: { backgroundColor: '#ffd80008' },
  userBos: { padding: 16, color: '#555555', fontSize: 13, textAlign: 'center' },
  userAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  userAvatarTxt: { fontSize: 14, fontWeight: '800' },
  userAd: { fontSize: 14, color: '#e0e0e0', fontWeight: '500' },
  userRol: { fontSize: 11, color: '#555555', marginTop: 1 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#333333',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSecili: { backgroundColor: '#ffd800', borderColor: '#ffd800' },

  maddeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
  },
  maddeNumara: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  maddeNumeraTxt: { fontSize: 10, fontWeight: '800', color: '#555555' },
  maddeInput: { flex: 1, fontSize: 13, color: '#e0e0e0' },
  maddeSilBtn: { padding: 4 },
  maddeEkleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: '#6366f130',
    backgroundColor: '#6366f108', marginBottom: 8,
  },
  maddeEkleTxt: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
});
