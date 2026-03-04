import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import ConfirmModal from '../components/ConfirmModal';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });

  const showInfo = (title, message) =>
    setModal({ visible: true, title, message });
  const hideModal = () => setModal((m) => ({ ...m, visible: false }));

  const handleLogin = async () => {
    if (!email || !password) {
      showInfo('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      const result = await login(email, password);
      if (result.payload) {
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      showInfo('Giriş Hatası', error || 'Giriş yapılamadı.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/paxLogoHv4.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Mesai Takip</Text>
        <Text style={styles.subtitle}>Pax Medya</Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />

        <Text style={styles.label}>Şifre</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Pax Medya Mesai Takip</Text>
      </View>

      <ConfirmModal
        visible={modal.visible}
        icon="info"
        iconColor="#ef4444"
        title={modal.title}
        message={modal.message}
        confirmText="Tamam"
        hideCancel
        onConfirm={hideModal}
        onCancel={hideModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 60,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 20,
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
    flex: 1,
    justifyContent: 'center',
    marginBottom: 50,
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
  loginButton: {
    backgroundColor: '#ffd800',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 24,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
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
    marginBottom: 60,
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  registerLink: {
    color: '#ffd800',
    fontWeight: '600',
  },
});
