import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

const PasswordResetScreen = ({ navigation }: any) => (
  <SafeAreaView style={styles.container}>
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      accessibilityLabel="Geri dön"
    >
      <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
    </TouchableOpacity>
    <View style={styles.content}>
      <Ionicons name="key-outline" size={44} color={theme.COLORS.primary} />
      <Text style={styles.title}>Şifre sıfırlama kullanılamıyor</Text>
      <Text style={styles.description}>
        Şifre sıfırlama ve doğrulama akışı şu anda desteklenmiyor. Şifren değiştirilmedi.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Geri dön</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.card },
  backButton: { width: 48, height: 48, justifyContent: 'center', paddingHorizontal: theme.SIZES.m },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.SIZES.xl },
  title: { ...theme.FONTS.h2, color: theme.COLORS.text, textAlign: 'center', marginTop: theme.SIZES.l, marginBottom: theme.SIZES.s },
  description: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: theme.SIZES.l },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.SIZES.xl, borderRadius: theme.SIZES.buttonRadius, backgroundColor: theme.COLORS.primary },
  buttonText: { ...theme.FONTS.body2, color: theme.COLORS.card, fontWeight: '600' },
});

export default PasswordResetScreen;
