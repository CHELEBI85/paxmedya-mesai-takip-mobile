import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, ScrollView, TouchableWithoutFeedback,
  RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useSelector } from 'react-redux';
import { useTakvim } from '../hooks/useTakvim';
import ConfirmModal from '../components/ConfirmModal';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const GUNLER_KISA = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

const ROL_ETIKET = { admin: 'Admin', manager: 'Yönetici', user: 'Kullanıcı' };

export const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };

const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const PROJE_RENKLER = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const projeRenk = (str = '') =>
  PROJE_RENKLER[Math.abs((str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PROJE_RENKLER.length];

const fmtGunAy = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${AYLAR_KISA[d.getMonth()]}`;
};

export const gorevHaftaStr = (gorev) => {
  if (!gorev?.baslangic) return '';
  return toDateStr(getWeekStart(new Date(gorev.baslangic + 'T00:00:00')));
};

const weekRangeLabel = (weekStartStr) => {
  const s = new Date(weekStartStr + 'T00:00:00');
  const e = addDays(s, 6);
  if (s.getMonth() === e.getMonth())
    return `${s.getDate()}–${e.getDate()} ${AYLAR[s.getMonth()]} ${s.getFullYear()}`;
  return `${s.getDate()} ${AYLAR_KISA[s.getMonth()]} – ${e.getDate()} ${AYLAR_KISA[e.getMonth()]} ${e.getFullYear()}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// InlineCalendar
// ─────────────────────────────────────────────────────────────────────────────
function InlineCalendar({ value, onChange, minDate }) {
  const initDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const todayStr = toDateStr(new Date());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const startPad = (firstDayOfMonth + 6) % 7;

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <View style={cal.box}>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn} activeOpacity={0.7}>
          <MaterialIcons name="chevron-left" size={20} color="#888888" />
        </TouchableOpacity>
        <Text style={cal.headerTxt}>{AYLAR[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn} activeOpacity={0.7}>
          <MaterialIcons name="chevron-right" size={20} color="#888888" />
        </TouchableOpacity>
      </View>
      <View style={cal.gunRow}>
        {GUNLER_KISA.map(g => <Text key={g} style={cal.gunBaslik}>{g}</Text>)}
      </View>
      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={cal.hucre} />;
          const str = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const selected = str === value;
          const isToday = str === todayStr;
          const disabled = !!(minDate && str < minDate);
          return (
            <TouchableOpacity
              key={str}
              style={[cal.hucre, selected && cal.secili, isToday && !selected && cal.bugun]}
              onPress={() => !disabled && onChange(str)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Text style={[cal.hucreTxt, selected && cal.seciliTxt, isToday && !selected && cal.bugunTxt, disabled && cal.disabledTxt]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GorevForm
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = { proje: '', is: '', baslangic: '', teslim: '', sorumluUidler: [], sorumlular: [] };

function GorevForm({ visible, users, usersLoading, onClose, onSave, saving, initialData, defaultWeekStart, currentRole }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    if (visible) {
      setForm(initialData
        ? {
          proje: initialData.proje || '',
          is: initialData.is || '',
          baslangic: initialData.baslangic || '',
          teslim: initialData.teslim || '',
          sorumluUidler: initialData.sorumluUidler || [],
          sorumlular: initialData.sorumlular || [],
        }
        : { ...EMPTY_FORM, baslangic: defaultWeekStart || '' }
      );
      setOpenSection(null);
    }
  }, [visible, initialData, defaultWeekStart]);

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

  const valid = form.proje.trim() && form.is.trim() && form.baslangic && form.teslim && form.sorumluUidler.length > 0;
  const isEdit = !!initialData?.id;

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={gf.overlay}>
            <TouchableWithoutFeedback>
              <View style={gf.sheet}>
                <View style={gf.handle} />
                <View style={gf.header}>
                  <Text style={gf.headerTxt}>{isEdit ? 'Görevi Düzenle' : 'Yeni Görev'}</Text>
                  <TouchableOpacity onPress={onClose} style={gf.closeBtn} activeOpacity={0.75}>
                    <MaterialIcons name="close" size={20} color="#555555" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={gf.icerik} keyboardShouldPersistTaps="handled">

                  {/* Proje */}
                  <Text style={gf.etiket}>Proje</Text>
                  <View style={gf.inputWrap}>
                    <MaterialIcons name="folder" size={17} color="#555555" />
                    <TextInput
                      style={gf.input}
                      value={form.proje}
                      onChangeText={t => set('proje', t)}
                      placeholder="Proje adı"
                      placeholderTextColor="#444444"
                      color="#e0e0e0"
                    />
                  </View>

                  {/* Yapılacak İş */}
                  <Text style={gf.etiket}>Yapılacak İş</Text>
                  <View style={[gf.inputWrap, { alignItems: 'flex-start', paddingTop: 12 }]}>
                    <MaterialIcons name="assignment" size={17} color="#555555" />
                    <TextInput
                      style={[gf.input, { minHeight: 72, textAlignVertical: 'top' }]}
                      value={form.is}
                      onChangeText={t => set('is', t)}
                      placeholder="İş açıklaması"
                      placeholderTextColor="#444444"
                      color="#e0e0e0"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* Tarihler */}
                  <View style={gf.tarihRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={gf.etiket}>Başlangıç</Text>
                      <TouchableOpacity
                        style={[gf.tarihBtn, openSection === 'baslangic' && gf.tarihBtnAktif]}
                        onPress={() => toggleSection('baslangic')}
                        activeOpacity={0.75}
                      >
                        <MaterialIcons name="event" size={16} color={form.baslangic ? '#ffd800' : '#555555'} />
                        <Text style={[gf.tarihTxt, form.baslangic && { color: '#ffd800' }]}>
                          {form.baslangic ? fmtGunAy(form.baslangic) : 'Seç'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <MaterialIcons name="arrow-forward" size={16} color="#333333" style={{ marginTop: 24 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={gf.etiket}>Teslim</Text>
                      <TouchableOpacity
                        style={[gf.tarihBtn, openSection === 'teslim' && gf.tarihBtnAktif]}
                        onPress={() => toggleSection('teslim')}
                        activeOpacity={0.75}
                      >
                        <MaterialIcons name="event" size={16} color={form.teslim ? '#ef4444' : '#555555'} />
                        <Text style={[gf.tarihTxt, form.teslim && { color: '#ef4444' }]}>
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
                  <Text style={gf.etiket}>Sorumlu Kişiler</Text>
                  <TouchableOpacity
                    style={[gf.sorumluBtn, openSection === 'users' && gf.sorumluBtnAktif]}
                    onPress={() => toggleSection('users')}
                    activeOpacity={0.75}
                  >
                    <MaterialIcons name="group" size={17} color={form.sorumluUidler.length > 0 ? '#ffd800' : '#555555'} />
                    {form.sorumlular.length === 0 ? (
                      <Text style={gf.placeholder}>Kişi seç...</Text>
                    ) : (
                      <View style={gf.chipRow}>
                        {form.sorumlular.slice(0, 4).map(s => (
                          <View key={s.uid} style={[gf.chip, { backgroundColor: projeRenk(s.displayName) + '22' }]}>
                            <Text style={[gf.chipTxt, { color: projeRenk(s.displayName) }]}>
                              {(s.displayName || s.uid || '?').split(' ')[0]}
                            </Text>
                          </View>
                        ))}
                        {form.sorumlular.length > 4 && (
                          <Text style={gf.chipFazla}>+{form.sorumlular.length - 4}</Text>
                        )}
                      </View>
                    )}
                    <MaterialIcons name={openSection === 'users' ? 'expand-less' : 'expand-more'} size={18} color="#444444" style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>

                  {openSection === 'users' && (
                    <View style={gf.userListBox}>
                      {usersLoading ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                          <ActivityIndicator color="#ffd800" size="small" />
                        </View>
                      ) : users.length === 0 ? (
                        <Text style={gf.userBos}>Kullanıcı bulunamadı</Text>
                      ) : (
                        users
                          .filter(u => !(currentRole === 'manager' && u.role === 'admin'))
                          .map(u => {
                          const checked = form.sorumluUidler.includes(u.uid);
                          const renk = projeRenk(u.displayName || u.uid);
                          return (
                            <TouchableOpacity
                              key={u.uid}
                              style={[gf.userSatir, checked && gf.userSatirSecili]}
                              onPress={() => toggleUser(u)}
                              activeOpacity={0.75}
                            >
                              <View style={[gf.userAvatar, { backgroundColor: renk + '25' }]}>
                                <Text style={[gf.userAvatarTxt, { color: renk }]}>
                                  {(u.displayName || u.email || '?')[0].toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={gf.userAd}>{u.displayName || u.email || u.uid}</Text>
                                {u.role ? (
                                  <Text style={gf.userRol}>{ROL_ETIKET[u.role] || u.role}</Text>
                                ) : null}
                              </View>
                              <View style={[gf.checkbox, checked && gf.checkboxSecili]}>
                                {checked && <MaterialIcons name="check" size={13} color="#000000" />}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[gf.kaydetBtn, !valid && gf.kaydetDisabled]}
                    onPress={() => valid && !saving && onSave(form)}
                    activeOpacity={0.85}
                    disabled={!valid || saving}
                  >
                    {saving
                      ? <ActivityIndicator color="#000000" size="small" />
                      : (
                        <>
                          <MaterialIcons name={isEdit ? 'save' : 'add-task'} size={19} color="#000000" />
                          <Text style={gf.kaydetTxt}>{isEdit ? 'Kaydet' : 'Görev Ekle'}</Text>
                        </>
                      )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GorevKart
// ─────────────────────────────────────────────────────────────────────────────
const GorevKart = React.memo(function GorevKart({ gorev, isAdmin, onEdit, onDelete, onTamamla }) {
  const renk = gorev.tamamlandi ? '#10b981' : projeRenk(gorev.proje);
  const today = toDateStr(new Date());
  const overdue = !gorev.tamamlandi && gorev.teslim < today;
  const nearDeadline = !overdue && !gorev.tamamlandi && gorev.teslim <= toDateStr(addDays(new Date(), 2));

  return (
    <View style={[gk.kart, { borderColor: renk + '30' }, gorev.tamamlandi && gk.kartTamamlandi]}>
      <View style={[gk.serit, { backgroundColor: renk }]} />
      <View style={gk.body}>

        {/* Üst satır */}
        <View style={gk.ustRow}>
          <View style={[gk.projeBadge, { backgroundColor: renk + '1a' }]}>
            <MaterialIcons name={gorev.tamamlandi ? 'check-circle' : 'folder'} size={11} color={renk} />
            <Text style={[gk.projeTxt, { color: renk }]} numberOfLines={1}>{gorev.proje}</Text>
          </View>
          {gorev.tamamlandi ? (
            <View style={gk.tamamlandiBadge}>
              <MaterialIcons name="verified" size={11} color="#10b981" />
              <Text style={gk.tamamlandiTxt}>Tamamlandı</Text>
            </View>
          ) : (
            <View style={[gk.tarihChip, overdue && gk.tarihChipOverdue]}>
              <MaterialIcons name="schedule" size={11} color={overdue ? '#ef4444' : nearDeadline ? '#f59e0b' : '#444444'} />
              <Text style={[gk.tarihTxt, overdue && { color: '#ef4444' }, nearDeadline && !overdue && { color: '#f59e0b' }]}>
                {fmtGunAy(gorev.baslangic)} → {fmtGunAy(gorev.teslim)}
              </Text>
            </View>
          )}
        </View>

        <Text style={[gk.isTxt, gorev.tamamlandi && gk.isTxtTamamlandi]} numberOfLines={3}>{gorev.is}</Text>

        {gorev.sorumlular?.length > 0 && (
          <View style={gk.sorumluRow}>
            <MaterialIcons name="group" size={12} color="#444444" />
            {gorev.sorumlular.slice(0, 5).map(s => {
              const r = projeRenk(s.displayName);
              return (
                <View key={s.uid} style={[gk.sorumluChip, { backgroundColor: r + '1a', borderColor: r + '33' }]}>
                  <Text style={[gk.sorumluChipTxt, { color: r }]}>
                    {(s.displayName || '?').split(' ')[0]}
                  </Text>
                </View>
              );
            })}
            {gorev.sorumlular.length > 5 && (
              <Text style={gk.fazla}>+{gorev.sorumlular.length - 5}</Text>
            )}
          </View>
        )}

        {isAdmin && (
          <View style={gk.aksiyonRow}>
            {!gorev.tamamlandi && (
              <TouchableOpacity style={gk.tamamlaBtn} onPress={() => onTamamla(gorev)} activeOpacity={0.75}>
                <MaterialIcons name="check-circle-outline" size={13} color="#10b981" />
                <Text style={gk.tamamlaBtnTxt}>Tamamlandı</Text>
              </TouchableOpacity>
            )}
            {gorev.tamamlandi && (
              <TouchableOpacity style={gk.geriAlBtn} onPress={() => onTamamla(gorev)} activeOpacity={0.75}>
                <MaterialIcons name="replay" size={13} color="#555555" />
                <Text style={gk.geriAlTxt}>Geri Al</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={gk.duzenleBtn} onPress={() => onEdit(gorev)} activeOpacity={0.75}>
              <MaterialIcons name="edit" size={13} color="#6366f1" />
              <Text style={gk.duzenleTxt}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={gk.silBtn} onPress={() => onDelete(gorev)} activeOpacity={0.75}>
              <MaterialIcons name="delete-outline" size={13} color="#ef4444" />
              <Text style={gk.silTxt}>Sil</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Hafta Başlığı (SectionList header)
// ─────────────────────────────────────────────────────────────────────────────
const thisWeekStr = toDateStr(getWeekStart(new Date()));

function HaftaBaslik({ weekStr, count }) {
  const isBuHafta = weekStr === thisWeekStr;
  const weekNo = getWeekNumber(new Date(weekStr + 'T00:00:00'));
  return (
    <View style={t.sectionHeader}>
      <View style={t.sectionSol}>
        <Text style={t.sectionHaftaNo}>Hafta {weekNo}</Text>
        {isBuHafta && (
          <View style={t.buHaftaBadge}>
            <Text style={t.buHaftaTxt}>Bu Hafta</Text>
          </View>
        )}
      </View>
      <View style={t.sectionSag}>
        <Text style={t.sectionTarih}>{weekRangeLabel(weekStr)}</Text>
        <View style={t.sectionSayi}>
          <Text style={t.sectionSayiTxt}>{count}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FiltreBar — shared filter bar for both tabs
// ─────────────────────────────────────────────────────────────────────────────
const DURUM_SECENEKLER = [
  { key: 'hepsi', label: 'Hepsi' },
  { key: 'devam', label: 'Devam Eden' },
  { key: 'tamamlandi', label: 'Tamamlanan' },
  { key: 'gecikti', label: 'Gecikmiş' },
];

function FiltreBar({ projeler, seciliProje, onProjeChange, durum, onDurumChange, kullanicilar, seciliKullanici, onKullaniciChange, isAdmin }) {
  return (
    <View style={ov.filtreBar}>
      {/* Durum filtresi */}
      <View style={ov.filtreRow}>
        <Text style={ov.filtreLabel}>Durum</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ov.filtreChipScroll} contentContainerStyle={{ flexDirection: 'row' }}>
          {DURUM_SECENEKLER.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[ov.filtreChip, durum === s.key && ov.filtreChipAktif]}
              onPress={() => onDurumChange(s.key)}
              activeOpacity={0.75}
            >
              <Text style={[ov.filtreChipTxt, durum === s.key && ov.filtreChipTxtAktif]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Proje filtresi */}
      {projeler.length > 1 && (
        <View style={ov.filtreRow}>
          <Text style={ov.filtreLabel}>Proje</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ov.filtreChipScroll} contentContainerStyle={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[ov.filtreChip, seciliProje === '' && ov.filtreChipAktif]}
              onPress={() => onProjeChange('')}
              activeOpacity={0.75}
            >
              <Text style={[ov.filtreChipTxt, seciliProje === '' && ov.filtreChipTxtAktif]}>Tümü</Text>
            </TouchableOpacity>
            {projeler.map(p => (
              <TouchableOpacity
                key={p}
                style={[ov.filtreChip, seciliProje === p && ov.filtreChipAktif]}
                onPress={() => onProjeChange(p)}
                activeOpacity={0.75}
              >
                <Text style={[ov.filtreChipTxt, seciliProje === p && ov.filtreChipTxtAktif]} numberOfLines={1}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Kullanıcı filtresi (sadece admin/manager) */}
      {isAdmin && kullanicilar.length > 0 && (
        <View style={ov.filtreRow}>
          <Text style={ov.filtreLabel}>Kişi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ov.filtreChipScroll} contentContainerStyle={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[ov.filtreChip, seciliKullanici === '' && ov.filtreChipAktif]}
              onPress={() => onKullaniciChange('')}
              activeOpacity={0.75}
            >
              <Text style={[ov.filtreChipTxt, seciliKullanici === '' && ov.filtreChipTxtAktif]}>Tümü</Text>
            </TouchableOpacity>
            {kullanicilar.map(u => (
              <TouchableOpacity
                key={u.uid}
                style={[ov.filtreChip, seciliKullanici === u.uid && ov.filtreChipAktif]}
                onPress={() => onKullaniciChange(u.uid)}
                activeOpacity={0.75}
              >
                <Text style={[ov.filtreChipTxt, seciliKullanici === u.uid && ov.filtreChipTxtAktif]}>
                  {(u.displayName || u.email || u.uid).split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// Tablo kolon genişlikleri
const COL = { no: 32, proje: 90, is: 140, tarih: 108, sorumlu: 120, durum: 96, islem: 82 };
const TABLE_W = Object.values(COL).reduce((a, b) => a + b, 0) + 12; // toplam + padding

// ─────────────────────────────────────────────────────────────────────────────
// TableSatir — tek tablo satırı
// ─────────────────────────────────────────────────────────────────────────────
const TableSatir = React.memo(function TableSatir({ gorev, idx, onEdit, onDelete, onTamamla }) {
  const renk = gorev.tamamlandi ? '#10b981' : projeRenk(gorev.proje);
  const today = toDateStr(new Date());
  const overdue = !gorev.tamamlandi && gorev.teslim < today;
  const isEven = idx % 2 === 0;

  return (
    <View style={[tb.satir, isEven && tb.satirEven, { borderLeftColor: renk, borderLeftWidth: 3 }]}>
      {/* # */}
      <View style={[tb.hucre, { width: COL.no }]}>
        <Text style={tb.noTxt}>{idx + 1}</Text>
      </View>
      {/* Proje */}
      <View style={[tb.hucre, { width: COL.proje }]}>
        <View style={[tb.projeBadge, { backgroundColor: renk + '1a' }]}>
          <Text style={[tb.projeTxt, { color: renk }]} numberOfLines={2}>{gorev.proje}</Text>
        </View>
      </View>
      {/* İş */}
      <View style={[tb.hucre, { width: COL.is }]}>
        <Text style={[tb.isTxt, gorev.tamamlandi && tb.isTxtGecti]} numberOfLines={3}>{gorev.is}</Text>
      </View>
      {/* Tarih */}
      <View style={[tb.hucre, { width: COL.tarih, flexDirection: 'column', alignItems: 'flex-start', gap: 3 }]}>
        <View style={tb.tarihSatir}>
          <MaterialIcons name="play-arrow" size={10} color="#555555" />
          <Text style={tb.tarihTxt}>{fmtGunAy(gorev.baslangic)}</Text>
        </View>
        <View style={tb.tarihSatir}>
          <MaterialIcons name="flag" size={10} color={overdue ? '#ef4444' : '#555555'} />
          <Text style={[tb.tarihTxt, overdue && { color: '#ef4444' }]}>{fmtGunAy(gorev.teslim)}</Text>
        </View>
      </View>
      {/* Sorumlular */}
      <View style={[tb.hucre, { width: COL.sorumlu, flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }]}>
        {gorev.sorumlular?.slice(0, 4).map(s => {
          const r = projeRenk(s.displayName);
          return (
            <View key={s.uid} style={[tb.sorumluChip, { backgroundColor: r + '18' }]}>
              <Text style={[tb.sorumluTxt, { color: r }]} numberOfLines={1}>
                {(s.displayName || '?').split(' ')[0]}
              </Text>
            </View>
          );
        })}
        {(gorev.sorumlular?.length || 0) > 4 && (
          <Text style={tb.fazla}>+{gorev.sorumlular.length - 4}</Text>
        )}
      </View>
      {/* Durum */}
      <View style={[tb.hucre, { width: COL.durum }]}>
        {gorev.tamamlandi ? (
          <View style={tb.tamamBadge}>
            <MaterialIcons name="check-circle" size={11} color="#10b981" />
            <Text style={tb.tamamTxt}>Tamamlandı</Text>
          </View>
        ) : overdue ? (
          <View style={tb.geciktiBadge}>
            <MaterialIcons name="warning" size={11} color="#ef4444" />
            <Text style={tb.geciktiTxt}>Gecikmiş</Text>
          </View>
        ) : (
          <View style={tb.devamBadge}>
            <MaterialIcons name="schedule" size={11} color="#6366f1" />
            <Text style={tb.devamTxt}>Devam</Text>
          </View>
        )}
      </View>
      {/* İşlemler */}
      <View style={[tb.hucre, { width: COL.islem, flexDirection: 'column', gap: 5, alignItems: 'stretch' }]}>
        {!gorev.tamamlandi ? (
          <TouchableOpacity style={tb.tamamlaBtn} onPress={() => onTamamla(gorev)} activeOpacity={0.75}>
            <MaterialIcons name="check" size={12} color="#10b981" />
            <Text style={tb.tamamlaBtnTxt}>Tamam</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={tb.geriAlBtn} onPress={() => onTamamla(gorev)} activeOpacity={0.75}>
            <MaterialIcons name="replay" size={12} color="#555555" />
            <Text style={tb.geriAlTxt}>Geri Al</Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity style={tb.duzenleBtn} onPress={() => onEdit(gorev)} activeOpacity={0.75}>
            <MaterialIcons name="edit" size={13} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity style={tb.silBtn} onPress={() => onDelete(gorev)} activeOpacity={0.75}>
            <MaterialIcons name="delete-outline" size={13} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// OverviewTab — Tab 2 full overview (tablo görünümü)
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ gorevler, loading, refreshing, onRefresh, onEdit, onDelete, onTamamla, kullanicilar }) {
  const today = toDateStr(new Date());
  const [durum, setDurum] = useState('hepsi');
  const [seciliProje, setSeciliProje] = useState('');
  const [seciliKullanici, setSeciliKullanici] = useState('');

  const projeler = useMemo(() => [...new Set(gorevler.map(g => g.proje).filter(Boolean))].sort(), [gorevler]);

  const filtered = useMemo(() => {
    let list = [...gorevler];
    if (durum === 'devam') list = list.filter(g => !g.tamamlandi && g.teslim >= today);
    else if (durum === 'tamamlandi') list = list.filter(g => g.tamamlandi);
    else if (durum === 'gecikti') list = list.filter(g => !g.tamamlandi && g.teslim < today);
    if (seciliProje) list = list.filter(g => g.proje === seciliProje);
    if (seciliKullanici) list = list.filter(g => g.sorumluUidler?.includes(seciliKullanici));
    return list.sort((a, b) => {
      if (a.tamamlandi !== b.tamamlandi) return a.tamamlandi ? 1 : -1;
      return (b.baslangic || '').localeCompare(a.baslangic || '');
    });
  }, [gorevler, durum, seciliProje, seciliKullanici, today]);

  const bekleyenSayi = useMemo(() => gorevler.filter(g => !g.tamamlandi).length, [gorevler]);
  const tamamSayi = useMemo(() => gorevler.filter(g => g.tamamlandi).length, [gorevler]);
  const gecikmisSayi = useMemo(() => gorevler.filter(g => !g.tamamlandi && g.teslim < today).length, [gorevler, today]);

  if (loading && gorevler.length === 0) {
    return <View style={t.bosOrta}><ActivityIndicator color="#ffd800" size="large" /></View>;
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" />}
    >
      {/* ── Özet Kartları ── */}
      <View style={ov.ozetRow}>
        <View style={[ov.ozetKart, { borderColor: '#ffd80030' }]}>
          <Text style={[ov.ozetSayi, { color: '#ffd800' }]}>{gorevler.length}</Text>
          <Text style={ov.ozetEtiket}>Toplam</Text>
        </View>
        <View style={[ov.ozetKart, { borderColor: '#6366f130' }]}>
          <Text style={[ov.ozetSayi, { color: '#6366f1' }]}>{bekleyenSayi}</Text>
          <Text style={ov.ozetEtiket}>Devam Eden</Text>
        </View>
        <View style={[ov.ozetKart, { borderColor: '#10b98130' }]}>
          <Text style={[ov.ozetSayi, { color: '#10b981' }]}>{tamamSayi}</Text>
          <Text style={ov.ozetEtiket}>Tamamlanan</Text>
        </View>
        {gecikmisSayi > 0 && (
          <View style={[ov.ozetKart, { borderColor: '#ef444430' }]}>
            <Text style={[ov.ozetSayi, { color: '#ef4444' }]}>{gecikmisSayi}</Text>
            <Text style={ov.ozetEtiket}>Gecikmiş</Text>
          </View>
        )}
      </View>

      {/* ── Filtre ── */}
      <FiltreBar
        projeler={projeler}
        seciliProje={seciliProje}
        onProjeChange={setSeciliProje}
        durum={durum}
        onDurumChange={setDurum}
        kullanicilar={kullanicilar}
        seciliKullanici={seciliKullanici}
        onKullaniciChange={setSeciliKullanici}
        isAdmin
      />

      {filtered.length === 0 ? (
        <View style={t.bosOrta}>
          <MaterialIcons name="filter-list-off" size={52} color="#1a1a1a" />
          <Text style={t.bosBuyuk}>{gorevler.length === 0 ? 'Henüz görev yok' : 'Filtre eşleşmedi'}</Text>
          <Text style={t.bosKucuk}>{gorevler.length === 0 ? 'Sağ alttaki + ile görev ekleyebilirsiniz' : 'Farklı bir filtre deneyin'}</Text>
        </View>
      ) : (
        /* ── Tablo ── */
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ width: TABLE_W, paddingBottom: 100 }}>
            {/* Başlık satırı */}
            <View style={tb.baslikSatir}>
              <View style={[tb.baslikHucre, { width: COL.no }]}>
                <Text style={tb.baslikTxt}>#</Text>
              </View>
              <View style={[tb.baslikHucre, { width: COL.proje }]}>
                <Text style={tb.baslikTxt}>Proje</Text>
              </View>
              <View style={[tb.baslikHucre, { width: COL.is }]}>
                <Text style={tb.baslikTxt}>Yapılacak İş</Text>
              </View>
              <View style={[tb.baslikHucre, { width: COL.tarih }]}>
                <Text style={tb.baslikTxt}>Tarih</Text>
              </View>
              <View style={[tb.baslikHucre, { width: COL.sorumlu }]}>
                <Text style={tb.baslikTxt}>Sorumlular</Text>
              </View>
              <View style={[tb.baslikHucre, { width: COL.durum }]}>
                <Text style={tb.baslikTxt}>Durum</Text>
              </View>
              <View style={[tb.baslikHucre, { width: COL.islem }]}>
                <Text style={tb.baslikTxt}>İşlem</Text>
              </View>
            </View>
            {/* Veri satırları */}
            {filtered.map((item, idx) => (
              <TableSatir
                key={item.id}
                gorev={item}
                idx={idx}
                onEdit={onEdit}
                onDelete={onDelete}
                onTamamla={onTamamla}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Bileşen
// ─────────────────────────────────────────────────────────────────────────────
export default function Takvim() {
  const { user } = useAuth();
  const userProfile = useSelector(s => s.database.userProfile);
  const {
    gorevler, kullanicilar, loading, kullanicilarLoading,
    getGorevler, getKullanicilar, gorevEkle, gorevGuncelle, gorevSil, gorevTamamla,
  } = useTakvim();

  const role = userProfile?.role;
  const isAdmin = role === 'admin' || role === 'manager';

  const [activeTab, setActiveTab] = useState(0);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editGorev, setEditGorev] = useState(null);
  const [saving, setSaving] = useState(false);

  // Tab 1 filter state
  const [tab1Durum, setTab1Durum] = useState('hepsi');
  const [tab1Proje, setTab1Proje] = useState('');
  const [tab1Kullanici, setTab1Kullanici] = useState('');

  const MODAL_DEF = { visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Tamam', cancelText: 'İptal', destructive: false, hideCancel: false, onConfirm: null };
  const [modal, setModal] = useState(MODAL_DEF);
  const hideModal = useCallback(() => setModal(m => ({ ...m, visible: false })), []);
  const showModal = useCallback((cfg) => setModal({ ...MODAL_DEF, visible: true, ...cfg }), []);

  useEffect(() => {
    if (!user?.uid) return;
    getGorevler(user.uid, role);
    if (isAdmin) getKullanicilar();
  }, [user?.uid, role]);

  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try { await getGorevler(user.uid, role); } finally { setRefreshing(false); }
  }, [user, role, getGorevler]);

  const weekStartStr = toDateStr(weekStart);

  const tab1Today = toDateStr(new Date());
  const tab1Projeler = useMemo(() => [...new Set(gorevler.map(g => g.proje).filter(Boolean))].sort(), [gorevler]);

  // Tüm görevleri haftaya göre grupla — en yeni hafta önce (Tab 1 filtresiyle)
  const sections = useMemo(() => {
    let filtered = gorevler;
    if (tab1Durum === 'devam') filtered = filtered.filter(g => !g.tamamlandi && g.teslim >= tab1Today);
    else if (tab1Durum === 'tamamlandi') filtered = filtered.filter(g => g.tamamlandi);
    else if (tab1Durum === 'gecikti') filtered = filtered.filter(g => !g.tamamlandi && g.teslim < tab1Today);
    if (tab1Proje) filtered = filtered.filter(g => g.proje === tab1Proje);
    if (tab1Kullanici) filtered = filtered.filter(g => g.sorumluUidler?.includes(tab1Kullanici));

    const groups = {};
    filtered.forEach(g => {
      const ws = gorevHaftaStr(g);
      if (!ws) return;
      if (!groups[ws]) groups[ws] = [];
      groups[ws].push(g);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekStr, data]) => ({ weekStr, data }));
  }, [gorevler, tab1Durum, tab1Proje, tab1Kullanici, tab1Today]);

  const handleAdd = useCallback(() => { setEditGorev(null); setFormVisible(true); }, []);
  const handleEdit = useCallback((g) => { setEditGorev(g); setFormVisible(true); }, []);
  const handleTamamla = useCallback((g) => {
    if (g.tamamlandi) {
      gorevTamamla(g.id, false);
      return;
    }
    showModal({
      icon: 'check-circle', iconColor: '#10b981',
      title: 'Görevi Tamamla',
      message: `"${g.proje}" projesindeki bu görevi tamamlandı olarak işaretlemek istiyor musunuz?`,
      confirmText: 'Tamamlandı İşaretle', cancelText: 'İptal',
      onConfirm: () => { hideModal(); gorevTamamla(g.id, true); },
    });
  }, [showModal, hideModal, gorevTamamla]);

  const handleDelete = useCallback((g) => {
    showModal({
      icon: 'delete-forever', iconColor: '#ef4444',
      title: 'Görevi Sil',
      message: `"${g.proje}" projesindeki bu görevi silmek istediğinize emin misiniz?`,
      confirmText: 'Sil', cancelText: 'İptal', destructive: true,
      onConfirm: async () => { hideModal(); await gorevSil(g.id); },
    });
  }, [showModal, hideModal, gorevSil]);

  const handleSave = useCallback(async (formData) => {
    setSaving(true);
    try {
      const payload = {
        proje: formData.proje.trim(),
        is: formData.is.trim(),
        baslangic: formData.baslangic,
        teslim: formData.teslim,
        sorumluUidler: formData.sorumluUidler,
        sorumlular: formData.sorumlular,
        olusturanId: user.uid,
        olusturanAd: userProfile?.displayName || user?.displayName || '',
      };
      if (editGorev?.id) await gorevGuncelle(editGorev.id, payload);
      else await gorevEkle(payload);
      setFormVisible(false);
    } finally {
      setSaving(false);
    }
  }, [user, userProfile, editGorev, gorevEkle, gorevGuncelle]);

  const renderItem = useCallback(({ item }) => (
    <GorevKart gorev={item} isAdmin={isAdmin} onEdit={handleEdit} onDelete={handleDelete} onTamamla={handleTamamla} />
  ), [isAdmin, handleEdit, handleDelete, handleTamamla]);

  const renderSectionHeader = useCallback(({ section }) => (
    <HaftaBaslik weekStr={section.weekStr} count={section.data.length} />
  ), []);

  const gorevKey = useCallback((item) => item.id, []);

  return (
    <View style={t.root}>

      {/* ── Tab Bar ── */}
      {isAdmin && (
        <View style={t.tabBar}>
          <TouchableOpacity
            style={[t.tabItem, activeTab === 0 && t.tabItemAktif]}
            onPress={() => setActiveTab(0)}
            activeOpacity={0.75}
          >
            <MaterialIcons name="view-list" size={16} color={activeTab === 0 ? '#ffd800' : '#555555'} />
            <Text style={[t.tabTxt, activeTab === 0 && t.tabTxtAktif]}>Görevlerim</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[t.tabItem, activeTab === 1 && t.tabItemAktif]}
            onPress={() => setActiveTab(1)}
            activeOpacity={0.75}
          >
            <MaterialIcons name="dashboard" size={16} color={activeTab === 1 ? '#ffd800' : '#555555'} />
            <Text style={[t.tabTxt, activeTab === 1 && t.tabTxtAktif]}>Genel Bakış</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Tab 0: Haftalık Görünüm ── */}
      {activeTab === 0 && (
        <>
          {/* Filtre */}
          <FiltreBar
            projeler={tab1Projeler}
            seciliProje={tab1Proje}
            onProjeChange={setTab1Proje}
            durum={tab1Durum}
            onDurumChange={setTab1Durum}
            kullanicilar={isAdmin ? kullanicilar : []}
            seciliKullanici={tab1Kullanici}
            onKullaniciChange={setTab1Kullanici}
            isAdmin={isAdmin}
          />

          {/* Hafta Nav (sadece yeni görev için hafta seçimi) */}
          <View style={t.haftaBar}>
            <TouchableOpacity style={t.navBtn} onPress={() => setWeekStart(d => addDays(d, -7))} activeOpacity={0.7}>
              <MaterialIcons name="chevron-left" size={24} color="#888888" />
            </TouchableOpacity>
            <TouchableOpacity style={t.haftaOrta} onPress={() => setWeekStart(getWeekStart(new Date()))} activeOpacity={0.75}>
              <View style={t.haftaNoWrap}>
                <Text style={t.haftaNo}>Hafta {getWeekNumber(weekStart)}</Text>
                {weekStartStr === thisWeekStr && <View style={t.bugunDot} />}
              </View>
              <Text style={t.haftaAlt}>Yeni görev için hafta seçimi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={t.navBtn} onPress={() => setWeekStart(d => addDays(d, 7))} activeOpacity={0.7}>
              <MaterialIcons name="chevron-right" size={24} color="#888888" />
            </TouchableOpacity>
          </View>

          {loading && gorevler.length === 0 ? (
            <View style={t.bosOrta}><ActivityIndicator color="#ffd800" size="large" /></View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={gorevKey}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              contentContainerStyle={t.liste}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffd800" />}
              initialNumToRender={10}
              ListEmptyComponent={
                <View style={t.bosOrta}>
                  <MaterialIcons name={tab1Durum !== 'hepsi' || tab1Proje || tab1Kullanici ? 'filter-list-off' : 'event-available'} size={52} color="#1a1a1a" />
                  <Text style={t.bosBuyuk}>
                    {tab1Durum !== 'hepsi' || tab1Proje || tab1Kullanici ? 'Filtre eşleşmedi' : 'Henüz görev yok'}
                  </Text>
                  <Text style={t.bosKucuk}>
                    {tab1Durum !== 'hepsi' || tab1Proje || tab1Kullanici
                      ? 'Farklı bir filtre deneyin'
                      : isAdmin ? 'Sağ alttaki + ile görev ekleyebilirsiniz' : 'Size henüz görev atanmadı'}
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* ── Tab 1: Genel Bakış (admin/manager only) ── */}
      {activeTab === 1 && isAdmin && (
        <OverviewTab
          gorevler={gorevler}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTamamla={handleTamamla}
          kullanicilar={kullanicilar}
        />
      )}

      {/* ── FAB ── */}
      {isAdmin && (
        <TouchableOpacity style={t.fab} onPress={handleAdd} activeOpacity={0.85}>
          <MaterialIcons name="add" size={28} color="#000000" />
        </TouchableOpacity>
      )}

      <GorevForm
        visible={formVisible}
        users={kullanicilar}
        usersLoading={kullanicilarLoading}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        saving={saving}
        initialData={editGorev}
        defaultWeekStart={weekStartStr}
        currentRole={role}
      />

      <ConfirmModal
        visible={modal.visible} icon={modal.icon} iconColor={modal.iconColor}
        title={modal.title} message={modal.message} confirmText={modal.confirmText}
        cancelText={modal.cancelText} destructive={modal.destructive}
        hideCancel={modal.hideCancel} onConfirm={modal.onConfirm} onCancel={hideModal}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const t = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemAktif: { borderBottomColor: '#ffd800' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#555555' },
  tabTxtAktif: { color: '#ffd800' },

  haftaBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111111',
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  navBtn: { padding: 10 },
  haftaOrta: { flex: 1, alignItems: 'center', gap: 3 },
  haftaNoWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  haftaNo: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  bugunDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffd800' },
  haftaAlt: { fontSize: 11, color: '#333333' },

  liste: { padding: 12, gap: 0, paddingBottom: 100 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 2,
    marginTop: 8,
  },
  sectionSol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHaftaNo: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  buHaftaBadge: {
    backgroundColor: '#ffd80020', borderRadius: 6, borderWidth: 1, borderColor: '#ffd80040',
    paddingHorizontal: 7, paddingVertical: 2,
  },
  buHaftaTxt: { fontSize: 10, fontWeight: '700', color: '#ffd800' },
  sectionSag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTarih: { fontSize: 12, color: '#444444' },
  sectionSayi: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#1e1e1e',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionSayiTxt: { fontSize: 11, fontWeight: '800', color: '#555555' },

  bosOrta: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  bosBuyuk: { fontSize: 15, fontWeight: '600', color: '#333333', textAlign: 'center' },
  bosKucuk: { fontSize: 12, color: '#2a2a2a', textAlign: 'center' },

  fab: {
    position: 'absolute', right: 18, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#ffd800', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#ffd800', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
});

const gk = StyleSheet.create({
  kart: {
    backgroundColor: '#141414', borderRadius: 14,
    flexDirection: 'row', overflow: 'hidden', borderWidth: 1,
    marginBottom: 10,
  },
  serit: { width: 4 },
  body: { flex: 1, padding: 14, gap: 10 },
  ustRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  projeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, maxWidth: '55%',
  },
  projeTxt: { fontSize: 12, fontWeight: '700' },
  tarihChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  tarihChipOverdue: { borderColor: '#ef444430' },
  tarihTxt: { fontSize: 11, color: '#555555', fontWeight: '600' },
  isTxt: { fontSize: 14, color: '#cccccc', lineHeight: 21 },
  sorumluRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sorumluChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  sorumluChipTxt: { fontSize: 11, fontWeight: '600' },
  fazla: { fontSize: 11, color: '#555555' },
  aksiyonRow: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: '#1e1e1e', paddingTop: 10,
  },
  kartTamamlandi: { opacity: 0.7 },
  tamamlandiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#10b98118', borderRadius: 8, borderWidth: 1, borderColor: '#10b98133',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tamamlandiTxt: { fontSize: 11, fontWeight: '700', color: '#10b981' },
  isTxtTamamlandi: { textDecorationLine: 'line-through', color: '#444444' },
  tamamlaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#10b98112', borderWidth: 1, borderColor: '#10b98130',
  },
  tamamlaBtnTxt: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  geriAlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  geriAlTxt: { fontSize: 12, fontWeight: '600', color: '#555555' },
  duzenleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#6366f110', borderWidth: 1, borderColor: '#6366f130',
  },
  duzenleTxt: { fontSize: 12, fontWeight: '600', color: '#6366f1' },
  silBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#ef444410', borderWidth: 1, borderColor: '#ef444430',
  },
  silTxt: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
});

const gf = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000cc' },
  sheet: {
    backgroundColor: '#111111', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1, borderColor: '#222222', borderBottomWidth: 0,
    maxHeight: '92%',
  },
  handle: { width: 36, height: 4, backgroundColor: '#2a2a2a', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  headerTxt: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' },
  icerik: { gap: 4, paddingBottom: 8 },
  etiket: { fontSize: 11, fontWeight: '700', color: '#555555', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 12, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 14, color: '#e0e0e0' },
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
  kaydetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ffd800', borderRadius: 12, paddingVertical: 14, marginTop: 18,
  },
  kaydetDisabled: { opacity: 0.35 },
  kaydetTxt: { fontSize: 15, fontWeight: '700', color: '#000000' },
});

const ov = StyleSheet.create({
  // Özet kartlar
  ozetRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
  },
  ozetKart: {
    flex: 1, backgroundColor: '#111111', borderRadius: 12,
    borderWidth: 1, paddingVertical: 12, alignItems: 'center', gap: 3,
  },
  ozetSayi: { fontSize: 22, fontWeight: '800' },
  ozetEtiket: { fontSize: 10, fontWeight: '600', color: '#444444', textAlign: 'center' },

  // Filtre bar
  filtreBar: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#000000',
    borderBottomWidth: 1, borderBottomColor: '#111111',
    gap: 8,
  },
  filtreRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filtreLabel: { fontSize: 10, fontWeight: '700', color: '#444444', textTransform: 'uppercase', letterSpacing: 0.6, minWidth: 44 },
  filtreChipScroll: { flex: 1 },
  filtreChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#222222',
    marginRight: 6,
  },
  filtreChipAktif: { backgroundColor: '#ffd80015', borderColor: '#ffd80050' },
  filtreChipTxt: { fontSize: 12, fontWeight: '600', color: '#555555' },
  filtreChipTxtAktif: { color: '#ffd800' },
});

const tb = StyleSheet.create({
  // Başlık satırı
  baslikSatir: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111111',
    borderBottomWidth: 1, borderBottomColor: '#222222',
    paddingVertical: 10, paddingLeft: 6,
  },
  baslikHucre: { paddingHorizontal: 6, justifyContent: 'center' },
  baslikTxt: { fontSize: 10, fontWeight: '800', color: '#555555', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Veri satırı
  satir: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#111111',
    paddingVertical: 10, paddingLeft: 6,
    minHeight: 60,
  },
  satirEven: { backgroundColor: '#0a0a0a' },
  hucre: {
    paddingHorizontal: 6, justifyContent: 'center',
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4,
  },

  noTxt: { fontSize: 11, color: '#333333', fontWeight: '700' },

  projeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  projeTxt: { fontSize: 11, fontWeight: '700' },

  isTxt: { fontSize: 12, color: '#cccccc', lineHeight: 17 },
  isTxtGecti: { textDecorationLine: 'line-through', color: '#444444' },

  tarihSatir: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tarihTxt: { fontSize: 11, color: '#555555', fontWeight: '600' },

  sorumluChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sorumluTxt: { fontSize: 10, fontWeight: '700' },
  fazla: { fontSize: 10, color: '#444444' },

  tamamBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#10b98118', borderRadius: 7, borderWidth: 1, borderColor: '#10b98133',
    paddingHorizontal: 6, paddingVertical: 3,
  },
  tamamTxt: { fontSize: 10, fontWeight: '700', color: '#10b981' },
  geciktiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ef444412', borderRadius: 7, borderWidth: 1, borderColor: '#ef444430',
    paddingHorizontal: 6, paddingVertical: 3,
  },
  geciktiTxt: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
  devamBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#6366f112', borderRadius: 7, borderWidth: 1, borderColor: '#6366f130',
    paddingHorizontal: 6, paddingVertical: 3,
  },
  devamTxt: { fontSize: 10, fontWeight: '700', color: '#6366f1' },

  tamamlaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    paddingVertical: 5, borderRadius: 7,
    backgroundColor: '#10b98112', borderWidth: 1, borderColor: '#10b98130',
  },
  tamamlaBtnTxt: { fontSize: 10, fontWeight: '700', color: '#10b981' },
  geriAlBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    paddingVertical: 5, borderRadius: 7,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  geriAlTxt: { fontSize: 10, fontWeight: '600', color: '#555555' },
  duzenleBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 5, borderRadius: 7,
    backgroundColor: '#6366f112', borderWidth: 1, borderColor: '#6366f130',
  },
  silBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 5, borderRadius: 7,
    backgroundColor: '#ef444412', borderWidth: 1, borderColor: '#ef444430',
  },
});

const cal = StyleSheet.create({
  box: {
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a2a',
    marginTop: 4, paddingVertical: 10, paddingHorizontal: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  navBtn: { padding: 6 },
  headerTxt: { fontSize: 14, fontWeight: '700', color: '#e0e0e0' },
  gunRow: { flexDirection: 'row', marginBottom: 4 },
  gunBaslik: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#444444', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  hucre: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  secili: { backgroundColor: '#ffd800', borderRadius: 20 },
  bugun: { borderWidth: 1.5, borderColor: '#ffd80055', borderRadius: 20 },
  hucreTxt: { fontSize: 13, fontWeight: '600', color: '#888888' },
  seciliTxt: { color: '#000000' },
  bugunTxt: { color: '#ffd800' },
  disabledTxt: { color: '#2a2a2a' },
});
