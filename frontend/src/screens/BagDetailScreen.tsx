import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { favoritesService } from '../services/favorites.service';
import { bagService } from '../services/bag.service';

const BagDetailScreen = ({ route, navigation }: any) => {
  const bag = route.params?.bag;
  const listingId = route.params?.listingId;
  if (bag) return <BagDetailContent bag={bag} navigation={navigation} />;
  if (listingId) return <NotificationBagDetail key={listingId} listingId={listingId} navigation={navigation} />;

  return (
    <SafeAreaView style={[styles.container, styles.missingBagContainer]}>
      <Ionicons name="alert-circle-outline" size={44} color={theme.COLORS.error} />
      <Text style={styles.missingBagTitle}>Çanta bilgisi bulunamadı</Text>
      <TouchableOpacity style={styles.missingBagButton} onPress={() => navigation.goBack()} accessibilityRole="button">
        <Text style={styles.missingBagButtonText}>Geri dön</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const NotificationBagDetail = ({ listingId, navigation }: any) => {
  const [bag, setBag] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    bagService.getBagDetail(listingId)
      .then((listing) => {
        if (!isCancelled) setBag(listing);
      })
      .catch((error) => {
        console.error('Push bildirimindeki ilan yüklenemedi:', error);
        if (!isCancelled) setLoadError('İlan bilgisi yüklenemedi. Bağlantını kontrol edip tekrar dene.');
      });

    return () => {
      isCancelled = true;
    };
  }, [listingId, retryCount]);

  if (bag) return <BagDetailContent bag={bag} navigation={navigation} />;
  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, styles.missingBagContainer]}>
        <Ionicons name="alert-circle-outline" size={44} color={theme.COLORS.error} />
        <Text style={styles.missingBagTitle}>{loadError}</Text>
        <TouchableOpacity
          style={styles.missingBagButton}
          onPress={() => {
            setLoadError('');
            setRetryCount((count) => count + 1);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.missingBagButtonText}>Tekrar dene</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.container, styles.missingBagContainer]}>
      <Text style={styles.missingBagTitle}>Çanta bilgisi yükleniyor...</Text>
    </SafeAreaView>
  );
};

const BagDetailContent = ({ bag, navigation }: any) => {
  const contentTags: string[] = Array.isArray(bag?.contentTags)
    ? bag.contentTags.filter((tag: unknown): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : [];
  const description = typeof bag?.description === 'string' && bag.description.trim()
    ? bag.description
    : 'İşletme bu çanta için açıklama paylaşmadı.';
  const allergenNote = typeof bag?.allergenNote === 'string' && bag.allergenNote.trim()
    ? bag.allergenNote
    : 'Alerjen bilgisi paylaşılmamış. Alerjin varsa rezervasyondan önce işletmeye danış.';
  const [isSaved, setIsSaved] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  useEffect(() => {
    if (!bag?.businessId) return;
    favoritesService.isBusinessFavorited(bag.businessId)
      .then(setIsSaved)
      .catch((error) => console.error('Favori işletme yüklenemedi:', error));
  }, [bag?.businessId]);

  const toggleFavorite = async () => {
    if (!bag?.businessId || isUpdatingFavorite) return;
    setIsUpdatingFavorite(true);
    try {
      await favoritesService.setFavorite(bag.businessId, isSaved);
      setIsSaved((saved) => !saved);
    } catch (error) {
      console.error('Favori işletme güncellenemedi:', error);
      Alert.alert('Hata', 'Favori işletme güncellenemedi. Giriş yaptığından emin olup tekrar dene.');
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  const openDirections = async () => {
    const coordinate = bag?.coordinate;
    if (!coordinate || !Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
      Alert.alert('Konum bulunamadı', 'Bu işletme için yol tarifi alınabilecek bir konum bilgisi yok.');
      return;
    }

    const destination = encodeURIComponent(`${coordinate.latitude},${coordinate.longitude}`);
    try {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    } catch (error) {
      console.error('Yol tarifi açılamadı:', error);
      Alert.alert('Yol tarifi açılamadı', 'Harita uygulaması açılamadı. Lütfen tekrar dene.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Çanta detayları</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={toggleFavorite} accessibilityRole="button" accessibilityLabel={isSaved ? 'Kaydedilenlerden çıkar' : 'Çantayı kaydet'}>
          <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={24} color={theme.COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Görsel */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: bag.imageUrl }}
            style={styles.image}
          />
          <View style={styles.tag}>
            <Text style={styles.tagText}>{bag.remainingBags < 3 ? 'Tükenmek üzere!' : `${bag.remainingBags} çanta kaldı`}</Text>
          </View>
        </View>

        {/* Ana Bilgiler */}
        <View style={styles.content}>
          <Text style={styles.businessName}>{bag.businessName}</Text>
          <Text style={styles.title}>{bag.bagType}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="sparkles" size={20} color={theme.COLORS.primary} />
            <Text style={styles.infoTitle}>İçindekiler sürpriz!</Text>
          </View>
          <Text style={styles.infoDesc}>
            İçerik, gün sonunda kalanlara göre değişir. Belirli bir ürün ya da miktar garanti edilmez.
          </Text>

          {contentTags.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Çantada bulunabilecekler</Text>
              <View style={styles.tagsContainer}>
                {contentTags.map((item) => (
                  <View key={item} style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Uyarı Kutusu */}
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color={theme.COLORS.textSecondary} />
            <Text style={styles.warningText}>{allergenNote}</Text>
          </View>

          {/* Teslimat Bilgisi */}
          <View style={styles.deliveryBox}>
            <View style={styles.deliveryIconBox}>
              <Ionicons name="time-outline" size={24} color={theme.COLORS.primary} />
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>TESLİM ALMA ZAMANI</Text>
              <Text style={styles.deliveryTime}>{bag.timeInfo}</Text>
              <Text style={styles.deliveryAddress}>{bag.businessName}</Text>
              <Text style={styles.deliveryAddressDetail}>
                {bag.distance ? `Mesafe: ${bag.distance}` : 'Konum bilgisi paylaşılmamış'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('MainFlow', { screen: 'Map' } as any)}>
                <Text style={styles.mapLink}>İşletmeyi gör {'>'}</Text>
              </TouchableOpacity>
              {bag.coordinate && Number.isFinite(bag.coordinate.latitude) && Number.isFinite(bag.coordinate.longitude) && (
                <TouchableOpacity
                  style={styles.directionsButton}
                  onPress={openDirections}
                  accessibilityRole="button"
                  accessibilityLabel="Google Haritalar'da yol tarifi al"
                >
                  <Ionicons name="navigate-outline" size={18} color={theme.COLORS.card} />
                  <Text style={styles.directionsButtonText}>Yol tarifi al</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Alt Sabit Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{bag.price} ₺</Text>
          <Text style={styles.originalPrice}>{bag.originalPrice} ₺</Text>
        </View>
        <TouchableOpacity
          style={styles.reserveBtn}
          onPress={() => navigation.navigate('ReservationReview', { bag })}
        >
          <Text style={styles.reserveBtnText}>Çantayı ayırt</Text>
          <Ionicons name="arrow-forward" size={20} color={theme.COLORS.card} />
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
  missingBagContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.SIZES.xl,
  },
  missingBagTitle: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
    marginVertical: theme.SIZES.m,
  },
  missingBagButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.SIZES.l,
    borderRadius: theme.SIZES.buttonRadius,
    backgroundColor: theme.COLORS.primary,
  },
  missingBagButtonText: {
    ...theme.FONTS.body2,
    color: theme.COLORS.card,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.SIZES.l,
    paddingVertical: theme.SIZES.m,
  },
  headerTitle: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
  },
  iconBtn: {
    padding: theme.SIZES.xs,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tag: {
    position: 'absolute',
    top: theme.SIZES.m,
    left: theme.SIZES.m,
    backgroundColor: theme.COLORS.card,
    paddingHorizontal: theme.SIZES.s,
    paddingVertical: 6,
    borderRadius: theme.SIZES.radius,
  },
  tagText: {
    ...theme.FONTS.caption,
    fontWeight: '600',
    color: theme.COLORS.primary,
  },
  content: {
    padding: theme.SIZES.l,
  },
  businessName: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
    marginBottom: 4,
  },
  title: {
    ...theme.FONTS.h1,
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.s,
  },
  description: {
    ...theme.FONTS.body1,
    color: theme.COLORS.textSecondary,
    marginBottom: theme.SIZES.l,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoTitle: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
  },
  infoDesc: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: theme.SIZES.l,
  },
  sectionTitle: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.m,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.SIZES.s,
    marginBottom: theme.SIZES.l,
  },
  categoryTag: {
    paddingHorizontal: theme.SIZES.m,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  categoryTagText: {
    ...theme.FONTS.body2,
    color: theme.COLORS.text,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.COLORS.background,
    padding: theme.SIZES.m,
    borderRadius: theme.SIZES.radius,
    gap: theme.SIZES.s,
    marginBottom: theme.SIZES.xl,
  },
  warningText: {
    flex: 1,
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    lineHeight: 18,
  },
  deliveryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.SIZES.m,
  },
  deliveryIconBox: {
    width: 40,
    alignItems: 'center',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginBottom: 4,
  },
  deliveryTime: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.m,
  },
  deliveryAddress: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.text,
  },
  deliveryAddressDetail: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginBottom: theme.SIZES.s,
  },
  mapLink: {
    ...theme.FONTS.body2,
    color: theme.COLORS.primary,
    fontWeight: '600',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.SIZES.xs,
    marginTop: theme.SIZES.m,
    paddingHorizontal: theme.SIZES.m,
    paddingVertical: theme.SIZES.s,
    borderRadius: theme.SIZES.buttonRadius,
    backgroundColor: theme.COLORS.primary,
  },
  directionsButtonText: {
    ...theme.FONTS.body2,
    color: theme.COLORS.card,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.SIZES.l,
    backgroundColor: theme.COLORS.card,
    borderTopWidth: 1,
    borderTopColor: theme.COLORS.border,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.s,
  },
  price: {
    ...theme.FONTS.h2,
    color: theme.COLORS.text,
  },
  originalPrice: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  reserveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.COLORS.primary,
    paddingHorizontal: theme.SIZES.xl,
    paddingVertical: theme.SIZES.m,
    borderRadius: theme.SIZES.buttonRadius,
    gap: theme.SIZES.xs,
  },
  reserveBtnText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.card,
  },
});

export default BagDetailScreen;
