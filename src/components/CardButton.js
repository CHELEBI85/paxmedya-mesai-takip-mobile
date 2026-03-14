import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * Ortak kart butonu. Sol renkli şerit + ikon kutusu + başlık/alt yazı + sağ ok.
 *
 * Props:
 *   onPress, disabled, activeOpacity, style
 *   loading, loadingColor          — yükleme göstergesi
 *   stripeColor, borderColor       — sol şerit ve dış kenar rengi
 *   icon, iconSize, iconColor      — MaterialIcons ikonu
 *   iconBgColor, iconBorderColor   — ikon kutusunun arka planı / kenarı
 *   iconElement                    — ikon alanına custom JSX (icon'un önceliği alır)
 *   title, titleColor, subtitle    — metin
 *   rightIcon, rightIconColor, rightBgColor — sağ ok ikonu
 *   rightElement                   — sağ alana custom JSX (rightIcon'un önceliği alır)
 */
export default function CardButton({
  onPress,
  disabled,
  activeOpacity = 0.75,
  style,
  loading = false,
  loadingColor = '#ffd800',
  stripeColor = '#ffd800',
  borderColor = '#ffd80033',
  icon,
  iconSize = 24,
  iconColor = '#ffd800',
  iconBgColor = '#ffd80012',
  iconBorderColor = '#ffd80033',
  iconElement,
  title,
  titleColor = '#e0e0e0',
  subtitle,
  rightIcon = 'chevron-right',
  rightIconColor = '#ffd800',
  rightBgColor = '#ffd80012',
  rightElement,
}) {
  return (
    <TouchableOpacity
      style={[s.container, { borderColor }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
    >
      <View style={[s.stripe, { backgroundColor: stripeColor }]} />
      {loading ? (
        <View style={s.loadingArea}>
          <ActivityIndicator color={loadingColor} />
        </View>
      ) : (
        <>
          <View style={[s.iconBox, { backgroundColor: iconBgColor, borderColor: iconBorderColor }]}>
            {iconElement ?? <MaterialIcons name={icon} size={iconSize} color={iconColor} />}
          </View>
          <View style={s.textBox}>
            <Text style={[s.title, { color: titleColor }]}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightElement ?? (
            <View style={[s.rightBox, { backgroundColor: rightBgColor }]}>
              <MaterialIcons name={rightIcon} size={22} color={rightIconColor} />
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  stripe: { width: 3, alignSelf: 'stretch' },
  loadingArea: { flex: 1, alignItems: 'center', paddingVertical: 23 },
  iconBox: {
    width: 48, height: 48, margin: 12, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  textBox: { flex: 1, gap: 3, paddingVertical: 14 },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 12, color: '#555555', fontWeight: '400' },
  rightBox: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
});
