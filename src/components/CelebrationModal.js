import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CHECK_IN_MESSAGES = [
  { text: 'Nerelerdesin, özlettin kendini!', sub: 'Set seni bekliyordu, hadi bakalım!' },
  { text: 'Aa sonunda geldin, diye bekliyorduk!', sub: 'Kamera kayda aldı, sahne senin!' },
  { text: 'Hooop patron geldi, herkes yerine!', sub: 'Pax Medya bugün de seninle parlayacak!' },
  { text: 'Yıldızımız stüdyoya adımını attı!', sub: 'Işıklar, kamera, MESAİ!' },
  { text: 'Dedik gelmez bu bugün, iyi ki yanılttın!', sub: 'Koltuğun soğumadan geldin, helal!' },
  { text: 'Bir dakika daha gelmesen arama ekibi kuruluyordu!', sub: 'Neyse ki geldin, iş başına!' },
  { text: 'Bugünkü yıldız oyuncumuz sahneye çıkıyor!', sub: 'Alkışlar sana, hadi başla!' },
  { text: 'Erken gelen mi? Bu saatte mi? Bravo!', sub: 'Tam bir profesyonel gibi geldin!' },
  { text: 'GPS seni bulduğuna göre başlarsın artık!', sub: 'Medya dünyası seni bekliyor!' },
  { text: 'Ofise girince hava değişti, hoş geldin!', sub: 'Bugünkü yayın akışı seninle başlıyor!' },

  { text: 'Stüdyo seni görünce toparlandı!', sub: 'Enerjinle güne start ver!' },
  { text: 'Sahne hazır, ışıklar açık!', sub: 'Başrol sensin, unutma.' },
  { text: 'Tam zamanında giriş yaptın!', sub: 'Bugün de güzel işler çıkacak.' },
  { text: 'Takım tamamlandı, eksik parça geldi!', sub: 'Hadi üretmeye başlayalım.' },
  { text: 'Bugünün enerjisi geldi!', sub: 'Hadi bakalım, harika işler seni bekliyor.' },
  { text: 'Ofis seni fark etti!', sub: 'Şimdi sıra üretimde.' },
  { text: 'Bugünün kahramanı giriş yaptı!', sub: 'Göster kendini!' },
  { text: 'Kapı açıldı ve enerji içeri girdi!', sub: 'Hoş geldin, gün başlasın.' },
  { text: 'Set artık tamam!', sub: 'Çünkü sen geldin.' },
  { text: 'Bugün de sahne senin!', sub: 'Harika işler çıkaracağına eminiz.' },

  { text: 'Hoş geldin, ekip seni bekliyordu!', sub: 'Bugün üretim günü.' },
  { text: 'Ofis sensiz eksikti!', sub: 'Şimdi tamamlandı.' },
  { text: 'Geldin mi? O zaman başlıyoruz!', sub: 'Bugün güzel olacak.' },
  { text: 'Sistem seni tanıdı!', sub: 'Şimdi üretme zamanı.' },
  { text: 'Enerji seviyesi yükseldi!', sub: 'Sebep: sen geldin.' },
  { text: 'Stüdyo hareketlendi!', sub: 'Çünkü sen giriş yaptın.' },
  { text: 'Bugün işler hızlanacak gibi!', sub: 'Sen gelince hep öyle olur.' },
  { text: 'Ekibin motivasyonu arttı!', sub: 'Hoş geldin!' },
  { text: 'Yeni sahne başladı!', sub: 'Başrol yine sende.' },
  { text: 'Sahne hazır, ekip hazır!', sub: 'Şimdi sen hazırsın.' },

  { text: 'Bugün üretken bir gün olacak gibi!', sub: 'İlk adımı attın bile.' },
  { text: 'Ofis bugün biraz daha parlak!', sub: 'Sebebi belli.' },
  { text: 'Hoş geldin, tempo başlıyor!', sub: 'Hazırsan başlayalım.' },
  { text: 'Enerji geldi, sistem çalışıyor!', sub: 'Bugün güzel işler çıkacak.' },
  { text: 'Takım tamamlandı!', sub: 'Şimdi üretim zamanı.' },
  { text: 'Hoş geldin, gün resmen başladı!', sub: 'Sahne seni bekliyor.' },
  { text: 'Bugün de fark yaratma günü!', sub: 'Hadi bakalım.' },
  { text: 'Stüdyo seni fark etti!', sub: 'Enerjin hissediliyor.' },
  { text: 'Bugünün başlangıcı yapıldı!', sub: 'Ve sen buradasın.' },
  { text: 'Hoş geldin, üretim başlasın!', sub: 'Bugün iyi işler çıkaracağız.' }
];

const CHECK_OUT_MESSAGES = [
  { text: 'Hadi gene iyisin, bugün de bitti!', sub: 'Yarında aynı saatte aynı yerde!' },
  { text: 'Ve... Kesss! Bugünlük bu kadar!', sub: 'Yönetmen memnun, gidebilirsin!' },
  { text: 'Bugün de hayatta kaldın, tebrikler!', sub: 'Kanepe seni bekliyor, koş!' },
  { text: 'Mesai bitti ama sen hâlâ buradasın, çık artık!', sub: 'Git biraz dinlen, hak ettin!' },
  { text: 'Finali güzel bitirdin, aferin sana!', sub: 'Şimdi tam bir dizi izleme zamanı!' },
  { text: 'Bugünün en iyi performansı senden!', sub: 'Oscar sana gelsin, iyi akşamlar!' },
  { text: 'Mesai bitti, artık serbest bir kuşsun!', sub: 'Uç gittiğin yere, görüşürüz yarın!' },
  { text: 'Çekimler tamam, ışıklar sönsün!', sub: 'Yarın yeni bir bölüm daha çekelim!' },
  { text: 'Sen gidince ofis karanlığa gömülüyor!', sub: 'Ama olsun, iyi geceler yıldızımız!' },
  { text: 'Bugün ekstra çalıştın mı ne, gözlerin yorgun!', sub: 'Kolay gelsin, hak ettin bu molayı!' },
];

// Özel kullanıcı mesajları (userId -> giriş/çıkış mesajları). Yeni kullanıcı eklemek için buraya ekle.
const SPECIAL_USER_MESSAGES = {
  AYDuSzM4VuV0JZCOm845m64XiRe2: {
    checkIn: [
      { text: 'Heval geldi, ofisin enerjisi yükseldi!', sub: 'Bugün de sağlam işler çıkacak.' },
      { text: 'Doğudan rüzgar esti!', sub: 'Mesai şimdi başlıyor.' },
      { text: 'Halay başı geldi!', sub: 'Ekip tamamlandı.' },
      { text: 'Dengbêj gibi ağır giriş yaptın!', sub: 'Sahne senin.' },
      { text: 'Heval sahaya indi!', sub: 'Bugün üretim var.' },
      { text: 'Kürt gücü ofise ulaştı!', sub: 'Şimdi çalışmaya başlayalım.' },
      { text: 'Doğu disiplini geldi!', sub: 'Herkes hazır olsun.' },
      { text: 'Çaylar hazır, heval geldi!', sub: 'Mesai başlasın.' },
      { text: 'Dağlardan enerji indi!', sub: 'Ofis canlandı.' },
      { text: 'Heval sahnede!', sub: 'Bugün işler hızlı gider.' },
      
      { text: 'Kürt motivasyonu geldi!', sub: 'Bugün güzel işler çıkar.' },
      { text: 'Halay ritmi başladı!', sub: 'Ekip tamam.' },
      { text: 'Heval giriş yaptı!', sub: 'Sistem sevindi.' },
      { text: 'Doğunun enerjisi ofiste!', sub: 'Bugün sağlam üretim var.' },
      { text: 'Dengbêj havası geldi!', sub: 'Gün başladı.' },
      { text: 'Heval geldiğine göre mesai başlar!', sub: 'Hadi bakalım.' },
      { text: 'Kürt sabrı devrede!', sub: 'Bugün de başaracağız.' },
      { text: 'Dağ gibi sağlam giriş!', sub: 'Ofis hazır.' },
      { text: 'Heval kapıyı açtı!', sub: 'Enerji içeri girdi.' },
      { text: 'Doğu ekibi sahnede!', sub: 'Bugün hareketli geçecek.' },
      
      { text: 'Halay başı geldi!', sub: 'Şimdi ritim başlar.' },
      { text: 'Heval ofise indi!', sub: 'Sistem aktif.' },
      { text: 'Kürt enerjisi geldi!', sub: 'Çalışma modu açıldı.' },
      { text: 'Doğudan selam var!', sub: 'Mesai başlasın.' },
      { text: 'Heval geldi, ekip tamam!', sub: 'Bugün üretim var.' },
      { text: 'Dengbêj gibi ağır giriş!', sub: 'Sahne senin.' },
      { text: 'Dağ gibi sağlam duruş!', sub: 'Gün başlıyor.' },
      { text: 'Kürt motivasyonu devrede!', sub: 'Hadi üretelim.' },
      { text: 'Heval geldiğine göre işler yürür!', sub: 'Başlayalım.' },
      { text: 'Ofise doğu havası geldi!', sub: 'Bugün güzel olacak.' },
      
      { text: 'Heval kapıdan girdi!', sub: 'Enerji arttı.' },
      { text: 'Kürt karizması geldi!', sub: 'Ofis toparlandı.' },
      { text: 'Doğu temposu başladı!', sub: 'Herkes hazır.' },
      { text: 'Halay başı pozisyon aldı!', sub: 'Şimdi iş zamanı.' },
      { text: 'Heval geldi, gün başladı!', sub: 'Hadi bakalım.' },
      { text: 'Dağ rüzgarı ofise ulaştı!', sub: 'Bugün hızlı geçer.' },
      { text: 'Kürt sabrı devrede!', sub: 'İşler yoluna girer.' },
      { text: 'Heval giriş yaptı!', sub: 'Sistem tamam.' },
      { text: 'Doğu gücü burada!', sub: 'Gün şimdi başlıyor.' },
      { text: 'Ofis seni bekliyordu heval!', sub: 'Şimdi başlayalım.' },
      
      { text: 'Halay ritmi ofise geldi!', sub: 'Enerji yükseldi.' },
      { text: 'Heval sahaya indi!', sub: 'Oyun başlasın.' },
      { text: 'Kürt temposu başladı!', sub: 'Mesai aktif.' },
      { text: 'Dağ gibi sağlam geldin!', sub: 'Bugün iyi geçer.' },
      { text: 'Heval geldi, ofis canlandı!', sub: 'Başlayalım.' },
      { text: 'Doğudan enerji geldi!', sub: 'Sistem mutlu.' },
      { text: 'Kürt kararlılığı burada!', sub: 'Gün güzel geçecek.' },
      { text: 'Halay başı pozisyon aldı!', sub: 'İş başlasın.' },
      { text: 'Heval geldiğine göre tamamız!', sub: 'Ekip hazır.' },
      { text: 'Ofise doğu güneşi doğdu!', sub: 'Mesai başladı.' },
      
      { text: 'Heval sahnede!', sub: 'Bugün üretim var.' },
      { text: 'Kürt gücü geldi!', sub: 'Enerji yükseldi.' },
      { text: 'Dağ rüzgarı esti!', sub: 'Ofis hareketlendi.' },
      { text: 'Halay başı geldi!', sub: 'Ritim başlasın.' },
      { text: 'Heval giriş yaptı!', sub: 'Gün başladı.' },
      { text: 'Doğu disiplini burada!', sub: 'Herkes hazır.' },
      { text: 'Kürt motivasyonu geldi!', sub: 'Bugün üretelim.' },
      { text: 'Heval geldi, ekip tamamlandı!', sub: 'Mesai başladı.' },
      { text: 'Dağ gibi sağlam giriş!', sub: 'Ofis hazır.' },
      { text: 'Doğudan selam var!', sub: 'Hadi çalışalım.' },
      
      { text: 'Heval kapıdan girdi!', sub: 'Enerji yükseldi.' },
      { text: 'Kürt karizması ofiste!', sub: 'Bugün güzel geçer.' },
      { text: 'Halay başı geldi!', sub: 'Ekip tamam.' },
      { text: 'Dağ enerjisi geldi!', sub: 'Ofis canlandı.' },
      { text: 'Heval sahnede!', sub: 'İş başlasın.' },
      { text: 'Doğu gücü burada!', sub: 'Mesai başladı.' },
      { text: 'Kürt motivasyonu devrede!', sub: 'Hadi üretelim.' },
      { text: 'Halay ritmi geldi!', sub: 'Enerji yükseldi.' },
      { text: 'Heval geldiğine göre tamamız!', sub: 'Bugün güzel işler var.' },
      { text: 'Doğu havası ofiste!', sub: 'Mesai başladı.' }
      ],
      checkOut: [
        { text: 'Heval bugün de işi bitirdi!', sub: 'Şimdi çay zamanı.' },
        { text: 'Bugün de sağlam çalıştın heval!', sub: 'Dinlenmeyi hak ettin.' },
        { text: 'Halay başı bugünlük sahneden indi!', sub: 'Yarın yine buradayız.' },
        { text: 'Doğu disiplini bugün de iş yaptı!', sub: 'İyi akşamlar heval.' },
        { text: 'Heval mesaiyi kapattı!', sub: 'Şimdi dinlenme zamanı.' },
        { text: 'Bugün de dağ gibi çalıştın!', sub: 'Helal olsun.' },
        { text: 'Kürt sabrı yine kazandı!', sub: 'İyi akşamlar.' },
        { text: 'Heval görevi tamamladı!', sub: 'Yarın devam.' },
        { text: 'Bugünün emeği bitti!', sub: 'Çay demle heval.' },
        { text: 'Ofis bugünlük senden razı!', sub: 'İyi akşamlar.' },
        
        { text: 'Heval bugün de sahneyi kapattı!', sub: 'Yarın yeni bölüm.' },
        { text: 'Mesai bitti heval!', sub: 'Şimdi rahatlama zamanı.' },
        { text: 'Halay bitti!', sub: 'Dinlenme başladı.' },
        { text: 'Bugün de sağlam performans!', sub: 'Helal sana.' },
        { text: 'Heval günü kapattı!', sub: 'İyi dinlen.' },
        { text: 'Doğu gücü bugünlük tamam!', sub: 'Yarın görüşürüz.' },
        { text: 'Kürt motivasyonu görevini yaptı!', sub: 'İyi akşamlar.' },
        { text: 'Bugün de güzel çalıştın!', sub: 'Dinlen heval.' },
        { text: 'Ekip senden memnun!', sub: 'İyi akşamlar.' },
        { text: 'Heval bugünlük sistemi kapattı!', sub: 'Yarın açarız.' },
        
        { text: 'Bugün de işi hallettin!', sub: 'Şimdi çay içme zamanı.' },
        { text: 'Heval görev tamam!', sub: 'Dinlenmeyi unutma.' },
        { text: 'Mesai başarıyla bitti!', sub: 'Helal sana.' },
        { text: 'Bugün de güzel iş çıkardın!', sub: 'İyi akşamlar.' },
        { text: 'Doğu temposu bugünlük durdu!', sub: 'Yarın devam.' },
        { text: 'Halay başı bugünlük dağıldı!', sub: 'Dinlen.' },
        { text: 'Heval bugün de fark yarattı!', sub: 'İyi akşamlar.' },
        { text: 'Bugün de işi bitirdin!', sub: 'Hak ettin.' },
        { text: 'Kürt azmi yine kazandı!', sub: 'Dinlen heval.' },
        { text: 'Ofis bugünlük seni uğurluyor!', sub: 'Yarın görüşürüz.' },
        
        { text: 'Heval bugün de sahneyi kapattı!', sub: 'Yarın yine açarız.' },
        { text: 'Bugün de sağlam mesai!', sub: 'Helal olsun.' },
        { text: 'Mesai tamamlandı!', sub: 'İyi dinlen.' },
        { text: 'Bugün de görev bitti!', sub: 'Yarın devam.' },
        { text: 'Heval günü kapattı!', sub: 'Dinlenmeye geç.' },
        { text: 'Halay ritmi bugünlük durdu!', sub: 'Yarın yine başlar.' },
        { text: 'Bugün de iyi çalıştın!', sub: 'İyi akşamlar.' },
        { text: 'Doğu enerjisi bugünlük tamam!', sub: 'Dinlen heval.' },
        { text: 'Ekip senden razı!', sub: 'Yarın yine bekliyoruz.' },
        { text: 'Heval görevi bitirdi!', sub: 'Şimdi mola zamanı.' },
        
        { text: 'Bugün de sağlam performans!', sub: 'Helal sana.' },
        { text: 'Mesai tamamlandı!', sub: 'İyi akşamlar.' },
        { text: 'Heval bugün de işi bitirdi!', sub: 'Dinlen.' },
        { text: 'Bugün de görev tamam!', sub: 'Yarın devam.' },
        { text: 'Doğu temposu kapandı!', sub: 'Dinlen heval.' },
        { text: 'Halay başı bugünlük kapattı!', sub: 'Yarın görüşürüz.' },
        { text: 'Bugün de emeğin büyük!', sub: 'Helal olsun.' },
        { text: 'Heval günü kapattı!', sub: 'Şimdi rahatla.' },
        { text: 'Mesai başarıyla tamam!', sub: 'İyi akşamlar.' },
        { text: 'Bugün de işi bitirdin!', sub: 'Dinlenmeyi hak ettin.' },
        
        { text: 'Heval bugün de çalıştı!', sub: 'Şimdi çay zamanı.' },
        { text: 'Bugün de iyi performans!', sub: 'Helal sana.' },
        { text: 'Mesai tamamlandı!', sub: 'Dinlen.' },
        { text: 'Heval görevini yaptı!', sub: 'İyi akşamlar.' },
        { text: 'Bugün de üretim vardı!', sub: 'Yarın yine olur.' },
        { text: 'Halay bitti!', sub: 'Dinlenme başladı.' },
        { text: 'Doğu gücü bugünlük kapandı!', sub: 'Yarın görüşürüz.' },
        { text: 'Heval sahneden indi!', sub: 'İyi akşamlar.' },
        { text: 'Bugün de işi hallettin!', sub: 'Helal sana.' },
        { text: 'Mesai tamam!', sub: 'Dinlen heval.' },
        
        { text: 'Heval günü bitirdi!', sub: 'Şimdi rahatla.' },
        { text: 'Bugün de sağlam çalıştın!', sub: 'İyi akşamlar.' },
        { text: 'Mesai kapandı!', sub: 'Yarın görüşürüz.' },
        { text: 'Halay başı dağıldı!', sub: 'Dinlen.' },
        { text: 'Heval bugün de iyi iş çıkardı!', sub: 'Helal olsun.' },
        { text: 'Doğu sabrı yine kazandı!', sub: 'İyi akşamlar.' },
        { text: 'Bugün de emeğin büyük!', sub: 'Dinlen.' },
        { text: 'Heval görevi tamamladı!', sub: 'Yarın devam.' },
        { text: 'Mesai bitti!', sub: 'Dinlen heval.' },
        { text: 'Bugün de güzel iş çıkardın!', sub: 'İyi akşamlar.' }
        ]
  },
};

const CONFETTI_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D2B4DE',
  '#A3E4D7', '#FAD7A0', '#FADBD8', '#A9CCE3', '#D5F5E3',
];

const SPARKLE_POSITIONS = [
  { top: '10%', left: '10%' },
  { top: '15%', right: '15%' },
  { top: '25%', left: '20%' },
  { top: '20%', right: '10%' },
  { top: '60%', left: '8%' },
  { top: '65%', right: '12%' },
  { top: '75%', left: '15%' },
  { top: '70%', right: '20%' },
];

export default function CelebrationModal({ visible, type, userName, userId, onClose }) {
  const isCheckIn = type === 'check-in';

  // Özel kullanıcı varsa onun mesajları, yoksa varsayılan liste
  const message = useMemo(() => {
    const special = userId && SPECIAL_USER_MESSAGES[userId];
    const list = special
      ? (isCheckIn ? special.checkIn : special.checkOut)
      : (isCheckIn ? CHECK_IN_MESSAGES : CHECK_OUT_MESSAGES);
    if (!list || list.length === 0) {
      const fallback = isCheckIn ? CHECK_IN_MESSAGES : CHECK_OUT_MESSAGES;
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    return list[Math.floor(Math.random() * list.length)];
  }, [visible, isCheckIn, userId]);

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.5)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const emojiBounce = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleShimmer = useRef(new Animated.Value(0)).current;
  const nameScale = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Confetti animations (20 pieces)
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      translateY: new Animated.Value(-50),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }))
  ).current;

  // Sparkle animations
  const sparkleAnims = useRef(
    Array.from({ length: 8 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      startAnimations();
    } else {
      resetAnimations();
    }
  }, [visible]);

  const resetAnimations = () => {
    overlayOpacity.setValue(0);
    modalScale.setValue(0.5);
    modalOpacity.setValue(0);
    emojiBounce.setValue(0);
    titleOpacity.setValue(0);
    titleShimmer.setValue(0);
    nameScale.setValue(0);
    nameOpacity.setValue(0);
    messageOpacity.setValue(0);
    buttonOpacity.setValue(0);
    buttonScale.setValue(0.8);
    glowAnim.setValue(0);
    confettiAnims.forEach((anim) => {
      anim.translateY.setValue(-50);
      anim.translateX.setValue(0);
      anim.rotate.setValue(0);
      anim.opacity.setValue(1);
      anim.scale.setValue(1);
    });
    sparkleAnims.forEach((anim) => {
      anim.scale.setValue(0);
      anim.opacity.setValue(0);
      anim.rotate.setValue(0);
    });
  };

  const startAnimations = () => {
    // 1. Overlay fade in
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // 2. Modal pop in
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Emoji bounce
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(emojiBounce, {
        toValue: 1,
        friction: 3,
        tension: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Continuous bounce
      Animated.loop(
        Animated.sequence([
          Animated.timing(emojiBounce, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(emojiBounce, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 4. Title fade in + shimmer loop
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(titleShimmer, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(titleShimmer, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Name pop-in
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.spring(nameScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 6. Message fade in
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // 7. Button fade in
    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 8. Glow border pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 9. Confetti
    confettiAnims.forEach((anim, index) => {
      const delay = 200 + Math.random() * 600;
      const startX = (Math.random() - 0.5) * SCREEN_WIDTH * 0.8;
      const endX = startX + (Math.random() - 0.5) * 100;
      const duration = 2000 + Math.random() * 1500;

      anim.translateX.setValue(startX);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim.translateY, {
            toValue: SCREEN_HEIGHT * 0.7,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: endX,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: Math.random() * 10 - 5,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(duration * 0.7),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: duration * 0.3,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    });

    // 10. Sparkles
    sparkleAnims.forEach((anim, index) => {
      const delay = 400 + index * 200;
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim.scale, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim.rotate, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(anim.scale, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(anim.rotate, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const shimmerOpacity = titleShimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1, 0.7],
  });

  const emojiScale = emojiBounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          {/* Confetti */}
          {confettiAnims.map((anim, index) => {
            const isEmoji = !isCheckIn && index % 4 === 0;
            const spin = anim.rotate.interpolate({
              inputRange: [-5, 5],
              outputRange: ['-180deg', '180deg'],
            });
            return (
              <Animated.View
                key={`confetti-${index}`}
                style={[
                  styles.confetti,
                  {
                    transform: [
                      { translateY: anim.translateY },
                      { translateX: anim.translateX },
                      { rotate: spin },
                    ],
                    opacity: anim.opacity,
                  },
                ]}
              >
                {isEmoji ? (
                  <Text style={styles.confettiEmoji}>🌙</Text>
                ) : (
                  <View
                    style={[
                      styles.confettiPiece,
                      {
                        backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                        width: 8 + Math.random() * 8,
                        height: 8 + Math.random() * 8,
                        borderRadius: index % 3 === 0 ? 10 : 2,
                      },
                    ]}
                  />
                )}
              </Animated.View>
            );
          })}

          {/* Sparkles */}
          {sparkleAnims.map((anim, index) => {
            const pos = SPARKLE_POSITIONS[index];
            const spin = anim.rotate.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '180deg'],
            });
            return (
              <Animated.View
                key={`sparkle-${index}`}
                style={[
                  styles.sparkle,
                  pos,
                  {
                    transform: [{ scale: anim.scale }, { rotate: spin }],
                    opacity: anim.opacity,
                  },
                ]}
              >
                <Text style={styles.sparkleText}>✨</Text>
              </Animated.View>
            );
          })}

          <TouchableWithoutFeedback>
            <Animated.View
              style={{
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
              }}
            >
              <Animated.View
                style={[
                  styles.modalContainer,
                  {
                    borderColor: isCheckIn ? '#10b981' : '#a855f7',
                    shadowColor: isCheckIn ? '#10b981' : '#a855f7',
                    opacity: glowOpacity,
                  },
                ]}
              >
              {/* Emoji */}
              <Animated.View
                style={[
                  styles.emojiContainer,
                  {
                    transform: [{ scale: emojiScale }],
                  },
                ]}
              >
                <Text style={styles.emoji}>{isCheckIn ? '🎬' : '🎉'}</Text>
              </Animated.View>

              {/* Title */}
              <Animated.View
                style={{
                  opacity: Animated.multiply(titleOpacity, shimmerOpacity),
                }}
              >
                <Text
                  style={[
                    styles.title,
                    { color: isCheckIn ? '#ffd800' : '#a855f7' },
                  ]}
                >
                  {isCheckIn ? 'İyi Mesailer!' : 'Mesai Bitti!'}
                </Text>
              </Animated.View>

              {/* User Name */}
              <Animated.View
                style={{
                  opacity: nameOpacity,
                  transform: [{ scale: nameScale }],
                }}
              >
                <Text style={styles.userName}>{userName}</Text>
              </Animated.View>

              {/* Funny Message */}
              <Animated.View style={{ opacity: messageOpacity }}>
                <Text style={styles.message}>{message.text}</Text>
                <Text style={styles.messageSub}>{message.sub}</Text>
              </Animated.View>

              {/* Close Button */}
              <Animated.View
                style={{
                  opacity: buttonOpacity,
                  transform: [{ scale: buttonScale }],
                  width: '100%',
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: isCheckIn ? '#10b981' : '#a855f7',
                    },
                  ]}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeButtonText}>
                    {isCheckIn ? 'Hadi Başlayalım!' : 'Hoşçakalın!'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 380,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    elevation: 20,
  },
  emojiContainer: {
    marginBottom: 16,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 216, 0, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  messageSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  confetti: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    zIndex: 10,
  },
  confettiPiece: {
    width: 10,
    height: 10,
  },
  confettiEmoji: {
    fontSize: 18,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 5,
  },
  sparkleText: {
    fontSize: 22,
  },
});
