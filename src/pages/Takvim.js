import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, ScrollView, TouchableWithoutFeedback,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useSelector } from 'react-redux';
import { useTakvim } from '../hooks/useTakvim';
import ConfirmModal from '../components/ConfirmModal';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const GUNLER_KISA = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

export const ROL_ETIKET = { admin: 'Admin', manager: 'Yönetici', user: 'Kullanıcı' };

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

export const PROJE_RENKLER = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
export const projeRenk = (str = '') =>
  PROJE_RENKLER[Math.abs((str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PROJE_RENKLER.length];

export const fmtGunAy = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${AYLAR_KISA[d.getMonth()]}`;
};

export const gorevHaftaStr = (gorev) => {
  if (!gorev?.baslangic) return '';
  return toDateStr(getWeekStart(new Date(gorev.baslangic + 'T00:00:00')));
};

// ─── Öncelik ──────────────────────────────────────────────────────────────────
export const ONCELIK_CONFIG = {
  dusuk:   { label: 'Düşük',   color: '#6b7280', icon: 'keyboard-arrow-down' },
  orta:    { label: 'Orta',    color: '#f59e0b', icon: 'remove' },
  yuksek:  { label: 'Yüksek',  color: '#ef4444', icon: 'keyboard-arrow-up' },
};

// ─── Durum ────────────────────────────────────────────────────────────────────
export const DURUM_CONFIG = {
  beklemede:        { label: 'Beklemede',        color: '#555555', icon: 'hourglass-empty' },
  devam_ediyor:     { label: 'Devam Ediyor',     color: '#6366f1', icon: 'play-circle-outline' },
  onay_bekliyor:    { label: 'Onay Bekliyor',    color: '#f59e0b', icon: 'pending-actions' },
  tamamlandi:       { label: 'Tamamlandı',       color: '#10b981', icon: 'check-circle' },
  revize:           { label: 'Revize İstendi',   color: '#ef4444', icon: 'rate-review' },
  revize_yapiliyor: { label: 'Revize Yapılıyor', color: '#f97316', icon: 'construction' },
};

export const getGorevDurum = (gorev) => {
  if (gorev.durum) return gorev.durum;
  return gorev.tamamlandi ? 'tamamlandi' : 'beklemede';
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
export function InlineCalendar({ value, onChange, minDate }) {
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
// GorevKart — minimal, tıklanınca detay açar
// ─────────────────────────────────────────────────────────────────────────────
const GorevKart = React.memo(function GorevKart({ gorev, onDetay }) {
  const durum = getGorevDurum(gorev);
  const dc = DURUM_CONFIG[durum] || DURUM_CONFIG.beklemede;
  const renk = dc.color;
  const today = toDateStr(new Date());
  const overdue = durum !== 'tamamlandi' && gorev.teslim < today;
  const nearDeadline = !overdue && durum !== 'tamamlandi' && gorev.teslim <= toDateStr(addDays(new Date(), 2));
  const isTamamlandi = durum === 'tamamlandi';

  return (
    <TouchableOpacity
      style={[gk.kart, { borderColor: renk + '30' }, isTamamlandi && gk.kartTamamlandi]}
      onPress={() => onDetay(gorev)}
      activeOpacity={0.75}
    >
      <View style={[gk.serit, { backgroundColor: renk }]} />
      <View style={gk.body}>
        {/* Proje + tarih */}
        <View style={gk.ustRow}>
          <View style={[gk.projeBadge, { backgroundColor: renk + '1a' }]}>
            <MaterialIcons name="folder" size={11} color={renk} />
            <Text style={[gk.projeTxt, { color: renk }]} numberOfLines={1}>{gorev.proje}</Text>
          </View>
          <View style={[gk.tarihChip, overdue && gk.tarihChipOverdue]}>
            <MaterialIcons name="schedule" size={11} color={overdue ? '#ef4444' : nearDeadline ? '#f59e0b' : '#444444'} />
            <Text style={[gk.tarihTxt, overdue && { color: '#ef4444' }, nearDeadline && !overdue && { color: '#f59e0b' }]}>
              {fmtGunAy(gorev.baslangic)} → {fmtGunAy(gorev.teslim)}
            </Text>
          </View>
        </View>
        {/* Durum + Öncelik */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[gk.durumBadge, { backgroundColor: renk + '18', borderColor: renk + '40' }]}>
            <MaterialIcons name={dc.icon} size={11} color={renk} />
            <Text style={[gk.durumTxt, { color: renk }]}>{dc.label}</Text>
          </View>
          {(() => {
            const oc = ONCELIK_CONFIG[gorev.oncelik] || ONCELIK_CONFIG.orta;
            return (
              <View style={[gk.durumBadge, { backgroundColor: oc.color + '18', borderColor: oc.color + '40' }]}>
                <MaterialIcons name={oc.icon} size={11} color={oc.color} />
                <Text style={[gk.durumTxt, { color: oc.color }]}>{oc.label}</Text>
              </View>
            );
          })()}
        </View>
        {/* Başlık */}
        <Text style={[gk.isTxt, isTamamlandi && gk.isTxtTamamlandi]} numberOfLines={2}>{gorev.is}</Text>
      </View>
      <View style={gk.detayOk}>
        <MaterialIcons name="chevron-right" size={18} color="#333333" />
      </View>
    </TouchableOpacity>
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
      <View style={[tb.hucre, { width: COL.durum, flexDirection: 'column', gap: 3 }]}>
        {(() => {
          const dur = getGorevDurum(gorev);
          const dc = DURUM_CONFIG[dur] || DURUM_CONFIG.beklemede;
          return (
            <View style={[tb.durumBadge, { backgroundColor: dc.color + '18', borderColor: dc.color + '40' }]}>
              <MaterialIcons name={dc.icon} size={10} color={dc.color} />
              <Text style={[tb.durumTxt, { color: dc.color }]}>{dc.label}</Text>
            </View>
          );
        })()}
        {overdue && getGorevDurum(gorev) !== 'tamamlandi' && (
          <View style={tb.geciktiBadge}>
            <MaterialIcons name="warning" size={10} color="#ef4444" />
            <Text style={tb.geciktiTxt}>Gecikmiş</Text>
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
function OverviewTab({ gorevler, loading, refreshing, onRefresh, onEdit, onDelete, onTamamla, onDurumGuncelle, onMaddeToggle, kullanicilar }) {
  const today = toDateStr(new Date());
  const [durum, setDurum] = useState('hepsi');
  const [seciliProje, setSeciliProje] = useState('');
  const [seciliKullanici, setSeciliKullanici] = useState('');

  const projeler = useMemo(() => [...new Set(gorevler.map(g => g.proje).filter(Boolean))].sort(), [gorevler]);

  const filtered = useMemo(() => {
    let list = [...gorevler];
    const isDone = g => getGorevDurum(g) === 'tamamlandi';
    if (durum === 'devam') list = list.filter(g => !isDone(g) && g.teslim >= today);
    else if (durum === 'tamamlandi') list = list.filter(g => isDone(g));
    else if (durum === 'gecikti') list = list.filter(g => !isDone(g) && g.teslim < today);
    if (seciliProje) list = list.filter(g => g.proje === seciliProje);
    if (seciliKullanici) list = list.filter(g => g.sorumluUidler?.includes(seciliKullanici));
    return list.sort((a, b) => {
      const aDone = isDone(a); const bDone = isDone(b);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return (b.baslangic || '').localeCompare(a.baslangic || '');
    });
  }, [gorevler, durum, seciliProje, seciliKullanici, today]);

  const bekleyenSayi = useMemo(() => gorevler.filter(g => getGorevDurum(g) !== 'tamamlandi').length, [gorevler]);
  const tamamSayi = useMemo(() => gorevler.filter(g => getGorevDurum(g) === 'tamamlandi').length, [gorevler]);
  const gecikmisSayi = useMemo(() => gorevler.filter(g => getGorevDurum(g) !== 'tamamlandi' && g.teslim < today).length, [gorevler, today]);
  const onayBekleyenSayi = useMemo(() => gorevler.filter(g => getGorevDurum(g) === 'onay_bekliyor').length, [gorevler]);

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
        {onayBekleyenSayi > 0 && (
          <View style={[ov.ozetKart, { borderColor: '#f59e0b30' }]}>
            <Text style={[ov.ozetSayi, { color: '#f59e0b' }]}>{onayBekleyenSayi}</Text>
            <Text style={ov.ozetEtiket}>Onay Bekliyor</Text>
          </View>
        )}
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
        loading ? (
          <View style={t.bosOrta}><ActivityIndicator color="#ffd800" size="large" /></View>
        ) : (
          <View style={t.bosOrta}>
            <MaterialIcons name={gorevler.length === 0 ? 'assignment-ind' : 'filter-list-off'} size={52} color="#1a1a1a" />
            <Text style={t.bosBuyuk}>{gorevler.length === 0 ? 'Henüz görev yok' : 'Filtre eşleşmedi'}</Text>
            <Text style={t.bosKucuk}>{gorevler.length === 0 ? 'Sağ alttaki + ile görev ekleyebilirsiniz' : 'Farklı bir filtre deneyin'}</Text>
          </View>
        )
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
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const userProfile = useSelector(s => s.database.userProfile);
  const {
    gorevler, kullanicilar, loading, kullanicilarLoading, oncesiLoading,
    getGorevler, getGorevlerIfNeeded, getGorevlerOncesi, getKullanicilar, getKullanicilarIfNeeded,
    gorevEkle, gorevGuncelle, gorevSil, gorevTamamla, gorevDurumGuncelle,
  } = useTakvim();

  const uid = user?.uid;
  const role = userProfile?.role;
  const isAdmin = role === 'admin' || role === 'manager';

  const [activeTab, setActiveTab] = useState(0);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [revizeModal, setRevizeModal] = useState({ visible: false, gorev: null, not: '' });

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
    getGorevlerIfNeeded(user.uid, role);
    if (isAdmin) getKullanicilarIfNeeded();
  }, [user?.uid, role]);

  // Sayfaya her dönüşte (GorevDetay'dan geri gelince vs.) stale kontrolü yap
  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      getGorevlerIfNeeded(user.uid, role);
    }, [user?.uid, role, getGorevlerIfNeeded])
  );


  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      await Promise.all([
        getGorevler(user.uid, role),
        isAdmin ? getKullanicilar() : Promise.resolve(),
      ]);
    } finally { setRefreshing(false); }
  }, [user, role, isAdmin, getGorevler, getKullanicilar]);

  const weekStartStr = toDateStr(weekStart);

  const tab1Today = toDateStr(new Date());
  const tab1Projeler = useMemo(() => [...new Set(gorevler.map(g => g.proje).filter(Boolean))].sort(), [gorevler]);

  // Tüm görevleri haftaya göre grupla — en yeni hafta önce (Tab 1 filtresiyle)
  const sections = useMemo(() => {
    let filtered = gorevler;
    const isDone = g => getGorevDurum(g) === 'tamamlandi';
    if (tab1Durum === 'devam') filtered = filtered.filter(g => !isDone(g) && g.teslim >= tab1Today);
    else if (tab1Durum === 'tamamlandi') filtered = filtered.filter(g => isDone(g));
    else if (tab1Durum === 'gecikti') filtered = filtered.filter(g => !isDone(g) && g.teslim < tab1Today);
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

  const handleAdd = useCallback(() => navigation.navigate('GorevForm', { defaultWeekStart: weekStartStr }), [navigation, weekStartStr]);
  const handleEdit = useCallback((g) => navigation.navigate('GorevForm', { gorevId: g.id }), [navigation]);

  // Manager, admin'in oluşturduğu görevi tamamlandıya çekemez
  const canApprove = useCallback((g) => {
    if (role === 'admin') return true;
    if (role === 'manager') return g.olusturanRole !== 'admin';
    return false;
  }, [role]);

  const handleTamamla = useCallback((g) => {
    const durum = getGorevDurum(g);
    if (durum === 'tamamlandi') {
      gorevDurumGuncelle(g.id, 'devam_ediyor');
      return;
    }
    if (!canApprove(g)) {
      showModal({
        icon: 'lock', iconColor: '#ef4444',
        title: 'Yetki Gerekli',
        message: 'Bu görevi sadece admin onaylayabilir.',
        confirmText: 'Tamam', hideCancel: true,
        onConfirm: hideModal,
      });
      return;
    }
    showModal({
      icon: 'check-circle', iconColor: '#10b981',
      title: 'Görevi Tamamla',
      message: `"${g.proje}" projesindeki bu görevi tamamlandı olarak işaretlemek istiyor musunuz?`,
      confirmText: 'Tamamlandı İşaretle', cancelText: 'İptal',
      onConfirm: () => { hideModal(); gorevDurumGuncelle(g.id, 'tamamlandi'); },
    });
  }, [showModal, hideModal, gorevDurumGuncelle, canApprove]);

  const handleDurumGuncelle = useCallback((g, yeniDurum) => {
    if (yeniDurum === 'revize') {
      setRevizeModal({ visible: true, gorev: g, not: '' });
      return;
    }
    if (yeniDurum === 'onay_bekliyor') {
      showModal({
        icon: 'send', iconColor: '#f59e0b',
        title: 'Onaya Gönder',
        message: 'Görevi onay için göndermek istiyor musunuz? Gönderildikten sonra düzenleyemezsiniz.',
        confirmText: 'Onaya Gönder', cancelText: 'İptal',
        onConfirm: () => { hideModal(); gorevDurumGuncelle(g.id, yeniDurum); },
      });
      return;
    }
    if (yeniDurum === 'tamamlandi') {
      if (!canApprove(g)) {
        showModal({
          icon: 'lock', iconColor: '#ef4444',
          title: 'Yetki Gerekli',
          message: 'Bu görevi sadece admin onaylayabilir.',
          confirmText: 'Tamam', hideCancel: true,
          onConfirm: hideModal,
        });
        return;
      }
      showModal({
        icon: 'verified', iconColor: '#10b981',
        title: 'Görevi Onayla',
        message: `"${g.proje}" projesindeki görev onaylanacak ve tamamlandı olarak işaretlenecek.`,
        confirmText: 'Onayla', cancelText: 'İptal',
        onConfirm: () => { hideModal(); gorevDurumGuncelle(g.id, yeniDurum); },
      });
      return;
    }
    gorevDurumGuncelle(g.id, yeniDurum);
  }, [showModal, hideModal, gorevDurumGuncelle, canApprove]);

  const handleMaddeToggle = useCallback((g, maddeId) => {
    const yeniMaddeler = (g.maddeler || []).map(m =>
      m.id === maddeId ? { ...m, tamamlandi: !m.tamamlandi } : m
    );
    gorevGuncelle(g.id, { maddeler: yeniMaddeler });
  }, [gorevGuncelle]);

  const canDelete = useCallback((g) => {
    if (role === 'admin') return true;
    if (role === 'manager') return g.olusturanId === user?.uid;
    return false;
  }, [role, user?.uid]);

  const handleDelete = useCallback((g) => {
    if (!canDelete(g)) {
      showModal({
        icon: 'lock', iconColor: '#ef4444',
        title: 'Yetki Gerekli',
        message: 'Sadece kendi oluşturduğunuz görevleri silebilirsiniz.',
        confirmText: 'Tamam', hideCancel: true,
        onConfirm: hideModal,
      });
      return;
    }
    showModal({
      icon: 'delete-forever', iconColor: '#ef4444',
      title: 'Görevi Sil',
      message: `"${g.proje}" projesindeki bu görevi silmek istediğinize emin misiniz?`,
      confirmText: 'Sil', cancelText: 'İptal', destructive: true,
      onConfirm: async () => { hideModal(); await gorevSil(g.id); },
    });
  }, [showModal, hideModal, gorevSil, canDelete]);


  const handleDetay = useCallback((g) => navigation.navigate('GorevDetay', { gorevId: g.id }), [navigation]);

  const renderItem = useCallback(({ item }) => (
    <GorevKart gorev={item} onDetay={handleDetay} />
  ), [handleDetay]);

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
            ListFooterComponent={
              oncesiLoading ? (
                <ActivityIndicator color="#ffd800" style={{ marginVertical: 20 }} />
              ) : (
                <TouchableOpacity
                  style={{ alignItems: 'center', paddingVertical: 20, opacity: 0.6 }}
                  onPress={() => getGorevlerOncesi(uid, role)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="history" size={20} color="#555555" />
                  <Text style={{ color: '#555555', fontSize: 12, marginTop: 4 }}>Önceki 3 ayı yükle</Text>
                </TouchableOpacity>
              )
            }
            ListEmptyComponent={
              loading ? (
                <View style={t.bosOrta}>
                  <ActivityIndicator color="#ffd800" size="large" />
                </View>
              ) : (
                <View style={t.bosOrta}>
                  <MaterialIcons
                    name={tab1Durum !== 'hepsi' || tab1Proje || tab1Kullanici ? 'filter-list-off' : 'assignment-ind'}
                    size={52} color="#1a1a1a"
                  />
                  <Text style={t.bosBuyuk}>
                    {tab1Durum !== 'hepsi' || tab1Proje || tab1Kullanici
                      ? 'Filtre eşleşmedi'
                      : isAdmin ? 'Henüz görev yok' : 'Size atanan görev yok'}
                  </Text>
                  <Text style={t.bosKucuk}>
                    {tab1Durum !== 'hepsi' || tab1Proje || tab1Kullanici
                      ? 'Farklı bir filtre deneyin'
                      : isAdmin ? 'Sağ alttaki + ile görev ekleyebilirsiniz' : 'Şu an size atanmış aktif bir görev bulunmuyor'}
                  </Text>
                </View>
              )
            }
          />
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
          onDurumGuncelle={handleDurumGuncelle}
          onMaddeToggle={handleMaddeToggle}
          kullanicilar={kullanicilar}
        />
      )}

      {/* ── FAB ── */}
      {isAdmin && (
        <TouchableOpacity style={t.fab} onPress={handleAdd} activeOpacity={0.85}>
          <MaterialIcons name="add" size={28} color="#000000" />
        </TouchableOpacity>
      )}

      <ConfirmModal
        visible={modal.visible} icon={modal.icon} iconColor={modal.iconColor}
        title={modal.title} message={modal.message} confirmText={modal.confirmText}
        cancelText={modal.cancelText} destructive={modal.destructive}
        hideCancel={modal.hideCancel} onConfirm={modal.onConfirm} onCancel={hideModal}
      />

      {/* Revize Modal */}
      <Modal transparent visible={revizeModal.visible} animationType="fade" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setRevizeModal(m => ({ ...m, visible: false }))}>
          <View style={t.revizeOverlay}>
            <TouchableWithoutFeedback>
              <View style={t.revizeBox}>
                <View style={[t.revizeIkon, { backgroundColor: '#f59e0b18' }]}>
                  <MaterialIcons name="rate-review" size={28} color="#f59e0b" />
                </View>
                <Text style={t.revizeBaslik}>Revize Notu</Text>
                <Text style={t.revizeAlt}>Kullanıcıya iletilecek açıklamayı yazın (opsiyonel)</Text>
                <TextInput
                  style={t.revizeInput}
                  value={revizeModal.not}
                  onChangeText={v => setRevizeModal(m => ({ ...m, not: v }))}
                  placeholder="Düzeltilmesi gereken noktalar..."
                  placeholderTextColor="#444444"
                  color="#e0e0e0"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={t.revizeGonderBtn}
                  onPress={() => {
                    gorevDurumGuncelle(revizeModal.gorev.id, 'revize', revizeModal.not.trim() || undefined);
                    setRevizeModal({ visible: false, gorev: null, not: '' });
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="send" size={16} color="#000000" />
                  <Text style={t.revizeGonderTxt}>Revize Gönder</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRevizeModal({ visible: false, gorev: null, not: '' })} style={t.revizeIptalBtn}>
                  <Text style={t.revizeIptalTxt}>İptal</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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

  // Revize Modal
  revizeOverlay: {
    flex: 1, backgroundColor: '#000000cc',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  revizeBox: {
    backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155',
    width: '100%', paddingHorizontal: 22, paddingTop: 26, paddingBottom: 20,
    alignItems: 'center', gap: 10,
  },
  revizeIkon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  revizeBaslik: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  revizeAlt: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  revizeInput: {
    width: '100%', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 80,
    marginTop: 4,
  },
  revizeGonderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 13,
    width: '100%', marginTop: 4,
  },
  revizeGonderTxt: { fontSize: 15, fontWeight: '700', color: '#000000' },
  revizeIptalBtn: { paddingVertical: 8 },
  revizeIptalTxt: { fontSize: 14, fontWeight: '600', color: '#475569' },
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
  isTxt: { fontSize: 14, fontWeight: '600', color: '#e0e0e0', lineHeight: 20 },
  aciklamaOnizleme: { fontSize: 12, color: '#555555', lineHeight: 18 },
  sorumluRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sorumluChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  sorumluChipTxt: { fontSize: 11, fontWeight: '600' },
  fazla: { fontSize: 11, color: '#555555' },
  aksiyonRow: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: '#1e1e1e', paddingTop: 10,
  },
  kartTamamlandi: { opacity: 0.7 },
  detayOk: { justifyContent: 'center', paddingRight: 8 },
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

  // Durum badge
  durumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  durumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1,
  },
  durumTxt: { fontSize: 11, fontWeight: '700' },
  revizeNotu: { fontSize: 11, color: '#ef4444', flex: 1 },

  // Maddeler
  maddelerWrap: { gap: 6, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: { flex: 1, height: 4, backgroundColor: '#1e1e1e', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressTxt: { fontSize: 10, fontWeight: '700', color: '#555555', minWidth: 28, textAlign: 'right' },
  maddeSatir: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3 },
  maddeCheck: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#333333',
    alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },
  maddeCheckDolu: { backgroundColor: '#ffd800', borderColor: '#ffd800' },
  maddeTxt: { fontSize: 13, color: '#aaaaaa', flex: 1, lineHeight: 20 },
  maddeTxtDolu: { textDecorationLine: 'line-through', color: '#444444' },

  // User aksiyon butonları
  baslaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#6366f110', borderWidth: 1, borderColor: '#6366f130',
  },
  baslaBtnTxt: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  onayaGonderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#f59e0b12', borderWidth: 1, borderColor: '#f59e0b35',
  },
  onayaGonderTxt: { fontSize: 12, fontWeight: '700', color: '#f59e0b' },
  tekrarGonderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#6366f110', borderWidth: 1, borderColor: '#6366f130',
  },
  tekrarGonderTxt: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  onayBekliyorInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  onayBekliyorTxt: { fontSize: 12, fontWeight: '600', color: '#f59e0b' },

  // Admin onay/revize butonları
  onaylaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#10b98112', borderWidth: 1, borderColor: '#10b98130',
  },
  onaylaBtnTxt: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  revizeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#f59e0b12', borderWidth: 1, borderColor: '#f59e0b35',
  },
  revizeBtnTxt: { fontSize: 12, fontWeight: '700', color: '#f59e0b' },
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
  durumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 7, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 3,
  },
  durumTxt: { fontSize: 10, fontWeight: '700' },

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
