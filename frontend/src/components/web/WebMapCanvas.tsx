import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
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
  onCenterChange?: (coordinate: MapCoordinate) => void;
  style?: ViewStyle;
}

interface GoogleMapMarker {
  setMap(map: GoogleMap | null): void;
  addListener(event: 'click', callback: () => void): void;
}

interface GoogleMap {
  setCenter(center: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
  addListener(event: 'click', callback: (event: { latLng?: { lat(): number; lng(): number } }) => void): { remove(): void };
  addListener(event: 'idle', callback: () => void): { remove(): void };
  getCenter(): { lat(): number; lng(): number } | undefined;
}

interface GoogleMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  Marker: new (options: {
    map: GoogleMap;
    position: { lat: number; lng: number };
    title?: string;
    label?: string;
    click?: () => void;
  }) => GoogleMapMarker;
}

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
    nightBagGoogleMapsReady?: () => void;
  }
}

const MAP_CENTER = { latitude: 40.9845, longitude: 29.026 };
let googleMapsRequest: Promise<GoogleMapsApi> | null = null;

const loadGoogleMaps = (apiKey: string): Promise<GoogleMapsApi> => {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsRequest) return googleMapsRequest;

  googleMapsRequest = new Promise((resolve, reject) => {
    const callbackName = 'nightBagGoogleMapsReady';
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      delete window.nightBagGoogleMapsReady;
      googleMapsRequest = null;
      reject(new Error('Google Maps yüklemesi zaman aşımına uğradı.'));
    }, 15000);

    window.nightBagGoogleMapsReady = () => {
      window.clearTimeout(timeout);
      delete window.nightBagGoogleMapsReady;
      const maps = window.google?.maps;
      if (!maps) {
        googleMapsRequest = null;
        reject(new Error('Google Maps API yüklenemedi.'));
        return;
      }
      resolve(maps);
    };

    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      delete window.nightBagGoogleMapsReady;
      googleMapsRequest = null;
      reject(new Error('Google Maps yüklenemedi. API anahtarını ve alan adı kısıtlarını kontrol edin.'));
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=${callbackName}`;
    document.head.appendChild(script);
  });

  return googleMapsRequest;
};

const WebMapCanvas = ({
  markers = [],
  selectedCoordinate,
  center = MAP_CENTER,
  radiusKm = 2,
  onSelectLocation,
  onCenterChange,
  style,
}: WebMapCanvasProps) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<GoogleMap | null>(null);
  const mapClickListener = useRef<{ remove(): void } | null>(null);
  const mapIdleListener = useRef<{ remove(): void } | null>(null);
  const renderedMarkers = useRef<GoogleMapMarker[]>([]);
  const onSelectLocationRef = useRef(onSelectLocation);
  const onCenterChangeRef = useRef(onCenterChange);
  const previousCenter = useRef(center);
  const previousRadiusKm = useRef(radiusKm);
  const [mapApi, setMapApi] = useState<GoogleMapsApi | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const zoom = Math.max(10, Math.min(16, Math.round(16 - Math.log2(Math.max(radiusKm, 1)))));
  const visibleError = apiKey ? errorMessage : 'Google Maps API anahtarı yapılandırılmamış.';

  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    let isMounted = true;
    if (!apiKey) return () => { isMounted = false; };

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (isMounted) {
          setMapApi(maps);
          setErrorMessage('');
        }
      })
      .catch((error: unknown) => {
        console.error('Google Maps başlatılamadı:', error);
        if (isMounted) setErrorMessage('Harita yüklenemedi. API anahtarını ve alan adı kısıtlarını kontrol edin.');
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapApi || !mapElement.current || mapInstance.current) return;

    mapInstance.current = new mapApi.Map(mapElement.current, {
      center: { lat: center.latitude, lng: center.longitude },
      zoom,
      clickableIcons: false,
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      zoomControl: true,
      scrollwheel: true,
      gestureHandling: 'greedy',
    });

    mapClickListener.current = mapInstance.current.addListener('click', (event) => {
      if (!event.latLng) return;
      onSelectLocationRef.current?.({
        latitude: event.latLng.lat(),
        longitude: event.latLng.lng(),
      });
    });
    mapIdleListener.current = mapInstance.current.addListener('idle', () => {
      const currentCenter = mapInstance.current?.getCenter();
      if (!currentCenter) return;
      onCenterChangeRef.current?.({
        latitude: currentCenter.lat(),
        longitude: currentCenter.lng(),
      });
    });

    return () => {
      mapClickListener.current?.remove();
      mapClickListener.current = null;
      mapIdleListener.current?.remove();
      mapIdleListener.current = null;
      renderedMarkers.current.forEach((marker) => marker.setMap(null));
      renderedMarkers.current = [];
      mapInstance.current = null;
    };
  }, [mapApi]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    const currentCenter = map.getCenter();
    const centerChanged = (
      Math.abs(previousCenter.current.latitude - center.latitude) > 0.000001
      || Math.abs(previousCenter.current.longitude - center.longitude) > 0.000001
    );
    const radiusChanged = previousRadiusKm.current !== radiusKm;
    const mapAlreadyAtCenter = currentCenter
      && Math.abs(currentCenter.lat() - center.latitude) < 0.00001
      && Math.abs(currentCenter.lng() - center.longitude) < 0.00001;

    if (centerChanged && !mapAlreadyAtCenter) {
      map.setCenter({ lat: center.latitude, lng: center.longitude });
      map.setZoom(zoom);
    } else if (radiusChanged) {
      map.setZoom(zoom);
    }

    previousCenter.current = center;
    previousRadiusKm.current = radiusKm;
  }, [center.latitude, center.longitude, radiusKm, zoom]);

  useEffect(() => {
    if (!mapApi || !mapInstance.current) return;
    renderedMarkers.current.forEach((marker) => marker.setMap(null));

    const points: { position: { lat: number; lng: number }; title: string; label: string; click?: () => void }[] = markers.flatMap((marker) => {
      if (!marker.coordinate || !Number.isFinite(marker.coordinate.latitude) || !Number.isFinite(marker.coordinate.longitude)) return [];
      return [{
        position: { lat: marker.coordinate.latitude, lng: marker.coordinate.longitude },
        title: marker.label,
        label: marker.label,
        click: marker.onPress,
      }];
    });

    if (selectedCoordinate) {
      points.push({
        position: { lat: selectedCoordinate.latitude, lng: selectedCoordinate.longitude },
        title: 'Seçilen konum',
        label: '●',
      });
    }

    renderedMarkers.current = points.map((point) => {
      const marker = new mapApi.Marker({
        map: mapInstance.current!,
        position: point.position,
        title: point.title,
        label: point.label,
      });
      if (point.click) marker.addListener('click', point.click);
      return marker;
    });
  }, [mapApi, markers, selectedCoordinate]);

  return (
    <View style={[styles.container, style]}>
      <div ref={mapElement} style={{ width: '100%', height: '100%' }} />
      {!mapApi && (
        <View style={styles.statusOverlay}>
          {visibleError
            ? <Ionicons name="map-outline" size={30} color={theme.COLORS.textSecondary} />
            : <ActivityIndicator size="large" color={theme.COLORS.primary} />}
          <Text style={styles.statusText}>{visibleError || 'Harita yükleniyor...'}</Text>
          {visibleError ? <Text style={styles.hintText}>EXPO_PUBLIC_GOOGLE_MAPS_API_KEY değişkenini ayarlayın.</Text> : null}
        </View>
      )}
      {onSelectLocation && mapApi && (
        <View pointerEvents="none" style={styles.selectHint}>
          <Text style={styles.selectHintText}>İşletme konumunu seçmek için haritaya dokunun</Text>
        </View>
      )}
      {!onSelectLocation && mapApi && markers.length === 0 && (
        <Pressable style={styles.mapNotice} onPress={() => undefined} accessibilityRole="text">
          <Text style={styles.mapNoticeText}>Bu bölgede haritada gösterilecek çanta bulunamadı.</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 240, overflow: 'hidden', backgroundColor: '#e8e5dc' },
  statusOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: theme.SIZES.l, backgroundColor: theme.COLORS.background },
  statusText: { ...theme.FONTS.body1, color: theme.COLORS.text, textAlign: 'center', marginTop: theme.SIZES.s },
  hintText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textAlign: 'center', marginTop: theme.SIZES.xs },
  selectHint: { position: 'absolute', top: theme.SIZES.m, alignSelf: 'center', paddingHorizontal: theme.SIZES.m, paddingVertical: theme.SIZES.s, borderRadius: theme.SIZES.radius, backgroundColor: 'rgba(255,255,255,0.94)' },
  selectHintText: { ...theme.FONTS.caption, color: theme.COLORS.text },
  mapNotice: { position: 'absolute', bottom: theme.SIZES.m, alignSelf: 'center', paddingHorizontal: theme.SIZES.m, paddingVertical: theme.SIZES.s, borderRadius: theme.SIZES.radius, backgroundColor: 'rgba(255,255,255,0.94)' },
  mapNoticeText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
});

export default WebMapCanvas;
