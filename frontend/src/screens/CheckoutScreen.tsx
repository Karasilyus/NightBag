import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

const CheckoutScreen = ({ navigation }: any) => {
  const [quantity, setQuantity] = useState(1);
  const pricePerBag = 125;

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Çantanı ayırt</Text>
        {/* Sağ taraf boşluğu dengelemek için */}
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subHeader}>Son bir kontrol, sonra hazırsın.</Text>

        {/* Çanta Özeti Kartı */}
        <View style={styles.bagCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop' }} 
            style={styles.cardImage} 
          />
          <View style={styles.cardInfo}>
            <Text style={styles.businessName}>Moda Fırını</Text>
            <Text style={styles.bagTitle}>Fırın sürpriz çantası</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{pricePerBag} ₺</Text>
              <Text style={styles.originalPrice}>350 ₺</Text>
            </View>
            <Text style={styles.timeInfo}>Bugün, 20.00-21.00</Text>
          </View>
        </View>

        {/* Çanta Adedi */}
        <View style={styles.quantitySection}>
          <View>
            <Text style={styles.sectionTitle}>Çanta adedi</Text>
            <Text style={styles.quantityDesc}>En fazla 4 çanta</Text>
          </View>
          <View style={styles.quantityControl}>
            <TouchableOpacity 
              style={[styles.qBtn, quantity <= 1 && styles.qBtnDisabled]} 
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Ionicons name="remove" size={20} color={quantity <= 1 ? theme.COLORS.border : theme.COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.qText}>{quantity}</Text>
            <TouchableOpacity 
              style={[styles.qBtn, quantity >= 4 && styles.qBtnDisabled]} 
              onPress={() => setQuantity(Math.min(4, quantity + 1))}
              disabled={quantity >= 4}
            >
              <Ionicons name="add" size={20} color={theme.COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Teslim Alma Bilgileri */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Teslim alma bilgileri</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.COLORS.text} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoBold}>6 Ekim, Salı • 20.00-21.00</Text>
              <Text style={styles.infoLight}>Moda Fırını • Moda Cad. No: 42, Kadıköy</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="storefront-outline" size={20} color={theme.COLORS.text} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoBold}>Çantanı işletmede teslim al</Text>
              <Text style={styles.infoLight}>Belirtilen saatte git ve rezervasyon kodunu göster. İçerik gün sonunda kalanlara göre değişir.</Text>
            </View>
          </View>
        </View>

        {/* Toplam Tutar */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{quantity} × Fırın sürpriz çantası</Text>
            <Text style={styles.totalValue}>{quantity * pricePerBag} ₺</Text>
          </View>
          <View style={styles.totalSummaryRow}>
            <Text style={styles.totalSummaryLabel}>Toplam</Text>
            <Text style={styles.totalSummaryValue}>{quantity * pricePerBag} ₺</Text>
          </View>
          
          <View style={styles.agreementBox}>
            <Ionicons name="checkmark-circle" size={20} color={theme.COLORS.primary} />
            <Text style={styles.agreementText}>
              Teslim saatinde işletmede olacağımı ve çanta içeriğini kabul ettiğimi onaylıyorum.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* Alt Sabit Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.confirmBtn} 
          onPress={() => navigation.navigate('ReservationConfirmed')}
        >
          <Text style={styles.confirmBtnText}>Rezervasyonu onayla</Text>
          <Ionicons name="arrow-forward" size={20} color={theme.COLORS.card} />
        </TouchableOpacity>
        <Text style={styles.bottomNote}>Bu adımda ödeme alınmaz.</Text>
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
    width: 40,
    alignItems: 'flex-start',
  },
  subHeader: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: theme.SIZES.l,
  },
  scrollContent: {
    padding: theme.SIZES.l,
    paddingBottom: 120,
  },
  bagCard: {
    flexDirection: 'row',
    backgroundColor: theme.COLORS.background,
    borderRadius: theme.SIZES.radius,
    padding: theme.SIZES.s,
    marginBottom: theme.SIZES.xl,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: theme.SIZES.radius,
  },
  cardInfo: {
    flex: 1,
    marginLeft: theme.SIZES.m,
    justifyContent: 'center',
  },
  businessName: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
  },
  bagTitle: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.text,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  price: {
    ...theme.FONTS.body1,
    fontWeight: '700',
    color: theme.COLORS.text,
  },
  originalPrice: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  timeInfo: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.SIZES.l,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.border,
    marginBottom: theme.SIZES.l,
  },
  sectionTitle: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.text,
    marginBottom: 4,
  },
  quantityDesc: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.m,
  },
  qBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qBtnDisabled: {
    opacity: 0.5,
  },
  qText: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
    width: 20,
    textAlign: 'center',
  },
  infoSection: {
    paddingBottom: theme.SIZES.l,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.border,
    marginBottom: theme.SIZES.l,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.SIZES.m,
    marginTop: theme.SIZES.m,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoBold: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.text,
    marginBottom: 4,
  },
  infoLight: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    lineHeight: 18,
  },
  totalSection: {
    marginBottom: theme.SIZES.xl,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.SIZES.m,
  },
  totalLabel: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
  },
  totalValue: {
    ...theme.FONTS.body2,
    color: theme.COLORS.text,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.SIZES.l,
  },
  totalSummaryLabel: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
  },
  totalSummaryValue: {
    ...theme.FONTS.h2,
    color: theme.COLORS.text,
  },
  agreementBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.SIZES.s,
    backgroundColor: theme.COLORS.tagBackground,
    padding: theme.SIZES.m,
    borderRadius: theme.SIZES.radius,
  },
  agreementText: {
    flex: 1,
    ...theme.FONTS.caption,
    color: theme.COLORS.text,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.SIZES.l,
    backgroundColor: theme.COLORS.card,
    borderTopWidth: 1,
    borderTopColor: theme.COLORS.border,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.COLORS.primary,
    paddingVertical: theme.SIZES.m,
    borderRadius: theme.SIZES.buttonRadius,
    gap: theme.SIZES.xs,
    marginBottom: theme.SIZES.s,
  },
  confirmBtnText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.card,
  },
  bottomNote: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default CheckoutScreen;
