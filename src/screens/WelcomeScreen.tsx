import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import theme from '../constants/theme';

const WelcomeScreen = ({ navigation }: any) => {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleUseMyLocation = async () => {
    setIsLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erişim Reddedildi', 'Sana yakın işletmeleri bulabilmemiz için konum iznine ihtiyacımız var.');
        setIsLoadingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      // Konum başarıyla alındı, normalde burada Context veya Redux'a kaydedilir
      navigation.replace('MainFlow');
    } catch (error) {
      Alert.alert('Hata', 'Konum alınırken bir sorun oluştu.');
    } finally {
      setIsLoadingLocation(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Beyaz arka planlı üst kısım */}
        <View style={styles.topSection}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="shopping" size={24} color={theme.COLORS.primary} />
              <Text style={styles.logoText}>NightBag</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
              <Text style={styles.loginText}>Giriş yap</Text>
            </TouchableOpacity>
          </View>

          {/* Görsel Alanı */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop' }}
              style={styles.image}
            />
            <View style={styles.badge}>
              <MaterialCommunityIcons name="thumb-up-outline" size={14} color={theme.COLORS.primary} />
              <Text style={styles.badgeText}>İyi lezzet, iyi şans</Text>
            </View>
          </View>

          {/* Açıklama Metinleri */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Güzel lezzetler.{"\n"}Yeni bir şans.</Text>
            <Text style={styles.subtitle}>
              Günün sonunda kalan taze lezzetleri, sürpriz bir çantada. Yakındaki işletmelerden indirimli fiyata ayırt, israfı azalt.
            </Text>
          </View>

          {/* 3'lü İkonlar (Yakınınızda keşfedin vs) */}
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Ionicons name="location-outline" size={24} color={theme.COLORS.text} />
              <Text style={styles.featureText}>Yakınınızda keşfedin</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="shopping-outline" size={24} color={theme.COLORS.text} />
              <Text style={styles.featureText}>Sürpriz çantaları alın</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="leaf-outline" size={24} color={theme.COLORS.text} />
              <Text style={styles.featureText}>İsrafı azaltın</Text>
            </View>
          </View>
        </View>

        {/* Alt Kısım (Krem Arka Plan) */}
        <View style={styles.bottomSection}>
          <View style={styles.locationInfoContainer}>
            <View style={styles.locationIconWrapper}>
              <Ionicons name="locate" size={20} color={theme.COLORS.primary} />
            </View>
            <View style={styles.locationTextWrapper}>
              <Text style={styles.locationTitle}>Sana yakın çantaları bulalım</Text>
              <Text style={styles.locationDesc}>
                Konumunu yalnızca yakındaki fırsatları göstermek için kullanırız.
              </Text>
            </View>
          </View>

          {/* Butonlar */}
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleUseMyLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator color={theme.COLORS.card} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Konumumu kullan</Text>
                <Ionicons name="arrow-forward" size={20} color={theme.COLORS.card} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('LocationPicker')}
          >
            <Text style={styles.secondaryButtonText}>Konumu kendim seç</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    backgroundColor: theme.COLORS.card,
    borderBottomLeftRadius: theme.SIZES.xxl,
    borderBottomRightRadius: theme.SIZES.xxl,
    paddingHorizontal: theme.SIZES.l,
    paddingTop: theme.SIZES.xl,
    paddingBottom: theme.SIZES.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.SIZES.l,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.xs,
  },
  logoText: {
    ...theme.FONTS.h2,
    color: theme.COLORS.primary,
  },
  loginText: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.text,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    borderRadius: theme.SIZES.cardRadius,
    overflow: 'hidden',
    marginBottom: theme.SIZES.l,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: theme.SIZES.m,
    left: theme.SIZES.m,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.COLORS.card,
    paddingHorizontal: theme.SIZES.s,
    paddingVertical: theme.SIZES.xs,
    borderRadius: theme.SIZES.radius,
    gap: theme.SIZES.xs,
  },
  badgeText: {
    ...theme.FONTS.caption,
    fontWeight: '600',
    color: theme.COLORS.text,
  },
  textContainer: {
    marginBottom: theme.SIZES.xl,
  },
  title: {
    ...theme.FONTS.h1,
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.m,
  },
  subtitle: {
    ...theme.FONTS.body1,
    color: theme.COLORS.textSecondary,
    lineHeight: 24,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.SIZES.xs,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
    gap: theme.SIZES.s,
  },
  featureText: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    textAlign: 'center',
  },
  bottomSection: {
    padding: theme.SIZES.l,
    paddingTop: theme.SIZES.xl,
  },
  locationInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.SIZES.xl,
    gap: theme.SIZES.m,
  },
  locationIconWrapper: {
    backgroundColor: theme.COLORS.tagBackground,
    padding: theme.SIZES.s,
    borderRadius: theme.SIZES.radius,
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationTitle: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.xs,
  },
  locationDesc: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: theme.COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.SIZES.m,
    borderRadius: theme.SIZES.buttonRadius,
    marginBottom: theme.SIZES.m,
    gap: theme.SIZES.s,
  },
  primaryButtonText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.card,
  },
  secondaryButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.SIZES.m,
  },
  secondaryButtonText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.textSecondary,
  },
});

export default WelcomeScreen;
