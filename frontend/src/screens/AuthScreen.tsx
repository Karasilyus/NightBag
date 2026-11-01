import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import theme from '../constants/theme';
import { authService } from '../services/auth.service';

const BUSINESS_CATEGORIES = [
  { value: 'firin', label: 'Fırın', icon: 'restaurant-outline' as const },
  { value: 'kafe', label: 'Kafe', icon: 'cafe-outline' as const },
  { value: 'tatli', label: 'Tatlı', icon: 'ice-cream-outline' as const },
  { value: 'yemek', label: 'Yemek', icon: 'fast-food-outline' as const },
];

const AuthScreen = ({ navigation }: any) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'customer' | 'business_owner'>('customer');
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('firin');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessDistrict, setBusinessDistrict] = useState('');
  const [businessLatitude, setBusinessLatitude] = useState<number | null>(null);
  const [businessLongitude, setBusinessLongitude] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum izni gerekli', 'İşletme konumunu eklemek için konum izni vermeniz veya koordinatları elle girmeniz gerekir.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setBusinessLatitude(location.coords.latitude);
      setBusinessLongitude(location.coords.longitude);
    } catch (error) {
      console.error('İşletme konumu alınamadı:', error);
      Alert.alert('Konum alınamadı', 'Konum bilgisi alınamadı. Koordinatları elle girebilirsiniz.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password || (!isLogin && !fullName.trim())) {
      Alert.alert('Eksik bilgi', 'Lütfen gerekli alanları doldurun.');
      return;
    }

    if (!isLogin && accountType === 'business_owner') {
      if (!businessName.trim() || !businessAddress.trim() || !businessDistrict.trim()) {
        Alert.alert('Eksik işletme bilgisi', 'İşletme adı, adresi ve ilçesi zorunludur.');
        return;
      }
      if (
        businessLatitude === null
        || businessLongitude === null
        || !Number.isFinite(businessLatitude)
        || !Number.isFinite(businessLongitude)
        || businessLatitude < -90
        || businessLatitude > 90
        || businessLongitude < -180
        || businessLongitude > 180
      ) {
        Alert.alert('İşletme konumu gerekli', 'Konumunuzu kullanın veya enlem ve boylamı elle girin.');
        return;
      }
    }

    setIsLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await authService.login({ email: email.trim(), password });
      } else {
        result = await authService.register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role: accountType,
          business: accountType === 'business_owner'
            ? {
                name: businessName.trim(),
                category: businessCategory,
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
      Alert.alert('Hata', error.response?.data?.error || error.message || 'Bir sorun oluştu.');
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
                        onPress={handleUseCurrentLocation}
                        disabled={isGettingLocation}
                        accessibilityRole="button"
                      >
                        {isGettingLocation
                          ? <ActivityIndicator size="small" color={theme.COLORS.primary} />
                          : <Ionicons name="locate-outline" size={17} color={theme.COLORS.primary} />}
                        <Text style={styles.locationButtonText}>Konumumu kullan</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.coordinateRow}>
                      <View style={[styles.coordinateInputGroup, styles.coordinateInputSpacing]}>
                        <Text style={styles.coordinateLabel}>Enlem</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="40.9845"
                          placeholderTextColor={theme.COLORS.textSecondary}
                          value={businessLatitude === null ? '' : String(businessLatitude)}
                          onChangeText={(value) => setBusinessLatitude(value.trim() ? Number(value.replace(',', '.')) : null)}
                          keyboardType="decimal-pad"
                          accessibilityLabel="İşletme enlemi"
                        />
                      </View>
                      <View style={styles.coordinateInputGroup}>
                        <Text style={styles.coordinateLabel}>Boylam</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="29.0260"
                          placeholderTextColor={theme.COLORS.textSecondary}
                          value={businessLongitude === null ? '' : String(businessLongitude)}
                          onChangeText={(value) => setBusinessLongitude(value.trim() ? Number(value.replace(',', '.')) : null)}
                          keyboardType="decimal-pad"
                          accessibilityLabel="İşletme boylamı"
                        />
                      </View>
                    </View>
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
              <TouchableOpacity
                style={styles.forgotPasswordBtn}
                onPress={() => Alert.alert('Şifremi unuttum', 'Şifre sıfırlama için backend kimlik doğrulama uç noktası gereklidir.')}
              >
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
  coordinateRow: {
    flexDirection: 'row',
  },
  coordinateInputGroup: {
    flex: 1,
  },
  coordinateInputSpacing: {
    marginRight: theme.SIZES.s,
  },
  coordinateLabel: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginBottom: theme.SIZES.xs,
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
