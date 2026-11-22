import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { reservationService } from '../services/reservation.service';
import { paymentService } from '../services/payment.service';
import { authService } from '../services/auth.service';
import LegalDraftNotice from '../components/LegalDraftNotice';

const CheckoutScreen = ({ route, navigation }: any) => {
  const bag = route?.params?.bag;
  const [quantity, setQuantity] = useState(1);
  const [paymentPreference, setPaymentPreference] = useState<'pickup' | 'online'>('pickup');
  const [isReserving, setIsReserving] = useState(false);
  const isOnlinePayment = paymentPreference === 'online';
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [draftAcknowledged, setDraftAcknowledged] = useState(false);
  const hasStockInfo = Number.isFinite(bag?.remainingBags);
  const maxQuantity = hasStockInfo
    ? Math.min(4, Math.max(0, Math.floor(bag.remainingBags)))
    : 0;
  const pricePerBag = Number.isFinite(bag?.price) ? bag.price : 0;

  const handleConfirmReservation = async () => {
    if (!bag?.id || maxQuantity === 0 || !draftAcknowledged || !termsAccepted) return;
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      Alert.alert('Giriş gerekli', 'Ödeme veya rezervasyon için önce giriş yapmalısınız.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Giriş yap', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }
    setIsReserving(true);
    try {
      if (isOnlinePayment) {
        const checkout = await paymentService.startCheckout(bag.id, quantity, termsAccepted);
        if (!checkout.payment_page_url) {
          throw new Error('Ödeme sayfası adresi alınamadı.');
        }
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.assign(checkout.payment_page_url);
          return;
        } else {
          const browserResult = await WebBrowser.openBrowserAsync(checkout.payment_page_url);
          if (browserResult.type === 'cancel') {
            throw new Error('Ödeme işlemi tarayıcıda iptal edildi.');
          }
        }
        const status = await paymentService.waitForPaid(checkout.order_id);
        if (status.status !== 'paid') {
          throw new Error('Ödeme tamamlanmadı veya iptal edildi.');
        }
        const reservations = await reservationService.getReservations('Aktif');
        const reservation = reservations.data.find(item => item.id === status.reservation_id);
        if (!reservation) {
          throw new Error('Ödeme başarılı ancak rezervasyon henüz görüntülenemedi.');
        }
        navigation.navigate('ReservationConfirmed', { reservation });
        return;
      }
      const reservation = await reservationService.reserve(bag.id, quantity, termsAccepted);
      navigation.navigate('ReservationConfirmed', { reservation });
    } catch (error: any) {
      const errMsg = error.response?.status === 401
        ? 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.'
        : error.response?.data?.error || error.message || 'Rezervasyon oluşturulamadı. Lütfen tekrar deneyin.';
      Alert.alert('Rezervasyon Hatası', errMsg);
    } finally {
      setIsReserving(false);
    }
  };

  if (!bag?.id || !Number.isFinite(bag.price)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.invalidBagContent}>
          <Ionicons name="alert-circle-outline" size={44} color={theme.COLORS.error} />
          <Text style={styles.invalidBagTitle}>Çanta bilgisi bulunamadı</Text>
          <Text style={styles.invalidBagText}>Rezervasyona devam etmek için çanta detayına geri dön.</Text>
          <TouchableOpacity style={styles.invalidBagButton} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={styles.invalidBagButtonText}>Geri dön</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Çantanı ayırt</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subHeader}>Son bir kontrol, sonra hazırsın.</Text>

        {/* Çanta Özeti Kartı */}
        <View style={styles.bagCard}>
          <Image
            source={{ uri: bag.imageUrl }}
            style={styles.cardImage} 
          />
          <View style={styles.cardInfo}>
            <Text style={styles.businessName}>{bag.businessName}</Text>
            <Text style={styles.bagTitle}>{bag.bagType}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{pricePerBag} ₺</Text>
              <Text style={styles.originalPrice}>{bag.originalPrice} ₺</Text>
            </View>
            <Text style={styles.timeInfo}>{bag.timeInfo}</Text>
          </View>
        </View>

        {/* Çanta Adedi */}
        <View style={styles.quantitySection}>
          <View>
            <Text style={styles.sectionTitle}>Çanta adedi</Text>
            <Text style={styles.quantityDesc}>
              {maxQuantity > 0
                ? `En fazla ${maxQuantity} çanta`
                : hasStockInfo ? 'Stok kalmamış' : 'Stok bilgisi alınamadı'}
            </Text>
          </View>
          <View style={styles.quantityControl}>
            <TouchableOpacity 
              style={[styles.qBtn, quantity <= 1 && styles.qBtnDisabled]} 
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1 || isReserving}
            >
              <Ionicons name="remove" size={20} color={quantity <= 1 ? theme.COLORS.border : theme.COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.qText}>{quantity}</Text>
            <TouchableOpacity 
              style={[styles.qBtn, quantity >= 4 && styles.qBtnDisabled]} 
              onPress={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              disabled={quantity >= maxQuantity || isReserving}
            >
              <Ionicons name="add" size={20} color={quantity >= maxQuantity ? theme.COLORS.border : theme.COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Teslim Alma Bilgileri */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Teslim alma bilgileri</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.COLORS.text} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoBold}>{bag.timeInfo}</Text>
              <Text style={styles.infoLight}>{bag.businessName}</Text>
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
            <Text style={styles.totalLabel}>{quantity} × {bag.bagType}</Text>
            <Text style={styles.totalValue}>{quantity * pricePerBag} ₺</Text>
          </View>
          <View style={styles.totalSummaryRow}>
            <Text style={styles.totalSummaryLabel}>Toplam</Text>
            <Text style={styles.totalSummaryValue}>{quantity * pricePerBag} ₺</Text>
          </View>

          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Ödeme tercihi</Text>
            <TouchableOpacity
              style={[styles.paymentOption, paymentPreference === 'pickup' && styles.paymentOptionSelected]}
              onPress={() => setPaymentPreference('pickup')}
              accessibilityRole="button"
              accessibilityState={{ selected: paymentPreference === 'pickup' }}
            >
              <Ionicons name="storefront-outline" size={20} color={theme.COLORS.primary} />
              <View style={styles.paymentOptionInfo}>
                <Text style={styles.paymentOptionTitle}>Rezervasyonu ayırt</Text>
                <Text style={styles.paymentOptionDescription}>Ödeme teslim sırasında işletmede yapılır</Text>
              </View>
              {paymentPreference === 'pickup'
                ? <Ionicons name="checkmark-circle" size={20} color={theme.COLORS.primary} />
                : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOption, paymentPreference === 'online' && styles.paymentOptionSelected]}
              onPress={() => setPaymentPreference('online')}
              accessibilityRole="button"
              accessibilityState={{ selected: paymentPreference === 'online' }}
            >
              <Ionicons name="card-outline" size={20} color={paymentPreference === 'online' ? theme.COLORS.primary : theme.COLORS.textSecondary} />
              <View style={styles.paymentOptionInfo}>
                <Text style={paymentPreference === 'online' ? styles.paymentOptionTitle : styles.paymentOptionDisabledTitle}>Online ödeme</Text>
                <Text style={styles.paymentOptionDescription}>iyzico ile güvenli online ödeme</Text>
              </View>
              {paymentPreference === 'online'
                ? <Ionicons name="checkmark-circle" size={20} color={theme.COLORS.primary} />
                : null}
            </TouchableOpacity>
            <Text style={styles.paymentDisclaimer}>
              {isOnlinePayment
                ? 'Ödeme için iyzico güvenli sayfası açılır. Başarılı ödeme sonrası rezervasyon otomatik oluşturulur.'
                : 'İşletmede ödeme seçildiğinde ödeme alınmaz; rezervasyon oluşturulur.'}
            </Text>
            {isOnlinePayment && (
              <View style={styles.paymentPreview}>
                <View style={styles.previewHeading}>
                  <Ionicons name="lock-closed-outline" size={18} color={theme.COLORS.card} />
                  <Text style={styles.previewLabel}>GÜVENLİ ÖDEME</Text>
                </View>
                <Text style={styles.previewTitle}>iyzico ödeme sayfası</Text>
                <Text style={styles.previewDescription}>
                  Kart bilgileri doğrudan sağlayıcının güvenli ekranında girilir; uygulama kart bilgisi toplamaz.
                </Text>
                <Text style={styles.previewDescription}>Ödeme tamamlanınca rezervasyon otomatik olarak oluşturulur.</Text>
              </View>
            )}
          </View>
          
          <LegalDraftNotice
            context="order"
            acknowledged={draftAcknowledged}
            onAcknowledgedChange={setDraftAcknowledged}
          />
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: termsAccepted }}
            style={styles.agreementBox}
            onPress={() => setTermsAccepted((accepted) => !accepted)}
            disabled={isReserving}
          >
            <Ionicons
              name={termsAccepted ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={termsAccepted ? theme.COLORS.primary : theme.COLORS.textSecondary}
            />
            <Text style={styles.agreementText}>
              Teslim saatinde işletmede olacağımı ve çanta içeriğinin sürpriz olabileceğini kabul ediyorum.
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Alt Sabit Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[
            styles.confirmBtn,
            (isReserving || maxQuantity === 0 || !draftAcknowledged || !termsAccepted) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirmReservation}
          disabled={isReserving || maxQuantity === 0 || !draftAcknowledged || !termsAccepted}
        >
          {isReserving ? (
            <ActivityIndicator color={theme.COLORS.card} />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>
                {isOnlinePayment
                  ? 'iyzico ile öde'
                  : maxQuantity > 0 ? 'Rezervasyonu onayla' : hasStockInfo ? 'Stok tükendi' : 'Stok bilgisi yok'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={theme.COLORS.card} />
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.bottomNote}>
          {isOnlinePayment
            ? 'Ödeme sağlayıcısı açılır; başarılı ödemeden sonra rezervasyon oluşturulur.'
            : 'Rezervasyon oluşturulur; bu adımda ödeme alınmaz.'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.background,
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
    paddingBottom: 200,
  },
  bagCard: {
    flexDirection: 'row',
    backgroundColor: theme.COLORS.card,
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
  paymentSection: {
    marginBottom: theme.SIZES.l,
  },
  paymentOption: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.s,
    padding: theme.SIZES.m,
    marginTop: theme.SIZES.s,
    borderRadius: theme.SIZES.radius,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    backgroundColor: theme.COLORS.card,
  },
  paymentOptionSelected: {
    borderColor: theme.COLORS.primary,
    backgroundColor: theme.COLORS.tagBackground,
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionTitle: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.primary,
    marginBottom: 3,
  },
  paymentOptionDisabledTitle: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.textSecondary,
    marginBottom: 3,
  },
  paymentOptionDescription: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    lineHeight: 17,
  },
  comingSoon: {
    ...theme.FONTS.caption,
    fontWeight: '600',
    color: theme.COLORS.textSecondary,
  },
  paymentDisclaimer: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    lineHeight: 18,
    marginTop: theme.SIZES.s,
  },
  paymentPreview: {
    backgroundColor: theme.COLORS.primary,
    borderRadius: theme.SIZES.cardRadius,
    padding: theme.SIZES.m,
    marginTop: theme.SIZES.m,
  },
  previewHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.s },
  previewLabel: { ...theme.FONTS.caption, color: theme.COLORS.card, fontWeight: '700', letterSpacing: 0.6 },
  previewTitle: { ...theme.FONTS.h3, color: theme.COLORS.card, marginTop: theme.SIZES.m },
  previewDescription: { ...theme.FONTS.caption, color: theme.COLORS.card, lineHeight: 18, marginTop: theme.SIZES.s },
  previewFields: { gap: theme.SIZES.s, marginTop: theme.SIZES.m },
  previewField: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary, backgroundColor: theme.COLORS.card, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, overflow: 'hidden' },
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
  confirmBtnDisabled: {
    backgroundColor: theme.COLORS.border,
    opacity: 0.75,
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
  invalidBagContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.SIZES.xl,
  },
  invalidBagTitle: {
    ...theme.FONTS.h3,
    color: theme.COLORS.text,
    marginTop: theme.SIZES.m,
    marginBottom: theme.SIZES.s,
  },
  invalidBagText: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: theme.SIZES.l,
  },
  invalidBagButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.SIZES.l,
    borderRadius: theme.SIZES.buttonRadius,
    backgroundColor: theme.COLORS.primary,
  },
  invalidBagButtonText: {
    ...theme.FONTS.body2,
    color: theme.COLORS.card,
    fontWeight: '600',
  },
});

export default CheckoutScreen;
