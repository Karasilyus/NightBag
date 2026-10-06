import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import SurpriseBagCard from '../components/SurpriseBagCard';
import { bagService } from '../services/bag.service';

const CATEGORIES = ['Tümü', 'Fırın', 'Kafe', 'Yemek'];

const HomeScreen = ({ navigation }: any) => {
  const [activeCategory, setActiveCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [bags, setBags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Veritabanından (Mock API'den) verileri çeken fonksiyon
  useEffect(() => {
    const fetchBags = async () => {
      setIsLoading(true);
      try {
        const response = await bagService.getBags(activeCategory, searchQuery);
        setBags(response.data);
      } catch (error) {
        console.error("Çantalar yüklenemedi", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBags();
  }, [activeCategory, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Kısım */}
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <View>
            <Text style={styles.locationLabel}>BULUNDUĞUN YER</Text>
            <View style={styles.locationSelector}>
              <Ionicons name="location-sharp" size={16} color={theme.COLORS.primary} />
              <Text style={styles.locationText}>Kadıköy, İstanbul</Text>
              <Ionicons name="chevron-down" size={16} color={theme.COLORS.text} />
            </View>
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={24} color={theme.COLORS.text} />
          </TouchableOpacity>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
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
        </ScrollView>

        {/* Liste Başlığı */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yakınında, bu akşam</Text>
          <TouchableOpacity style={styles.seeMapBtn} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.seeMapText}>Haritada gör</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Kartlar */}
        <View style={styles.cardsContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.COLORS.primary} style={{ marginTop: 40 }} />
          ) : bags.length > 0 ? (
            bags.map((item) => (
              <SurpriseBagCard key={item.id} {...item} />
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
  filterBtn: {
    padding: 8,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    borderRadius: 20,
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
    flexDirection: 'row',
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
