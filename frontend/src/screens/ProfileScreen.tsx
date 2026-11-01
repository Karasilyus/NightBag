import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Modal, Pressable, TextInput, Switch, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { authService } from '../services/auth.service';
import { preferencesService, UserPreferences } from '../services/preferences.service';

const PERSONALIZATION_CATEGORIES = ['Fırın', 'Kafe', 'Tatlı', 'Yemek'];

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState({ 
    fullName: 'Misafir', 
    email: '',
    role: '',
    business_id: '',
    profileStats: { savedBags: 0, moneySaved: 0 },
    savedBusinesses: [] as any[]
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    searchRadiusKm: 5,
    notificationsEnabled: true,
    location: null,
    favoriteCategories: [],
  });
  const [activeModal, setActiveModal] = useState<'edit' | 'location' | 'personalization' | 'privacy' | 'help' | null>(null);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const canAccessBusinessPanel = user.role === 'business_owner'
    && Boolean(user.business_id)
    && Boolean(user.email.trim());
  const favoritePlaces = Array.from(new Map(
    user.savedBusinesses.map((savedBag) => [savedBag.name, savedBag])
  ).values());

  useEffect(() => {
    const loadUser = async () => {
      const [currentUser, currentPreferences, savedBags] = await Promise.all([
        authService.getCurrentUser(),
        preferencesService.getPreferences(),
        preferencesService.getSavedBags(),
      ]);
      if (currentUser) setUser(currentUser);
      setPreferences(currentPreferences);
      setUser((previous) => ({
        ...previous,
        savedBusinesses: savedBags.map((bag) => ({
          id: bag.id,
          name: bag.name,
          type: bag.type,
          distance: bag.distance,
          imageUrl: bag.imageUrl,
        })),
      }));
    };

    const refreshUser = () => {
      loadUser().catch((error) => {
        console.error('Profil bilgileri yüklenemedi:', error);
        setSettingsError('Profil bilgileri yüklenemedi. Lütfen tekrar deneyin.');
      });
    };

    refreshUser();
    const unsubscribe = navigation.addListener('focus', refreshUser);
    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    await authService.logout();
    navigation.replace('Welcome');
  };

  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'NB';
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const saveName = async () => {
    const fullName = editedName.trim();
    if (!fullName) return;

    setIsSavingName(true);
    try {
      const updatedUser = await authService.updateCurrentUser({ fullName });
      setUser((previous) => ({ ...previous, ...updatedUser }));
      setSettingsError('');
      setActiveModal(null);
    } catch (error) {
      console.error('Profil adı kaydedilemedi:', error);
      setSettingsError('Profil adı kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSavingName(false);
    }
  };

  const updateRadius = async (searchRadiusKm: number) => {
    try {
      const updatedPreferences = await preferencesService.updatePreferences({ searchRadiusKm });
      setPreferences(updatedPreferences);
      setSettingsError('');
    } catch (error) {
      console.error('Arama mesafesi kaydedilemedi:', error);
      setSettingsError('Arama mesafesi kaydedilemedi. Lütfen tekrar deneyin.');
    }
  };

  const toggleFavoriteCategory = async (category: string) => {
    const favoriteCategories = preferences.favoriteCategories.includes(category)
      ? preferences.favoriteCategories.filter((item) => item !== category)
      : [...preferences.favoriteCategories, category];
    try {
      setPreferences(await preferencesService.updatePreferences({ favoriteCategories }));
      setSettingsError('');
    } catch (error) {
      console.error('Kişiselleştirme tercihleri kaydedilemedi:', error);
      setSettingsError('Kişiselleştirme tercihleri kaydedilemedi. Lütfen tekrar deneyin.');
    }
  };

  const openSupportEmail = async () => {
    try {
      await Linking.openURL('mailto:?subject=NightBag%20destek');
    } catch (error) {
      console.error('E-posta uygulaması açılamadı:', error);
      setSupportError('E-posta uygulaması açılamadı. Lütfen cihazınızda bir e-posta uygulaması ayarlayın.');
    }
  };

  const toggleSavedBag = async (bag: typeof user.savedBusinesses[number]) => {
    try {
      await preferencesService.toggleSavedBag({
        id: bag.id,
        name: bag.name,
        type: bag.type,
        distance: bag.distance,
        imageUrl: bag.imageUrl,
      });
      setUser((previous) => ({
        ...previous,
        savedBusinesses: previous.savedBusinesses.filter((savedBag) => savedBag.id !== bag.id),
      }));
      setSettingsError('');
    } catch (error) {
      console.error('Kaydedilen çanta kaldırılamadı:', error);
      setSettingsError('Kaydedilen çanta kaldırılamadı. Lütfen tekrar deneyin.');
    }
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
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                setEditedName(user.fullName);
                setActiveModal('edit');
              }}
            >
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
        {settingsError ? <Text style={styles.settingsError}>{settingsError}</Text> : null}
        <Text style={styles.sectionTitle}>Ayarlar</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setActiveModal('location')}>
            <View style={styles.menuLeft}>
              <Ionicons name="location-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Konum ve adres alanı</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>{preferences.searchRadiusKm} km</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Bildirimler</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>{preferences.notificationsEnabled ? 'Açık' : 'Kapalı'}</Text>
              <Switch
                value={preferences.notificationsEnabled}
                onValueChange={async (notificationsEnabled) => {
                  try {
                    setPreferences(await preferencesService.updatePreferences({ notificationsEnabled }));
                  } catch (error) {
                    console.error('Bildirim tercihi kaydedilemedi:', error);
                    setSettingsError('Bildirim tercihi kaydedilemedi. Lütfen tekrar deneyin.');
                  }
                }}
                trackColor={{ false: theme.COLORS.border, true: theme.COLORS.tagBackground }}
                thumbColor={preferences.notificationsEnabled ? theme.COLORS.primary : '#f4f3f4'}
                accessibilityLabel="Bildirim tercihini değiştir"
              />
            </View>
          </View>
          <Text style={styles.preferenceNote}>Bildirim tercihi bu cihazda saklanır; bildirim gönderimi backend entegrasyonu gerektirir.</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => setActiveModal('privacy')}>
            <View style={styles.menuLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Hesap ve gizlilik</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setActiveModal('personalization')} accessibilityRole="button">
            <View style={styles.menuLeft}>
              <Ionicons name="sparkles-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Keşfet tercihleri</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PasswordReset', { initialEmail: user.email })}
            accessibilityRole="button"
          >
            <View style={styles.menuLeft}>
              <Ionicons name="key-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Şifre değiştir</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => {
            setSupportError('');
            setActiveModal('help');
          }}>
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle-outline" size={20} color={theme.COLORS.textSecondary} />
              <Text style={styles.menuText}>Yardım ve destek</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Favori mekanların</Text>
          <Text style={styles.seeAllText}>{favoritePlaces.length} mekan</Text>
        </View>
        <Text style={styles.preferenceNote}>Favori mekanlar, kaydettiğin çantalara göre bu cihazda oluşturulur.</Text>
        {favoritePlaces.map((place) => (
          <View key={place.name} style={styles.favCard}>
            <Image source={{ uri: place.imageUrl }} style={styles.favImage} />
            <View style={styles.favInfo}>
              <Text style={styles.favName}>{place.name}</Text>
              <Text style={styles.favDesc}>{place.type}</Text>
            </View>
            <Ionicons name="heart" size={22} color={theme.COLORS.primary} />
          </View>
        ))}
        {favoritePlaces.length === 0 && (
          <Text style={styles.emptyFavorites}>Bir çantayı kaydederek mekanı favorilerine ekleyebilirsin.</Text>
        )}

        {/* Kaydedilenler */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kaydettiğin çantalar</Text>
          <Text style={styles.seeAllText}>Tümü - {user.savedBusinesses.length}</Text>
        </View>

        {user.savedBusinesses.map((biz: any) => (
          <View key={biz.id} style={styles.favCard}>
            <Image source={{ uri: biz.imageUrl }} style={styles.favImage} />
            <View style={styles.favInfo}>
              <Text style={styles.favName}>{biz.name}</Text>
              <Text style={styles.favDesc}>{biz.type} • {biz.distance}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleSavedBag(biz)} accessibilityRole="button" accessibilityLabel={`${biz.name} kaydını kaldır`}>
              <Ionicons name="heart" size={24} color={theme.COLORS.primary} />
            </TouchableOpacity>
          </View>
        ))}

        {user.savedBusinesses.length === 0 && (
          <Text style={{ textAlign: 'center', color: theme.COLORS.textSecondary, marginBottom: theme.SIZES.m }}>Henüz çanta kaydetmedin.</Text>
        )}

        {canAccessBusinessPanel && (
          <TouchableOpacity
            style={styles.businessSwitchBtn}
            onPress={() => navigation.navigate('BusinessFlow')}
            accessibilityRole="button"
          >
            <Ionicons name="storefront-outline" size={20} color={theme.COLORS.primary} />
            <Text style={styles.businessSwitchText}>İşletme paneline geç</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.COLORS.primary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={activeModal !== null} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveModal(null)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            {activeModal === 'edit' && (
              <>
                <Text style={styles.modalTitle}>Profil bilgilerini düzenle</Text>
                <TextInput
                  style={styles.profileInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Ad Soyad"
                  accessibilityLabel="Ad soyad"
                />
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={saveName} disabled={isSavingName || !editedName.trim()}>
                  <Text style={styles.modalPrimaryText}>{isSavingName ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                </TouchableOpacity>
              </>
            )}

            {activeModal === 'location' && (
              <>
                <Text style={styles.modalTitle}>Konum ve arama alanı</Text>
                <Text style={styles.modalDescription}>Yakınındaki çantaları hangi mesafede arayalım?</Text>
                <View style={styles.radiusOptions}>
                  {[2, 5, 10, 20, 50].map((radius) => (
                    <TouchableOpacity
                      key={radius}
                      style={[styles.radiusOption, preferences.searchRadiusKm === radius && styles.radiusOptionSelected]}
                      onPress={() => updateRadius(radius)}
                    >
                      <Text style={[styles.radiusOptionText, preferences.searchRadiusKm === radius && styles.radiusOptionTextSelected]}>{radius} km</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.modalDescription}>
                  Seçili konum: {preferences.location?.label || 'Kadıköy, İstanbul'}
                </Text>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => {
                  setActiveModal(null);
                  navigation.navigate('LocationPicker', { returnToProfile: true });
                }}>
                  <Text style={styles.modalPrimaryText}>Haritada konumu seç</Text>
                </TouchableOpacity>
              </>
            )}

            {activeModal === 'personalization' && (
              <>
                <Text style={styles.modalTitle}>Keşfet tercihleri</Text>
                <Text style={styles.modalDescription}>İlgilendiğin işletme türlerini seç. Tercihlerin bu cihazda saklanır.</Text>
                <View style={styles.categoryOptions}>
                  {PERSONALIZATION_CATEGORIES.map((category) => {
                    const selected = preferences.favoriteCategories.includes(category);
                    return (
                      <TouchableOpacity
                        key={category}
                        style={[styles.categoryOption, selected && styles.categoryOptionSelected]}
                        onPress={() => toggleFavoriteCategory(category)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text style={[styles.categoryOptionText, selected && styles.categoryOptionTextSelected]}>{category}</Text>
                        {selected ? <Ionicons name="checkmark" size={17} color={theme.COLORS.primary} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => setActiveModal(null)}>
                  <Text style={styles.modalPrimaryText}>Tamam</Text>
                </TouchableOpacity>
              </>
            )}

            {activeModal === 'privacy' && (
              <>
                <Text style={styles.modalTitle}>Hesap ve gizlilik</Text>
                <Text style={styles.modalDescription}>
                  Profil adı ve uygulama tercihleri bu cihazda saklanır. Hesap silme, şifre sıfırlama ve sunucudaki kişisel verileri yönetme özellikleri backend desteği gerektirir ve henüz uygulamada sunulmuyor.
                </Text>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => setActiveModal(null)}>
                  <Text style={styles.modalPrimaryText}>Anladım</Text>
                </TouchableOpacity>
              </>
            )}

            {activeModal === 'help' && (
              <>
                <Text style={styles.modalTitle}>Yardım ve destek</Text>
                <Text style={styles.modalDescription}>Destek talebinizi e-posta uygulamanızdan iletebilirsiniz.</Text>
                {supportError ? <Text style={styles.supportError}>{supportError}</Text> : null}
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={openSupportEmail}>
                  <Text style={styles.modalPrimaryText}>E-posta oluştur</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  preferenceNote: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, paddingBottom: theme.SIZES.m },
  categoryOptions: { gap: theme.SIZES.s, marginBottom: theme.SIZES.m },
  categoryOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, paddingHorizontal: theme.SIZES.m, borderWidth: 1, borderColor: theme.COLORS.border, borderRadius: theme.SIZES.radius },
  categoryOptionSelected: { borderColor: theme.COLORS.primary, backgroundColor: theme.COLORS.tagBackground },
  categoryOptionText: { ...theme.FONTS.body2, color: theme.COLORS.text },
  categoryOptionTextSelected: { color: theme.COLORS.primary, fontWeight: '600' },
  emptyFavorites: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, textAlign: 'center', marginBottom: theme.SIZES.l },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: theme.SIZES.l, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: { alignSelf: 'center', width: '100%', maxWidth: 440, padding: theme.SIZES.l, backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.cardRadius },
  modalTitle: { ...theme.FONTS.h3, color: theme.COLORS.text, marginBottom: theme.SIZES.m },
  modalDescription: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary, lineHeight: 21, marginBottom: theme.SIZES.m },
  profileInput: { height: 48, borderWidth: 1, borderColor: theme.COLORS.border, borderRadius: theme.SIZES.radius, paddingHorizontal: theme.SIZES.m, color: theme.COLORS.text, marginBottom: theme.SIZES.m },
  modalPrimaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: theme.SIZES.m, backgroundColor: theme.COLORS.primary, borderRadius: theme.SIZES.buttonRadius, marginTop: theme.SIZES.s },
  modalPrimaryText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.card },
  radiusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.SIZES.s, marginBottom: theme.SIZES.m },
  radiusOption: { paddingHorizontal: theme.SIZES.m, paddingVertical: theme.SIZES.s, borderRadius: 18, borderWidth: 1, borderColor: theme.COLORS.border },
  radiusOptionSelected: { backgroundColor: theme.COLORS.tagBackground, borderColor: theme.COLORS.primary },
  radiusOptionText: { ...theme.FONTS.body2, color: theme.COLORS.text },
  radiusOptionTextSelected: { color: theme.COLORS.primary, fontWeight: '600' },
  supportError: { ...theme.FONTS.caption, color: theme.COLORS.error, marginBottom: theme.SIZES.s },
  settingsError: { ...theme.FONTS.caption, color: theme.COLORS.error, marginBottom: theme.SIZES.s },
  favCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.card, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, marginBottom: theme.SIZES.m, borderWidth: 1, borderColor: theme.COLORS.border },
  favImage: { width: 48, height: 48, borderRadius: 24 },
  favInfo: { flex: 1, marginLeft: theme.SIZES.m },
  favName: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text },
  favDesc: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  businessSwitchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.tagBackground, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, marginTop: theme.SIZES.m, gap: theme.SIZES.s },
  businessSwitchText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.primary },
});

export default ProfileScreen;
