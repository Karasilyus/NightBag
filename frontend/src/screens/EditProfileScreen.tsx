import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { profileService } from '../services/profile.service';
import type { CustomerProfileDetails } from '../services/profile.service';

const EditProfileScreen = ({ navigation, route }: any) => {
  const { userId, fullName: initialName, email } = route.params;
  const [fullName, setFullName] = useState(initialName || '');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isCancelled = false;
    profileService.getCustomerDetails(userId, initialName || '')
      .then((details) => {
        if (!isCancelled) {
          setFullName(details.fullName);
          setPhone(details.phone);
        }
      })
      .catch((error) => {
        console.error('Profil alanları yüklenemedi:', error);
        if (!isCancelled) setErrorMessage('Profil bilgileri yüklenemedi.');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [initialName, userId]);

  const save = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      setErrorMessage('Ad soyad alanı boş bırakılamaz.');
      return;
    }
    if (trimmedPhone && !/^\+?[0-9\s()-]{7,20}$/.test(trimmedPhone)) {
      setErrorMessage('Geçerli bir telefon numarası girin.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      const details: CustomerProfileDetails = { fullName: trimmedName, phone: trimmedPhone };
      await profileService.saveCustomerDetails(userId, details);
      navigation.goBack();
    } catch (error) {
      console.error('Profil bilgileri kaydedilemedi:', error);
      setErrorMessage('Profil bilgileri bu cihazda kaydedilemedi. Tekrar deneyin.');
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
        <Text style={styles.headerTitle}>Profil bilgileri</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.COLORS.primary} />
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.description}>
              Ad ve telefon bilgilerin yalnızca bu cihazda saklanır; hesap sunucusuyla eşitlenmez.
            </Text>

            <Text style={styles.label}>Ad soyad</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ad soyad"
              autoCapitalize="words"
              accessibilityLabel="Ad soyad"
            />

            <Text style={styles.label}>E-posta</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text style={styles.readOnlyText}>{email || 'E-posta bilgisi yok'}</Text>
              <Ionicons name="lock-closed-outline" size={16} color={theme.COLORS.textSecondary} />
            </View>

            <Text style={styles.label}>Telefon (isteğe bağlı)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="05xx xxx xx xx"
              keyboardType="phone-pad"
              accessibilityLabel="Telefon numarası"
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={save}
              disabled={isSaving}
              accessibilityRole="button"
            >
              {isSaving
                ? <ActivityIndicator color={theme.COLORS.card} />
                : <Text style={styles.saveButtonText}>Bu cihazda kaydet</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.SIZES.m, borderBottomWidth: 1, borderBottomColor: theme.COLORS.border, backgroundColor: theme.COLORS.card },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { ...theme.FONTS.h3, color: theme.COLORS.text },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: theme.SIZES.l, paddingBottom: theme.SIZES.xxl },
  description: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary, lineHeight: 21, marginBottom: theme.SIZES.xl },
  label: { ...theme.FONTS.caption, fontWeight: '600', color: theme.COLORS.text, marginBottom: theme.SIZES.xs },
  input: { minHeight: 52, justifyContent: 'center', borderWidth: 1, borderColor: theme.COLORS.border, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, color: theme.COLORS.text, marginBottom: theme.SIZES.m, ...theme.FONTS.body2 },
  readOnlyInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.COLORS.background },
  readOnlyText: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary },
  errorText: { ...theme.FONTS.caption, color: theme.COLORS.error, textAlign: 'center', marginBottom: theme.SIZES.m },
  saveButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.COLORS.primary, borderRadius: theme.SIZES.buttonRadius, marginTop: theme.SIZES.s },
  disabledButton: { opacity: 0.65 },
  saveButtonText: { ...theme.FONTS.body1, fontWeight: '600', color: theme.COLORS.card },
  loader: { flex: 1 },
});

export default EditProfileScreen;
