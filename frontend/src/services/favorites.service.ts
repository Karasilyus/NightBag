import { apiClient } from './api';
import { mapListingToBag } from './bag.service';

export interface FavoriteBusinessListing {
  id: string;
  businessId: string;
  businessName: string;
  bagType: string;
  distance: string;
  timeInfo: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  remainingBags: number;
  coordinate: { latitude: number; longitude: number };
}

export interface FavoriteBusiness {
  businessId: string;
  businessName: string;
  imageUrl: string;
  notificationsEnabled: boolean;
}

let favoriteListingsCache: FavoriteBusinessListing[] | null = null;
let favoriteListingsRequest: Promise<FavoriteBusinessListing[]> | null = null;
let favoriteBusinessesCache: FavoriteBusiness[] | null = null;
let favoriteBusinessesRequest: Promise<FavoriteBusiness[]> | null = null;
let favoritesVersion = 0;
const favoriteListeners = new Set<(businessId: string, isFavorite: boolean) => void>();

const loadFavorites = async (): Promise<FavoriteBusinessListing[]> => {
  if (favoriteListingsCache) return favoriteListingsCache;
  if (!favoriteListingsRequest) {
    const requestVersion = favoritesVersion;
    favoriteListingsRequest = (async () => {
      const response = await apiClient.get('/favorites');
      if (!Array.isArray(response.data)) {
        throw new Error('Favori işletme yanıtı geçersiz.');
      }
      const favorites = response.data.map(mapListingToBag);
      if (requestVersion === favoritesVersion) favoriteListingsCache = favorites;
      return favorites;
    })().finally(() => {
      if (requestVersion === favoritesVersion) favoriteListingsRequest = null;
    });
  }
  return favoriteListingsRequest;
};

const loadFavoriteBusinesses = async (): Promise<FavoriteBusiness[]> => {
  if (favoriteBusinessesCache) return favoriteBusinessesCache;
  if (!favoriteBusinessesRequest) {
    const requestVersion = favoritesVersion;
    favoriteBusinessesRequest = (async () => {
      const response = await apiClient.get('/favorites/businesses');
      if (!Array.isArray(response.data)) {
        throw new Error('Favori işletme yanıtı geçersiz.');
      }
      const businesses = response.data.map((item) => {
        if (
          !item
          || typeof item.business_id !== 'string'
          || typeof item.business_name !== 'string'
          || typeof item.notifications_enabled !== 'boolean'
        ) {
          throw new Error('Favori işletme bilgisi geçersiz.');
        }
        return {
          businessId: item.business_id,
          businessName: item.business_name,
          imageUrl: typeof item.photo_url === 'string' ? item.photo_url : '',
          notificationsEnabled: item.notifications_enabled,
        };
      });
      if (requestVersion === favoritesVersion) favoriteBusinessesCache = businesses;
      return businesses;
    })().finally(() => {
      if (requestVersion === favoritesVersion) favoriteBusinessesRequest = null;
    });
  }
  return favoriteBusinessesRequest;
};

export const favoritesService = {
  clearCache: () => {
    favoritesVersion += 1;
    favoriteListingsCache = null;
    favoriteListingsRequest = null;
    favoriteBusinessesCache = null;
    favoriteBusinessesRequest = null;
  },

  getFavorites: async (): Promise<FavoriteBusinessListing[]> => {
    return loadFavorites();
  },

  getFavoriteBusinesses: async (): Promise<FavoriteBusiness[]> => {
    return loadFavoriteBusinesses();
  },

  isBusinessFavorited: async (businessId: string): Promise<boolean> => {
    if (!businessId) return false;
    const favorites = await loadFavoriteBusinesses();
    return favorites.some((favorite) => favorite.businessId === businessId);
  },

  subscribe: (listener: (businessId: string, isFavorite: boolean) => void) => {
    favoriteListeners.add(listener);
    return () => favoriteListeners.delete(listener);
  },

  setFavorite: async (businessId: string, isFavorite: boolean): Promise<void> => {
    if (!businessId) throw new Error('İşletme kimliği bulunamadı.');

    if (isFavorite) {
      await apiClient.delete(`/favorites/${businessId}`);
    } else {
      await apiClient.post(`/favorites/${businessId}`);
    }

    favoritesService.clearCache();
    favoriteListeners.forEach((listener) => listener(businessId, !isFavorite));
  },

  setBusinessNotifications: async (businessId: string, enabled: boolean): Promise<void> => {
    if (!businessId) throw new Error('İşletme kimliği bulunamadı.');

    await apiClient.put(`/favorites/${businessId}/notifications`, { enabled });
    favoritesService.clearCache();
  },
};
