import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';

export default function Profile() {
  const { user, logout, loading: authLoading } = useAuth();
  const { userProfile, loading: dbLoading, error, getProfile, updateProfile } = useDatabase();

  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
  });

  // Profil bilgisini yükle
  useEffect(() => {
    if (user?.uid) {
      getProfile(user.uid);
    }
  }, [user]);

  // Form data'yı userProfile'dan doldur
  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        phone: userProfile.phone || '',
      });
    }
  }, [userProfile]);

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (user?.uid) {
        await getProfile(user.uid);
      }
    } catch (err) {
      console.error('Yenileme hatası:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Çıkış Yap', 'Emin misiniz?', [
      { text: 'İptal', onPress: () => {} },
      {
        text: 'Çıkış Yap',
        onPress: async () => {
          await logout();
        },
        style: 'destructive',
      },
    ]);
  };

  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    if (!formData.displayName.trim()) {
      Alert.alert('Hata', 'Ad Soyad boş olamaz');
      return;
    }

    try {
      console.log('Salvando perfil:', { userId: user.uid, data: formData });
      
      const result = await updateProfile(user.uid, formData);
      console.log('Resultado da atualização:', result);
      
      // Aguardar um pouco para o Firebase sincronizar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recarregar o perfil
      await getProfile(user.uid);
      
      Alert.alert('Başarılı', 'Profil bilgileri güncellendi');
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      Alert.alert('Hata', 'Profil güncellenirken um hata oluştu: ' + (err?.message || 'Desconhecido'));
    }
  };

  if (dbLoading && !userProfile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffd800" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#ffd800"
          title="Yenileniyor..."
          titleColor="#ffd800"
          progressViewOffset={10}
        />
      }
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="account-circle" size={80} color="#ffd800" />
        </View>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>

        {/* Display Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ad Soyad *</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor="#64748b"
              value={formData.displayName}
              onChangeText={(text) =>
                setFormData({ ...formData, displayName: text })
              }
            />
          ) : (
            <Text style={styles.value}>{formData.displayName || '-'}</Text>
          )}
        </View>

        {/* Phone */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Telefon</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              placeholder="Telefon Numarası"
              placeholderTextColor="#64748b"
              value={formData.phone}
              onChangeText={(text) =>
                setFormData({ ...formData, phone: text })
              }
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.value}>{formData.phone || '-'}</Text>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={dbLoading}
            >
              {dbLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Kaydet</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setIsEditing(false)}
            >
              <MaterialIcons name="close" size={20} color="#ffd800" />
              <Text style={[styles.buttonText, { color: '#ffd800' }]}>
                İptal
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() => setIsEditing(true)}
          >
            <MaterialIcons name="edit" size={20} color="#fff" />
            <Text style={styles.buttonText}>Düzenle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={[styles.logoutButton, authLoading && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={authLoading}
        >
          {authLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="logout" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  email: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#0f172a',
    color: '#f8fafc',
  },
  value: {
    fontSize: 14,
    color: '#f8fafc',
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#ffd800',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#ffd800',
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutContainer: {
    marginBottom: 30,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
