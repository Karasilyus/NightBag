import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { favoritesService } from '../services/favorites.service';

interface SurpriseBagCardProps {
  id?: string;
  businessId?: string;
  businessName: string;
  bagType: string;
  distance: string;
  timeInfo: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  remainingBags: number;
  isMapCard?: boolean; // Harita sayfasındaki yatay kartlar için
  isMapSidebarCard?: boolean;
  webGrid?: boolean;
  gridWidth?: ViewStyle['width'];
}

const SurpriseBagCard: React.FC<SurpriseBagCardProps> = (props) => {
  const {
    businessName,
    bagType,
    distance,
    timeInfo,
    price,
    originalPrice,
    imageUrl,
    remainingBags,
    isMapCard = false,
    isMapSidebarCard = false,
    webGrid = false,
    gridWidth = '48%',
  } = props;
  const navigation = useNavigation<any>();
  const [isSaved, setIsSaved] = React.useState(false);
  const [isFavoriteReady, setIsFavoriteReady] = React.useState(false);
  const [favoriteLoadFailed, setFavoriteLoadFailed] = React.useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const unsubscribe = favoritesService.subscribe((businessId, isFavorite) => {
      if (businessId === props.businessId) setIsSaved(isFavorite);
    });
    favoritesService.isBusinessFavorited(props.businessId || '')
      .then((isFavorite) => {
        if (isMounted) {
          setIsSaved(isFavorite);
          setFavoriteLoadFailed(false);
          setIsFavoriteReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFavoriteLoadFailed(true);
          setIsFavoriteReady(true);
        }
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [props.businessId]);

  const toggleFavorite = async (event: any) => {
    event.stopPropagation();
    if (!props.businessId) {
      Alert.alert('Favoriye eklenemedi', 'Bu işletmenin kimliği bulunamadı.');
      return;
    }
    if (!isFavoriteReady) {
      Alert.alert('Favoriler yüklenemedi', 'İşletme favorileri yüklenmeden bu işlem yapılamıyor. Lütfen tekrar deneyin.');
      return;
    }

    setIsSavingFavorite(true);
    try {
      let currentFavorite = isSaved;
      if (favoriteLoadFailed) {
        currentFavorite = await favoritesService.isBusinessFavorited(props.businessId);
        setIsSaved(currentFavorite);
        setFavoriteLoadFailed(false);
      }
      await favoritesService.setFavorite(props.businessId, currentFavorite);
    } catch (error) {
      console.error('Favori güncellenemedi:', error);
      Alert.alert('Hata', 'Favori güncellenemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSavingFavorite(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        webGrid && { width: gridWidth, marginBottom: 0 },
        isMapCard && styles.mapCard,
        isMapSidebarCard && styles.mapSidebarCard,
      ]}
      onPress={() => navigation.navigate('BagDetails', { bag: { id: props.id, businessId: props.businessId, businessName, bagType, distance, timeInfo, price, originalPrice, imageUrl, remainingBags } })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        
        {/* Sol Üst Etiket */}
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {remainingBags < 3 ? 'Tükenmek üzere!' : `${remainingBags} çanta`}
          </Text>
        </View>

        {/* Sağ Üst Favori Butonu */}
        <TouchableOpacity
          style={[styles.favoriteBtn, (!isFavoriteReady || isSavingFavorite) && styles.favoriteBtnDisabled]}
          onPress={toggleFavorite}
          disabled={!isFavoriteReady || isSavingFavorite}
          accessibilityRole="button"
          accessibilityLabel={favoriteLoadFailed
            ? 'Favori durumu yüklenemedi; dokunarak tekrar dene'
            : isSaved ? 'İşletmeyi favorilerden çıkar' : 'İşletmeyi favorilere ekle'}
        >
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={20} color={theme.COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.businessName}>{businessName}</Text>
        <Text style={styles.bagInfo}>{bagType} • {distance}</Text>
        
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={theme.COLORS.textSecondary} />
          <Text style={styles.timeText}>{timeInfo}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{price} ₺</Text>
          <Text style={styles.originalPrice}>{originalPrice} ₺</Text>
        </View>
        
        {isMapCard && (
          <View style={styles.reserveBtn} pointerEvents="none">
            <Text style={styles.reserveBtnText}>Çantayı İncele</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.COLORS.card} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.COLORS.card,
    borderRadius: theme.SIZES.cardRadius,
    overflow: 'hidden',
    marginBottom: theme.SIZES.l,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  mapCard: {
    width: 280,
    marginRight: theme.SIZES.m,
    marginBottom: 0,
  },
  mapSidebarCard: {
    width: '100%',
    marginBottom: theme.SIZES.m,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tag: {
    position: 'absolute',
    top: theme.SIZES.s,
    left: theme.SIZES.s,
    backgroundColor: theme.COLORS.card,
    paddingHorizontal: theme.SIZES.s,
    paddingVertical: 4,
    borderRadius: theme.SIZES.radius,
  },
  tagText: {
    ...theme.FONTS.caption,
    fontWeight: '600',
    color: theme.COLORS.primary,
  },
  favoriteBtn: {
    position: 'absolute',
    top: theme.SIZES.s,
    right: theme.SIZES.s,
    backgroundColor: theme.COLORS.card,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBtnDisabled: {
    opacity: 0.55,
  },
  content: {
    padding: theme.SIZES.m,
  },
  businessName: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
    marginBottom: 4,
  },
  bagInfo: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginBottom: theme.SIZES.s,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: theme.SIZES.s,
  },
  timeText: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.s,
  },
  price: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
  },
  originalPrice: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  reserveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.COLORS.primary,
    paddingVertical: theme.SIZES.s,
    borderRadius: theme.SIZES.buttonRadius,
    marginTop: theme.SIZES.m,
    gap: theme.SIZES.xs,
  },
  reserveBtnText: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.card,
  },
});

export default SurpriseBagCard;
