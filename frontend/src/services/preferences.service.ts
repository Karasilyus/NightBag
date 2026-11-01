import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedLocation {
  latitude: number;
  longitude: number;
  label: string;
}

export interface UserPreferences {
  searchRadiusKm: number;
  notificationsEnabled: boolean;
  location: SavedLocation | null;
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
let savedBagsCache: SavedBag[] | null = null;
let savedBagsRequest: Promise<SavedBag[]> | null = null;

const DEFAULT_PREFERENCES: UserPreferences = {
  searchRadiusKm: 5,
  notificationsEnabled: true,
  location: null,
};

export const preferencesService = {
  getPreferences: async (): Promise<UserPreferences> => {
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
    };
  },

  updatePreferences: async (
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> => {
    const currentPreferences = await preferencesService.getPreferences();
    const nextPreferences = { ...currentPreferences, ...updates };
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(nextPreferences));
    return nextPreferences;
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
};
