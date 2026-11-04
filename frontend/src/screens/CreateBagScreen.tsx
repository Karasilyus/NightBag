import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { businessService } from '../services/business.service';

const CATEGORIES = ['Fırın', 'Kafe', 'Tatlı', 'Yemek'];
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Fırın': 'restaurant-outline',
  'Kafe': 'cafe-outline',
  'Tatlı': 'ice-cream-outline',
  'Yemek': 'fast-food-outline',
};
const QUANTITY_PRESETS = [1, 5, 10, 20];

const CreateBagScreen = ({ navigation }: any) => {
  const [activeCategory, setActiveCategory] = useState('Fırın');
  const [originalPrice, setOriginalPrice] = useState('350');
  const [price, setPrice] = useState('125');
  const [bagCount, setBagCount] = useState(12);
  const [pickupStart, setPickupStart] = useState('20:00');
  const [pickupEnd, setPickupEnd] = useState('21:00');
  const [pickupDayOffset, setPickupDayOffset] = useState(0);
  const [description, setDescription] = useState('Günün taze lezzetlerinden oluşan sürpriz seçki.');
  const [isPublishing, setIsPublishing] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [businessLoadError, setBusinessLoadError] = useState('');
  const parsedOriginalPrice = parseFloat(originalPrice.replace(',', '.')) || 0;
  const parsedPrice = parseFloat(price.replace(',', '.')) || 0;
  const discountPercent = parsedOriginalPrice > 0 && parsedPrice > 0
    ? Math.max(0, Math.round((1 - parsedPrice / parsedOriginalPrice) * 100))
    : 0;

  const getPickupDate = () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + pickupDayOffset);
    const year = pickupDate.getFullYear();
    const month = String(pickupDate.getMonth() + 1).padStart(2, '0');
    const day = String(pickupDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    let active = true;
    businessService.getMyBusiness()
      .then((business) => {
        if (active) setBusinessId(business.id);
      })
      .catch((error) => {
        console.error('İşletme bilgisi yüklenemedi:', error);
        if (active) setBusinessLoadError('İşletme bilgisi yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryToApi = (cat: string): string => {
    const map: Record<string, string> = {
      'Fırın': 'firin',
      'Kafe': 'kafe',
      'Tatlı': 'tatli',
      'Yemek': 'yemek',
    };
    return map[cat] || 'firin';
  };

  const handlePublish = async () => {
    if (!businessId) {
      Alert.alert('İşletme bulunamadı', businessLoadError || 'İlan yayımlamak için işletme bilgisi gerekli.');
      return;
    }

    const origVal = parseFloat(originalPrice.replace(',', '.'));
    const prVal = parseFloat(price.replace(',', '.'));

    if (isNaN(origVal) || origVal <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir orijinal değer girin.');
      return;
    }
    if (isNaN(prVal) || prVal <= 0 || prVal > origVal) {
      Alert.alert('Hata', 'İndirimli fiyat 0\'dan büyük ve orijinal değerden küçük olmalıdır.');
      return;
    }

    const startFormatted = pickupStart.replace('.', ':').trim();
    const endFormatted = pickupEnd.replace('.', ':').trim();
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(startFormatted) || !timePattern.test(endFormatted)) {
      Alert.alert('Hata', 'Teslim saatlerini SS:DD biçiminde girin (örn. 20:00).');
      return;
    }
    if (startFormatted >= endFormatted) {
      Alert.alert('Hata', 'Teslim bitiş saati başlangıç saatinden sonra olmalıdır.');
      return;
    }
    if (!Number.isInteger(bagCount) || bagCount < 1) {
      Alert.alert('Hata', 'En az bir çanta yayınlamalısınız.');
      return;
    }

    setIsPublishing(true);
    try {
      await businessService.createListing(businessId, {
        title: `${activeCategory} sürpriz çantası`,
        category: categoryToApi(activeCategory),
        description: description.trim(),
        originalValue: origVal,
        price: prVal,
        quantity: bagCount,
        pickupDate: getPickupDate(),
        pickupStart: startFormatted,
        pickupEnd: endFormatted,
      });

      Alert.alert('Yayında!', `${bagCount} sürpriz çanta müşterilerin keşfetmesi için hazır.`);
      navigation.goBack();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Çantalar yayınlanırken bir sorun oluştu.';
      Alert.alert('Yayınlama Hatası', errMsg);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Geri dön">
            <Ionicons name="arrow-back" size={22} color={theme.COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerEyebrow}>İŞLETME PANELİ</Text>
            <Text style={styles.headerTitle}>Yeni çanta oluştur</Text>
          </View>
          <View style={styles.headerStep}>
            <Ionicons name="sparkles-outline" size={17} color={theme.COLORS.primary} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="bag-handle" size={25} color={theme.COLORS.primary} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Günün lezzetleri, yeni sahiplerini bekliyor.</Text>
              <Text style={styles.heroDescription}>Bilgileri tamamla, sürpriz çantanı hemen yayına al.</Text>
            </View>
            <View style={styles.heroDecoration}>
              <Ionicons name="leaf" size={34} color="#A8C9AF" />
            </View>
          </View>
          {businessLoadError ? (
            <Text accessibilityRole="alert" style={styles.businessError}>{businessLoadError}</Text>
          ) : null}

          <View style={styles.sectionHeading}>
            <View style={styles.stepBadge}><Text style={styles.stepNumber}>01</Text></View>
            <View>
              <Text style={styles.sectionTitle}>Çanta türü</Text>
              <Text style={styles.sectionDescription}>Sana en uygun kategoriyi seç</Text>
            </View>
          </View>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => {
              const isSelected = activeCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryCard, isSelected && styles.categoryCardActive]}
                  onPress={() => setActiveCategory(category)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={[styles.categoryIcon, isSelected && styles.categoryIconActive]}>
                    <Ionicons name={CATEGORY_ICONS[category]} size={21} color={isSelected ? theme.COLORS.card : theme.COLORS.primary} />
                  </View>
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>{category}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={theme.COLORS.primary} style={styles.categoryCheck} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sectionHeading}>
            <View style={styles.stepBadge}><Text style={styles.stepNumber}>02</Text></View>
            <View>
              <Text style={styles.sectionTitle}>Fiyatını belirle</Text>
              <Text style={styles.sectionDescription}>İndirimini müşterilerine göster</Text>
            </View>
          </View>
          <View style={styles.formCard}>
            <View style={styles.priceRow}>
              <View style={styles.priceInputBox}>
                <Text style={styles.inputLabel}>PİYASA DEĞERİ</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={originalPrice}
                    onChangeText={setOriginalPrice}
                    keyboardType="decimal-pad"
                    placeholder="350"
                    placeholderTextColor={theme.COLORS.textSecondary}
                    accessibilityLabel="Piyasa değeri"
                  />
                  <Text style={styles.currency}>₺</Text>
                </View>
              </View>
              <View style={styles.priceInputBox}>
                <View style={styles.priceLabelRow}>
                  <Text style={styles.inputLabel}>ÇANTA FİYATI</Text>
                  {discountPercent > 0 && <Text style={styles.discountBadge}>%{discountPercent} indirim</Text>}
                </View>
                <View style={[styles.inputWrapper, styles.salePriceWrapper]}>
                  <TextInput
                    style={styles.input}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholder="125"
                    placeholderTextColor={theme.COLORS.textSecondary}
                    accessibilityLabel="İndirimli çanta fiyatı"
                  />
                  <Text style={styles.currency}>₺</Text>
                </View>
              </View>
            </View>
            <View style={styles.savingsRow}>
              <Ionicons name="trending-down-outline" size={17} color={theme.COLORS.primary} />
              <Text style={styles.savingsText}>
                {discountPercent > 0 ? `Müşterin yaklaşık %${discountPercent} tasarruf eder` : 'İndirim oranı fiyatı girdikçe hesaplanır'}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View style={styles.stepBadge}><Text style={styles.stepNumber}>03</Text></View>
            <View>
              <Text style={styles.sectionTitle}>Stok ve açıklama</Text>
              <Text style={styles.sectionDescription}>Kaç çanta hazır olduğunu belirt</Text>
            </View>
          </View>
          <View style={styles.formCard}>
            <View style={styles.quantityHeader}>
              <View>
                <Text style={styles.fieldTitle}>Yayınlanacak çanta</Text>
                <Text style={styles.fieldDescription}>Stok adedini seç</Text>
              </View>
              <View style={styles.counterControl}>
                <TouchableOpacity
                  style={[styles.counterButton, bagCount <= 1 && styles.counterButtonDisabled]}
                  onPress={() => setBagCount(Math.max(1, bagCount - 1))}
                  disabled={bagCount <= 1}
                  accessibilityRole="button"
                  accessibilityLabel="Çanta adedini azalt"
                >
                  <Ionicons name="remove" size={20} color={bagCount <= 1 ? theme.COLORS.textSecondary : theme.COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{bagCount}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setBagCount(bagCount + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Çanta adedini artır"
                >
                  <Ionicons name="add" size={20} color={theme.COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.quantityPresets}>
              {QUANTITY_PRESETS.map((quantity) => (
                <TouchableOpacity
                  key={quantity}
                  style={[styles.quantityPreset, bagCount === quantity && styles.quantityPresetActive]}
                  onPress={() => setBagCount(quantity)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.quantityPresetText, bagCount === quantity && styles.quantityPresetTextActive]}>
                    {quantity} adet
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.cardDivider} />
            <Text style={styles.inputLabel}>KISA AÇIKLAMA</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Çantanı özel yapan lezzetlerden bahset..."
              placeholderTextColor={theme.COLORS.textSecondary}
              multiline
              maxLength={140}
              textAlignVertical="top"
              accessibilityLabel="Çanta açıklaması"
            />
            <Text style={styles.characterCount}>{description.length}/140</Text>
          </View>

          <View style={styles.sectionHeading}>
            <View style={styles.stepBadge}><Text style={styles.stepNumber}>04</Text></View>
            <View>
              <Text style={styles.sectionTitle}>Teslim alma zamanı</Text>
              <Text style={styles.sectionDescription}>Müşterilerin çantalarını alabileceği saat</Text>
            </View>
          </View>
          <View style={styles.formCard}>
            <View style={styles.dateOptions}>
              {[0, 1].map((dayOffset) => {
                const date = new Date();
                date.setDate(date.getDate() + dayOffset);
                const dateLabel = dayOffset === 0
                  ? 'Bugün'
                  : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                return (
                  <TouchableOpacity
                    key={dayOffset}
                    style={[styles.dateOption, pickupDayOffset === dayOffset && styles.dateOptionActive]}
                    onPress={() => setPickupDayOffset(dayOffset)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pickupDayOffset === dayOffset }}
                  >
                    <Ionicons name="calendar-outline" size={17} color={pickupDayOffset === dayOffset ? theme.COLORS.primary : theme.COLORS.textSecondary} />
                    <Text style={[styles.dateOptionText, pickupDayOffset === dayOffset && styles.dateOptionTextActive]}>
                      {dateLabel}
                    </Text>
                    {pickupDayOffset === dayOffset && <Ionicons name="checkmark-circle" size={16} color={theme.COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.timeRow}>
              <View style={styles.timeBox}>
                <Text style={styles.inputLabel}>BAŞLANGIÇ</Text>
                <View style={styles.timeInputWrapper}>
                  <Ionicons name="time-outline" size={18} color={theme.COLORS.primary} />
                  <TextInput
                    style={styles.timeInput}
                    value={pickupStart}
                    onChangeText={setPickupStart}
                    placeholder="20:00"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    accessibilityLabel="Teslim alma başlangıç saati"
                  />
                </View>
              </View>
              <View style={styles.timeArrow}><Ionicons name="arrow-forward" size={16} color={theme.COLORS.textSecondary} /></View>
              <View style={styles.timeBox}>
                <Text style={styles.inputLabel}>BİTİŞ</Text>
                <View style={styles.timeInputWrapper}>
                  <Ionicons name="time-outline" size={18} color={theme.COLORS.primary} />
                  <TextInput
                    style={styles.timeInput}
                    value={pickupEnd}
                    onChangeText={setPickupEnd}
                    placeholder="21:00"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    accessibilityLabel="Teslim alma bitiş saati"
                  />
                </View>
              </View>
            </View>
            <Text style={styles.timeHint}>24 saat biçimi kullan. Örnek: 20:00</Text>
          </View>

          <View style={styles.previewHeader}>
            <View style={styles.previewTitleRow}>
              <Ionicons name="eye-outline" size={19} color={theme.COLORS.primary} />
              <Text style={styles.previewTitle}>Müşteriler böyle görecek</Text>
            </View>
            <Text style={styles.previewHint}>Canlı önizleme</Text>
          </View>
          <View style={styles.previewCard}>
            <View style={styles.previewCategoryIcon}>
              <Ionicons name={CATEGORY_ICONS[activeCategory]} size={25} color={theme.COLORS.primary} />
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewBusiness}>İşletmeniz</Text>
              <Text style={styles.previewBagTitle}>{activeCategory} sürpriz çantası</Text>
              <View style={styles.previewMeta}>
                <Ionicons name="time-outline" size={13} color={theme.COLORS.textSecondary} />
                <Text style={styles.previewMetaText}>{pickupStart} – {pickupEnd}</Text>
                <Text style={styles.previewMetaDot}>·</Text>
                <Text style={styles.previewMetaText}>{bagCount} adet</Text>
              </View>
            </View>
            <View style={styles.previewPriceColumn}>
              <Text style={styles.previewPrice}>{parsedPrice > 0 ? `${parsedPrice} ₺` : '—'}</Text>
              {parsedOriginalPrice > 0 && <Text style={styles.previewOriginal}>{parsedOriginalPrice} ₺</Text>}
            </View>
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.bottomSummary}>
            <Text style={styles.bottomSummaryLabel}>YAYINLANACAK</Text>
            <Text style={styles.bottomSummaryValue}>{bagCount} çanta <Text style={styles.bottomSummaryPrice}>· {parsedPrice > 0 ? `${parsedPrice} ₺ / adet` : 'fiyat girin'}</Text></Text>
          </View>
          <TouchableOpacity
            style={[styles.publishBtn, (isPublishing || !businessId) && styles.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={isPublishing || !businessId}
            accessibilityRole="button"
          >
            {isPublishing ? (
              <ActivityIndicator color={theme.COLORS.card} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color={theme.COLORS.card} />
                <Text style={styles.publishBtnText}>Çantayı yayınla</Text>
                <Ionicons name="arrow-forward" size={18} color={theme.COLORS.card} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.background },
  keyboardView: { flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.SIZES.l, paddingVertical: theme.SIZES.m, backgroundColor: theme.COLORS.background },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: theme.COLORS.card, borderWidth: 1, borderColor: theme.COLORS.border },
  headerTitleBox: { flex: 1, marginLeft: theme.SIZES.m },
  headerEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, color: theme.COLORS.primary, marginBottom: 3 },
  headerTitle: { ...theme.FONTS.h3, color: theme.COLORS.text },
  headerStep: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: theme.COLORS.tagBackground },
  scrollContent: { paddingHorizontal: theme.SIZES.l, paddingTop: theme.SIZES.s, paddingBottom: theme.SIZES.m },
  heroCard: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', padding: theme.SIZES.m, marginBottom: theme.SIZES.xl, borderRadius: theme.SIZES.cardRadius, backgroundColor: '#E8F3EB' },
  heroIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: theme.COLORS.card },
  heroCopy: { flex: 1, marginLeft: theme.SIZES.m, marginRight: theme.SIZES.s },
  heroTitle: { ...theme.FONTS.body2, fontWeight: '700', lineHeight: 20, color: theme.COLORS.text, marginBottom: 3 },
  heroDescription: { ...theme.FONTS.caption, lineHeight: 17, color: theme.COLORS.textSecondary },
  heroDecoration: { opacity: 0.8 },
  businessError: { ...theme.FONTS.body2, color: theme.COLORS.error, marginBottom: theme.SIZES.m },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.SIZES.m },
  stepBadge: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.COLORS.tagBackground, marginRight: theme.SIZES.s },
  stepNumber: { fontSize: 11, fontWeight: '800', color: theme.COLORS.primary },
  sectionTitle: { ...theme.FONTS.body1, fontWeight: '700', color: theme.COLORS.text },
  sectionDescription: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginTop: 2 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.SIZES.s, marginBottom: theme.SIZES.xl },
  categoryCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', flexGrow: 1, flexBasis: '45%', minWidth: 128, padding: theme.SIZES.s, borderRadius: theme.SIZES.radius, backgroundColor: theme.COLORS.card, borderWidth: 1, borderColor: theme.COLORS.border },
  categoryCardActive: { backgroundColor: '#F2F8F3', borderColor: theme.COLORS.primary },
  categoryIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.COLORS.tagBackground },
  categoryIconActive: { backgroundColor: theme.COLORS.primary },
  categoryText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text, marginLeft: theme.SIZES.s },
  categoryTextActive: { color: theme.COLORS.primary },
  categoryCheck: { position: 'absolute', top: 5, right: 5 },
  formCard: { padding: theme.SIZES.m, marginBottom: theme.SIZES.xl, borderRadius: theme.SIZES.cardRadius, backgroundColor: theme.COLORS.card, borderWidth: 1, borderColor: theme.COLORS.border },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.SIZES.m },
  priceInputBox: { flex: 1, flexBasis: '45%', minWidth: 120 },
  priceLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.SIZES.s },
  inputLabel: { ...theme.FONTS.caption, fontWeight: '700', fontSize: 10, letterSpacing: 0.6, color: theme.COLORS.textSecondary, marginBottom: theme.SIZES.s },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: theme.SIZES.m, borderRadius: theme.SIZES.radius, backgroundColor: theme.COLORS.background, borderWidth: 1, borderColor: theme.COLORS.border },
  salePriceWrapper: { borderColor: '#B9D2BE', backgroundColor: '#FAFCFA' },
  input: { flex: 1, ...theme.FONTS.h3, color: theme.COLORS.text, paddingVertical: 0 },
  currency: { ...theme.FONTS.body1, fontWeight: '600', color: theme.COLORS.textSecondary, marginLeft: theme.SIZES.xs },
  discountBadge: { paddingHorizontal: 7, paddingVertical: 4, overflow: 'hidden', borderRadius: 10, backgroundColor: theme.COLORS.tagBackground, color: theme.COLORS.primary, fontSize: 10, fontWeight: '700' },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: theme.SIZES.m },
  savingsText: { ...theme.FONTS.caption, fontWeight: '600', color: theme.COLORS.primary },
  quantityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldTitle: { ...theme.FONTS.body2, fontWeight: '700', color: theme.COLORS.text },
  fieldDescription: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginTop: 3 },
  counterControl: { flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.s },
  counterButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: theme.COLORS.background, borderWidth: 1, borderColor: theme.COLORS.border },
  counterButtonDisabled: { opacity: 0.55 },
  counterValue: { minWidth: 28, textAlign: 'center', ...theme.FONTS.h3, color: theme.COLORS.text },
  quantityPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.SIZES.s, marginTop: theme.SIZES.m },
  quantityPreset: { paddingHorizontal: theme.SIZES.m, paddingVertical: theme.SIZES.s, borderRadius: 16, borderWidth: 1, borderColor: theme.COLORS.border, backgroundColor: theme.COLORS.card },
  quantityPresetActive: { borderColor: theme.COLORS.primary, backgroundColor: theme.COLORS.tagBackground },
  quantityPresetText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  quantityPresetTextActive: { color: theme.COLORS.primary, fontWeight: '700' },
  cardDivider: { height: 1, backgroundColor: theme.COLORS.border, marginVertical: theme.SIZES.m },
  descriptionInput: { minHeight: 76, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, backgroundColor: theme.COLORS.background, borderWidth: 1, borderColor: theme.COLORS.border, ...theme.FONTS.body2, color: theme.COLORS.text },
  characterCount: { ...theme.FONTS.caption, fontSize: 10, textAlign: 'right', color: theme.COLORS.textSecondary, marginTop: theme.SIZES.xs },
  dateOptions: { flexDirection: 'row', gap: theme.SIZES.s, marginBottom: theme.SIZES.m },
  dateOption: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: theme.SIZES.s, borderRadius: theme.SIZES.radius, borderWidth: 1, borderColor: theme.COLORS.border },
  dateOptionActive: { backgroundColor: theme.COLORS.tagBackground, borderColor: '#B9D2BE' },
  dateOptionText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  dateOptionTextActive: { color: theme.COLORS.primary, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.SIZES.s },
  timeBox: { flex: 1, minWidth: 0 },
  timeArrow: { height: 50, justifyContent: 'center', paddingHorizontal: 2 },
  timeInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.s, height: 50, paddingHorizontal: theme.SIZES.s, borderRadius: theme.SIZES.radius, backgroundColor: theme.COLORS.background, borderWidth: 1, borderColor: theme.COLORS.border },
  timeInput: { flex: 1, minWidth: 0, ...theme.FONTS.body1, fontWeight: '600', color: theme.COLORS.text, paddingVertical: 0 },
  timeHint: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginTop: theme.SIZES.s },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.SIZES.s },
  previewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.s },
  previewTitle: { ...theme.FONTS.body2, fontWeight: '700', color: theme.COLORS.text },
  previewHint: { ...theme.FONTS.caption, color: theme.COLORS.primary, fontWeight: '600' },
  previewCard: { flexDirection: 'row', alignItems: 'center', padding: theme.SIZES.m, borderRadius: theme.SIZES.cardRadius, backgroundColor: theme.COLORS.card, borderWidth: 1, borderColor: theme.COLORS.border },
  previewCategoryIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: theme.COLORS.tagBackground },
  previewInfo: { flex: 1, minWidth: 0, marginHorizontal: theme.SIZES.s },
  previewBusiness: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginBottom: 3 },
  previewBagTitle: { ...theme.FONTS.body2, fontWeight: '700', color: theme.COLORS.text },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  previewMetaText: { fontSize: 10, color: theme.COLORS.textSecondary },
  previewMetaDot: { color: theme.COLORS.textSecondary, marginHorizontal: 1 },
  previewPriceColumn: { alignItems: 'flex-end' },
  previewPrice: { ...theme.FONTS.body1, fontWeight: '700', color: theme.COLORS.primary },
  previewOriginal: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textDecorationLine: 'line-through', marginTop: 2 },
  bottomSpacer: { height: 24 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.s, paddingHorizontal: theme.SIZES.l, paddingVertical: theme.SIZES.s, paddingBottom: Platform.OS === 'web' ? theme.SIZES.s : theme.SIZES.m, backgroundColor: theme.COLORS.card, borderTopWidth: 1, borderTopColor: theme.COLORS.border },
  bottomSummary: { flex: 1, minWidth: 0 },
  bottomSummaryLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7, color: theme.COLORS.textSecondary, marginBottom: 3 },
  bottomSummaryValue: { ...theme.FONTS.body2, fontWeight: '700', color: theme.COLORS.text },
  bottomSummaryPrice: { fontWeight: '400', color: theme.COLORS.textSecondary },
  publishBtn: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: theme.SIZES.m, borderRadius: theme.SIZES.buttonRadius, backgroundColor: theme.COLORS.primary },
  publishBtnDisabled: { opacity: 0.65 },
  publishBtnText: { ...theme.FONTS.body2, fontWeight: '700', color: theme.COLORS.card },
});

export default CreateBagScreen;
