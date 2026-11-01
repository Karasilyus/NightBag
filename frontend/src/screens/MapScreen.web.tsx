import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import SurpriseBagCard from '../components/SurpriseBagCard';
import { bagService } from '../services/bag.service';
import WebMapCanvas from '../components/web/WebMapCanvas';
import { preferencesService, UserPreferences } from '../services/preferences.service';

const MapScreen = ({ navigation }: any) => {
  const { width } = useWindowDimensions();
  const [bags, setBags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ latitude: 40.9845, longitude: 29.026 });
  const [preferences, setPreferences] = useState<UserPreferences>({
    searchRadiusKm: 5,
    notificationsEnabled: true,
    location: null,
    favoriteCategories: [],
  });

  useEffect(() => {
    const loadPreferences = () => {
      preferencesService.getPreferences()
        .then((nextPreferences) => {
          setPreferences(nextPreferences);
          if (nextPreferences.location) setMapCenter(nextPreferences.location);
        })
        .catch((error) => console.error('Kullanıcı tercihleri yüklenemedi:', error));
    };

    loadPreferences();
    return navigation.addListener('focus', loadPreferences);
  }, [navigation]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await bagService.getBags(
          'Tümü',
          '',
          mapCenter.latitude,
          mapCenter.longitude,
          preferences.searchRadiusKm * 1000
        );
        setBags(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [mapCenter.latitude, mapCenter.longitude, preferences.searchRadiusKm]);

  const handleCenterChange = (nextCenter: { latitude: number; longitude: number }) => {
    setMapCenter((currentCenter) => (
      Math.abs(currentCenter.latitude - nextCenter.latitude) < 0.002
      && Math.abs(currentCenter.longitude - nextCenter.longitude) < 0.002
        ? currentCenter
        : nextCenter
    ));
  };

  return (
    <View style={styles.container}>
      <WebMapCanvas
        style={styles.map}
        center={mapCenter}
        radiusKm={preferences.searchRadiusKm}
        onCenterChange={handleCenterChange}
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
            <TouchableOpacity
              style={styles.locationSelector}
              onPress={() => navigation.navigate('LocationPicker', { returnToMap: true })}
              accessibilityRole="button"
            >
              <Ionicons name="location-sharp" size={14} color={theme.COLORS.primary} />
              <Text style={styles.locationText}>{preferences.location?.label || 'Kadıköy, İstanbul'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate('Discover')}>
            <Ionicons name="search" size={24} color={theme.COLORS.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Harita üzerindeki dikey sonuç listesi */}
      <View style={[styles.mapSidebar, { width: Math.min(width - 24, 360, Math.max(220, width * 0.32)) }]}>
        <Text style={styles.listTitle}>Yakındaki çantalar</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.COLORS.primary} style={styles.loadingIndicator} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {bags.map((item) => (
              <SurpriseBagCard key={item.id} {...item} isMapSidebarCard />
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
  mapSidebar: {
    position: 'absolute',
    top: 104,
    bottom: 90,
    left: theme.SIZES.m,
    backgroundColor: 'rgba(253, 251, 247, 0.96)',
    borderRadius: theme.SIZES.radius,
    padding: theme.SIZES.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  listTitle: {
    ...theme.FONTS.body2,
    color: theme.COLORS.text,
    fontWeight: '700',
    padding: theme.SIZES.s,
  },
  scrollContent: {
    paddingBottom: theme.SIZES.s,
  },
  loadingIndicator: {
    marginTop: theme.SIZES.xl,
  },
});

export default MapScreen;
