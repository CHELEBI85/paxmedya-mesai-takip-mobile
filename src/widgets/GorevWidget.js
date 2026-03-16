import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const GUNLER = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const RENKLER = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
const projeRenk = (proje = '') => {
  let hash = 0;
  for (let i = 0; i < proje.length; i++) hash = proje.charCodeAt(i) + ((hash << 5) - hash);
  return RENKLER[Math.abs(hash) % RENKLER.length];
};

// Tarih formatı: "15/03" gibi
const fmtTarih = (dateStr) => (dateStr ? dateStr.slice(5).replace('-', '/') : '');

const DURUM_RENK = {
  beklemede:        '#555555',
  devam_ediyor:     '#6366f1',
  onay_bekliyor:    '#f59e0b',
  tamamlandi:       '#10b981',
  revize:           '#ef4444',
  revize_yapiliyor: '#f97316',
};
const DURUM_ETIKET = {
  beklemede:        'Beklemede',
  devam_ediyor:     'Devam Ediyor',
  onay_bekliyor:    'Onay Bekliyor',
  tamamlandi:       'Tamamlandı',
  revize:           'Revize',
  revize_yapiliyor: 'Revize Yapılıyor',
};
const getGorevDurum = (g) => {
  if (g.durum) return g.durum;
  return g.tamamlandi ? 'tamamlandi' : 'beklemede';
};

function GorevSatir({ gorev }) {
  const projeRenki = projeRenk(gorev.proje);
  const durum = getGorevDurum(gorev);
  const durumRenk = DURUM_RENK[durum] || '#555555';
  const durumEtiket = DURUM_ETIKET[durum] || 'Beklemede';
  return (
    <FlexWidget
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#181818',
        borderRadius: 10,
        marginBottom: 5,
        paddingVertical: 7,
        paddingRight: 10,
      }}
    >
      {/* Sol durum çubuğu */}
      <FlexWidget
        style={{
          width: 3,
          height: 28,
          backgroundColor: durumRenk,
          borderRadius: 2,
          marginLeft: 8,
          marginRight: 9,
        }}
      />

      {/* Görev metni */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          style={{ fontSize: 11, color: '#e8e8e8', fontWeight: '700' }}
          text={gorev.is || 'Görev'}
          maxLines={1}
        />
        <TextWidget
          style={{ fontSize: 9, color: projeRenki, fontWeight: '600', marginTop: 1 }}
          text={gorev.proje || ''}
          maxLines={1}
        />
      </FlexWidget>

      {/* Durum badge */}
      <FlexWidget
        style={{
          backgroundColor: durumRenk + '20',
          borderRadius: 5,
          paddingHorizontal: 5,
          paddingVertical: 2,
          marginLeft: 6,
        }}
      >
        <TextWidget
          style={{ fontSize: 9, color: durumRenk, fontWeight: '700' }}
          text={durumEtiket}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function GorevWidget({ gorevler = [] }) {
  const bugun = new Date();
  const tarihStr = `${GUNLER[bugun.getDay()]} ${bugun.getDate()} ${AYLAR[bugun.getMonth()]}`;

  const aktifGorevler = gorevler.filter(g => getGorevDurum(g) !== 'tamamlandi');
  const tamamlanan = gorevler.filter(g => getGorevDurum(g) === 'tamamlandi').length;
  const toplam = gorevler.length;
  const goruntulenecek = aktifGorevler.slice(0, 4);
  const fazla = aktifGorevler.length - 4;
  const yuzde = toplam > 0 ? Math.round((tamamlanan / toplam) * 100) : 0;
  const hepsiTamam = toplam > 0 && aktifGorevler.length === 0;

  return (
    <FlexWidget
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0f0f0f',
        flexDirection: 'column',
        padding: 12,
      }}
    >
      {/* ── Başlık ── */}
      <FlexWidget
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 9,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Sarı nokta ikonu */}
          <FlexWidget
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              backgroundColor: '#ffd80018',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <FlexWidget
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#ffd800',
              }}
            />
          </FlexWidget>
          <TextWidget
            style={{ fontSize: 13, fontWeight: '700', color: '#f0f0f0' }}
            text="Haftalık Görevler"
          />
        </FlexWidget>

        {/* Tarih badge */}
        <FlexWidget
          style={{
            backgroundColor: '#1c1c1c',
            borderRadius: 7,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <TextWidget style={{ fontSize: 9, color: '#555555', fontWeight: '600' }} text={tarihStr} />
        </FlexWidget>
      </FlexWidget>

      {/* ── İlerleme ── */}
      {toplam > 0 && (
        <FlexWidget style={{ width: '100%', marginBottom: 9 }}>
          {/* Progress bar */}
          <FlexWidget
            style={{
              width: '100%',
              height: 4,
              backgroundColor: '#1e1e1e',
              borderRadius: 2,
              marginBottom: 6,
            }}
          >
            <FlexWidget
              style={{
                width: yuzde > 0 ? `${yuzde}%` : '2%',
                height: 4,
                backgroundColor: hepsiTamam ? '#10b981' : '#ffd800',
                borderRadius: 2,
              }}
            />
          </FlexWidget>

          {/* İstatistik rozetleri */}
          <FlexWidget style={{ flexDirection: 'row' }}>
            <FlexWidget
              style={{
                backgroundColor: '#10b98118',
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 3,
                marginRight: 5,
              }}
            >
              <TextWidget
                style={{ fontSize: 9, color: '#10b981', fontWeight: '700' }}
                text={`✓ ${tamamlanan} tamamlandı`}
              />
            </FlexWidget>
            {aktifGorevler.length > 0 && (
              <FlexWidget
                style={{
                  backgroundColor: '#ffd80015',
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                }}
              >
                <TextWidget
                  style={{ fontSize: 9, color: '#ffd800', fontWeight: '700' }}
                  text={`${aktifGorevler.length} bekliyor`}
                />
              </FlexWidget>
            )}
          </FlexWidget>
        </FlexWidget>
      )}

      {/* ── Görev listesi / boş durum ── */}
      {goruntulenecek.length === 0 ? (
        <FlexWidget
          style={{
            flex: 1,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hepsiTamam ? (
            <FlexWidget style={{ alignItems: 'center' }}>
              <TextWidget
                style={{ fontSize: 20, color: '#10b981', fontWeight: '700' }}
                text="✓"
              />
              <TextWidget
                style={{ fontSize: 12, color: '#10b981', fontWeight: '700', marginTop: 4 }}
                text="Tüm görevler tamamlandı!"
              />
              <TextWidget
                style={{ fontSize: 9, color: '#2e2e2e', marginTop: 3 }}
                text="Harika bir hafta geçirdiniz"
              />
            </FlexWidget>
          ) : (
            <FlexWidget style={{ alignItems: 'center' }}>
              <TextWidget style={{ fontSize: 12, color: '#2e2e2e', fontWeight: '600' }} text="Bu hafta görev yok" />
              <TextWidget style={{ fontSize: 9, color: '#222222', marginTop: 3 }} text="Yeni görev atandığında burada görünür" />
            </FlexWidget>
          )}
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flex: 1, width: '100%', flexDirection: 'column' }}>
          {goruntulenecek.map((g, i) => (
            <GorevSatir key={g.id || i} gorev={g} />
          ))}
          {fazla > 0 && (
            <FlexWidget
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 3,
              }}
            >
              <TextWidget
                style={{ fontSize: 9, color: '#333333', fontWeight: '600' }}
                text={`+${fazla} görev daha`}
              />
            </FlexWidget>
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
