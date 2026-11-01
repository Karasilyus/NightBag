import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import theme from '../constants/theme';

interface DistanceSliderProps {
  value: number;
  onCommit: (value: number) => void;
}

const MIN_DISTANCE = 2;
const MAX_DISTANCE = 50;

const clampDistance = (value: number) => (
  Number.isFinite(value)
    ? Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, Math.round(value)))
    : MIN_DISTANCE
);

const DistanceSlider = ({ value, onCommit }: DistanceSliderProps) => {
  const [selectedValue, setSelectedValue] = useState(clampDistance(value));

  const updateValue = (nextValue: number) => {
    const clampedValue = clampDistance(nextValue);
    setSelectedValue(clampedValue);
    return clampedValue;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Mesafe</Text>
      <View style={styles.controls}>
        {React.createElement('input', {
          type: 'range',
          min: MIN_DISTANCE,
          max: MAX_DISTANCE,
          step: 1,
          value: selectedValue,
          'aria-label': 'Arama mesafesi',
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            updateValue(event.currentTarget.valueAsNumber);
          },
          onMouseUp: (event: React.MouseEvent<HTMLInputElement>) => {
            onCommit(updateValue(event.currentTarget.valueAsNumber));
          },
          onTouchEnd: (event: React.TouchEvent<HTMLInputElement>) => {
            onCommit(updateValue(event.currentTarget.valueAsNumber));
          },
          onKeyUp: (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
              onCommit(updateValue(event.currentTarget.valueAsNumber));
            }
          },
          style: {
            width: 110,
            height: 28,
            margin: 0,
            accentColor: theme.COLORS.primary,
            cursor: 'pointer',
            touchAction: 'none',
          },
        })}
        <Text style={styles.value}>{selectedValue >= MAX_DISTANCE ? '50 km' : `${selectedValue} km`}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tüm mesafeyi göster"
          onPress={() => {
            setSelectedValue(MAX_DISTANCE);
            onCommit(MAX_DISTANCE);
          }}
          style={styles.allButton}
        >
          Tümü
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
