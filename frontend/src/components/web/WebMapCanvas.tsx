import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../constants/theme';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

interface WebMapMarker {
  id: string;
  coordinate?: MapCoordinate;
  label: string;
  onPress?: () => void;
}

interface WebMapCanvasProps {
  markers?: WebMapMarker[];
  selectedCoordinate?: MapCoordinate;
  center?: MapCoordinate;
  radiusKm?: number;
  onSelectLocation?: (coordinate: MapCoordinate) => void;
  style?: ViewStyle;
}

const MAP_CENTER = { latitude: 40.9845, longitude: 29.026 };

const WebMapCanvas = ({
  markers = [],
  selectedCoordinate,
  center = MAP_CENTER,
  radiusKm = 2,
  onSelectLocation,
  style,
}: WebMapCanvasProps) => {
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const mapSpan = Math.max(radiusKm / 55, 0.004);

  const getPosition = (coordinate: MapCoordinate) => ({
    left: `${50 + ((coordinate.longitude - center.longitude) / mapSpan) * 100}%` as `${number}%`,
    top: `${50 - ((coordinate.latitude - center.latitude) / mapSpan) * 100}%` as `${number}%`,
  });

  const handleMapPress = (event: any) => {
    if (!onSelectLocation) return;

    const { locationX, locationY } = event.nativeEvent;
    if (
      !Number.isFinite(locationX)
      || !Number.isFinite(locationY)
      || dimensions.width <= 0
      || dimensions.height <= 0
    ) return;

    onSelectLocation({
      latitude: center.latitude + (0.5 - locationY / dimensions.height) * mapSpan,
      longitude: center.longitude + (locationX / dimensions.width - 0.5) * mapSpan,
    });
  };

  return (
    <View
      style={[styles.map, style]}
      onLayout={(event) => setDimensions(event.nativeEvent.layout)}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleMapPress}
        accessibilityRole={onSelectLocation ? 'button' : undefined}
        accessibilityLabel={onSelectLocation ? 'Haritada konum seç' : undefined}
      >
        <View pointerEvents="none" style={styles.park} />
        <View pointerEvents="none" style={styles.parkSecondary} />
        <View pointerEvents="none" style={styles.roadHorizontal} />
        <View pointerEvents="none" style={styles.roadVertical} />
        <View pointerEvents="none" style={styles.roadDiagonal} />
        <View pointerEvents="none" style={styles.waterway} />
        <View pointerEvents="none" style={styles.mapLabelTop}>
          <Text style={styles.labelText}>KADIKÖY</Text>
        </View>
        <View pointerEvents="none" style={styles.mapLabelBottom}>
          <Text style={styles.labelText}>MODA</Text>
        </View>
      </Pressable>

      {markers.map((marker) => {
        if (!marker.coordinate) return null;
        const position = getPosition(marker.coordinate);
        return (
          <Pressable
            key={marker.id}
            style={[styles.marker, { left: position.left, top: position.top }]}
            onPress={marker.onPress}
            accessibilityRole="button"
            accessibilityLabel={marker.label}
          >
            <Ionicons name="bag-handle" size={16} color={theme.COLORS.card} />
            <Text style={styles.markerLabel}>{marker.label}</Text>
          </Pressable>
        );
      })}

      {selectedCoordinate && (
        <View
          pointerEvents="none"
          style={[styles.selectedMarker, { left: getPosition(selectedCoordinate).left, top: getPosition(selectedCoordinate).top }]}
        >
          <Ionicons name="location" size={32} color={theme.COLORS.error} />
        </View>
      )}
      <View pointerEvents="none" style={styles.mapNotice}>
        <Text style={styles.mapNoticeText}>Şematik harita • {center.latitude.toFixed(3)}, {center.longitude.toFixed(3)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  map: { flex: 1, minHeight: 240, overflow: 'hidden', backgroundColor: '#e8e5dc' },
  park: { position: 'absolute', width: '42%', height: '32%', left: '6%', top: '12%', borderRadius: 60, backgroundColor: '#c9dcc0', transform: [{ rotate: '-13deg' }] },
  parkSecondary: { position: 'absolute', width: '34%', height: '25%', right: '-4%', bottom: '14%', borderRadius: 60, backgroundColor: '#d3e2ca', transform: [{ rotate: '18deg' }] },
  roadHorizontal: { position: 'absolute', width: '130%', height: 24, left: '-12%', top: '48%', backgroundColor: '#fffaf0', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#d3cec3', transform: [{ rotate: '-8deg' }] },
  roadVertical: { position: 'absolute', width: 22, height: '130%', top: '-12%', left: '56%', backgroundColor: '#fffaf0', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#d3cec3', transform: [{ rotate: '11deg' }] },
  roadDiagonal: { position: 'absolute', width: '130%', height: 14, left: '-14%', top: '72%', backgroundColor: '#fffaf0', transform: [{ rotate: '19deg' }] },
  waterway: { position: 'absolute', width: '120%', height: 16, left: '-8%', top: '18%', backgroundColor: '#c7e0e7', transform: [{ rotate: '4deg' }] },
  mapLabelTop: { position: 'absolute', top: '30%', left: '16%' },
  mapLabelBottom: { position: 'absolute', bottom: '23%', right: '22%' },
  labelText: { fontSize: 11, fontWeight: '700', color: '#72806d', letterSpacing: 1 },
  marker: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 18, backgroundColor: theme.COLORS.primary, transform: [{ translateX: -20 }, { translateY: -18 }] },
  markerLabel: { fontSize: 12, fontWeight: '700', color: theme.COLORS.card },
  selectedMarker: { position: 'absolute', transform: [{ translateX: -16 }, { translateY: -29 }] },
  mapNotice: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)' },
  mapNoticeText: { fontSize: 11, color: theme.COLORS.textSecondary },
});

export default WebMapCanvas;
