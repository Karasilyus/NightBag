import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { reservationService } from '../services/reservation.service';

const MyOrdersScreen = () => {
  const { width } = useWindowDimensions();
  const isWebGrid = Platform.OS === 'web' && width >= 700;
  const webCardWidth = width >= 1150 ? '31.5%' : '48%';
  const [activeTab, setActiveTab] = useState('Tümü');
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [reservationToCancel, setReservationToCancel] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState('');

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

  const cancelReservation = async () => {
    if (!reservationToCancel?.id) return;

    setIsCancelling(true);
    setCancellationError('');
    try {
      await reservationService.cancelReservation(reservationToCancel.id);
      setReservationToCancel(null);
      const response = await reservationService.getReservations(activeTab);
      setReservations(response.data);
    } catch (error) {
      console.error('Rezervasyon iptal edilemedi:', error);
      setCancellationError('Rezervasyon iptal edilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsCancelling(false);
    }
  };

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

      <ScrollView contentContainerStyle={[styles.scrollContent, isWebGrid && styles.webReservations]} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.COLORS.primary} style={{ marginTop: 40 }} />
        ) : reservations.length > 0 ? (
          reservations.map((item) => {
            if (item.status === 'active') {
              return (
                <View key={item.id} style={[styles.activeCard, isWebGrid && { width: webCardWidth }]}>
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
                    <TouchableOpacity style={styles.codeBtn} onPress={() => setSelectedCode(item.code)} accessibilityRole="button">
                      <Text style={styles.codeBtnText}>Kodu göster</Text>
                      <Ionicons name="qr-code-outline" size={16} color={theme.COLORS.card} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelReservationBtn}
                    onPress={() => {
                      setCancellationError('');
                      setReservationToCancel(item);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelReservationText}>Rezervasyonu iptal et</Text>
                  </TouchableOpacity>
                </View>
              );
            } else {
              return (
                <View key={item.id} style={[styles.pastCard, isWebGrid && { width: webCardWidth }]}>
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

      <Modal visible={selectedCode !== null} transparent animationType="fade" onRequestClose={() => setSelectedCode(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedCode(null)}>
          <Pressable style={styles.codeModal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Teslim alma kodun</Text>
            <Text style={styles.modalCode}>{selectedCode}</Text>
            <Text style={styles.modalHint}>Bu kodu teslim alırken işletme görevlisine göster.</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedCode(null)}>
              <Text style={styles.modalCloseText}>Kapat</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={reservationToCancel !== null} transparent animationType="fade" onRequestClose={() => setReservationToCancel(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReservationToCancel(null)}>
          <Pressable style={styles.codeModal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Rezervasyonu iptal et?</Text>
            <Text style={styles.modalHint}>{reservationToCancel?.bagTitle} rezervasyonu iptal edilecek.</Text>
            {cancellationError ? <Text style={styles.cancellationError}>{cancellationError}</Text> : null}
            <View style={styles.cancelActions}>
              <TouchableOpacity
                style={styles.cancelKeepButton}
                onPress={() => setReservationToCancel(null)}
                disabled={isCancelling}
              >
                <Text style={styles.cancelKeepText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelConfirmButton}
                onPress={cancelReservation}
                disabled={isCancelling}
              >
                <Text style={styles.cancelConfirmText}>{isCancelling ? 'İptal ediliyor...' : 'İptal et'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  webReservations: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'flex-start' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: theme.SIZES.m },
  sectionTitle: { ...theme.FONTS.h3, color: theme.COLORS.text },
  sectionCount: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: theme.SIZES.l, backgroundColor: 'rgba(0,0,0,0.35)' },
  codeModal: { alignSelf: 'center', width: '100%', maxWidth: 400, alignItems: 'center', padding: theme.SIZES.l, backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.cardRadius },
  modalTitle: { ...theme.FONTS.h3, color: theme.COLORS.text, marginBottom: theme.SIZES.m },
  modalCode: { ...theme.FONTS.h1, color: theme.COLORS.primary, letterSpacing: 2, marginBottom: theme.SIZES.s },
  modalHint: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary, textAlign: 'center', marginBottom: theme.SIZES.m },
  modalCloseButton: { minWidth: 120, padding: theme.SIZES.s, alignItems: 'center', backgroundColor: theme.COLORS.primary, borderRadius: theme.SIZES.buttonRadius },
  modalCloseText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.card },
  cancelReservationBtn: { alignSelf: 'flex-end', paddingVertical: theme.SIZES.s, marginTop: theme.SIZES.xs },
  cancelReservationText: { ...theme.FONTS.caption, color: theme.COLORS.error, fontWeight: '600' },
  cancellationError: { ...theme.FONTS.caption, color: theme.COLORS.error, textAlign: 'center', marginBottom: theme.SIZES.s },
  cancelActions: { flexDirection: 'row', width: '100%', gap: theme.SIZES.s },
  cancelKeepButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.COLORS.border, borderRadius: theme.SIZES.buttonRadius },
  cancelKeepText: { ...theme.FONTS.body2, color: theme.COLORS.text },
  cancelConfirmButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.COLORS.error, borderRadius: theme.SIZES.buttonRadius },
  cancelConfirmText: { ...theme.FONTS.body2, color: theme.COLORS.card, fontWeight: '600' },
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
