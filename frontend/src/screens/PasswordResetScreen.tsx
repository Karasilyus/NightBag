import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { checkPasswordBreach, getPasswordStrengthScore } from '../services/password-security.service';

const showMessage = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const PasswordResetScreen = ({ navigation, route }: any) => {
  const [email, setEmail] = useState(route?.params?.initialEmail || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const submit = async () => {
    setErrorMessage('');
    if (!email.trim() || !password || !confirmation) {
      setErrorMessage('Lütfen tüm alanları doldurun.');
      return;
    }
    if (password.length < 8 || getPasswordStrengthScore(password) < 3) {
      setErrorMessage('En az 8 karakter ve güçlü bir şifre seçin.');
      return;
    }
    if (password !== confirmation) {
      setErrorMessage('Şifreler eşleşmiyor.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (await checkPasswordBreach(password) > 0) {
        setErrorMessage('Bu şifre daha önce veri sızıntılarında görülmüş. Başka bir şifre deneyin.');
        return;
      }
      showMessage(
        'Şifre sıfırlama henüz kullanılamıyor',
        'Şifre sıfırlama e-postası ve doğrulama uç noktası backend’de hazır olmadığı için yeni şifren kaydedilmedi.'
      );
    } catch (error) {
      console.error('Sızdırılmış şifre kontrolü yapılamadı:', error);
      setErrorMessage('Şifre güvenlik kontrolü yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordScore = password ? getPasswordStrengthScore(password) : 0;
  const scoreLabels = ['Çok zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok güçlü'];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Yeni şifre oluştur</Text>
          <Text style={styles.description}>
            Şifre sıfırlama e-postası ve doğrulama adımı backend desteği bekliyor. Bu ekran şimdilik taslak formdur; şifreni kaydetmez.
          </Text>

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="E-posta adresi"
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="E-posta"
          />

          <Text style={styles.label}>Yeni şifre</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="En az 8 karakter"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              accessibilityLabel="Yeni şifre"
            />
            <TouchableOpacity onPress={() => setShowPassword((visible) => !visible)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          {password ? <Text style={styles.strength}>Şifre gücü: {scoreLabels[passwordScore]}</Text> : null}

          <Text style={styles.label}>Yeni şifreyi tekrar gir</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={styles.passwordInput}
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Yeni şifreyi tekrar gir"
              secureTextEntry={!showConfirmation}
              autoCapitalize="none"
              accessibilityLabel="Yeni şifre tekrarı"
            />
            <TouchableOpacity onPress={() => setShowConfirmation((visible) => !visible)} accessibilityRole="button" accessibilityLabel={showConfirmation ? 'Şifreyi gizle' : 'Şifreyi göster'}>
              <Ionicons name={showConfirmation ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={isSubmitting} accessibilityRole="button">
            {isSubmitting
              ? <ActivityIndicator color={theme.COLORS.card} />
              : <Text style={styles.submitText}>Yeni şifreyi kaydet</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.card },
  flex: { flex: 1 },
  content: { padding: theme.SIZES.l, width: '100%', maxWidth: 540, alignSelf: 'center' },
  backButton: { width: 42, height: 42, justifyContent: 'center', marginBottom: theme.SIZES.l },
  title: { ...theme.FONTS.h1, color: theme.COLORS.text, marginBottom: theme.SIZES.s },
  description: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary, lineHeight: 21, marginBottom: theme.SIZES.xl },
  label: { ...theme.FONTS.caption, fontWeight: '600', color: theme.COLORS.text, marginBottom: theme.SIZES.xs },
  input: { height: 52, borderWidth: 1, borderColor: theme.COLORS.border, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, color: theme.COLORS.text, marginBottom: theme.SIZES.m },
  passwordField: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.COLORS.border, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, marginBottom: theme.SIZES.m },
  passwordInput: { flex: 1, height: 50, color: theme.COLORS.text },
  strength: { ...theme.FONTS.caption, color: theme.COLORS.primary, marginTop: -theme.SIZES.s, marginBottom: theme.SIZES.m },
  error: { ...theme.FONTS.caption, color: theme.COLORS.error, textAlign: 'center', marginBottom: theme.SIZES.m },
  submitButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.COLORS.primary, borderRadius: theme.SIZES.buttonRadius, marginTop: theme.SIZES.s },
  submitText: { ...theme.FONTS.body1, fontWeight: '600', color: theme.COLORS.card },
});

export default PasswordResetScreen;
