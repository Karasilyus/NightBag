import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Share, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { notificationsService } from '../services/notifications.service';
import { preferencesService } from '../services/preferences.service';
import PickupCodeQrCard from '../components/PickupCodeQrCard';

const OrderSuccessScreen = ({ route, navigation }: any) => {
  const reservation = route?.params?.reservation;
  const [reminderMessage, setReminderMessage] = useState('');
  const pickupCode = reservation?.code;
  const businessName = reservation?.businessName || 'İşletme bilgisi alınamadı';
  const bagTitle = reservation?.bagTitle || 'Çanta bilgisi alınamadı';
  const timeInfo = reservation?.timeInfo || 'Saat bilgisi alınamadı';
  const date = reservation?.date || 'Tarih bilgisi alınamadı';
  const quantity = reservation?.quantity;
  const price = reservation?.price;
  const imageUrl = reservation?.imageUrl || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop';

  useEffect(() => {
    let isCancelled = false;

    const scheduleReminder = async () => {
      if (!reservation?.id) return;

      try {
        const preferences = await preferencesService.getPreferences();
        if (!preferences.notificationsEnabled) {
          if (!isCancelled) setReminderMessage('Bildirimler ayarlardan kapalı.');
          return;
        }

        const permission = await notificationsService.requestPermission();
        if (permission === 'unsupported') return;
        if (permission === 'denied') {
          if (!isCancelled) setReminderMessage('Hatırlatıcı için telefon bildirim izni gerekli.');
          return;
        }

        const result = await notificationsService.schedulePickupReminder(reservation);
        if (isCancelled) return;
        if (result === 'scheduled') {
          setReminderMessage('Teslim saatinden 30 dakika önce hatırlatacağız.');
        } else if (result === 'too-late') {
          setReminderMessage('Teslim saati yaklaştığı için hatırlatıcı planlanamadı.');
        } else if (result === 'permission-denied') {
          setReminderMessage('Hatırlatıcı planlanamadı. Telefon bildirim ayarlarını kontrol et.');
        }
      } catch (error) {
        console.error('Teslim alma hatırlatıcısı planlanamadı:', error);
        if (!isCancelled) setReminderMessage('Hatırlatıcı planlanamadı. Daha sonra ayarlardan tekrar deneyebilirsin.');
      }
    };

    scheduleReminder();
    return () => {
      isCancelled = true;
    };
  }, [reservation]);

  const shareReservation = async () => {
    try {
      await Share.share({
        message: `NightBag rezervasyonum: ${bagTitle} - ${businessName}. Teslim alma kodu: ${pickupCode}`,
      });
    } catch (error) {
      console.error('Rezervasyon paylaşılamadı:', error);
      Alert.alert('Paylaşım başarısız', 'Rezervasyon bilgileri paylaşılamadı.');
    }
  };

  if (typeof pickupCode !== 'string' || !pickupCode.trim()) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.invalidReservationContent}>
          <Ionicons name="alert-circle-outline" size={44} color={theme.COLORS.error} />
          <Text style={styles.title}>Rezervasyon doğrulanamadı</Text>
          <Text style={styles.subtitle}>Gerçek bir teslim alma kodu alınamadı. Rezervasyon durumunu kontrol et.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('MainFlow', { screen: 'Reservations' } as any)}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Rezervasyonlarıma git</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('MainFlow')} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rezervasyonun</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={shareReservation} accessibilityRole="button" accessibilityLabel="Rezervasyonu paylaş">
          <Ionicons name="share-social-outline" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Çantan seni bekliyor!</Text>
        <Text style={styles.subtitle}>{businessName} işletmesindeki çantan başarıyla ayrıldı.</Text>

        {/* Ana Yeşil Kart */}
        <View style={styles.successCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>TESLİM ALMA ZAMANI</Text>
              <Text style={styles.cardTime}>{timeInfo}</Text>
            </View>
            <Text style={styles.cardDate}>{date}</Text>
          </View>

          <View style={styles.cardBody}>
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.cardImage} 
            />
            <View style={styles.cardInfo}>
              <Text style={styles.businessName}>{businessName}</Text>
              <Text style={styles.bagTitle}>{bagTitle}</Text>
              <Text style={styles.bagDetails}>
                {quantity != null ? `${quantity} çanta` : 'Adet bilgisi alınamadı'}
                {price != null ? ` • ${price} ₺` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>TESLİM ALMA KODUN</Text>
            <PickupCodeQrCard code={pickupCode} size={160} />
          </View>
        </View>

        {reminderMessage ? (
          <View style={styles.reminderNotice} accessibilityLiveRegion="polite">
            <Ionicons name="notifications-outline" size={20} color={theme.COLORS.primary} />
            <Text style={styles.reminderText}>{reminderMessage}</Text>
          </View>
        ) : null}

        {/* Adımlar */}
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>Teslim saatinde gel</Text>
              <Text style={styles.stepDesc}>{businessName}</Text>
            </View>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>QR kodunu veya kodunu görevliye göster</Text>
              <Text style={styles.stepDesc}>Teslim alma işlemini tamamlamak için.</Text>
            </View>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>Çantanı al, afiyetle tüket</Text>
              <Text style={styles.stepDesc}>Mükemmel lezzetler çantanla birlikte gelir.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Alt Butonlar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('MainFlow', { screen: 'Map' } as any)}>
          <Text style={styles.primaryBtnText}>Yol tarifi al</Text>
          <Ionicons name="navigate-outline" size={20} color={theme.COLORS.card} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('MainFlow', { screen: 'Reservations' } as any)}
        >
          <Text style={styles.secondaryBtnText}>Rezervasyonlarına git</Text>
        </TouchableOpacity>
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
    padding: theme.SIZES.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.SIZES.l,
    alignItems: 'center',
  },
  title: {
    ...theme.FONTS.h2,
    color: theme.COLORS.text,
    marginBottom: theme.SIZES.xs,
  },
  subtitle: {
    ...theme.FONTS.body2,
    color: theme.COLORS.textSecondary,
    marginBottom: theme.SIZES.xl,
  },
  successCard: {
    width: '100%',
    backgroundColor: theme.COLORS.card,
    borderRadius: theme.SIZES.cardRadius,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    marginBottom: theme.SIZES.xl,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: theme.COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.SIZES.m,
  },
  cardLabel: {
    ...theme.FONTS.caption,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  cardTime: {
    ...theme.FONTS.h2,
    color: theme.COLORS.card,
  },
  cardDate: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.card,
  },
  cardBody: {
    flexDirection: 'row',
    padding: theme.SIZES.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.border,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: theme.SIZES.radius,
  },
  cardInfo: {
    flex: 1,
    marginLeft: theme.SIZES.m,
    justifyContent: 'center',
  },
  businessName: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.text,
    marginBottom: 2,
  },
  bagTitle: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginBottom: 4,
  },
  bagDetails: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.text,
  },
  codeContainer: {
    alignItems: 'center',
    padding: theme.SIZES.l,
  },
  codeLabel: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
    marginBottom: theme.SIZES.s,
  },
  reminderNotice: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.s,
    padding: theme.SIZES.m,
    marginBottom: theme.SIZES.l,
    backgroundColor: theme.COLORS.tagBackground,
    borderRadius: theme.SIZES.radius,
  },
  reminderText: {
    ...theme.FONTS.body2,
    flex: 1,
    color: theme.COLORS.primary,
  },
  stepsContainer: {
    width: '100%',
    paddingHorizontal: theme.SIZES.m,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.SIZES.m,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.COLORS.tagBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    ...theme.FONTS.caption,
    fontWeight: '700',
    color: theme.COLORS.primary,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    ...theme.FONTS.body2,
    fontWeight: '600',
    color: theme.COLORS.text,
    marginBottom: 2,
  },
  stepDesc: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: theme.COLORS.border,
    marginLeft: 11,
    marginVertical: 4,
  },
  bottomBar: {
    padding: theme.SIZES.l,
    paddingBottom: theme.SIZES.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.COLORS.primary,
    paddingVertical: theme.SIZES.m,
    borderRadius: theme.SIZES.buttonRadius,
    gap: theme.SIZES.xs,
    marginBottom: theme.SIZES.m,
  },
  primaryBtnText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.card,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.SIZES.s,
  },
  secondaryBtnText: {
    ...theme.FONTS.body1,
    fontWeight: '600',
    color: theme.COLORS.primary,
  },
  invalidReservationContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.SIZES.xl,
  },
});

export default OrderSuccessScreen;
