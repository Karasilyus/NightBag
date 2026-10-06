import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { reservationService } from '../services/reservation.service';

const MyOrdersScreen = () => {
  const [activeTab, setActiveTab] = useState('Tümü');
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReservations = async () => {
      setIsLoading(true);
      try {
        const response = await reservationService.getReservations(activeTab);
        setReservations(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReservations();
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rezervasyonlarım</Text>
        <Text style={styles.headerSubtitle}>Ayırdığın lezzetler, tek bir yerde.</Text>
      </View>

      <View style={styles.tabsContainer}>
        {['Tümü', 'Aktif', 'Geçmiş'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.COLORS.primary} style={{ marginTop: 40 }} />
        ) : reservations.length > 0 ? (
          reservations.map((item) => {
            if (item.status === 'active') {
              return (
                <View key={item.id} style={styles.activeCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Teslim bekliyor</Text>
                    </View>
                    <Text style={styles.dateText}>{item.date}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.businessName}>{item.businessName}</Text>
                      <Text style={styles.bagTitle}>{item.bagTitle}</Text>
                      <Text style={styles.bagTime}>{item.timeInfo}</Text>
                      <Text style={styles.bagDetails}>{item.quantity} çanta • {item.price} ₺</Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.codeText}>{item.code}</Text>
                    <TouchableOpacity style={styles.codeBtn}>
                      <Text style={styles.codeBtnText}>Kodu göster</Text>
                      <Ionicons name="qr-code-outline" size={16} color={theme.COLORS.card} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            } else {
              return (
                <View key={item.id} style={styles.pastCard}>
                  <Image source={{ uri: item.imageUrl }} style={styles.pastImage} />
                  <View style={styles.pastInfo}>
                    <View style={styles.pastRow}>
                      <Text style={styles.businessName}>{item.businessName}</Text>
                      <Text style={styles.pastPrice}>{item.price} ₺</Text>
                    </View>
                    <Text style={styles.bagTitle}>{item.bagTitle} • {item.quantity} Çanta</Text>
                    <Text style={styles.bagTime}>{item.date} • {item.timeInfo}</Text>
                    {item.rating && (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#FFB800" />
                        <Text style={styles.ratingText}>Puan verildi ({item.rating})</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            }
          })
        ) : (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="receipt-outline" size={48} color={theme.COLORS.textSecondary} />
            <Text style={{ ...theme.FONTS.body2, color: theme.COLORS.textSecondary, marginTop: 16 }}>
              Bu kategoride rezervasyonun bulunmuyor.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.background },
  header: { padding: theme.SIZES.l, paddingTop: theme.SIZES.xl },
  headerTitle: { ...theme.FONTS.h2, color: theme.COLORS.text, marginBottom: 4 },
  headerSubtitle: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: theme.SIZES.l, marginBottom: theme.SIZES.l },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8 },
  activeTab: { backgroundColor: theme.COLORS.tagBackground },
  tabText: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary },
  activeTabText: { color: theme.COLORS.primary, fontWeight: '600' },
  scrollContent: { paddingHorizontal: theme.SIZES.l, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: theme.SIZES.m },
  sectionTitle: { ...theme.FONTS.h3, color: theme.COLORS.text },
  sectionCount: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  activeCard: { backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.radius, padding: theme.SIZES.m, marginBottom: theme.SIZES.xl, borderWidth: 1, borderColor: theme.COLORS.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.SIZES.m },
  statusBadge: { backgroundColor: theme.COLORS.tagBackground, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { ...theme.FONTS.caption, color: theme.COLORS.primary, fontWeight: '600' },
  dateText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  cardBody: { flexDirection: 'row', marginBottom: theme.SIZES.m },
  cardImage: { width: 60, height: 60, borderRadius: theme.SIZES.radius },
  cardInfo: { flex: 1, marginLeft: theme.SIZES.m, justifyContent: 'center' },
  businessName: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text },
  bagTitle: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginBottom: 2 },
  bagTime: { ...theme.FONTS.caption, color: theme.COLORS.primary, fontWeight: '600', marginBottom: 2 },
  bagDetails: { ...theme.FONTS.caption, color: theme.COLORS.text },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: theme.SIZES.m, borderTopWidth: 1, borderTopColor: theme.COLORS.border },
  codeText: { ...theme.FONTS.h3, color: theme.COLORS.text, letterSpacing: 1 },
  codeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 4 },
  codeBtnText: { ...theme.FONTS.caption, color: theme.COLORS.card, fontWeight: '600' },
  pastCard: { flexDirection: 'row', backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.radius, padding: theme.SIZES.m, marginTop: theme.SIZES.m, borderWidth: 1, borderColor: theme.COLORS.border },
  pastImage: { width: 50, height: 50, borderRadius: theme.SIZES.radius },
  pastInfo: { flex: 1, marginLeft: theme.SIZES.m },
  pastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  pastPrice: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
});

export default MyOrdersScreen;
