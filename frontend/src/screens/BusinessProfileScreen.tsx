import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import theme from '../constants/theme';
import { profileService } from '../services/profile.service';
import type { BusinessProfileDetails } from '../services/profile.service';
import { businessService } from '../services/business.service';
import { preferencesService } from '../services/preferences.service';

const CATEGORIES = ['Fırın', 'Kafe', 'Tatlı', 'Yemek'];

const BusinessProfileScreen = ({ navigation, route }: any) => {
  const routeBusinessId = route?.params?.businessId;
  const routeBusinessName = route?.params?.businessName;
  const [businessId, setBusinessId] = useState(routeBusinessId || '');
  const [details, setDetails] = useState<BusinessProfileDetails>({
    name: routeBusinessName || '',
    category: 'Fırın',
    address: '',
    district: '',
    phone: '',
    latitude: null,
    longitude: null,
    imageUri: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const isScreenActive = useRef(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const id = routeBusinessId || await businessService.getCurrentBusinessId();
      const profile = await profileService.getBusinessDetails(
        id,
        routeBusinessName || 'İşletme'
      );
      const pickedLocation = await preferencesService.takeBusinessRegistrationLocation();
      const nextProfile = pickedLocation
        ? { ...profile, latitude: pickedLocation.latitude, longitude: pickedLocation.longitude }
        : profile;

      if (!isScreenActive.current) return;
      setBusinessId(id);
      setDetails(nextProfile);
      if (pickedLocation) {
        await profileService.saveBusinessDetails(id, nextProfile);
      }
    } catch (error) {
      console.error('İşletme profili yüklenemedi:', error);
      if (isScreenActive.current) setLoadError('İşletme profili yüklenemedi. Tekrar deneyin.');
    } finally {
      if (isScreenActive.current) setIsLoading(false);
    }
  }, [routeBusinessId, routeBusinessName]);

  useFocusEffect(useCallback(() => {
    isScreenActive.current = true;
    loadProfile();
    return () => {
      isScreenActive.current = false;
    };
  }, [loadProfile]));

  const pickImage = async () => {
    setIsPickingImage(true);
    setSaveError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setDetails((current) => ({ ...current, imageUri: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('İşletme görseli seçilemedi:', error);
      setSaveError('Görsel seçilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsPickingImage(false);
    }
  };

  const updateField = (field: keyof BusinessProfileDetails, value: string) => {
    setDetails((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!businessId) {
      setSaveError('İşletme kimliği bulunamadığı için profil kaydedilemedi.');
      return;
    }
    if (!details.name.trim() || !details.address.trim() || !details.district.trim()) {
      setSaveError('İşletme adı, açık adres ve ilçe zorunludur.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      const nextDetails = { ...details, name: details.name.trim(), address: details.address.trim(), district: details.district.trim(), phone: details.phone.trim() };
      await profileService.saveBusinessDetails(businessId, nextDetails);
      setDetails(nextDetails);
      navigation.goBack();
    } catch (error) {
      console.error('İşletme profili kaydedilemedi:', error);
      setSaveError('İşletme profili bu cihazda kaydedilemedi. Tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Geri dön"
        >
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İşletme profili</Text>
        <View style={styles.headerButton} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.COLORS.primary} />
      ) : loadError ? (
        <View style={styles.loadError}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => loadProfile()}
            accessibilityRole="button"
          >
            <Text style={styles.saveButtonText}>Tekrar dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.intro}>
              İşletme bilgilerin ve seçtiğin görsel bu cihazda saklanır; henüz sunucuya yüklenmez.
            </Text>

            <View style={styles.photoSection}>
              {details.imageUri ? (
                <Image source={{ uri: details.imageUri }} style={styles.businessImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="storefront-outline" size={34} color={theme.COLORS.primary} />
                </View>
              )}
              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickImage}
                disabled={isPickingImage}
                accessibilityRole="button"
                accessibilityLabel="İşletme fotoğrafı seç"
              >
                {isPickingImage
                  ? <ActivityIndicator color={theme.COLORS.primary} />
                  : <><Ionicons name="image-outline" size={18} color={theme.COLORS.primary} /><Text style={styles.photoButtonText}>Fotoğraf seç</Text></>}
              </TouchableOpacity>
              <Text style={styles.photoHint}>Kare bir işletme fotoğrafı seçebilirsin.</Text>
            </View>

            <Text style={styles.label}>İşletme adı</Text>
            <TextInput
              style={styles.input}
              value={details.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="İşletme adı"
              accessibilityLabel="İşletme adı"
            />

            <Text style={styles.label}>İşletme türü</Text>
            <View style={styles.categories}>
              {CATEGORIES.map((category) => {
                const isSelected = details.category === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.category, isSelected && styles.categorySelected]}
                    onPress={() => updateField('category', category)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Açık adres</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={details.address}
              onChangeText={(value) => updateField('address', value)}
              placeholder="Cadde, sokak ve kapı numarası"
              multiline
              textAlignVertical="top"
              accessibilityLabel="Açık adres"
            />

            <Text style={styles.label}>İlçe</Text>
            <TextInput
              style={styles.input}
              value={details.district}
              onChangeText={(value) => updateField('district', value)}
              placeholder="Örn. Kadıköy"
              accessibilityLabel="İlçe"
            />

            <Text style={styles.label}>Telefon (isteğe bağlı)</Text>
            <TextInput
              style={styles.input}
              value={details.phone}
              onChangeText={(value) => updateField('phone', value)}
              placeholder="05xx xxx xx xx"
              keyboardType="phone-pad"
              accessibilityLabel="İşletme telefonu"
            />

            <View style={styles.locationRow}>
              <View style={styles.locationInfo}>
                <Text style={styles.label}>Harita konumu</Text>
                <Text style={styles.locationValue}>
                  {details.latitude != null && details.longitude != null
                    ? `${details.latitude.toFixed(4)}, ${details.longitude.toFixed(4)}`
                    : 'Konum seçilmedi'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => navigation.navigate('LocationPicker', {
                  returnToBusiness: true,
                  ...(details.latitude != null && details.longitude != null
                    ? { initialCoordinate: { latitude: details.latitude, longitude: details.longitude } }
                    : {}),
                })}
                accessibilityRole="button"
              >
                <Ionicons name="map-outline" size={17} color={theme.COLORS.primary} />
                <Text style={styles.locationButtonText}>Konum seç</Text>
              </TouchableOpacity>
            </View>

            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
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
  headerButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { ...theme.FONTS.h3, color: theme.COLORS.text },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: theme.SIZES.l, paddingBottom: theme.SIZES.xxl },
  intro: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary, lineHeight: 21, marginBottom: theme.SIZES.l },
  photoSection: { alignItems: 'center', marginBottom: theme.SIZES.xl },
  businessImage: { width: 112, height: 112, borderRadius: 56, backgroundColor: theme.COLORS.tagBackground },
  photoPlaceholder: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', borderRadius: 56, backgroundColor: theme.COLORS.tagBackground },
  photoButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.SIZES.s, marginTop: theme.SIZES.s, paddingHorizontal: theme.SIZES.m },
  photoButtonText: { ...theme.FONTS.body2, color: theme.COLORS.primary, fontWeight: '600' },
  photoHint: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginTop: theme.SIZES.xs },
  label: { ...theme.FONTS.caption, fontWeight: '600', color: theme.COLORS.text, marginBottom: theme.SIZES.xs },
  input: { minHeight: 52, borderWidth: 1, borderColor: theme.COLORS.border, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, color: theme.COLORS.text, marginBottom: theme.SIZES.m, ...theme.FONTS.body2 },
  multilineInput: { minHeight: 78, paddingTop: theme.SIZES.m, textAlignVertical: 'top' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.SIZES.s, marginBottom: theme.SIZES.m },
  category: { minHeight: 42, justifyContent: 'center', paddingHorizontal: theme.SIZES.m, borderWidth: 1, borderColor: theme.COLORS.border, borderRadius: theme.SIZES.radius, backgroundColor: theme.COLORS.card },
  categorySelected: { borderColor: theme.COLORS.primary, backgroundColor: theme.COLORS.tagBackground },
  categoryText: { ...theme.FONTS.body2, color: theme.COLORS.text },
  categoryTextSelected: { color: theme.COLORS.primary, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.SIZES.m, paddingVertical: theme.SIZES.m, marginBottom: theme.SIZES.m, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.COLORS.border },
  locationInfo: { flex: 1 },
  locationValue: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  locationButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.xs, paddingHorizontal: theme.SIZES.s, borderRadius: theme.SIZES.radius, borderWidth: 1, borderColor: theme.COLORS.border },
  locationButtonText: { ...theme.FONTS.caption, fontWeight: '600', color: theme.COLORS.primary },
  errorText: { ...theme.FONTS.caption, color: theme.COLORS.error, textAlign: 'center', marginBottom: theme.SIZES.m },
  saveButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.COLORS.primary, borderRadius: theme.SIZES.buttonRadius, marginTop: theme.SIZES.s },
  disabledButton: { opacity: 0.65 },
  saveButtonText: { ...theme.FONTS.body1, fontWeight: '600', color: theme.COLORS.card },
  loader: { flex: 1 },
  loadError: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.SIZES.xl },
});

export default BusinessProfileScreen;
