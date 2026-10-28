import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { businessService } from '../services/business.service';

const BusinessDashboardScreen = ({ navigation }: any) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await businessService.getDashboardData();
      setData(response.data);
    } catch (error) {
      console.error('Dashboard hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerifyCode = async () => {
    const code = searchCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Uyarı', 'Lütfen müşterinin teslim alma kodunu girin (örn: NB-482615).');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await businessService.completePickup(code);
      Alert.alert('Başarılı', `${result.title || 'Çanta'} başarıyla teslim edildi!`);
      setSearchCode('');
      // İstatistikleri güncelle
      await fetchData();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Kod doğrulanamadı veya bu sipariş zaten teslim edilmiş.';
      Alert.alert('Teslimat Hatası', errMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading || !data) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Bar: Logo ve Müşteri Paneline Geçiş Butonu */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="shopping" size={24} color={theme.COLORS.primary} />
          <Text style={styles.logoText}>NightBag <Text style={styles.businessTag}>İşletme</Text></Text>
        </View>
        <TouchableOpacity 
          style={styles.switchModeBtn}
          onPress={() => navigation.navigate('MainFlow')}
        >
          <Ionicons name="person-outline" size={16} color={theme.COLORS.primary} />
          <Text style={styles.switchModeText}>Müşteri Paneli</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.welcomeText}>{data.businessName}</Text>
        <Text style={styles.dateText}>{data.dateString}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{data.stats.published}</Text>
            <Text style={styles.statLabel}>Yayınlanan</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{data.stats.sold}</Text>
            <Text style={styles.statLabel}>Satılan</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumberGreen}>{data.stats.remaining}</Text>
            <Text style={styles.statLabel}>Kalan çanta</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bugünün çantası</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('PublishBag')}>
            <Ionicons name="add" size={16} color={theme.COLORS.primary} />
            <Text style={styles.addBtnText}>Yeni çanta</Text>
          </TouchableOpacity>
        </View>

        {/* Bugünün Çantası (Null-Safe) */}
        {data.todaysBag ? (
          <>
            <View style={styles.bagCard}>
              <Image source={{ uri: data.todaysBag.imageUrl }} style={styles.bagImage} />
              <View style={styles.bagInfo}>
                <Text style={styles.bagTitle}>{data.todaysBag.title}</Text>
                <Text style={styles.bagPrice}>
                  {data.todaysBag.price} ₺{' '}
                  <Text style={styles.originalPrice}>{data.todaysBag.originalPrice} ₺</Text>
                </Text>
                <Text style={styles.bagTime}>Teslim: {data.todaysBag.time}</Text>
              </View>
              <View style={styles.bagAction}>
                <Ionicons name="chevron-forward" size={20} color={theme.COLORS.textSecondary} />
              </View>
            </View>
            <Text style={styles.bagHelper}>
              {data.stats.published} çantadan {data.stats.sold}'i satıldı • {data.stats.remaining} çanta beklemede.
            </Text>
          </>
        ) : (
          <View style={styles.emptyBagCard}>
            <Ionicons name="bag-add-outline" size={32} color={theme.COLORS.textSecondary} />
            <Text style={styles.emptyBagTitle}>Bugün için aktif çanta ilanı yok</Text>
            <Text style={styles.emptyBagDesc}>
              Kalan ürünlerini değerlendirmek ve israfı önlemek için hemen yeni bir sürpriz çanta yayınlayabilirsin.
            </Text>
            <TouchableOpacity style={styles.emptyBagBtn} onPress={() => navigation.navigate('PublishBag')}>
              <Ionicons name="add" size={18} color={theme.COLORS.card} />
              <Text style={styles.emptyBagBtnText}>Çanta Yayınla</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: theme.SIZES.xl }]}>Teslim yönetimi</Text>
        
        {/* Teslimat Kodu Doğrulama */}
        <View style={styles.searchRow}>
          <TextInput 
            style={styles.searchInput}
            placeholder="Teslimat kodunu gir (örn: NB-482615)"
            placeholderTextColor={theme.COLORS.textSecondary}
            value={searchCode}
            onChangeText={setSearchCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity 
            style={[styles.searchBtn, isVerifying && { opacity: 0.6 }]} 
            onPress={handleVerifyCode}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color={theme.COLORS.card} />
            ) : (
              <Text style={styles.searchBtnText}>Teslim Et</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sipariş Listesi */}
        <View style={styles.orderList}>
          {data.orders && data.orders.length > 0 ? (
            data.orders
              .filter((o: any) => searchCode.trim() === '' || o.code.toLowerCase().includes(searchCode.toLowerCase()))
              .map((order: any) => (
                <View key={order.id} style={styles.orderItem}>
                  <View>
                    <Text style={styles.orderName}>{order.name} • {order.quantity} çanta</Text>
                    <Text style={styles.orderCode}>
                      {order.code} • {order.status === 'delivered' ? 'Teslim edildi' : 'Teslim bekliyor'}
                    </Text>
                  </View>
                  {order.status === 'delivered' ? (
                    <View style={styles.statusBoxDone}>
                      <Ionicons name="checkmark-done" size={16} color={theme.COLORS.textSecondary} />
                      <Text style={styles.statusDoneText}>Teslim edildi</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={async () => {
                        setSearchCode(order.code);
                        await handleVerifyCode();
                      }}
                    >
                      <Ionicons name="checkmark" size={16} color={theme.COLORS.card} />
                      <Text style={styles.actionBtnText}>Teslim et</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
          ) : (
            <View style={styles.emptyOrdersBox}>
              <Ionicons name="qr-code-outline" size={28} color={theme.COLORS.primary} />
              <Text style={styles.emptyOrdersTitle}>Hızlı Teslimat Doğrulama</Text>
              <Text style={styles.emptyOrdersDesc}>
                Müşteri geldiğinde uygulamasında görünen 8 haneli kodu (örn: NB-482615) yukarıdaki kutuya girip "Teslim Et" butonuna basarak teslimatı onaylayabilirsiniz.
              </Text>
            </View>
          )}
        </View>

        {/* Müşteri Moduna Geçiş Kartı */}
        <TouchableOpacity 
          style={styles.customerSwitchBtn} 
          onPress={() => navigation.navigate('MainFlow')}
        >
          <Ionicons name="person-circle-outline" size={24} color={theme.COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.customerSwitchTitle}>Müşteri Paneline Geç</Text>
            <Text style={styles.customerSwitchDesc}>Sürpriz çantaları keşfet ve sipariş ver</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.COLORS.primary} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.SIZES.l, paddingTop: theme.SIZES.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.xs },
  logoText: { ...theme.FONTS.h3, color: theme.COLORS.primary },
  businessTag: { fontSize: 12, backgroundColor: theme.COLORS.tagBackground, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  switchModeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.COLORS.tagBackground, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.COLORS.border },
  switchModeText: { ...theme.FONTS.caption, color: theme.COLORS.primary, fontWeight: '600' },
  scrollContent: { paddingHorizontal: theme.SIZES.l, paddingBottom: 100 },
  welcomeText: { ...theme.FONTS.h1, color: theme.COLORS.text },
  dateText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginBottom: theme.SIZES.l },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.SIZES.xl },
  statBox: { backgroundColor: theme.COLORS.card, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, flex: 1, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: theme.COLORS.border },
  statNumber: { ...theme.FONTS.h2, color: theme.COLORS.text, marginBottom: 4 },
  statNumberGreen: { ...theme.FONTS.h2, color: theme.COLORS.primary, marginBottom: 4 },
  statLabel: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.SIZES.m },
  sectionTitle: { ...theme.FONTS.h3, color: theme.COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.COLORS.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.COLORS.border },
  addBtnText: { ...theme.FONTS.caption, color: theme.COLORS.primary, fontWeight: '600' },
  bagCard: { flexDirection: 'row', backgroundColor: theme.COLORS.card, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, borderWidth: 1, borderColor: theme.COLORS.primary, alignItems: 'center' },
  bagImage: { width: 60, height: 60, borderRadius: theme.SIZES.radius },
  bagInfo: { flex: 1, marginLeft: theme.SIZES.m },
  bagTitle: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text, marginBottom: 4 },
  bagPrice: { ...theme.FONTS.body2, fontWeight: '700', color: theme.COLORS.primary, marginBottom: 2 },
  originalPrice: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textDecorationLine: 'line-through', fontWeight: '400' },
  bagTime: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  bagAction: { padding: theme.SIZES.s },
  bagHelper: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginTop: theme.SIZES.s, textAlign: 'center' },
  emptyBagCard: { backgroundColor: theme.COLORS.card, padding: theme.SIZES.l, borderRadius: theme.SIZES.radius, borderWidth: 1, borderColor: theme.COLORS.border, alignItems: 'center', gap: 8 },
  emptyBagTitle: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text },
  emptyBagDesc: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 6 },
  emptyBagBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  emptyBagBtnText: { ...theme.FONTS.body2, color: theme.COLORS.card, fontWeight: '600' },
  searchRow: { flexDirection: 'row', gap: theme.SIZES.s, marginBottom: theme.SIZES.l },
  searchInput: { flex: 1, backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, height: 48, borderWidth: 1, borderColor: theme.COLORS.border, ...theme.FONTS.body2 },
  searchBtn: { backgroundColor: theme.COLORS.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.SIZES.l, borderRadius: theme.SIZES.radius, minWidth: 90 },
  searchBtnText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.card },
  orderList: { backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.radius, borderWidth: 1, borderColor: theme.COLORS.border, padding: theme.SIZES.m },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.SIZES.m, borderBottomWidth: 1, borderBottomColor: theme.COLORS.background },
  orderName: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text, marginBottom: 4 },
  orderCode: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  actionBtnText: { ...theme.FONTS.caption, color: theme.COLORS.card, fontWeight: '600' },
  statusBoxDone: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  statusDoneText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  emptyOrdersBox: { padding: theme.SIZES.m, alignItems: 'center', gap: 6 },
  emptyOrdersTitle: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text },
  emptyOrdersDesc: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  customerSwitchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.card, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, borderWidth: 1, borderColor: theme.COLORS.border, marginTop: theme.SIZES.xl, gap: theme.SIZES.m },
  customerSwitchTitle: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text, marginBottom: 2 },
  customerSwitchDesc: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
});

export default BusinessDashboardScreen;
