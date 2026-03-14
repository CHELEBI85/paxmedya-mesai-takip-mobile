import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * ConfirmModal — Native Alert.alert'in yerini alan custom modal
 *
 * Props:
 *  visible      boolean
 *  icon         MaterialIcons icon name (opsiyonel)
 *  iconColor    string (opsiyonel, default '#ffd800')
 *  title        string
 *  message      string
 *  confirmText  string   (default 'Onayla')
 *  cancelText   string   (default 'İptal')
 *  destructive  boolean  (onaylama butonu kırmızı olur)
 *  onConfirm    () => void
 *  onCancel     () => void
 */
export default function ConfirmModal({
  visible,
  icon,
  iconColor = '#ffd800',
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  destructive = false,
  hideCancel = false,
  onConfirm,
  onCancel,
  onBackdropPress,
  secondaryText,
  secondaryColor = '#8b5cf6',
  onSecondary,
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onBackdropPress ?? onCancel}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.box, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
              {/* İkon */}
              {icon && (
                <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
                  <MaterialIcons name={icon} size={30} color={iconColor} />
                </View>
              )}

              {/* Başlık */}
              <Text style={styles.title}>{title}</Text>

              {/* Mesaj */}
              {message ? <Text style={styles.message}>{message}</Text> : null}

              {/* Butonlar */}
              <View style={styles.btnCol}>
                <TouchableOpacity
                  style={[styles.confirmBtn, destructive ? styles.confirmBtnRed : styles.confirmBtnYellow]}
                  onPress={onConfirm}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.confirmBtnTxt, destructive ? styles.confirmBtnTxtLight : styles.confirmBtnTxtDark]}>
                    {confirmText}
                  </Text>
                </TouchableOpacity>

                {secondaryText && (
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: secondaryColor + '55' }]}
                    onPress={onSecondary}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.secondaryBtnTxt, { color: secondaryColor }]}>{secondaryText}</Text>
                  </TouchableOpacity>
                )}

                {!hideCancel && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
                    <Text style={styles.cancelBtnTxt}>{cancelText}</Text>
                  </TouchableOpacity>
                )}
              </View>
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
    backgroundColor: '#000000cc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  box: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 21,
  },
  btnCol: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
  },
  secondaryBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnYellow: { backgroundColor: '#ffd800' },
  confirmBtnRed: { backgroundColor: '#ef4444' },
  confirmBtnTxt: { fontSize: 15, fontWeight: '700' },
  confirmBtnTxtDark: { color: '#0f172a' },
  confirmBtnTxtLight: { color: '#fff' },
});
