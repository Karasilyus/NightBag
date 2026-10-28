import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { businessService } from '../services/business.service';

const BusinessDashboardScreen = ({ navigation }: any) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await businessService.getDashboardData();
        setData(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDeliver = async (id: string) => {
    // Optimistic UI update
    setData((prevData: any) => ({
      ...prevData,
      orders: prevData.orders.map((o: any) => 
        o.id === id ? { ...o, status: 'delivered' } : o
      )
    }));
    await businessService.deliverOrder(id);
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
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="shopping" size={24} color={theme.COLORS.primary} />
          <Text style={styles.logoText}>NightBag <Text style={styles.businessTag}>İşletme</Text></Text>
        </View>
        <Ionicons name="notifications-outline" size={24} color={theme.COLORS.text} />
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

        <View style={styles.bagCard}>
          <Image source={{ uri: data.todaysBag.imageUrl }} style={styles.bagImage} />
          <View style={styles.bagInfo}>
            <Text style={styles.bagTitle}>{data.todaysBag.title}</Text>
            <Text style={styles.bagPrice}>{data.todaysBag.price} ₺ <Text style={styles.originalPrice}>{data.todaysBag.originalPrice} ₺</Text></Text>
            <Text style={styles.bagTime}>Teslim: {data.todaysBag.time}</Text>
          </View>
          <View style={styles.bagAction}>
            <Ionicons name="chevron-forward" size={20} color={theme.COLORS.textSecondary} />
          </View>
        </View>
        <Text style={styles.bagHelper}>{data.stats.published} çantadan {data.stats.sold}'i satıldı • {data.stats.remaining} çanta beklemede.</Text>

        <Text style={[styles.sectionTitle, { marginTop: theme.SIZES.xl }]}>Teslim yönetimi</Text>
        
        <View style={styles.searchRow}>
          <TextInput 
            style={styles.searchInput}
            placeholder="Teslim alma kodunu gir"
            placeholderTextColor={theme.COLORS.textSecondary}
            value={searchCode}
            onChangeText={setSearchCode}
          />
          <TouchableOpacity style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Bul</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.orderList}>
          {data.orders
            .filter((o: any) => searchCode.trim() === '' || o.code.toLowerCase().includes(searchCode.toLowerCase()))
            .map((order: any) => (
            <View key={order.id} style={styles.orderItem}>
              <View>
                <Text style={styles.orderName}>{order.name} • {order.quantity} çanta</Text>
                <Text style={styles.orderCode}>{order.code} • {order.status === 'delivered' ? 'Teslim edildi' : 'Teslim bekliyor'}</Text>
              </View>
              {order.status === 'delivered' ? (
                <View style={styles.statusBoxDone}>
                  <Ionicons name="checkmark-done" size={16} color={theme.COLORS.textSecondary} />
                  <Text style={styles.statusDoneText}>Teslim edildi</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeliver(order.id)}>
                  <Ionicons name="checkmark" size={16} color={theme.COLORS.card} />
                  <Text style={styles.actionBtnText}>Teslim et</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {data.orders.filter((o: any) => searchCode.trim() === '' || o.code.toLowerCase().includes(searchCode.toLowerCase())).length === 0 && (
            <Text style={{ textAlign: 'center', color: theme.COLORS.textSecondary, padding: 10 }}>Kayıt bulunamadı.</Text>
          )}
        </View>
        <TouchableOpacity style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>8 rezervasyonun tümünü gör</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.COLORS.primary} />
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
  searchRow: { flexDirection: 'row', gap: theme.SIZES.s, marginBottom: theme.SIZES.l },
  searchInput: { flex: 1, backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, height: 48, borderWidth: 1, borderColor: theme.COLORS.border, ...theme.FONTS.body2 },
  searchBtn: { backgroundColor: theme.COLORS.primary, justifyContent: 'center', paddingHorizontal: theme.SIZES.l, borderRadius: theme.SIZES.radius },
  searchBtnText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.card },
  orderList: { backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.radius, borderWidth: 1, borderColor: theme.COLORS.border, padding: theme.SIZES.m },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.SIZES.m, borderBottomWidth: 1, borderBottomColor: theme.COLORS.background },
  orderName: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text, marginBottom: 4 },
  orderCode: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  actionBtnText: { ...theme.FONTS.caption, color: theme.COLORS.card, fontWeight: '600' },
  statusBoxDone: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  statusDoneText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  viewAllBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: theme.SIZES.l },
  viewAllText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.primary },
});

export default BusinessDashboardScreen;
