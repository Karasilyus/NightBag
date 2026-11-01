import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import SurpriseBagCard from '../components/SurpriseBagCard';
import { bagService } from '../services/bag.service';
import WebMapCanvas from '../components/web/WebMapCanvas';
import { preferencesService, UserPreferences } from '../services/preferences.service';

const MapScreen = ({ navigation }: any) => {
  const [bags, setBags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>({
    searchRadiusKm: 5,
    notificationsEnabled: true,
    location: null,
  });

  useEffect(() => {
    preferencesService.getPreferences()
      .then(setPreferences)
      .catch((error) => console.error('Kullanıcı tercihleri yüklenemedi:', error));
  }, []);

  useEffect(() => {
    const fetchBags = async () => {
      setIsLoading(true);
      try {
        const response = await bagService.getBags(
          'Tümü',
          '',
          preferences.location?.latitude,
          preferences.location?.longitude,
          preferences.searchRadiusKm * 1000
        );
        setBags(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBags();
  }, [preferences]);

  return (
    <View style={styles.container}>
      <WebMapCanvas
        style={styles.map}
        center={preferences.location || undefined}
        radiusKm={preferences.searchRadiusKm}
        markers={bags.map((bag) => ({
          id: bag.id,
          coordinate: bag.coordinate,
          label: `${bag.price} ₺`,
          onPress: () => navigation.navigate('BagDetails', { bag }),
        }))}
      />

      {/* Üst Arama/Konum Başlığı (Absolute) */}
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Haritada keşfet</Text>
            <View style={styles.locationSelector}>
              <Ionicons name="location-sharp" size={14} color={theme.COLORS.primary} />
              <Text style={styles.locationText}>Kadıköy, İstanbul</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate('Discover')}>
            <Ionicons name="search" size={24} color={theme.COLORS.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Alt Yatay Liste (Absolute) */}
      <View style={styles.bottomListContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.COLORS.primary} style={{ marginBottom: 40 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {bags.map((item) => (
              <SurpriseBagCard key={item.id} {...item} isMapCard />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.background,
  },
  map: {
    width: '100%',
    height: '100%',
    ...StyleSheet.absoluteFill,

  },
  customMarker: {
    backgroundColor: theme.COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    ...theme.FONTS.caption,
    fontWeight: '700',
    color: theme.COLORS.card,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 251, 247, 0.9)',
    margin: theme.SIZES.m,
    padding: theme.SIZES.m,
    borderRadius: theme.SIZES.radius,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
  },
  searchBtn: {
    padding: 8,
    backgroundColor: theme.COLORS.card,
    borderRadius: 20,
  },
  bottomListContainer: {
    position: 'absolute',
    bottom: 90, // Bottom tab navigation için boşluk
    left: 0,
    right: 0,
  },
  scrollContent: {
    paddingHorizontal: theme.SIZES.m,
  },
});

export default MapScreen;
