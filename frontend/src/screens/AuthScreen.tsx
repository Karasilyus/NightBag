import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { authService } from '../services/auth.service';
import { preferencesService } from '../services/preferences.service';
import { checkPasswordBreach, getPasswordStrengthScore } from '../services/password-security.service';

const BUSINESS_CATEGORIES = [
  { value: 'bakery', label: 'Fırın', apiCategory: 'firin', icon: 'restaurant-outline' as const },
  { value: 'pastry', label: 'Pastane', apiCategory: 'tatli', icon: 'ice-cream-outline' as const },
  { value: 'dessert', label: 'Tatlıcı', apiCategory: 'tatli', icon: 'ice-cream-outline' as const },
  { value: 'cafe', label: 'Kafe', apiCategory: 'kafe', icon: 'cafe-outline' as const },
  { value: 'tea-house', label: 'Çay evi', apiCategory: 'kafe', icon: 'cafe-outline' as const },
  { value: 'restaurant', label: 'Restoran', apiCategory: 'yemek', icon: 'restaurant-outline' as const },
  { value: 'fast-food', label: 'Hızlı yemek', apiCategory: 'yemek', icon: 'fast-food-outline' as const },
  { value: 'market', label: 'Market', apiCategory: 'yemek', icon: 'basket-outline' as const },
  { value: 'produce', label: 'Manav', apiCategory: 'yemek', icon: 'nutrition-outline' as const },
  { value: 'deli', label: 'Şarküteri', apiCategory: 'yemek', icon: 'fast-food-outline' as const },
  { value: 'butcher', label: 'Kasap', apiCategory: 'yemek', icon: 'fast-food-outline' as const },
  { value: 'other', label: 'Diğer', apiCategory: 'yemek', icon: 'ellipsis-horizontal-circle-outline' as const },
];
const AuthScreen = ({ navigation }: any) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [passwordBreachStatus, setPasswordBreachStatus] = useState<'idle' | 'safe' | 'breached'>('idle');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'customer' | 'business_owner'>('customer');
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('bakery');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessDistrict, setBusinessDistrict] = useState('');
  const [businessLatitude, setBusinessLatitude] = useState<number | null>(null);
  const [businessLongitude, setBusinessLongitude] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const passwordStrengthScore = password ? getPasswordStrengthScore(password) : 0;
  const passwordStrengthLabel = ['Çok zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok güçlü'][passwordStrengthScore];

  useEffect(() => {
    const loadBusinessLocation = () => {
      preferencesService.takeBusinessRegistrationLocation()
        .then((location) => {
          if (location) {
            setBusinessLatitude(location.latitude);
            setBusinessLongitude(location.longitude);
          }
        })
        .catch((error) => {
          console.error('İşletme konumu yüklenemedi:', error);
          setErrorMsg('İşletme konumu yüklenemedi. Haritadan tekrar seçin.');
        });
    };

    loadBusinessLocation();
    return navigation.addListener('focus', loadBusinessLocation);
  }, [navigation]);

  const handleAuth = async () => {
    setErrorMsg('');

    if (!email.trim() || !password || (!isLogin && !fullName.trim())) {
      setErrorMsg('Lütfen gerekli alanları doldurun.');
      return;
    }

    if (!isLogin) {
      if (password.length < 8) {
        setErrorMsg('Şifre en az 8 karakter olmalı.');
        return;
      }
      if (passwordStrengthScore < 3) {
        setErrorMsg('Daha güçlü bir şifre seçin. Şifre gücü en az “Güçlü” olmalı.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Şifreler eşleşmiyor.');
        return;
      }
    }

    if (!isLogin && accountType === 'business_owner') {
      if (!businessName.trim() || !businessAddress.trim() || !businessDistrict.trim()) {
        setErrorMsg('İşletme adı, adresi ve ilçesi zorunludur.');
        return;
      }
    }

    if (!isLogin && accountType === 'business_owner' && (
      businessLatitude === null
      || businessLongitude === null
      || !Number.isFinite(businessLatitude)
      || !Number.isFinite(businessLongitude)
      || businessLatitude < -90
      || businessLatitude > 90
      || businessLongitude < -180
      || businessLongitude > 180
    )) {
      setErrorMsg('İşletme konumunu haritadan seçin.');
      return;
    }

    let breachCheckCompleted = isLogin;
    setIsLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await authService.login({ email: email.trim(), password });
      } else {
        const breachCount = await checkPasswordBreach(password);
        if (breachCount > 0) {
          setPasswordBreachStatus('breached');
          setErrorMsg('Bu şifre daha önce veri sızıntılarında görülmüş. Lütfen başka bir şifre seçin.');
          return;
        }
        breachCheckCompleted = true;
        setPasswordBreachStatus('safe');
        result = await authService.register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role: accountType,
          business: accountType === 'business_owner'
            ? {
                name: businessName.trim(),
                category: BUSINESS_CATEGORIES.find((category) => category.value === businessCategory)?.apiCategory || 'yemek',
                address: businessAddress.trim(),
                district: businessDistrict.trim(),
                lat: businessLatitude!,
                lon: businessLongitude!,
              }
            : undefined,
        });
      }

      const role = result.data.user.role;
      navigation.replace(role === 'business_owner' ? 'BusinessFlow' : 'MainFlow');
    } catch (error: any) {
      if (isLogin) {
        setErrorMsg('Giriş başarısız. E-posta veya şifrenizi kontrol edin.');
      } else if (!breachCheckCompleted) {
        console.error('Şifre güvenlik kontrolü tamamlanamadı:', error);
        setErrorMsg('Sızdırılmış şifre kontrolü yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
      } else {
        setErrorMsg(error.response?.data?.error || error.message || 'Kayıt sırasında bir sorun oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
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
              : 'İhtiyacına uygun hesap türünü seçerek NightBag’e katıl.'}
          </Text>

          <View style={styles.formContainer}>
            {!isLogin && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Ad Soyad</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ad Soyad"
                    placeholderTextColor={theme.COLORS.textSecondary}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    accessibilityLabel="Ad Soyad"
                  />
                </View>

                <Text style={styles.label}>Hangi hesap türü sana uygun?</Text>
                <View style={styles.accountTypeRow}>
                  <TouchableOpacity
                    style={[styles.accountTypeCard, accountType === 'customer' && styles.accountTypeCardSelected]}
                    onPress={() => setAccountType('customer')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: accountType === 'customer' }}
                  >
                    <View style={[styles.accountTypeIcon, accountType === 'customer' && styles.accountTypeIconSelected]}>
                      <Ionicons name="person-outline" size={22} color={accountType === 'customer' ? theme.COLORS.card : theme.COLORS.primary} />
                    </View>
                    <Text style={[styles.accountTypeTitle, accountType === 'customer' && styles.accountTypeTextSelected]}>Müşteriyim</Text>
                    <Text style={[styles.accountTypeDescription, accountType === 'customer' && styles.accountTypeTextSelected]}>Yakınımdaki çantaları keşfet</Text>
                    {accountType === 'customer' && <Ionicons name="checkmark-circle" size={18} color={theme.COLORS.card} style={styles.accountTypeCheck} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.accountTypeCard, accountType === 'business_owner' && styles.accountTypeCardSelected]}
                    onPress={() => setAccountType('business_owner')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: accountType === 'business_owner' }}
                  >
                    <View style={[styles.accountTypeIcon, accountType === 'business_owner' && styles.accountTypeIconSelected]}>
                      <Ionicons name="storefront-outline" size={22} color={accountType === 'business_owner' ? theme.COLORS.card : theme.COLORS.primary} />
                    </View>
                    <Text style={[styles.accountTypeTitle, accountType === 'business_owner' && styles.accountTypeTextSelected]}>İşletmem var</Text>
                    <Text style={[styles.accountTypeDescription, accountType === 'business_owner' && styles.accountTypeTextSelected]}>Fazla ürünlerini yayınla</Text>
                    {accountType === 'business_owner' && <Ionicons name="checkmark-circle" size={18} color={theme.COLORS.card} style={styles.accountTypeCheck} />}
                  </TouchableOpacity>
                </View>

                {accountType === 'business_owner' && (
                  <View style={styles.businessForm}>
                    <View style={styles.businessFormHeading}>
                      <Ionicons name="storefront-outline" size={20} color={theme.COLORS.primary} />
                      <View>
                        <Text style={styles.businessFormTitle}>İşletme bilgileri</Text>
                        <Text style={styles.businessFormDescription}>İşletme profilini oluşturmak için gerekli</Text>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>İşletme adı</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Örn. Moda Fırını"
                        placeholderTextColor={theme.COLORS.textSecondary}
                        value={businessName}
                        onChangeText={setBusinessName}
                        autoCapitalize="words"
                        accessibilityLabel="İşletme adı"
                      />
                    </View>

                    <Text style={styles.label}>İşletme türü</Text>
                    <View style={styles.categoryGrid}>
                      {BUSINESS_CATEGORIES.map((category) => {
                        const selected = businessCategory === category.value;
                        return (
                          <TouchableOpacity
                            key={category.value}
                            style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                            onPress={() => setBusinessCategory(category.value)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Ionicons name={category.icon} size={19} color={selected ? theme.COLORS.card : theme.COLORS.primary} />
                            <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{category.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Açık adres</Text>
                      <TextInput
                        style={[styles.input, styles.multilineInput]}
                        placeholder="Cadde, sokak ve kapı numarası"
                        placeholderTextColor={theme.COLORS.textSecondary}
                        value={businessAddress}
                        onChangeText={setBusinessAddress}
                        multiline
                        accessibilityLabel="İşletme açık adresi"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>İlçe</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Örn. Kadıköy"
                        placeholderTextColor={theme.COLORS.textSecondary}
                        value={businessDistrict}
                        onChangeText={setBusinessDistrict}
                        autoCapitalize="words"
                        accessibilityLabel="İşletme ilçesi"
                      />
                    </View>

                    <View style={styles.locationHeader}>
                      <View>
                        <Text style={styles.label}>Harita konumu</Text>
                        <Text style={styles.locationHelp}>İşletmenin bulunduğu noktayı ekle</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.locationButton}
                        onPress={() => navigation.navigate('LocationPicker', { returnToBusiness: true })}
                        accessibilityRole="button"
                      >
                        <Ionicons name={businessLatitude === null ? 'map-outline' : 'checkmark-circle-outline'} size={17} color={theme.COLORS.primary} />
                        <Text style={styles.locationButtonText}>{businessLatitude === null ? 'Haritadan seç' : 'Konum seçildi'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.locationHelp}>
                      {businessLatitude === null ? 'Konum bilgisi kayıt için gereklidir.' : 'Konum kayıt sırasında güvenli biçimde gönderilir.'}
                    </Text>
                  </View>
                )}
              </>
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
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Şifre"
                  secureTextEntry={!isPasswordVisible}
                  placeholderTextColor={theme.COLORS.textSecondary}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setPasswordBreachStatus('idle');
                  }}
                  autoCapitalize="none"
                  accessibilityLabel="Şifre"
                />
                <TouchableOpacity onPress={() => setIsPasswordVisible((visible) => !visible)} accessibilityRole="button" accessibilityLabel={isPasswordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                  <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {!isLogin && password ? (
                <Text style={styles.passwordHint}>
                  Şifre gücü: {passwordStrengthLabel}
                  {passwordBreachStatus === 'safe' ? ' • Sızıntı kontrolü temiz' : ''}
                  {passwordBreachStatus === 'breached' ? ' • Sızdırılmış' : ''}
                </Text>
              ) : null}
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Şifre tekrarı</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Şifreni tekrar gir"
                      secureTextEntry={!isConfirmPasswordVisible}
                      placeholderTextColor={theme.COLORS.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                      accessibilityLabel="Şifre tekrarı"
                    />
                    <TouchableOpacity onPress={() => setIsConfirmPasswordVisible((visible) => !visible)} accessibilityRole="button" accessibilityLabel={isConfirmPasswordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                      <Ionicons name={isConfirmPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPasswordBtn}
                onPress={() => navigation.navigate('PasswordReset', { initialEmail: email.trim() })}
              >
                <Text style={styles.forgotPasswordText}>Şifremi unuttum</Text>
              </TouchableOpacity>
            )}
            {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}
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
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
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
  accountTypeRow: {
    flexDirection: 'row',
    gap: theme.SIZES.s,
    marginTop: theme.SIZES.xs,
    marginBottom: theme.SIZES.l,
  },
  accountTypeCard: {
    flex: 1,
    minHeight: 142,
    padding: theme.SIZES.m,
    borderRadius: theme.SIZES.cardRadius,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    backgroundColor: theme.COLORS.background,
  },
  accountTypeCardSelected: {
    borderColor: theme.COLORS.primary,
    backgroundColor: theme.COLORS.primary,
  },
  accountTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.COLORS.tagBackground,
    marginBottom: theme.SIZES.s,
  },
  accountTypeIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  accountTypeTitle: {
    ...theme.FONTS.body1,
    fontWeight: '700',
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.xs,
  },
  accountTypeDescription: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    lineHeight: 17,
    paddingRight: theme.SIZES.s,
  },
  accountTypeTextSelected: {
    color: theme.COLORS.card,
  },
  accountTypeCheck: {
    position: 'absolute',
    top: theme.SIZES.s,
    right: theme.SIZES.s,
  },
  businessForm: {
    padding: theme.SIZES.m,
    marginBottom: theme.SIZES.l,
    borderRadius: theme.SIZES.cardRadius,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    backgroundColor: theme.COLORS.card,
  },
  businessFormHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.s,
    paddingBottom: theme.SIZES.m,
    marginBottom: theme.SIZES.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.border,
  },
  businessFormTitle: {
    ...theme.FONTS.body1,
    fontWeight: '700',
    color: theme.COLORS.text,
  },
  businessFormDescription: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.SIZES.s,
    marginTop: theme.SIZES.xs,
    marginBottom: theme.SIZES.m,
  },
  categoryCard: {
    width: '48%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.s,
    paddingHorizontal: theme.SIZES.s,
    borderRadius: theme.SIZES.radius,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    backgroundColor: theme.COLORS.background,
  },
  categoryCardSelected: {
    borderColor: theme.COLORS.primary,
    backgroundColor: theme.COLORS.primary,
  },
  categoryText: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.text,
  },
  categoryTextSelected: {
    color: theme.COLORS.card,
  },
  multilineInput: {
    minHeight: 72,
    height: 72,
    paddingTop: theme.SIZES.m,
    textAlignVertical: 'top',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.SIZES.s,
    marginTop: theme.SIZES.xs,
    marginBottom: theme.SIZES.s,
  },
  locationHelp: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginTop: 2,
  },
  locationButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: theme.SIZES.s,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    borderRadius: theme.SIZES.radius,
  },
  locationButtonText: {
    ...theme.FONTS.caption,
    fontWeight: '600',
    color: theme.COLORS.primary,
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
  passwordInputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.COLORS.background,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    borderRadius: theme.SIZES.radius,
    paddingHorizontal: theme.SIZES.m,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    ...theme.FONTS.body1,
    color: theme.COLORS.text,
  },
  passwordHint: {
    ...theme.FONTS.caption,
    color: theme.COLORS.primary,
    marginTop: -theme.SIZES.s,
    marginBottom: theme.SIZES.m,
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
  errorText: {
    color: '#C62828',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default AuthScreen;
