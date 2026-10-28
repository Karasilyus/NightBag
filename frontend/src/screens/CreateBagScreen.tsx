import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

const CATEGORIES = ['Fırın', 'Kafe', 'Tatlı', 'Yemek'];

const CreateBagScreen = ({ navigation }: any) => {
  const [activeCategory, setActiveCategory] = useState('Fırın');
  const [bagCount, setBagCount] = useState(12);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = () => {
    setIsPublishing(true);
    // Simüle edilmiş API isteği (800ms)
    setTimeout(() => {
      setIsPublishing(false);
      // Web'de alert fallback
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Başarılı! Çantalar başarıyla yayınlandı.');
      } else {
        Alert.alert('Başarılı', 'Çantalar başarıyla yayınlandı.');
      }
      navigation.goBack();
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Çanta yayınla</Text>
          <Text style={styles.headerSubtitle}>Moda Fırını • İşletme paneli</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Ionicons name="bag-handle-outline" size={24} color={theme.COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>Çantayı hazırla, tek tıkla ürün yayınla.</Text>
            <Text style={styles.infoBannerDesc}>Ürün envanteri girmene gerekmez. Kategori, çanta sayısı ve teslim saatini belirlemen yeterli.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Çanta kategorisi</Text>
        <View style={styles.categoriesRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.categoryBtn, activeCategory === cat && styles.activeCategoryBtn]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceInputBox}>
            <Text style={styles.inputLabel}>Yaklaşık orijinal değer</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} defaultValue="350" keyboardType="numeric" />
              <Text style={styles.currency}>₺</Text>
            </View>
          </View>
          <View style={styles.priceInputBox}>
            <Text style={styles.inputLabel}>İndirimli çanta fiyatı</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} defaultValue="125" keyboardType="numeric" />
              <Text style={styles.currency}>₺</Text>
            </View>
            <Text style={styles.helperText}>%50'den ucuza gelir</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Kaç çanta yayınlayacaksın?</Text>
        <View style={styles.counterBox}>
          <TouchableOpacity style={styles.counterBtn} onPress={() => setBagCount(Math.max(1, bagCount - 1))}>
            <Ionicons name="remove" size={24} color={theme.COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.counterText}>{bagCount} çanta</Text>
          <TouchableOpacity style={styles.counterBtnActive} onPress={() => setBagCount(bagCount + 1)}>
            <Ionicons name="add" size={24} color={theme.COLORS.card} />
          </TouchableOpacity>
        </View>
        <Text style={styles.counterHelper}>Seçtiğiniz sayı güncellendiğinde envanter anında değişir.</Text>

        <View style={styles.timeSectionHeader}>
          <Text style={styles.sectionTitle}>Teslim alma aralığı</Text>
          <View style={styles.dateSelector}>
            <Text style={styles.dateText}>Bugün, 6 Ekim</Text>
            <Ionicons name="pencil" size={12} color={theme.COLORS.textSecondary} />
          </View>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeBox}>
            <Text style={styles.inputLabel}>BAŞLANGIÇ</Text>
            <View style={styles.timeInputWrapper}>
              <Ionicons name="time-outline" size={20} color={theme.COLORS.textSecondary} />
              <TextInput style={styles.timeInput} defaultValue="20.00" />
            </View>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.inputLabel}>BİTİŞ</Text>
            <View style={styles.timeInputWrapper}>
              <Ionicons name="time-outline" size={20} color={theme.COLORS.textSecondary} />
              <TextInput style={styles.timeInput} defaultValue="21.00" />
            </View>
          </View>
        </View>
        <Text style={styles.counterHelper}>Müşterilerin çantalarını alabileceği saatleri seçin.</Text>

        <View style={styles.previewBox}>
          <Ionicons name="eye-outline" size={20} color={theme.COLORS.textSecondary} />
          <View>
            <Text style={styles.previewTitle}>Keşfette böyle görünecek</Text>
            <Text style={styles.previewDesc}>Fırın sürpriz çantası - 125 ₺{"\n"}12 çanta • Bugün 20.00-21.00</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.publishBtn, isPublishing && { opacity: 0.7 }]} 
          onPress={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <ActivityIndicator color={theme.COLORS.card} />
          ) : (
            <>
              <Text style={styles.publishBtnText}>{bagCount} çantayı yayınla</Text>
              <Ionicons name="arrow-forward" size={20} color={theme.COLORS.card} />
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.bottomHelper}>Yayınladıktan sonra çanta bilgilerini güncelleyebilirsin.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.SIZES.l, paddingTop: theme.SIZES.m },
  headerTitleBox: { alignItems: 'center' },
  headerTitle: { ...theme.FONTS.h3, color: theme.COLORS.text, marginBottom: 2 },
  headerSubtitle: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  iconBtn: { width: 40, alignItems: 'flex-start' },
  scrollContent: { padding: theme.SIZES.l, paddingBottom: 120 },
  infoBanner: { flexDirection: 'row', backgroundColor: theme.COLORS.tagBackground, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, gap: theme.SIZES.m, marginBottom: theme.SIZES.xl },
  infoBannerTitle: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text, marginBottom: 4 },
  infoBannerDesc: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, lineHeight: 18 },
  sectionTitle: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text, marginBottom: theme.SIZES.m },
  categoriesRow: { flexDirection: 'row', gap: theme.SIZES.s, marginBottom: theme.SIZES.xl },
  categoryBtn: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: theme.COLORS.border, alignItems: 'center' },
  activeCategoryBtn: { backgroundColor: theme.COLORS.primary, borderColor: theme.COLORS.primary },
  categoryText: { ...theme.FONTS.caption, color: theme.COLORS.text },
  activeCategoryText: { color: theme.COLORS.card, fontWeight: '600' },
  priceRow: { flexDirection: 'row', gap: theme.SIZES.m, marginBottom: theme.SIZES.xl },
  priceInputBox: { flex: 1 },
  inputLabel: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', fontSize: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.background, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, height: 48, borderWidth: 1, borderColor: theme.COLORS.border },
  input: { flex: 1, ...theme.FONTS.h3, color: theme.COLORS.text },
  currency: { ...theme.FONTS.body1, color: theme.COLORS.textSecondary },
  helperText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginTop: 4, fontSize: 10 },
  counterBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.COLORS.background, borderRadius: theme.SIZES.radius, padding: theme.SIZES.s, borderWidth: 1, borderColor: theme.COLORS.border, marginBottom: 8 },
  counterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.COLORS.border },
  counterBtnActive: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  counterText: { ...theme.FONTS.h3, color: theme.COLORS.text },
  counterHelper: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginBottom: theme.SIZES.xl },
  timeSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.COLORS.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  dateText: { ...theme.FONTS.caption, fontWeight: '600', color: theme.COLORS.primary },
  timeRow: { flexDirection: 'row', gap: theme.SIZES.m, marginBottom: 8 },
  timeBox: { flex: 1 },
  timeInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.background, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, height: 48, borderWidth: 1, borderColor: theme.COLORS.border, gap: 8 },
  timeInput: { flex: 1, ...theme.FONTS.h3, color: theme.COLORS.text },
  previewBox: { flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.m, backgroundColor: theme.COLORS.background, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.COLORS.border },
  previewTitle: { ...theme.FONTS.caption, fontWeight: '600', color: theme.COLORS.textSecondary, marginBottom: 2 },
  previewDesc: { ...theme.FONTS.caption, color: theme.COLORS.text, lineHeight: 18 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: theme.SIZES.l, backgroundColor: theme.COLORS.card, borderTopWidth: 1, borderTopColor: theme.COLORS.border },
  publishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.COLORS.primary, paddingVertical: theme.SIZES.m, borderRadius: theme.SIZES.buttonRadius, gap: theme.SIZES.xs, marginBottom: theme.SIZES.s },
  publishBtnText: { ...theme.FONTS.body1, fontWeight: '600', color: theme.COLORS.card },
  bottomHelper: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textAlign: 'center' },
});

export default CreateBagScreen;
