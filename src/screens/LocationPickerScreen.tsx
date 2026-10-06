import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

let MapView: any = View;
let Marker: any = View;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

const LocationPickerScreen = ({ navigation }: any) => {
  const [selectedCoordinate, setSelectedCoordinate] = useState({
    latitude: 40.9845,
    longitude: 29.0260,
  });

  const handleConfirm = () => {
    // Burada lokasyon kaydedilebilir
    navigation.replace('MainFlow');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Konumu Seç</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]}>
            <Ionicons name="map-outline" size={48} color={theme.COLORS.textSecondary} />
            <Text style={{ marginTop: 10, color: theme.COLORS.textSecondary }}>Web'de harita seçimi simülasyonu</Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: selectedCoordinate.latitude,
              longitude: selectedCoordinate.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={(e: any) => setSelectedCoordinate(e.nativeEvent.coordinate)}
          >
            <Marker coordinate={selectedCoordinate} />
          </MapView>
        )}
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.infoText}>Haritada istediğin konuma dokunarak seçim yapabilirsin.</Text>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>Bu Konumu Kullan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.SIZES.l,
    paddingVertical: theme.SIZES.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.border,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    padding: theme.SIZES.l,
    backgroundColor: theme.COLORS.card,
    borderTopWidth: 1,
    borderTopColor: theme.COLORS.border,
  },
  infoText: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginBottom: theme.SIZES.m,
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: theme.COLORS.primary,
    height: 52,
    borderRadius: theme.SIZES.buttonRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.card,
  },
});

export default LocationPickerScreen;
