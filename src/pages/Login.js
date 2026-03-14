import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import ConfirmModal from '../components/ConfirmModal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error } = useAuth();
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });

  const showInfo = (title, message) => setModal({ visible: true, title, message });
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
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          <Image
            source={require('../../assets/Pax_Portal_Saydam.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.tagline}>Mesai Takip Sistemi</Text>
        </View>

        {/* Form kartı */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Giriş Yap</Text>

          {/* Email */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>E-Posta</Text>
            <View style={s.inputRow}>
              <MaterialIcons name="email" size={18} color="#555555" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="ornek@paxmedya.com"
                placeholderTextColor="#444444"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          {/* Şifre */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Şifre</Text>
            <View style={s.inputRow}>
              <MaterialIcons name="lock" size={18} color="#555555" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor="#444444"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={s.eyeBtn}>
                <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color="#555555" />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={s.errorRow}>
              <MaterialIcons name="error-outline" size={14} color="#ff4444" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          {/* Buton */}
          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#000000" />
              : <><MaterialIcons name="login" size={20} color="#000000" /><Text style={s.btnTxt}>Giriş Yap</Text></>}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={s.footer}>© Pax Medya</Text>
      </ScrollView>

      <ConfirmModal
        visible={modal.visible}
        icon="error"
        iconColor="#ef4444"
        title={modal.title}
        message={modal.message}
        confirmText="Tamam"
        hideCancel
        onConfirm={hideModal}
        onCancel={hideModal}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 48,
  },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 240, height: 58 },
  tagline: { marginTop: 10, fontSize: 11, color: '#444444', letterSpacing: 1.2, textTransform: 'uppercase' },
  card: {
    backgroundColor: '#111111', borderRadius: 16,
    borderWidth: 1, borderColor: '#222222',
    padding: 20, gap: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  fieldWrap: { gap: 6, marginTop: 12 },
  label: { fontSize: 11, fontWeight: '600', color: '#555555', letterSpacing: 0.8, textTransform: 'uppercase' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d0d0d', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10,
  },
  inputIcon: { paddingLeft: 14 },
  input: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 13,
    fontSize: 15, color: '#ffffff',
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 13 },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, backgroundColor: '#ff444415', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#ff444433',
  },
  errorTxt: { fontSize: 12, color: '#ff4444', flex: 1 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffd800', borderRadius: 10,
    paddingVertical: 15, marginTop: 20, gap: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnTxt: { color: '#000000', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  footer: { textAlign: 'center', marginTop: 28, fontSize: 11, color: '#333333', letterSpacing: 0.5 },
});
