import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { authService } from '../services/auth.service';

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState({ 
    fullName: 'Misafir', 
    email: '',
    profileStats: { savedBags: 0, moneySaved: 0 },
    savedBusinesses: [] as any[]
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      loadUser();
    });

    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    await authService.logout();
    navigation.replace('Welcome');
  };

  const getInitials = (name: string) => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profilim</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Kullanıcı Kartı */}
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.fullName)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.fullName}</Text>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Profil bilgilerini düzenle</Text>
              <Ionicons name="pencil" size={12} color={theme.COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.profileStats.savedBags} çanta</Text>
            <Text style={styles.statLabel}>Kurtarılan</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.profileStats.moneySaved} ₺</Text>
            <Text style={styles.statLabel}>Yaklaşık kazanılan tutar</Text>
          </View>
        </View>

        {/* Ayarlar Menüsü */}
        <Text style={styles.sectionTitle}>Ayarlar</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="location-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Konum ve adres alanı</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>5 km</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Bildirimler</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>Açık</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Hesap ve gizlilik</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Yardım ve destek</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Kaydedilenler */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kaydettiğin işletmeler</Text>
          <Text style={styles.seeAllText}>Tümü - {user.savedBusinesses.length}</Text>
        </View>

        {user.savedBusinesses.map((biz: any) => (
          <View key={biz.id} style={styles.favCard}>
            <Image source={{ uri: biz.imageUrl }} style={styles.favImage} />
            <View style={styles.favInfo}>
              <Text style={styles.favName}>{biz.name}</Text>
              <Text style={styles.favDesc}>{biz.type} • {biz.distance}</Text>
            </View>
            <Ionicons name="heart" size={24} color={theme.COLORS.primary} />
          </View>
        ))}

        {user.savedBusinesses.length === 0 && (
          <Text style={{ textAlign: 'center', color: theme.COLORS.textSecondary, marginBottom: theme.SIZES.m }}>Henüz işletme kaydetmedin.</Text>
        )}

        {/* İşletme Butonu */}
        <TouchableOpacity
          style={styles.businessSwitchBtn}
          onPress={() => navigation.navigate('BusinessFlow')}
        >
          <Ionicons name="storefront-outline" size={20} color={theme.COLORS.primary} />
          <Text style={styles.businessSwitchText}>İşletme paneline geç</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.COLORS.primary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: theme.SIZES.l, paddingTop: theme.SIZES.xl },
  headerTitle: { ...theme.FONTS.h2, color: theme.COLORS.text },
  scrollContent: { paddingHorizontal: theme.SIZES.l, paddingBottom: 100 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.SIZES.xl },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...theme.FONTS.h2, color: theme.COLORS.card },
  userInfo: { marginLeft: theme.SIZES.m },
  userName: { ...theme.FONTS.h3, color: theme.COLORS.text, marginBottom: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { ...theme.FONTS.caption, color: theme.COLORS.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.radius, padding: theme.SIZES.m, marginBottom: theme.SIZES.xl, borderWidth: 1, borderColor: theme.COLORS.border },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: theme.COLORS.border },
  statValue: { ...theme.FONTS.h3, color: theme.COLORS.text, marginBottom: 4 },
  statLabel: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.SIZES.m },
  sectionTitle: { ...theme.FONTS.h3, color: theme.COLORS.text, marginBottom: theme.SIZES.m },
  seeAllText: { ...theme.FONTS.caption, color: theme.COLORS.primary, fontWeight: '600' },
  menuContainer: { backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.radius, marginBottom: theme.SIZES.xl, borderWidth: 1, borderColor: theme.COLORS.border, paddingHorizontal: theme.SIZES.m },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.SIZES.m, borderBottomWidth: 1, borderBottomColor: theme.COLORS.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.m },
  menuText: { ...theme.FONTS.body2, color: theme.COLORS.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.s },
  menuValue: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  favCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.card, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, marginBottom: theme.SIZES.m, borderWidth: 1, borderColor: theme.COLORS.border },
  favImage: { width: 48, height: 48, borderRadius: 24 },
  favInfo: { flex: 1, marginLeft: theme.SIZES.m },
  favName: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text },
  favDesc: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  businessSwitchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.tagBackground, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, marginTop: theme.SIZES.m, gap: theme.SIZES.s },
  businessSwitchText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.primary },
});

export default ProfileScreen;
