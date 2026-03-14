import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const AYLAR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const GUNLER = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

const projeRenk = (proje = '') => {
  const renkler = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
  let hash = 0;
  for (let i = 0; i < proje.length; i++) hash = proje.charCodeAt(i) + ((hash << 5) - hash);
  return renkler[Math.abs(hash) % renkler.length];
};

function GorevSatir({ gorev }) {
  const renk = projeRenk(gorev.proje);
  return (
    <FlexWidget
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1f1f1f',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginBottom: 4,
      }}
    >
      <FlexWidget style={{ width: 4, height: '100%', minHeight: 14, backgroundColor: renk, borderRadius: 2, marginRight: 8 }} />
      <TextWidget
        style={{ flex: 1, fontSize: 11, color: '#e0e0e0', fontWeight: '600' }}
        text={gorev.is || 'Görev'}
        maxLines={1}
      />
      <TextWidget
        style={{ fontSize: 9, color: renk, fontWeight: '700', marginLeft: 6 }}
        text={gorev.proje || ''}
        maxLines={1}
      />
    </FlexWidget>
  );
}

export function GorevWidget({ gorevler = [] }) {
  const bugun = new Date();
  const tarihStr = `${GUNLER[bugun.getDay()]} ${bugun.getDate()} ${AYLAR[bugun.getMonth()]}`;

  const aktifGorevler = gorevler.filter(g => !g.tamamlandi);
  const tamamlanan = gorevler.filter(g => g.tamamlandi).length;
  const toplam = gorevler.length;
  const goruntulenecek = aktifGorevler.slice(0, 4);
  const fazla = aktifGorevler.length - 4;

  return (
    // Root: tam 4x2 alanı kapla
    <FlexWidget
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#141414',
        padding: 10,
        flexDirection: 'column',
      }}
    >
      {/* ── Başlık satırı ── */}
      <FlexWidget
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget style={{ width: 3, height: 13, backgroundColor: '#ffd800', borderRadius: 2, marginRight: 6 }} />
          <TextWidget
            style={{ fontSize: 12, fontWeight: '700', color: '#ffd800' }}
            text="Bu Hafta Görevlerim"
          />
        </FlexWidget>
        <TextWidget style={{ fontSize: 10, color: '#555555' }} text={tarihStr} />
      </FlexWidget>

      {/* ── İlerleme çubuğu ── */}
      {toplam > 0 && (
        <FlexWidget
          style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}
        >
          <FlexWidget
            style={{ flex: 1, height: 3, backgroundColor: '#2a2a2a', borderRadius: 2 }}
          >
            <FlexWidget
              style={{
                width: `${Math.round((tamamlanan / toplam) * 100)}%`,
                height: 3,
                backgroundColor: '#10b981',
                borderRadius: 2,
              }}
            />
          </FlexWidget>
          <TextWidget
            style={{ fontSize: 9, color: '#555555', marginLeft: 6 }}
            text={`${tamamlanan}/${toplam} tamamlandı`}
          />
        </FlexWidget>
      )}

      {/* ── Görev listesi ── */}
      {goruntulenecek.length === 0 ? (
        <FlexWidget
          style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <TextWidget style={{ fontSize: 12, color: '#10b981', fontWeight: '700' }} text="✓ Tüm görevler tamamlandı" />
          <TextWidget style={{ fontSize: 10, color: '#444444', marginTop: 3 }} text="Bu hafta aktif görev yok" />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flex: 1, width: '100%', flexDirection: 'column' }}>
          {goruntulenecek.map((g, i) => <GorevSatir key={g.id || i} gorev={g} />)}
          {fazla > 0 && (
            <TextWidget
              style={{ fontSize: 9, color: '#444444', textAlign: 'center', marginTop: 2 }}
              text={`+${fazla} görev daha`}
            />
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
