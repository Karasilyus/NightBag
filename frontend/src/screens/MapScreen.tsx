import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../constants/theme';
import SurpriseBagCard from '../components/SurpriseBagCard';
import { bagService } from '../services/bag.service';

const MapScreen = () => {
  const [bags, setBags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBags = async () => {
      setIsLoading(true);
      try {
        const response = await bagService.getBags();
        setBags(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBags();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 40.9845,
          longitude: 29.0260,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {!isLoading && bags.map((item) => (
          item.coordinate && (
            <Marker key={item.id} coordinate={item.coordinate}>
              <View style={styles.customMarker}>
                <MaterialCommunityIcons name="shopping" size={14} color={theme.COLORS.card} />
                <Text style={styles.markerText}>{item.price} ₺</Text>
              </View>
            </Marker>
          )
        ))}
      </MapView>

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
          <TouchableOpacity style={styles.searchBtn}>
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
