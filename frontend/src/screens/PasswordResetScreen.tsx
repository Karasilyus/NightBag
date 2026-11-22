import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { authService } from '../services/auth.service';
import { checkPasswordBreach, getPasswordStrengthScore } from '../services/password-security.service';

const PasswordResetScreen = ({ navigation }: any) => {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const strength = getPasswordStrengthScore(newPassword);

  useEffect(() => {
    AsyncStorage.getItem('authToken')
      .then((token) => setHasSession(Boolean(token)))
      .catch((error) => {
        console.error('Oturum durumu okunamadı:', error);
        setHasSession(false);
      });
  }, []);

  const changePassword = async () => {
    setErrorMessage('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Tüm şifre alanlarını doldurun.');
      return;
    }
    if (newPassword.length < 8 || strength < 3) {
      setErrorMessage('Yeni şifreniz en az 8 karakter ve güçlü olmalı.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Yeni şifreler eşleşmiyor.');
      return;
    }

    setIsSaving(true);
    try {
      if (await checkPasswordBreach(newPassword) > 0) {
        setErrorMessage('Bu şifre bilinen veri sızıntılarında görülmüş. Başka bir şifre seçin.');
        return;
      }
      await authService.changePassword(currentPassword, newPassword);
      if (Platform.OS === 'web') {
        window.alert('Şifren güncellendi.');
      } else {
        Alert.alert('Başarılı', 'Şifren güncellendi.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
        return;
      }
      navigation.goBack();
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Şifre güncellenemedi.';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Geri dön"
        >
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Şifre değiştir</Text>
        <View style={styles.backButton} />
      </View>
      {hasSession === null ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.COLORS.primary} />
      ) : hasSession ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.description}>Hesap güvenliğin için önce mevcut şifreni doğrula.</Text>
            <Text style={styles.label}>Mevcut şifre</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Mevcut şifre"
            />
            <Text style={styles.label}>Yeni şifre</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Yeni şifre"
            />
            <Text style={styles.label}>Yeni şifreyi tekrar gir</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Yeni şifreyi tekrar gir"
            />
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <TouchableOpacity
              style={[styles.button, isSaving && styles.disabledButton]}
              onPress={changePassword}
              disabled={isSaving}
              accessibilityRole="button"
            >
              {isSaving
                ? <ActivityIndicator color={theme.COLORS.card} />
                : <Text style={styles.buttonText}>Şifreyi güncelle</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.content}>
          <Ionicons name="key-outline" size={44} color={theme.COLORS.primary} />
          <Text style={styles.title}>Şifre değiştirmek için giriş yap</Text>
          <Text style={styles.description}>
            E-posta ile şifre kurtarma şu anda desteklenmiyor. Hesabına erişebiliyorsan giriş yaptıktan sonra mevcut şifrenle değiştirebilirsin.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Auth')} accessibilityRole="button">
            <Text style={styles.buttonText}>Giriş ekranına dön</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.card },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.SIZES.m },
  headerTitle: { ...theme.FONTS.h3, color: theme.COLORS.text },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  loader: { flex: 1 },
  content: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'center', padding: theme.SIZES.xl },
  title: { ...theme.FONTS.h2, color: theme.COLORS.text, textAlign: 'center', marginTop: theme.SIZES.l, marginBottom: theme.SIZES.s },
  description: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary, lineHeight: 21, marginBottom: theme.SIZES.l },
  label: { ...theme.FONTS.caption, fontWeight: '600', color: theme.COLORS.text, marginBottom: theme.SIZES.xs },
  input: { minHeight: 52, borderWidth: 1, borderColor: theme.COLORS.border, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, color: theme.COLORS.text, marginBottom: theme.SIZES.m, ...theme.FONTS.body2 },
  errorText: { ...theme.FONTS.caption, color: theme.COLORS.error, textAlign: 'center', marginBottom: theme.SIZES.m },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.SIZES.xl, borderRadius: theme.SIZES.buttonRadius, backgroundColor: theme.COLORS.primary },
  disabledButton: { opacity: 0.65 },
  buttonText: { ...theme.FONTS.body2, color: theme.COLORS.card, fontWeight: '600' },
});

export default PasswordResetScreen;
