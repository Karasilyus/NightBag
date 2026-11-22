import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';

export interface SavedLocation {
  latitude: number;
  longitude: number;
  label: string;
}

export interface UserPreferences {
  searchRadiusKm: number;
  notificationsEnabled: boolean;
  location: SavedLocation | null;
  favoriteCategories: string[];
}

export interface SavedBag {
  id: string;
  name: string;
  type: string;
  distance: string;
  imageUrl: string;
}

const PREFERENCES_KEY = 'userPreferences';
const SAVED_BAGS_KEY = 'savedBags';
const BUSINESS_LOCATION_KEY = 'businessRegistrationLocation';
let savedBagsCache: SavedBag[] | null = null;
let savedBagsRequest: Promise<SavedBag[]> | null = null;

const DEFAULT_PREFERENCES: UserPreferences = {
  searchRadiusKm: 5,
  notificationsEnabled: true,
  location: null,
  favoriteCategories: [],
};

const categoryToApi: Record<string, string> = {
  'Fırın': 'firin',
  'Kafe': 'kafe',
  'Tatlı': 'tatli',
  'Yemek': 'yemek',
};
const categoryFromApi = Object.fromEntries(
  Object.entries(categoryToApi).map(([label, value]) => [value, label])
);

interface PreferencesResponse {
  search_radius_m: number;
  notifications_enabled: boolean;
  favorite_categories: string[];
  location: SavedLocation | null;
}

const readLocalPreferences = async (): Promise<UserPreferences> => {
  const storedPreferences = await AsyncStorage.getItem(PREFERENCES_KEY);
  if (!storedPreferences) return DEFAULT_PREFERENCES;

  const parsedPreferences = JSON.parse(storedPreferences) as Partial<UserPreferences>;
  const location = parsedPreferences.location;
  const hasValidLocation = location
    && Number.isFinite(location.latitude)
    && Number.isFinite(location.longitude);

  return {
    ...DEFAULT_PREFERENCES,
    ...parsedPreferences,
    location: hasValidLocation ? location : null,
    favoriteCategories: Array.isArray(parsedPreferences.favoriteCategories)
      ? parsedPreferences.favoriteCategories.filter((category): category is string => typeof category === 'string')
      : DEFAULT_PREFERENCES.favoriteCategories,
  };
};

const mapPreferences = (preferences: PreferencesResponse): UserPreferences => {
  if (
    !Number.isFinite(preferences.search_radius_m)
    || typeof preferences.notifications_enabled !== 'boolean'
    || !Array.isArray(preferences.favorite_categories)
  ) {
    throw new Error('Kullanıcı tercihleri yanıtı geçersiz.');
  }
  const location = preferences.location;
  if (location && (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude))) {
    throw new Error('Kayıtlı konum yanıtı geçersiz.');
  }
  return {
    searchRadiusKm: preferences.search_radius_m / 1000,
    notificationsEnabled: preferences.notifications_enabled,
    favoriteCategories: preferences.favorite_categories
      .map((category) => categoryFromApi[category])
      .filter((category): category is string => typeof category === 'string'),
    location,
  };
};

const saveLocalPreferences = async (preferences: UserPreferences): Promise<void> => {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
};

const toApiPreferences = (preferences: UserPreferences): PreferencesResponse => ({
  search_radius_m: Math.round(preferences.searchRadiusKm * 1000),
  notifications_enabled: preferences.notificationsEnabled,
  favorite_categories: preferences.favoriteCategories.map((category) => categoryToApi[category]).filter(Boolean),
  location: preferences.location,
});

export const preferencesService = {
  getPreferences: async (): Promise<UserPreferences> => {
    const localPreferences = await readLocalPreferences();
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return localPreferences;

    const response = await apiClient.get<PreferencesResponse>('/users/me/preferences');
    const preferences = mapPreferences(response.data);
    await saveLocalPreferences(preferences);
    return preferences;
  },

  updatePreferences: async (
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> => {
    const currentPreferences = await preferencesService.getPreferences();
    const nextPreferences = { ...currentPreferences, ...updates };
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      await saveLocalPreferences(nextPreferences);
      return nextPreferences;
    }

    const response = await apiClient.put<PreferencesResponse>(
      '/users/me/preferences',
      toApiPreferences(nextPreferences)
    );
    const savedPreferences = mapPreferences(response.data);
    await saveLocalPreferences(savedPreferences);
    return savedPreferences;
  },

  syncLocalPreferences: async (): Promise<void> => {
    const localPreferences = await readLocalPreferences();
    const response = await apiClient.put<PreferencesResponse>(
      '/users/me/preferences',
      toApiPreferences(localPreferences)
    );
    await saveLocalPreferences(mapPreferences(response.data));
  },

  clearLocalPreferences: async (): Promise<void> => {
    await AsyncStorage.multiRemove([PREFERENCES_KEY, SAVED_BAGS_KEY]);
    savedBagsCache = null;
    savedBagsRequest = null;
  },

  getSavedBags: async (): Promise<SavedBag[]> => {
    if (savedBagsCache) return savedBagsCache;
    if (!savedBagsRequest) {
      const request = AsyncStorage.getItem(SAVED_BAGS_KEY)
        .then((storedBags) => {
          const savedBags: SavedBag[] = storedBags ? JSON.parse(storedBags) : [];
          savedBagsCache = savedBags;
          return savedBags;
        });
      savedBagsRequest = request;
    }

    const request = savedBagsRequest;
    if (!request) throw new Error('Kaydedilen çantalar isteği başlatılamadı.');

    try {
      return await request;
    } finally {
      if (savedBagsRequest === request) savedBagsRequest = null;
    }
  },

  toggleSavedBag: async (bag: SavedBag): Promise<boolean> => {
    const savedBags = await preferencesService.getSavedBags();
    const isSaved = savedBags.some((savedBag) => savedBag.id === bag.id);
    const nextSavedBags = isSaved
      ? savedBags.filter((savedBag) => savedBag.id !== bag.id)
      : [...savedBags, bag];

    await AsyncStorage.setItem(SAVED_BAGS_KEY, JSON.stringify(nextSavedBags));
    savedBagsCache = nextSavedBags;
    return !isSaved;
  },

  saveBusinessRegistrationLocation: async (location: Omit<SavedLocation, 'label'>): Promise<void> => {
    await AsyncStorage.setItem(BUSINESS_LOCATION_KEY, JSON.stringify(location));
  },

  takeBusinessRegistrationLocation: async (): Promise<Omit<SavedLocation, 'label'> | null> => {
    const storedLocation = await AsyncStorage.getItem(BUSINESS_LOCATION_KEY);
    if (!storedLocation) return null;

    await AsyncStorage.removeItem(BUSINESS_LOCATION_KEY);
    const location = JSON.parse(storedLocation) as Partial<SavedLocation>;
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      throw new Error('İşletme konum bilgisi geçersiz.');
    }

    return {
      latitude: location.latitude as number,
      longitude: location.longitude as number,
    };
  },
};
