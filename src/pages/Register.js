import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

export default function Register({ navigation }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phone: '',
  });
  const { register, loading, error } = useAuth();

  const handleRegister = async () => {
    // Validasyon
    if (!formData.email || !formData.password || !formData.displayName) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun (Email, Şifre, Ad Soyad)');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      const result = await register(formData.email, formData.password, {
        displayName: formData.displayName,
        phone: formData.phone || '',
      });

      if (result.payload) {
        Alert.alert(
          'Başarılı',
          'Kayıt başarıyla tamamlandı! Otomatik olarak giriş yapılıyor...'
        );
        // Firebase Auth otomatik giriş yapacak, navigation gerekmez
      }
    } catch (err) {
      Alert.alert('Kayıt Hatası', error || 'Kayıt yapılamadı');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/paxLogoHv4.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Kayıt Ol</Text>
        <Text style={styles.subtitle}>Yeni hesap oluştur</Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Email */}
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          placeholderTextColor="#64748b"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />

        {/* Şifre */}
        <Text style={styles.label}>Şifre *</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          secureTextEntry
          editable={!loading}
        />

        {/* Şifre Tekrar */}
        <Text style={styles.label}>Şifre Tekrar *</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
          secureTextEntry
          editable={!loading}
        />

        {/* Ad Soyad */}
        <Text style={styles.label}>Ad Soyad *</Text>
        <TextInput
          style={styles.input}
          placeholder="Adınız Soyadınız"
          placeholderTextColor="#64748b"
          value={formData.displayName}
          onChangeText={(text) => setFormData({ ...formData, displayName: text })}
          editable={!loading}
        />

        {/* Telefon */}
        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          placeholder="5XX XXX XX XX"
          placeholderTextColor="#64748b"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          keyboardType="phone-pad"
          editable={!loading}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.registerButton, loading && styles.registerButtonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="person-add" size={20} color="#fff" />
              <Text style={styles.registerButtonText}>Kayıt Ol</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Zaten hesabınız var mı?{' '}
          <Text
            style={styles.loginLink}
            onPress={() => {
              if (navigation) {
                navigation.goBack();
              }
            }}
          >
            Giriş yapın
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 70,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffd800',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e1',
  },
  formContainer: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#1e293b',
    color: '#f8fafc',
  },
  registerButton: {
    backgroundColor: '#ffd800',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  loginLink: {
    color: '#ffd800',
    fontWeight: '600',
  },
});
