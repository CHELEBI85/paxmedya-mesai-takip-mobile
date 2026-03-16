import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, TouchableWithoutFeedback, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { useTakvim } from '../hooks/useTakvim';
import ConfirmModal from '../components/ConfirmModal';

// ── Helpers (Takvim.js ile aynı) ────────────────────────────────────────────
const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const fmtGunAy = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${AYLAR_KISA[d.getMonth()]} ${d.getFullYear()}`;
};

const projeRenk = (str = '') => {
  const RENKLER = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
  return RENKLER[Math.abs((str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % RENKLER.length];
};

const DURUM_CONFIG = {
  beklemede:        { label: 'Beklemede',        color: '#555555', icon: 'hourglass-empty' },
  devam_ediyor:     { label: 'Devam Ediyor',     color: '#6366f1', icon: 'play-circle-outline' },
  onay_bekliyor:    { label: 'Onay Bekliyor',    color: '#f59e0b', icon: 'pending-actions' },
  tamamlandi:       { label: 'Tamamlandı',       color: '#10b981', icon: 'check-circle' },
  revize:           { label: 'Revize İstendi',   color: '#ef4444', icon: 'rate-review' },
  revize_yapiliyor: { label: 'Revize Yapılıyor', color: '#f97316', icon: 'construction' },
};

const fmtTarihSaat = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const getGorevDurum = (gorev) => {
  if (gorev?.durum) return gorev.durum;
  return gorev?.tamamlandi ? 'tamamlandi' : 'beklemede';
};

// ── GorevDetay Sayfası ───────────────────────────────────────────────────────
export default function GorevDetay() {
  const navigation = useNavigation();
  const route = useRoute();
  const { gorevId } = route.params;
  const insets = useSafeAreaInsets();

  const { user } = useAuth();
  const userProfile = useSelector(s => s.database.userProfile);
  const role = userProfile?.role;
  const isAdmin = role === 'admin' || role === 'manager';

  // Redux'tan her zaman güncel veriyi oku
  const gorevler = useSelector(s => s.takvim.gorevler);
  const gorev = gorevler.find(g => g.id === gorevId);

  const { gorevGuncelle, gorevSil, gorevTamamla, gorevDurumGuncelle } = useTakvim();

  const [revizeModal, setRevizeModal] = useState({ visible: false, not: '' });
  const MODAL_DEF = { visible: false, icon: null, iconColor: '#ffd800', title: '', message: '', confirmText: 'Tamam', cancelText: 'İptal', destructive: false, onConfirm: null };
  const [modal, setModal] = useState(MODAL_DEF);
  const hideModal = useCallback(() => setModal(m => ({ ...m, visible: false })), []);
  const showModal = useCallback((cfg) => setModal({ ...MODAL_DEF, visible: true, ...cfg }), []);

  if (!gorev) {
    return (
      <View style={s.bosEkran}>
        <ActivityIndicator color="#ffd800" size="large" />
      </View>
    );
  }

  const durum = getGorevDurum(gorev);
  const dc = DURUM_CONFIG[durum] || DURUM_CONFIG.beklemede;
  // Manager, admin'in oluşturduğu görevi tamamlandıya çekemez
  const canApprove = role === 'admin' || (role === 'manager' && gorev.olusturanRole !== 'admin');
  // Manager sadece kendi oluşturduğu görevi silebilir/düzenleyebilir
  const canDelete = role === 'admin' || (role === 'manager' && gorev.olusturanId === user?.uid);
  const renk = dc.color;
  const today = new Date().toISOString().split('T')[0];
  const overdue = durum !== 'tamamlandi' && gorev.teslim < today;
  const isOnayBekliyor = durum === 'onay_bekliyor';
  const isTamamlandi = durum === 'tamamlandi';
  const isRevize = durum === 'revize';
  const isRevizeYapiliyor = durum === 'revize_yapiliyor';
  const maddeler = gorev.maddeler || [];
  const tamamlananMadde = maddeler.filter(m => m.tamamlandi).length;
  const toplamMadde = maddeler.length;
  const revizeler = gorev.revizeler || [];
  const sonRevize = revizeler[revizeler.length - 1] || null;

  const handleMaddeToggle = (maddeId) => {
    const yeniMaddeler = maddeler.map(m =>
      m.id === maddeId ? { ...m, tamamlandi: !m.tamamlandi } : m
    );
    gorevGuncelle(gorev.id, { maddeler: yeniMaddeler });
  };

  const durumGuncelleSafe = useCallback(async (yeniDurum, extra = {}) => {
    try {
      const result = await gorevDurumGuncelle(gorev.id, yeniDurum, extra.revizeNotu, extra.gonderenAd, extra.gonderenId);
      if (result?.error) throw new Error(result.error.message || 'Bilinmeyen hata');
    } catch (e) {
      if (__DEV__) console.error('Durum güncelleme hatası:', e);
      Alert.alert('Güncelleme Hatası', 'Durum değiştirilemedi. Lütfen tekrar deneyin.\n\n' + (e?.message || ''));
    }
  }, [gorev.id, gorevDurumGuncelle]);

  const handleDurum = (yeniDurum) => {
    if (yeniDurum === 'revize') {
      setRevizeModal({ visible: true, not: '' });
      return;
    }
    if (yeniDurum === 'onay_bekliyor') {
      showModal({
        icon: 'send', iconColor: '#f59e0b',
        title: 'Onaya Gönder',
        message: 'Görevi onay için göndermek istiyor musunuz?',
        confirmText: 'Onaya Gönder', cancelText: 'İptal',
        onConfirm: () => { hideModal(); durumGuncelleSafe(yeniDurum); },
      });
      return;
    }
    if (yeniDurum === 'tamamlandi') {
      if (!canApprove) {
        showModal({
          icon: 'lock', iconColor: '#ef4444',
          title: 'Yetki Gerekli',
          message: 'Bu görevi sadece admin onaylayabilir.',
          confirmText: 'Tamam',
          onConfirm: hideModal,
        });
        return;
      }
      showModal({
        icon: 'verified', iconColor: '#10b981',
        title: 'Görevi Onayla',
        message: `"${gorev.proje}" projesindeki görevi onaylıyor musunuz?`,
        confirmText: 'Onayla', cancelText: 'İptal',
        onConfirm: () => { hideModal(); durumGuncelleSafe(yeniDurum); },
      });
      return;
    }
    durumGuncelleSafe(yeniDurum);
  };

  const handleTamamla = () => {
    if (isTamamlandi) {
      gorevDurumGuncelle(gorev.id, 'devam_ediyor');
      return;
    }
    if (!canApprove) {
      showModal({
        icon: 'lock', iconColor: '#ef4444',
        title: 'Yetki Gerekli',
        message: 'Bu görevi sadece admin onaylayabilir.',
        confirmText: 'Tamam',
        onConfirm: hideModal,
      });
      return;
    }
    showModal({
      icon: 'check-circle', iconColor: '#10b981',
      title: 'Görevi Tamamla',
      message: `"${gorev.proje}" projesindeki görevi tamamlandı olarak işaretlemek istiyor musunuz?`,
      confirmText: 'Tamamlandı İşaretle', cancelText: 'İptal',
      onConfirm: () => { hideModal(); gorevDurumGuncelle(gorev.id, 'tamamlandi'); },
    });
  };

  const handleSil = () => {
    if (!canDelete) {
      showModal({
        icon: 'lock', iconColor: '#ef4444',
        title: 'Yetki Gerekli',
        message: 'Sadece kendi oluşturduğunuz görevleri silebilirsiniz.',
        confirmText: 'Tamam',
        onConfirm: hideModal,
      });
      return;
    }
    showModal({
      icon: 'delete-forever', iconColor: '#ef4444',
      title: 'Görevi Sil',
      message: `"${gorev.proje}" projesindeki bu görevi silmek istediğinize emin misiniz?`,
      confirmText: 'Sil', cancelText: 'İptal', destructive: true,
      onConfirm: async () => { hideModal(); await gorevSil(gorev.id); navigation.goBack(); },
    });
  };

  const handleDuzenle = () => {
    navigation.navigate('Tabs', { screen: 'Takvim', params: { editGorevId: gorev.id } });
  };

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.geriBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <MaterialIcons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={[s.headerProjeBadge, { backgroundColor: renk + '20' }]}>
          <MaterialIcons name="folder" size={13} color={renk} />
          <Text style={[s.headerProjeTxt, { color: renk }]} numberOfLines={1}>{gorev.proje}</Text>
        </View>
        {isAdmin && (
          <View style={s.headerSag}>
            <TouchableOpacity style={s.headerBtn} onPress={handleDuzenle} activeOpacity={0.75}>
              <MaterialIcons name="edit" size={20} color="#6366f1" />
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity style={s.headerBtn} onPress={handleSil} activeOpacity={0.75}>
                <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── İçerik ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollIcerik}
        showsVerticalScrollIndicator={false}
      >
        {/* Durum + gecikmiş */}
        <View style={s.durumRow}>
          <View style={[s.durumBadge, { backgroundColor: renk + '18', borderColor: renk + '40' }]}>
            <MaterialIcons name={dc.icon} size={15} color={renk} />
            <Text style={[s.durumTxt, { color: renk }]}>{dc.label}</Text>
          </View>
          {overdue && (
            <View style={s.geciktiBadge}>
              <MaterialIcons name="warning" size={13} color="#ef4444" />
              <Text style={s.geciktiTxt}>Gecikmiş</Text>
            </View>
          )}
        </View>

        {/* Aktif revize notu */}
        {(isRevize || isRevizeYapiliyor) && (
          <View style={s.revizeNotBox}>
            <MaterialIcons name="rate-review" size={16} color="#ef4444" />
            <View style={{ flex: 1 }}>
              <Text style={[s.revizeNotTxt, { color: '#ef4444', fontWeight: '700', marginBottom: 2 }]}>
                {isRevize ? 'Revize İstendi' : 'Revize Yapılıyor'}
              </Text>
              <Text style={s.revizeNotTxt}>
                {sonRevize?.not || gorev.revizeNotu || 'Revize notu girilmedi.'}
              </Text>
              {sonRevize?.gonderenAd ? (
                <Text style={[s.revizeNotTxt, { color: '#666666', fontSize: 11, marginTop: 4 }]}>
                  — {sonRevize.gonderenAd}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Görev başlığı */}
        <Text style={s.bolumBaslik}>Görev</Text>
        <Text style={[s.gorevBaslik, isTamamlandi && s.ustTxt]}>{gorev.is}</Text>

        {/* Açıklama */}
        {!!gorev.aciklama && (
          <>
            <Text style={s.bolumBaslik}>Açıklama</Text>
            <Text style={[s.aciklamaTxt, isTamamlandi && s.ustTxt]}>{gorev.aciklama}</Text>
          </>
        )}

        {/* Tarihler */}
        <Text style={s.bolumBaslik}>Tarihler</Text>
        <View style={s.tarihRow}>
          <View style={s.tarihKutu}>
            <MaterialIcons name="play-arrow" size={16} color="#555555" />
            <View>
              <Text style={s.tarihEtiket}>Başlangıç</Text>
              <Text style={s.tarihDeger}>{fmtGunAy(gorev.baslangic)}</Text>
            </View>
          </View>
          <MaterialIcons name="arrow-forward" size={18} color="#2a2a2a" />
          <View style={s.tarihKutu}>
            <MaterialIcons name="flag" size={16} color={overdue ? '#ef4444' : '#555555'} />
            <View>
              <Text style={s.tarihEtiket}>Teslim</Text>
              <Text style={[s.tarihDeger, overdue && { color: '#ef4444' }]}>{fmtGunAy(gorev.teslim)}</Text>
            </View>
          </View>
        </View>

        {/* Maddeler */}
        {toplamMadde > 0 && (
          <>
            <View style={s.bolumSatir}>
              <Text style={s.bolumBaslik}>Görev Maddeleri</Text>
              <Text style={s.maddeSayi}>{tamamlananMadde}/{toplamMadde} tamamlandı</Text>
            </View>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${(tamamlananMadde / toplamMadde) * 100}%`, backgroundColor: renk }]} />
            </View>
            <View style={s.maddelerBox}>
              {maddeler.map((m, idx) => (
                <TouchableOpacity
                  key={m.id}
                  style={s.maddeSatir}
                  onPress={() => !isTamamlandi && handleMaddeToggle(m.id)}
                  activeOpacity={isTamamlandi ? 1 : 0.75}
                  disabled={isTamamlandi}
                >
                  <View style={[s.maddeCheck, m.tamamlandi && s.maddeCheckDolu]}>
                    {m.tamamlandi && <MaterialIcons name="check" size={12} color="#000000" />}
                  </View>
                  <View style={s.maddeSol}>
                    <Text style={s.maddeNo}>{idx + 1}</Text>
                    <Text style={[s.maddeTxt, m.tamamlandi && s.maddeTxtDolu]}>{m.metin}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Sorumlular */}
        {gorev.sorumlular?.length > 0 && (
          <>
            <Text style={s.bolumBaslik}>Sorumlular</Text>
            <View style={s.sorumluRow}>
              {gorev.sorumlular.map(sr => {
                const r = projeRenk(sr.displayName);
                return (
                  <View key={sr.uid} style={[s.sorumluChip, { backgroundColor: r + '15', borderColor: r + '30' }]}>
                    <View style={[s.sorumluAvatar, { backgroundColor: r + '30' }]}>
                      <Text style={[s.sorumluAvatarTxt, { color: r }]}>{(sr.displayName || '?')[0].toUpperCase()}</Text>
                    </View>
                    <Text style={[s.sorumluAd, { color: r }]}>{sr.displayName || sr.uid}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Revize Geçmişi */}
        {(revizeler.length > 0 || gorev.revizeNotu) && (
          <>
            <Text style={s.bolumBaslik}>
              Revize Geçmişi {revizeler.length > 0 ? `(${revizeler.length})` : ''}
            </Text>
            <View style={s.revizeGecmisiBox}>
              {revizeler.length > 0
                ? [...revizeler].reverse().map((r, idx) => (
                    <View
                      key={idx}
                      style={[s.revizeGecmisiItem, idx < revizeler.length - 1 && s.revizeGecmisiBorder]}
                    >
                      <View style={s.revizeGecmisiHeader}>
                        <View style={s.revizeGecmisiNo}>
                          <Text style={s.revizeGecmisiNoTxt}>{revizeler.length - idx}</Text>
                        </View>
                        <Text style={s.revizeGecmisiKisi}>{r.gonderenAd || 'Admin'}</Text>
                        <Text style={s.revizeGecmisiTarih}>{fmtTarihSaat(r.tarih)}</Text>
                      </View>
                      <Text style={s.revizeGecmisiNot}>{r.not || 'Not girilmedi.'}</Text>
                    </View>
                  ))
                : (
                    <View style={s.revizeGecmisiItem}>
                      <Text style={s.revizeGecmisiNot}>{gorev.revizeNotu}</Text>
                    </View>
                  )
              }
            </View>
          </>
        )}

        {/* Alt boşluk — fixed butonlar için */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Fixed Aksiyon Butonları ── */}
      <View style={[s.aksiyonBar, { paddingBottom: (insets.bottom || 0) + 12 }]}>
        {isAdmin ? (
          <View style={s.aksiyonSatir}>
            {durum === 'beklemede' && (
              <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonMavi]} onPress={() => handleDurum('devam_ediyor')} activeOpacity={0.85}>
                <MaterialIcons name="play-circle-outline" size={18} color="#6366f1" />
                <Text style={[s.aksiyonTxt, { color: '#6366f1' }]}>Başlat</Text>
              </TouchableOpacity>
            )}
            {durum === 'devam_ediyor' && (
              <>
                <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonSari, { flex: 1 }]} onPress={() => handleDurum('onay_bekliyor')} activeOpacity={0.85}>
                  <MaterialIcons name="send" size={18} color="#f59e0b" />
                  <Text style={[s.aksiyonTxt, { color: '#f59e0b' }]}>Onaya Al</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonKirmizi, { flex: 1 }]} onPress={() => handleDurum('revize')} activeOpacity={0.85}>
                  <MaterialIcons name="rate-review" size={18} color="#ef4444" />
                  <Text style={[s.aksiyonTxt, { color: '#ef4444' }]}>Revize</Text>
                </TouchableOpacity>
              </>
            )}
            {isOnayBekliyor && (
              <>
                {canApprove ? (
                  <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonYesil, { flex: 1 }]} onPress={() => handleDurum('tamamlandi')} activeOpacity={0.85}>
                    <MaterialIcons name="verified" size={18} color="#10b981" />
                    <Text style={[s.aksiyonTxt, { color: '#10b981' }]}>Onayla</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[s.aksiyonBtn, s.aksiyonGri, { flex: 1 }]}>
                    <MaterialIcons name="lock" size={18} color="#555555" />
                    <Text style={[s.aksiyonTxt, { color: '#555555' }]}>Admin Onayı Gerekli</Text>
                  </View>
                )}
                <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonKirmizi, { flex: 1 }]} onPress={() => handleDurum('revize')} activeOpacity={0.85}>
                  <MaterialIcons name="rate-review" size={18} color="#ef4444" />
                  <Text style={[s.aksiyonTxt, { color: '#ef4444' }]}>Revize</Text>
                </TouchableOpacity>
              </>
            )}
            {isRevize && (
              <>
                <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonKirmizi, { flex: 1 }]} onPress={() => handleDurum('revize_yapiliyor')} activeOpacity={0.85}>
                  <MaterialIcons name="construction" size={18} color="#ef4444" />
                  <Text style={[s.aksiyonTxt, { color: '#ef4444' }]}>Revize Başla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonSari, { flex: 1 }]} onPress={() => handleDurum('onay_bekliyor')} activeOpacity={0.85}>
                  <MaterialIcons name="send" size={18} color="#f59e0b" />
                  <Text style={[s.aksiyonTxt, { color: '#f59e0b' }]}>Onaya Gönder</Text>
                </TouchableOpacity>
              </>
            )}
            {isRevizeYapiliyor && (
              <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonSari, { flex: 1 }]} onPress={() => handleDurum('onay_bekliyor')} activeOpacity={0.85}>
                <MaterialIcons name="send" size={18} color="#f59e0b" />
                <Text style={[s.aksiyonTxt, { color: '#f59e0b' }]}>Onaya Gönder</Text>
              </TouchableOpacity>
            )}
            {!isOnayBekliyor && !isTamamlandi && !isRevize && !isRevizeYapiliyor && canApprove && (
              <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonYesil]} onPress={handleTamamla} activeOpacity={0.85}>
                <MaterialIcons name="check-circle-outline" size={18} color="#10b981" />
                <Text style={[s.aksiyonTxt, { color: '#10b981' }]}>Tamamlandı</Text>
              </TouchableOpacity>
            )}
            {!isOnayBekliyor && !isTamamlandi && !isRevize && !isRevizeYapiliyor && !canApprove && (
              <View style={[s.aksiyonBtn, s.aksiyonGri]}>
                <MaterialIcons name="lock" size={18} color="#555555" />
                <Text style={[s.aksiyonTxt, { color: '#555555' }]}>Admin Onayı Gerekli</Text>
              </View>
            )}
            {isTamamlandi && (
              <>
                <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonGri, { flex: 1 }]} onPress={handleTamamla} activeOpacity={0.85}>
                  <MaterialIcons name="replay" size={18} color="#888888" />
                  <Text style={[s.aksiyonTxt, { color: '#888888' }]}>Geri Al</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonKirmizi, { flex: 1 }]} onPress={() => handleDurum('revize')} activeOpacity={0.85}>
                  <MaterialIcons name="rate-review" size={18} color="#ef4444" />
                  <Text style={[s.aksiyonTxt, { color: '#ef4444' }]}>Revize</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={s.aksiyonSatir}>
            {durum === 'beklemede' && (
              <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonMavi]} onPress={() => handleDurum('devam_ediyor')} activeOpacity={0.85}>
                <MaterialIcons name="play-circle-outline" size={18} color="#6366f1" />
                <Text style={[s.aksiyonTxt, { color: '#6366f1' }]}>Başla</Text>
              </TouchableOpacity>
            )}
            {durum === 'devam_ediyor' && (
              <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonSari]} onPress={() => handleDurum('onay_bekliyor')} activeOpacity={0.85}>
                <MaterialIcons name="send" size={18} color="#f59e0b" />
                <Text style={[s.aksiyonTxt, { color: '#f59e0b' }]}>Onaya Gönder</Text>
              </TouchableOpacity>
            )}
            {isRevize && (
              <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonKirmizi, { flex: 1 }]} onPress={() => handleDurum('revize_yapiliyor')} activeOpacity={0.85}>
                <MaterialIcons name="construction" size={18} color="#ef4444" />
                <Text style={[s.aksiyonTxt, { color: '#ef4444' }]}>Revize Başla</Text>
              </TouchableOpacity>
            )}
            {isRevizeYapiliyor && (
              <TouchableOpacity style={[s.aksiyonBtn, s.aksiyonSari, { flex: 1 }]} onPress={() => handleDurum('onay_bekliyor')} activeOpacity={0.85}>
                <MaterialIcons name="send" size={18} color="#f59e0b" />
                <Text style={[s.aksiyonTxt, { color: '#f59e0b' }]}>Onaya Gönder</Text>
              </TouchableOpacity>
            )}
            {isOnayBekliyor && (
              <View style={[s.aksiyonBtn, s.aksiyonSari, { flex: 1 }]}>
                <MaterialIcons name="access-time" size={18} color="#f59e0b" />
                <Text style={[s.aksiyonTxt, { color: '#f59e0b' }]}>Onay Bekleniyor...</Text>
              </View>
            )}
            {isTamamlandi && (
              <View style={[s.aksiyonBtn, s.aksiyonYesil, { flex: 1 }]}>
                <MaterialIcons name="verified" size={18} color="#10b981" />
                <Text style={[s.aksiyonTxt, { color: '#10b981' }]}>Tamamlandı</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Revize Modal ── */}
      <Modal transparent visible={revizeModal.visible} animationType="fade" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setRevizeModal(m => ({ ...m, visible: false }))}>
          <View style={s.revizeOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.revizeBox}>
                <View style={s.revizeIkon}>
                  <MaterialIcons name="rate-review" size={28} color="#f59e0b" />
                </View>
                <Text style={s.revizeBaslik}>Revize Notu</Text>
                <Text style={s.revizeAlt}>Kullanıcıya iletilecek açıklamayı yazın (opsiyonel)</Text>
                <TextInput
                  style={s.revizeInput}
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
                  style={s.revizeGonderBtn}
                  onPress={() => {
                    durumGuncelleSafe('revize', {
                    revizeNotu: revizeModal.not.trim() || undefined,
                    gonderenAd: userProfile?.displayName || user?.email || '',
                    gonderenId: user?.uid || '',
                  });
                  setRevizeModal({ visible: false, not: '' });
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="send" size={16} color="#000000" />
                  <Text style={s.revizeGonderTxt}>Revize Gönder</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRevizeModal({ visible: false, not: '' })} style={s.revizeIptalBtn}>
                  <Text style={s.revizeIptalTxt}>İptal</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ConfirmModal
        visible={modal.visible} icon={modal.icon} iconColor={modal.iconColor}
        title={modal.title} message={modal.message} confirmText={modal.confirmText}
        cancelText={modal.cancelText} destructive={modal.destructive}
        onConfirm={modal.onConfirm} onCancel={hideModal}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  bosEkran: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111111', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  geriBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  headerProjeBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  headerProjeTxt: { fontSize: 14, fontWeight: '700' },
  headerSag: { flexDirection: 'row', gap: 6 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },

  // Scroll
  scroll: { flex: 1 },
  scrollIcerik: { paddingHorizontal: 16, paddingTop: 16 },

  // Durum
  durumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  durumBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  durumTxt: { fontSize: 14, fontWeight: '700' },
  geciktiBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ef444415', borderRadius: 10, borderWidth: 1, borderColor: '#ef444430', paddingHorizontal: 10, paddingVertical: 5 },
  geciktiTxt: { fontSize: 12, fontWeight: '700', color: '#ef4444' },

  // Revize notu
  revizeNotBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#ef44440c', borderRadius: 12, borderWidth: 1, borderColor: '#ef444430', padding: 14, marginBottom: 10 },
  revizeNotTxt: { flex: 1, fontSize: 14, color: '#f59e0b', lineHeight: 22 },

  // Bölüm başlıkları
  bolumBaslik: { fontSize: 11, fontWeight: '700', color: '#444444', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  bolumSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 },
  maddeSayi: { fontSize: 12, fontWeight: '700', color: '#555555' },

  // Görev metinleri
  gorevBaslik: { fontSize: 18, fontWeight: '700', color: '#ffffff', lineHeight: 26 },
  aciklamaTxt: { fontSize: 15, color: '#888888', lineHeight: 24 },
  ustTxt: { textDecorationLine: 'line-through', color: '#444444' },

  // Tarihler
  tarihRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tarihKutu: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#111111', borderRadius: 12, borderWidth: 1, borderColor: '#1e1e1e', padding: 12 },
  tarihEtiket: { fontSize: 10, color: '#555555', fontWeight: '600', marginBottom: 2 },
  tarihDeger: { fontSize: 15, fontWeight: '700', color: '#e0e0e0' },

  // Progress
  progressBg: { height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: 6, borderRadius: 3 },

  // Maddeler
  maddelerBox: { gap: 2 },
  maddeSatir: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#111111' },
  maddeCheck: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  maddeCheckDolu: { backgroundColor: '#ffd800', borderColor: '#ffd800' },
  maddeSol: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  maddeNo: { fontSize: 12, color: '#333333', fontWeight: '700', minWidth: 16, marginTop: 3 },
  maddeTxt: { flex: 1, fontSize: 15, color: '#cccccc', lineHeight: 22 },
  maddeTxtDolu: { textDecorationLine: 'line-through', color: '#444444' },

  // Sorumlular
  sorumluRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sorumluChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  sorumluAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sorumluAvatarTxt: { fontSize: 12, fontWeight: '800' },
  sorumluAd: { fontSize: 14, fontWeight: '600' },

  // Fixed aksiyon bar
  aksiyonBar: {
    backgroundColor: '#0a0a0a', borderTopWidth: 1, borderTopColor: '#1e1e1e',
    paddingHorizontal: 16, paddingTop: 12,
  },
  aksiyonSatir: { flexDirection: 'row', gap: 10 },
  aksiyonBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  aksiyonTxt: { fontSize: 15, fontWeight: '700' },
  aksiyonMavi: { backgroundColor: '#6366f110', borderColor: '#6366f130' },
  aksiyonSari: { backgroundColor: '#f59e0b0d', borderColor: '#f59e0b35' },
  aksiyonYesil: { backgroundColor: '#10b98112', borderColor: '#10b98130' },
  aksiyonKirmizi: { backgroundColor: '#ef444410', borderColor: '#ef444430' },
  aksiyonGri: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' },

  // Revize geçmişi
  revizeGecmisiBox: { backgroundColor: '#0d0d0d', borderRadius: 12, borderWidth: 1, borderColor: '#1e1e1e', overflow: 'hidden' },
  revizeGecmisiItem: { padding: 14 },
  revizeGecmisiBorder: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  revizeGecmisiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  revizeGecmisiNo: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ef444420', borderWidth: 1, borderColor: '#ef444440', alignItems: 'center', justifyContent: 'center' },
  revizeGecmisiNoTxt: { fontSize: 10, fontWeight: '800', color: '#ef4444' },
  revizeGecmisiKisi: { fontSize: 12, fontWeight: '700', color: '#cccccc', flex: 1 },
  revizeGecmisiTarih: { fontSize: 10, color: '#444444' },
  revizeGecmisiNot: { fontSize: 13, color: '#888888', lineHeight: 20 },

  // Revize modal
  revizeOverlay: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  revizeBox: { backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', width: '100%', paddingHorizontal: 22, paddingTop: 26, paddingBottom: 20, alignItems: 'center', gap: 10 },
  revizeIkon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f59e0b18', alignItems: 'center', justifyContent: 'center' },
  revizeBaslik: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  revizeAlt: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  revizeInput: { width: '100%', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 80, marginTop: 4 },
  revizeGonderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 13, width: '100%', marginTop: 4 },
  revizeGonderTxt: { fontSize: 15, fontWeight: '700', color: '#000000' },
  revizeIptalBtn: { paddingVertical: 8 },
  revizeIptalTxt: { fontSize: 14, fontWeight: '600', color: '#475569' },
});
