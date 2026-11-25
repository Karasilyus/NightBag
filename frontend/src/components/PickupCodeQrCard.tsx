import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import theme from '../constants/theme';

interface PickupCodeQrCardProps {
  code: string;
  size?: number;
}

const PickupCodeQrCard = ({ code, size = 180 }: PickupCodeQrCardProps) => (
  <View style={styles.container}>
    <View
      style={styles.qrFrame}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Teslim alma QR kodu: ${code}`}
    >
      <QRCode
        value={code}
        size={size}
        color={theme.COLORS.primary}
        backgroundColor={theme.COLORS.card}
        quietZone={10}
      />
    </View>
    <Text style={styles.code}>{code}</Text>
    <Text style={styles.hint}>İşletmede QR kodunu okut veya teslim alma kodunu göster.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.SIZES.s,
    marginTop: theme.SIZES.m,
  },
  qrFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.SIZES.s,
    backgroundColor: theme.COLORS.card,
    borderRadius: theme.SIZES.radius,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  code: {
    ...theme.FONTS.h3,
    color: theme.COLORS.primary,
    letterSpacing: 2,
  },
  hint: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default PickupCodeQrCard;
