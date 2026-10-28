import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../constants/theme';
import { authService } from '../services/auth.service';

const AuthScreen = ({ navigation }: any) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (isLogin) {
        await authService.login({ email, password });
      } else {
        await authService.register({ email, password, fullName });
      }
      
      // Başarılı olursa (token alındı varsayıyoruz)
      navigation.replace('MainFlow');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    // Google ile girişte şifre kontrolüne gerek yok, 1 saniye bekleyip başarılı sayıyoruz.
    setTimeout(async () => {
      const googleUser = { fullName: 'Google Kullanıcısı', email: 'kullanici@gmail.com' };
      await AsyncStorage.setItem('currentUser', JSON.stringify(googleUser));
      setIsLoading(false);
      navigation.replace('MainFlow');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{isLogin ? 'Hoş geldin' : 'Aramıza katıl'}</Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? 'Hesabına giriş yap ve kurtarmaya devam et.' 
              : 'Hesap oluştur ve lezzetleri uygun fiyata yakalamaya başla.'}
          </Text>

          {/* Form Alanı */}
          <View style={styles.formContainer}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ad Soyad</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ad Soyad" 
                  placeholderTextColor={theme.COLORS.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta</Text>
              <TextInput 
                style={styles.input} 
                placeholder="E-posta adresi" 
                keyboardType="email-address" 
                autoCapitalize="none"
                placeholderTextColor={theme.COLORS.textSecondary} 
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Şifre" 
                secureTextEntry 
                placeholderTextColor={theme.COLORS.textSecondary} 
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {isLogin && (
              <TouchableOpacity style={styles.forgotPasswordBtn}>
                <Text style={styles.forgotPasswordText}>Şifremi unuttum</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.COLORS.card} />
              ) : (
                <Text style={styles.primaryBtnText}>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Ayırıcı */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.divider} />
          </View>

          {/* Google ile Giriş */}
          <TouchableOpacity 
            style={styles.googleBtn} 
            onPress={handleGoogleAuth}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={20} color={theme.COLORS.text} />
            <Text style={styles.googleBtnText}>
              {isLogin ? 'Google ile giriş yap' : 'Google ile kayıt ol'}
            </Text>
          </TouchableOpacity>

          {/* Mod Değiştirici */}
          <View style={styles.switchModeContainer}>
            <Text style={styles.switchModeText}>
              {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.switchModeBtnText}>
                {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.card,
  },
  header: {
    paddingHorizontal: theme.SIZES.l,
    paddingVertical: theme.SIZES.m,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.SIZES.l,
  },
  title: {
    ...theme.FONTS.h1,
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.xs,
  },
  subtitle: {
    ...theme.FONTS.body1,
    color: theme.COLORS.textSecondary,
    marginBottom: theme.SIZES.xl,
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: theme.SIZES.xl,
  },
  inputGroup: {
    marginBottom: theme.SIZES.m,
  },
  label: {
    ...theme.FONTS.caption,
    fontWeight: '600',
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.xs,
  },
  input: {
    backgroundColor: theme.COLORS.background,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    borderRadius: theme.SIZES.radius,
    paddingHorizontal: theme.SIZES.m,
    height: 52,
    ...theme.FONTS.body1,
    color: theme.COLORS.text,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: theme.SIZES.l,
  },
  forgotPasswordText: {
    ...theme.FONTS.caption,
    fontWeight: '600',
    color: theme.COLORS.primary,
  },
  primaryBtn: {
    backgroundColor: theme.COLORS.primary,
    height: 52,
    borderRadius: theme.SIZES.buttonRadius,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.SIZES.s,
  },
  primaryBtnText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.card,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.SIZES.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.COLORS.border,
  },
  dividerText: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    paddingHorizontal: theme.SIZES.m,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: theme.SIZES.buttonRadius,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    backgroundColor: theme.COLORS.card,
    gap: theme.SIZES.s,
    marginBottom: theme.SIZES.xl,
  },
  googleBtnText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.text,
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.SIZES.xs,
  },
  switchModeText: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
  },
  switchModeBtnText: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.primary,
  },
});

export default AuthScreen;
