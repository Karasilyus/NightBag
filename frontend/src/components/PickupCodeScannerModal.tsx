import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

interface PickupCodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
}

const PickupCodeScannerModal = ({
  visible,
  onClose,
  onCodeScanned,
}: PickupCodeScannerModalProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setHasScanned(false)}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="QR okuyucuyu kapat"
          >
            <Ionicons name="close" size={24} color={theme.COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Teslim kodunu okut</Text>
          <View style={styles.closeButton} />
        </View>

        {permission === null ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator size="large" color={theme.COLORS.primary} />
            <Text style={styles.message}>Kamera izni kontrol ediliyor.</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.messageContainer}>
            <Ionicons name="camera-outline" size={40} color={theme.COLORS.primary} />
            <Text style={styles.message}>Teslim kodlarını okutmak için kamera izni gerekli.</Text>
            {permission.canAskAgain ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  void requestPermission();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>Kamera izni ver</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.message}>Kamera erişimini cihaz ayarlarından etkinleştirip tekrar dene.</Text>
            )}
          </View>
        ) : (
          <View style={styles.scannerContent}>
            <Text style={styles.subtitle}>Müşterinin NightBag QR kodunu çerçeveye alın.</Text>
            <View style={styles.cameraFrame}>
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={hasScanned ? undefined : ({ data }) => {
                  setHasScanned(true);
                  onCodeScanned(data);
                }}
              />
              <View pointerEvents="none" style={styles.scanTarget} />
            </View>
            {hasScanned ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setHasScanned(false)}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Yeniden tara</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.SIZES.m,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
  },
  messageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.SIZES.xl,
    gap: theme.SIZES.m,
  },
  message: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.SIZES.l,
    backgroundColor: theme.COLORS.primary,
    borderRadius: theme.SIZES.buttonRadius,
  },
  primaryButtonText: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.card,
  },
  scannerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.SIZES.l,
    gap: theme.SIZES.l,
  },
  subtitle: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
    textAlign: 'center',
  },
  cameraFrame: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: theme.SIZES.cardRadius,
    backgroundColor: '#1E2922',
  },
  scanTarget: {
    position: 'absolute',
    top: '18%',
    left: '18%',
    right: '18%',
    bottom: '18%',
    borderWidth: 3,
    borderColor: theme.COLORS.card,
    borderRadius: theme.SIZES.radius,
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.SIZES.l,
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
    borderRadius: theme.SIZES.buttonRadius,
  },
  secondaryButtonText: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.primary,
  },
});

export default PickupCodeScannerModal;
