import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

const OrderSuccessScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('MainFlow')} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rezervasyonun</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="share-social-outline" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Çantan seni bekliyor!</Text>
        <Text style={styles.subtitle}>Moda Fırını'ndaki çantan başarıyla ayrıldı.</Text>

        {/* Ana Yeşil Kart */}
        <View style={styles.successCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>TESLİM ALMA ZAMANI</Text>
              <Text style={styles.cardTime}>20.00-21.00</Text>
            </View>
            <Text style={styles.cardDate}>6 Ekim, Salı</Text>
          </View>

          <View style={styles.cardBody}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop' }} 
              style={styles.cardImage} 
            />
            <View style={styles.cardInfo}>
              <Text style={styles.businessName}>Moda Fırını</Text>
              <Text style={styles.bagTitle}>Fırın sürpriz çantası</Text>
              <Text style={styles.bagDetails}>1 çanta • 125 ₺</Text>
            </View>
          </View>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>TESLİM ALMA KODUN</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>NB-4826</Text>
              <Ionicons name="copy-outline" size={20} color={theme.COLORS.primary} />
            </View>
            <Text style={styles.codeHint}>Bu kodu işletmedeki görevliye göster.</Text>
          </View>
        </View>

        {/* Adımlar */}
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>Teslim saatinde gel</Text>
              <Text style={styles.stepDesc}>Moda Cad. No: 42, Kadıköy</Text>
            </View>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>Kodunu görevliye göster</Text>
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
      </View>

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
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SIZES.s,
    marginBottom: theme.SIZES.s,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.COLORS.text,
    letterSpacing: 2,
  },
  codeHint: {
    ...theme.FONTS.caption,
    color: theme.COLORS.textSecondary,
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
});

export default OrderSuccessScreen;
