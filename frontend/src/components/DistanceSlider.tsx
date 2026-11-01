import React, { useCallback, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import theme from '../constants/theme';

interface DistanceSliderProps {
  value: number;
  onCommit: (value: number) => void;
}

const MIN_DISTANCE = 2;
const MAX_DISTANCE = 50;
const TRACK_WIDTH = 110;

const DistanceSlider = ({ value, onCommit }: DistanceSliderProps) => {
  const [selectedValue, setSelectedValue] = useState(value);

  const getValueFromLocation = useCallback((locationX: number) => {
    const ratio = Math.max(0, Math.min(1, locationX / TRACK_WIDTH));
    return Math.round(MIN_DISTANCE + ratio * (MAX_DISTANCE - MIN_DISTANCE));
  }, []);

  const updateValue = useCallback((locationX: number) => {
    const nextValue = getValueFromLocation(locationX);
    setSelectedValue(nextValue);
    return nextValue;
  }, [getValueFromLocation]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => updateValue(event.nativeEvent.locationX),
    onPanResponderMove: (event) => updateValue(event.nativeEvent.locationX),
    onPanResponderRelease: (event) => onCommit(updateValue(event.nativeEvent.locationX)),
    onPanResponderTerminate: (event) => onCommit(updateValue(event.nativeEvent.locationX)),
  }), [onCommit, updateValue]);

  const selectAll = () => {
    setSelectedValue(MAX_DISTANCE);
    onCommit(MAX_DISTANCE);
  };

  const progress = ((selectedValue - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE)) * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Mesafe</Text>
      <View style={styles.controls}>
        <View
          style={styles.trackTouchArea}
          {...panResponder.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel="Arama mesafesi"
          accessibilityValue={{ min: MIN_DISTANCE, max: MAX_DISTANCE, now: selectedValue }}
          accessibilityActions={[
            { name: 'increment', label: 'Mesafeyi artır' },
            { name: 'decrement', label: 'Mesafeyi azalt' },
          ]}
          onAccessibilityAction={(event) => {
            const adjustment = event.nativeEvent.actionName === 'increment' ? 1 : -1;
            const nextValue = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, selectedValue + adjustment));
            setSelectedValue(nextValue);
            onCommit(nextValue);
          }}
        >
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${progress}%` }]} />
            <View style={[styles.thumb, { left: `${progress}%` }]} />
          </View>
        </View>
        <Text style={styles.value}>{selectedValue >= MAX_DISTANCE ? '50 km+' : `${selectedValue} km`}</Text>
        <TouchableOpacity onPress={selectAll} accessibilityRole="button" accessibilityLabel="Tüm mesafeyi göster">
          <Text style={styles.allButton}>Tümü</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 220,
    justifyContent: 'center',
    marginLeft: theme.SIZES.s,
    paddingHorizontal: theme.SIZES.s,
  },
  label: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginBottom: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.xs,
  },
  trackTouchArea: {
    width: TRACK_WIDTH,
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.COLORS.border,
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.COLORS.primary,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: theme.COLORS.card,
    borderWidth: 2,
    borderColor: theme.COLORS.primary,
  },
  value: {
    ...theme.FONTS.caption,
    minWidth: 42,
    color: theme.COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  allButton: {
    ...theme.FONTS.caption,
    color: theme.COLORS.primary,
    fontWeight: '700',
    paddingVertical: theme.SIZES.xs,
  },
});

export default DistanceSlider;
