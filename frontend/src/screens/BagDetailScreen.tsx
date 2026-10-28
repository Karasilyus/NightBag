import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

const BagDetailScreen = ({ route, navigation }: any) => {
  const bag = route.params?.bag;

  if (!bag) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Çanta detayları</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="heart-outline" size={24} color={theme.COLORS.text} />
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
          <Text style={styles.description}>
            Mahallenin işletmesinden, günün son lezzetleri.
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="sparkles" size={20} color={theme.COLORS.primary} />
            <Text style={styles.infoTitle}>İçindekiler sürpriz!</Text>
          </View>
          <Text style={styles.infoDesc}>
            İçerik, gün sonunda kalanlara göre değişir. Belirli bir ürün ya da miktar garanti edilmez.
          </Text>

          {/* Çanta İçeriği Etiketleri */}
          <Text style={styles.sectionTitle}>Çantada bulunabilecekler</Text>
          <View style={styles.tagsContainer}>
            {['Ekmek', 'Hamur İşi', 'Tatlı'].map((item, index) => (
              <View key={index} style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Uyarı Kutusu */}
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color={theme.COLORS.textSecondary} />
            <Text style={styles.warningText}>
              Glüten, süt, yumurta ve kuruyemiş içerebilir. Alerjin varsa ayırtmadan önce işletmeye danış.
            </Text>
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
              <Text style={styles.deliveryAddressDetail}>Kadıköy ({bag.distance})</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MainFlow', { screen: 'Map' } as any)}>
                <Text style={styles.mapLink}>İşletmeyi gör {'>'}</Text>
              </TouchableOpacity>
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
