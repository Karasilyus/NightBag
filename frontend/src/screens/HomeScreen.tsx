import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import SurpriseBagCard from '../components/SurpriseBagCard';
import { bagService } from '../services/bag.service';
import { preferencesService, UserPreferences } from '../services/preferences.service';
import DistanceSlider from '../components/DistanceSlider';

const CATEGORIES = ['Tümü', 'Fırın', 'Kafe', 'Tatlı', 'Yemek'];

const HomeScreen = ({ navigation }: any) => {
  const [activeCategory, setActiveCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [bags, setBags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>({
    searchRadiusKm: 5,
    notificationsEnabled: true,
    location: null,
    favoriteCategories: [],
  });
  const { width } = useWindowDimensions();
  const webGridWidth = width >= 1200 ? '31.5%' : '48%';
  const displayedBags = activeCategory === 'Tümü' && preferences.favoriteCategories.length > 0
    ? [
        ...bags.filter((bag) => preferences.favoriteCategories.includes(bag.category)),
        ...bags.filter((bag) => !preferences.favoriteCategories.includes(bag.category)),
      ]
    : bags;

  useEffect(() => {
    preferencesService.getPreferences()
      .then(setPreferences)
      .catch((error) => console.error('Kullanıcı tercihleri yüklenemedi:', error));
  }, []);

  const updateSearchRadius = async (searchRadiusKm: number) => {
    const previousPreferences = preferences;
    setPreferences((current) => ({ ...current, searchRadiusKm }));
    try {
      setPreferences(await preferencesService.updatePreferences({ searchRadiusKm }));
    } catch (error) {
      console.error('Arama mesafesi kaydedilemedi:', error);
      setPreferences(previousPreferences);
      Alert.alert('Hata', 'Arama mesafesi kaydedilemedi. Lütfen tekrar deneyin.');
    }
  };

  useEffect(() => {
    const fetchBags = async () => {
      setIsLoading(true);
      try {
        const response = await bagService.getBags(
          activeCategory,
          searchQuery,
          preferences.location?.latitude,
          preferences.location?.longitude,
          preferences.searchRadiusKm * 1000
        );
        setBags(response.data);
      } catch (error) {
        console.error("Çantalar yüklenemedi", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBags();
  }, [activeCategory, searchQuery, preferences]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Kısım */}
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <View>
            <Text style={styles.locationLabel}>BULUNDUĞUN YER</Text>
            <TouchableOpacity
              style={styles.locationSelector}
              onPress={() => navigation.navigate('LocationPicker')}
              accessibilityRole="button"
            >
              <Ionicons name="location-sharp" size={16} color={theme.COLORS.primary} />
              <Text style={styles.locationText}>
                {preferences.location?.label || 'Kadıköy, İstanbul'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.mainTitle}>Bugünün sonu,{"\n"}lezzetin başlangıcı.</Text>
        
        {/* Arama */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.COLORS.textSecondary} />
          <TextInput 
            placeholder="İşletme veya çanta ara..." 
            style={styles.searchInput}
            placeholderTextColor={theme.COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Kategoriler */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer} contentContainerStyle={styles.categoriesContent}>
          {CATEGORIES.map((category, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.categoryBtn, activeCategory === category && styles.categoryBtnActive]}
              onPress={() => setActiveCategory(category)}
            >
              <Text style={[styles.categoryText, activeCategory === category && styles.categoryTextActive]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
          {width >= 700 && (
            <DistanceSlider key={preferences.searchRadiusKm} value={preferences.searchRadiusKm} onCommit={updateSearchRadius} />
          )}
        </ScrollView>
        {width < 700 && (
          <View style={styles.mobileDistanceSlider}>
            <DistanceSlider key={preferences.searchRadiusKm} value={preferences.searchRadiusKm} onCommit={updateSearchRadius} />
          </View>
        )}

        {/* Liste Başlığı */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yakınında, bu akşam</Text>
          <TouchableOpacity style={styles.seeMapBtn} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.seeMapText}>Haritada gör</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Kartlar */}
        <View style={[styles.cardsContainer, Platform.OS === 'web' && width >= 700 && styles.webCardsContainer]}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.COLORS.primary} style={{ marginTop: 40 }} />
          ) : displayedBags.length > 0 ? (
            displayedBags.map((item) => (
              <SurpriseBagCard
                key={item.id}
                {...item}
                webGrid={Platform.OS === 'web' && width >= 700}
                gridWidth={webGridWidth}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-remove-outline" size={48} color={theme.COLORS.textSecondary} />
              <Text style={styles.emptyText}>Bu kategoride veya aramada uygun çanta bulunamadı.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.background,
  },
  header: {
    paddingHorizontal: theme.SIZES.l,
    paddingTop: theme.SIZES.m,
    paddingBottom: theme.SIZES.m,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginBottom: 4,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.text,
  },
  scrollContent: {
    paddingHorizontal: theme.SIZES.l,
    paddingBottom: 100, // Bottom tab için boşluk
  },
  mainTitle: {
    ...theme.FONTS.h1,
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.l,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.COLORS.card,
    borderRadius: theme.SIZES.radius,
    paddingHorizontal: theme.SIZES.m,
    height: 48,
    marginBottom: theme.SIZES.l,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.SIZES.s,
    ...theme.FONTS.body2,
    color: theme.COLORS.text,
  },
  categoriesContainer: {
    marginBottom: theme.SIZES.xl,
  },
  categoriesContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileDistanceSlider: {
    marginTop: -theme.SIZES.l,
    marginBottom: theme.SIZES.xl,
  },
  categoryBtn: {
    paddingHorizontal: theme.SIZES.m,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.COLORS.card,
    marginRight: theme.SIZES.s,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  categoryBtnActive: {
    backgroundColor: theme.COLORS.tagBackground,
    borderColor: theme.COLORS.primary,
  },
  categoryText: {
    ...theme.FONTS.body2,
    color: theme.COLORS.text,
  },
  categoryTextActive: {
    color: theme.COLORS.primary,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.SIZES.m,
  },
  sectionTitle: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
  },
  seeMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeMapText: {
    ...theme.FONTS.caption,
    fontWeight: '600',
    color: theme.COLORS.primary,
  },
  cardsContainer: {
    flexDirection: 'column',
    minHeight: 200,
  },
  webCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.SIZES.xl,
    marginTop: theme.SIZES.l,
  },
  emptyText: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
    textAlign: 'center',
    marginTop: theme.SIZES.m,
  },
});

export default HomeScreen;
