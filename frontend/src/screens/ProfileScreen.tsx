import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Modal, Pressable, Switch, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import { authService } from '../services/auth.service';
import { FavoriteBusiness, favoritesService } from '../services/favorites.service';
import { preferencesService, UserPreferences } from '../services/preferences.service';
import { profileService } from '../services/profile.service';
import { reservationService } from '../services/reservation.service';
import { notificationsService } from '../services/notifications.service';
import { NotificationPermissionResult } from '../services/notifications.types';
import LegalDraftNotice from '../components/LegalDraftNotice';

const PERSONALIZATION_CATEGORIES = ['Fırın', 'Kafe', 'Tatlı', 'Yemek'];

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState({ 
    id: '',
    fullName: 'Misafir', 
    email: '',
    role: '',
    business_id: '',
    profilePhone: '',
    profileStats: { savedBags: 0, moneySaved: 0 },
    savedBusinesses: [] as FavoriteBusiness[]
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    searchRadiusKm: 5,
    notificationsEnabled: true,
    location: null,
    favoriteCategories: [],
  });
  const [activeModal, setActiveModal] = useState<'location' | 'personalization' | 'privacy' | 'help' | null>(null);
  const [supportError, setSupportError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [arePreferencesLoaded, setArePreferencesLoaded] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [updatingFavoriteBusinessId, setUpdatingFavoriteBusinessId] = useState<string | null>(null);
  const canAccessBusinessPanel = user.role === 'business_owner'
    && Boolean(user.business_id)
    && Boolean(user.email.trim());
  const favoritePlaces = user.savedBusinesses;

  useEffect(() => {
    const loadUser = async () => {
      const results = await Promise.allSettled([
        authService.getCurrentUser(),
        preferencesService.getPreferences(),
        authService.getCurrentUserStats(),
        favoritesService.getFavoriteBusinesses(),
      ]);
      const [currentUserResult, preferencesResult, statsResult, favoritesResult] = results;
      const failures = results.filter((result) => result.status === 'rejected').length;
      let profileDetails: { fullName: string; phone: string } | null = null;
      let profileDetailsError = false;

      if (preferencesResult.status === 'fulfilled') {
        setPreferences(preferencesResult.value);
        setArePreferencesLoaded(true);
      }
      if (currentUserResult.status === 'fulfilled' && currentUserResult.value) {
        if (
          preferencesResult.status === 'fulfilled'
          && preferencesResult.value.notificationsEnabled
        ) {
          void notificationsService.registerPushToken().catch((error) => {
            console.error('Sunucu bildirimleri eşitlenemedi:', error);
          });
        }
        try {
          profileDetails = await profileService.getCustomerDetails(
            currentUserResult.value.id,
            currentUserResult.value.fullName
          );
        } catch (error) {
          console.error('Cihazdaki profil alanları yüklenemedi:', error);
          profileDetailsError = true;
        }
        setUser((previous) => ({
          ...previous,
          ...currentUserResult.value,
          fullName: profileDetails?.fullName || currentUserResult.value.fullName,
          profilePhone: profileDetails?.phone || '',
          profileStats: statsResult.status === 'fulfilled' ? statsResult.value : previous.profileStats,
          savedBusinesses: favoritesResult.status === 'fulfilled'
            ? favoritesResult.value
            : previous.savedBusinesses,
        }));
      }
      setSettingsError(
        profileDetailsError
            ? 'Bu cihazdaki profil alanları yüklenemedi.'
            : failures > 0
              ? 'Profil bilgilerinin bir kısmı yüklenemedi.'
              : ''
      );
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
    try {
      await authService.logout();
    } catch (error) {
      console.error('Sunucu oturumu kapatılamadı:', error);
    } finally {
      navigation.replace('Welcome');
    }
  };

  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'NB';
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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

  const updateNotificationPreference = async (notificationsEnabled: boolean) => {
    setIsUpdatingNotifications(true);
    setSettingsError('');
    let preferenceSaved = false;
    try {
      let permission: NotificationPermissionResult = 'unsupported';
      if (notificationsEnabled) {
        permission = await notificationsService.requestPermission();
        if (permission === 'denied') {
          setSettingsError('Hatırlatıcılar için telefon bildirim izni gerekli.');
          return;
        }
      }

      const updatedPreferences = await preferencesService.updatePreferences({ notificationsEnabled });
      setPreferences(updatedPreferences);
      preferenceSaved = true;

      if (notificationsEnabled && permission === 'granted') {
        let pushRegistered = false;
        let pushRegistrationFailed = false;
        try {
          pushRegistered = await notificationsService.registerPushToken();
        } catch (error) {
          console.error('Sunucu bildirimi kaydedilemedi:', error);
          pushRegistrationFailed = true;
        }
        try {
          const activeReservations = await reservationService.getReservations('Aktif');
          for (const reservation of activeReservations.data) {
            await notificationsService.schedulePickupReminder(reservation);
          }
          if (!pushRegistered && user.id) {
            setSettingsError(pushRegistrationFailed
              ? 'Sunucu bildirimi eşitlenemedi; bu cihazda yerel hatırlatıcı kullanılacak.'
              : 'Sunucu bildirimi için EAS proje kimliği ve push kimlik bilgileri gerekir; bu cihazda yerel hatırlatıcı kullanılacak.');
          }
        } catch (error) {
          console.error('Aktif rezervasyon hatırlatıcıları planlanamadı:', error);
          setSettingsError('Bildirimler açıldı ancak bazı rezervasyonlar için hatırlatıcı kurulamadı.');
        }
      } else if (!notificationsEnabled) {
        await notificationsService.cancelAllPickupReminders();
        await notificationsService.unregisterPushToken();
      }
    } catch (error) {
      console.error('Bildirim tercihi güncellenemedi:', error);
      setSettingsError(preferenceSaved
        ? 'Bildirim tercihi kaydedildi ancak cihaz eşitlemesi tamamlanamadı.'
        : 'Bildirim tercihi güncellenemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsUpdatingNotifications(false);
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

  const removeFavoriteBusiness = async (businessId: string) => {
    try {
      await favoritesService.setFavorite(businessId, true);
      setUser((previous) => ({
        ...previous,
        savedBusinesses: previous.savedBusinesses.filter((favorite) => favorite.businessId !== businessId),
      }));
      setSettingsError('');
    } catch (error) {
      console.error('Favori işletme kaldırılamadı:', error);
      setSettingsError('Favori işletme kaldırılamadı. Lütfen tekrar deneyin.');
    }
  };

  const updateFavoriteBusinessNotifications = async (businessId: string, enabled: boolean) => {
    if (!arePreferencesLoaded) {
      setSettingsError('Bildirim tercihleri yüklenene kadar lütfen bekle.');
      return;
    }
    if (enabled && !preferences.notificationsEnabled) {
      setSettingsError('Favori işletme bildirimleri için önce genel bildirimleri aç.');
      return;
    }
    if (enabled && Platform.OS === 'web') {
      setSettingsError('Favori işletme bildirimleri iOS ve Android uygulamasında kullanılabilir.');
      return;
    }

    setUpdatingFavoriteBusinessId(businessId);
    setSettingsError('');
    try {
      if (enabled) {
        const permission = await notificationsService.requestPermission();
        if (permission !== 'granted') {
          setSettingsError('Favori işletme bildirimleri için telefon bildirim izni gerekli.');
          return;
        }
        const registered = await notificationsService.registerPushToken();
        if (!registered) {
          setSettingsError('Push kaydı tamamlanamadı. Oturum, EAS proje kimliği ve bildirim yapılandırmasını kontrol et.');
          return;
        }
      }

      await favoritesService.setBusinessNotifications(businessId, enabled);
      setUser((previous) => ({
        ...previous,
        savedBusinesses: previous.savedBusinesses.map((business) => (
          business.businessId === businessId
            ? { ...business, notificationsEnabled: enabled }
            : business
        )),
      }));
    } catch (error) {
      console.error('Favori işletme bildirimi güncellenemedi:', error);
      setSettingsError('Favori işletme bildirimi kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setUpdatingFavoriteBusinessId(null);
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
            <Text style={styles.userContact}>{user.email}</Text>
            {user.profilePhone ? <Text style={styles.userContact}>{user.profilePhone}</Text> : null}
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                if (!user.id) {
                  setSettingsError('Profil düzenleme için kullanıcı bilgisi yüklenemedi.');
                  return;
                }
                navigation.navigate('EditProfile', {
                  userId: user.id,
                  fullName: user.fullName,
                  email: user.email,
                });
              }}
              accessibilityRole="button"
            >
              <Text style={styles.editBtnText}>Profilini düzenle</Text>
              <Ionicons name="create-outline" size={15} color={theme.COLORS.primary} />
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
                onValueChange={updateNotificationPreference}
                disabled={isUpdatingNotifications || !arePreferencesLoaded}
                trackColor={{ false: theme.COLORS.border, true: theme.COLORS.tagBackground }}
                thumbColor={preferences.notificationsEnabled ? theme.COLORS.primary : '#f4f3f4'}
                accessibilityLabel="Bildirim tercihini değiştir"
              />
            </View>
          </View>
          <Text style={styles.preferenceNote}>
            {Platform.OS === 'web'
              ? 'Teslim hatırlatıcıları telefon uygulamasında çalışır.'
              : 'Teslimden 30 dakika önce bildirim gönderilir. Sunucu bildirimi için EAS proje kimliği, push kimlik bilgileri ve telefon izni gerekir.'}
          </Text>

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
          <Text style={styles.preferenceNote}>
            {Platform.OS === 'web'
              ? 'Yeni çanta bildirimleri iOS ve Android uygulamasında kullanılabilir.'
              : preferences.notificationsEnabled
                ? 'Yeni çanta uyarıları için cihaz bildirim izni ve sunucu push kaydı gerekir.'
                : 'Favori işletme uyarılarını açmak için genel bildirimleri etkinleştir.'}
          </Text>
          {favoritePlaces.map((place) => (
            <View key={place.businessId} style={styles.favCard}>
              {place.imageUrl
                ? <Image source={{ uri: place.imageUrl }} style={styles.favImage} />
                : <View style={[styles.favImage, styles.favImagePlaceholder]}>
                    <Ionicons name="storefront-outline" size={20} color={theme.COLORS.primary} />
                  </View>}
              <View style={styles.favInfo}>
                <Text style={styles.favName}>{place.businessName}</Text>
                <View style={styles.favNotificationRow}>
                  <Text style={styles.favDesc}>Yeni çanta bildirimi</Text>
                  <Switch
                    value={place.notificationsEnabled}
                    onValueChange={(enabled) => updateFavoriteBusinessNotifications(place.businessId, enabled)}
                    disabled={
                      ((Platform.OS === 'web' || !preferences.notificationsEnabled)
                        && !place.notificationsEnabled)
                      || !arePreferencesLoaded
                      || updatingFavoriteBusinessId !== null
                    }
                    trackColor={{ false: theme.COLORS.border, true: theme.COLORS.tagBackground }}
                    thumbColor={place.notificationsEnabled ? theme.COLORS.primary : '#f4f3f4'}
                    accessibilityLabel={`${place.businessName} yeni çanta bildirimleri`}
                    accessibilityState={{
                      checked: place.notificationsEnabled,
                      disabled: ((Platform.OS === 'web' || !preferences.notificationsEnabled)
                        && !place.notificationsEnabled)
                        || !arePreferencesLoaded
                        || updatingFavoriteBusinessId !== null,
                    }}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeFavoriteBusiness(place.businessId)}
                accessibilityRole="button"
                accessibilityLabel={`${place.businessName} favorilerden çıkar`}
              >
                <Ionicons name="heart" size={22} color={theme.COLORS.primary} />
              </TouchableOpacity>
            </View>
          ))}
          {favoritePlaces.length === 0 && (
            <Text style={styles.emptyFavorites}>Bir işletmenin çantasındaki kalp simgesine dokunarak favorilerine ekleyebilirsin.</Text>
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
            <ScrollView contentContainerStyle={styles.modalCardContent}>
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
                <Text style={styles.modalDescription}>İlgilendiğin işletme türlerini seç. Tercihlerin hesabında saklanır.</Text>
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
                  Profil bilgilerin ve keşfet tercihlerin hesabınla eşitlenir. Bilgilerini düzenleyebilir veya şifreni değiştirebilirsin.
                </Text>
                <LegalDraftNotice context="privacy" inlineDetails />
                <TouchableOpacity style={styles.privacyAction} onPress={() => {
                  setActiveModal(null);
                  if (user.id) navigation.navigate('EditProfile', { userId: user.id, fullName: user.fullName, email: user.email });
                  else setSettingsError('Profil bilgileri yüklenemedi.');
                }} accessibilityRole="button">
                  <Ionicons name="person-outline" size={19} color={theme.COLORS.primary} />
                  <Text style={styles.privacyActionText}>Profil bilgilerini düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.privacyAction} onPress={() => {
                  setActiveModal(null);
                  navigation.navigate('PasswordReset', { initialEmail: user.email });
                }} accessibilityRole="button">
                  <Ionicons name="key-outline" size={19} color={theme.COLORS.primary} />
                  <Text style={styles.privacyActionText}>Şifreni değiştir</Text>
                </TouchableOpacity>
                <Text style={styles.modalDescription}>Hesap silme ve kişisel verilerin tamamen silinmesi henüz desteklenmiyor.</Text>
                <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => setActiveModal(null)}>
                  <Text style={styles.modalPrimaryText}>Kapat</Text>
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
            </ScrollView>
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
  userContact: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary, marginBottom: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, marginLeft: -4 },
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
  modalCard: { alignSelf: 'center', width: '100%', maxWidth: 440, maxHeight: '85%', backgroundColor: theme.COLORS.card, borderRadius: theme.SIZES.cardRadius },
  modalCardContent: { padding: theme.SIZES.l },
  modalTitle: { ...theme.FONTS.h3, color: theme.COLORS.text, marginBottom: theme.SIZES.m },
  modalDescription: { ...theme.FONTS.body2, color: theme.COLORS.textSecondary, lineHeight: 21, marginBottom: theme.SIZES.m },
  privacyAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.SIZES.s, marginBottom: theme.SIZES.s },
  privacyActionText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.primary },
  modalPrimaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: theme.SIZES.m, backgroundColor: theme.COLORS.primary, borderRadius: theme.SIZES.buttonRadius, marginTop: theme.SIZES.s },
  modalPrimaryText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.card },
  radiusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.SIZES.s, marginBottom: theme.SIZES.m },
  radiusOption: { paddingHorizontal: theme.SIZES.m, paddingVertical: theme.SIZES.s, borderRadius: 18, borderWidth: 1, borderColor: theme.COLORS.border },
  radiusOptionSelected: { backgroundColor: theme.COLORS.tagBackground, borderColor: theme.COLORS.primary },
  radiusOptionText: { ...theme.FONTS.body2, color: theme.COLORS.text },
  radiusOptionTextSelected: { color: theme.COLORS.primary, fontWeight: '600' },
  supportError: { ...theme.FONTS.caption, color: theme.COLORS.error, marginBottom: theme.SIZES.s },
  settingsError: { ...theme.FONTS.caption, color: theme.COLORS.error, marginBottom: theme.SIZES.s },
  favCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.card, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, marginBottom: theme.SIZES.m, borderWidth: 1, borderColor: theme.COLORS.border, gap: theme.SIZES.s },
  favImage: { width: 48, height: 48, borderRadius: 24 },
  favImagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.COLORS.tagBackground },
  favInfo: { flex: 1, minWidth: 0 },
  favName: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.text },
  favDesc: { ...theme.FONTS.caption, color: theme.COLORS.textSecondary },
  favNotificationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.SIZES.xs, marginTop: 2 },
  businessSwitchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.tagBackground, padding: theme.SIZES.m, borderRadius: theme.SIZES.radius, marginTop: theme.SIZES.m, gap: theme.SIZES.s },
  businessSwitchText: { ...theme.FONTS.body2, fontWeight: '600', color: theme.COLORS.primary },
});

export default ProfileScreen;
