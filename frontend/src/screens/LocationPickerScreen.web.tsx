import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import WebMapCanvas, { MapCoordinate } from '../components/web/WebMapCanvas';
import { preferencesService } from '../services/preferences.service';

const INITIAL_COORDINATE = { latitude: 40.9845, longitude: 29.026 };

const LocationPickerScreen = ({ navigation, route }: any) => {
  const [selectedCoordinate, setSelectedCoordinate] = useState<MapCoordinate>(INITIAL_COORDINATE);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    preferencesService.getPreferences()
      .then(({ location }) => {
        if (location) setSelectedCoordinate(location);
      })
      .catch((error) => {
        setLoadError('Kayıtlı konum yüklenemedi.');
        console.error('Kayıtlı konum yüklenemedi:', error);
      });
  }, []);

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await preferencesService.updatePreferences({
        location: {
          ...selectedCoordinate,
          label: `${selectedCoordinate.latitude.toFixed(4)}, ${selectedCoordinate.longitude.toFixed(4)}`,
        },
      });
      if (route?.params?.returnToProfile || route?.params?.returnToMap) {
        navigation.goBack();
      } else {
        navigation.replace('MainFlow');
      }
    } catch (error) {
      console.error('Konum kaydedilemedi:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Konumu Seç</Text>
        <View style={styles.backButton} />
      </View>
      <WebMapCanvas
        selectedCoordinate={selectedCoordinate}
        center={INITIAL_COORDINATE}
        radiusKm={2}
        onSelectLocation={setSelectedCoordinate}
        style={styles.map}
      />
      <View style={styles.bottomSection}>
        {loadError ? <Text style={styles.locationText}>{loadError}</Text> : null}
        <Text style={styles.locationText}>
          Seçilen konum: {selectedCoordinate.latitude.toFixed(4)}, {selectedCoordinate.longitude.toFixed(4)}
        </Text>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={isSaving}>
          {isSaving
            ? <ActivityIndicator color={theme.COLORS.card} />
            : <Text style={styles.confirmText}>Bu Konumu Kullan</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.SIZES.m, borderBottomWidth: 1, borderBottomColor: theme.COLORS.border },
  backButton: { width: 40 },
  title: { ...theme.FONTS.h3, color: theme.COLORS.text },
  map: { flex: 1 },
  bottomSection: { padding: theme.SIZES.l, backgroundColor: theme.COLORS.card, borderTopWidth: 1, borderTopColor: theme.COLORS.border },
  locationText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textAlign: 'center', marginBottom: theme.SIZES.m },
  confirmButton: { minHeight: 52, borderRadius: theme.SIZES.buttonRadius, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.COLORS.primary },
  confirmText: { ...theme.FONTS.body1, fontWeight: '600', color: theme.COLORS.card },
});

export default LocationPickerScreen;
