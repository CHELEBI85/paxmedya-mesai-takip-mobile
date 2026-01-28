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

export default function CelebrationModal({ visible, type, userName, onClose }) {
  const isCheckIn = type === 'check-in';

  // Pick a random message when modal becomes visible
  const message = useMemo(() => {
    const messages = isCheckIn ? CHECK_IN_MESSAGES : CHECK_OUT_MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
  }, [visible, isCheckIn]);

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
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
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

  const glowColor = isCheckIn
    ? glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.8)'],
      })
    : glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(168, 85, 247, 0.3)', 'rgba(168, 85, 247, 0.8)'],
      });

  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
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
                    borderColor: glowColor,
                    shadowColor: isCheckIn ? '#10b981' : '#a855f7',
                    shadowRadius: glowShadowRadius,
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
