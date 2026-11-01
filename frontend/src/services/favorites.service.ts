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

let favoriteListingsCache: FavoriteBusinessListing[] | null = null;
let favoriteListingsRequest: Promise<FavoriteBusinessListing[]> | null = null;
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

export const favoritesService = {
  clearCache: () => {
    favoritesVersion += 1;
    favoriteListingsCache = null;
    favoriteListingsRequest = null;
  },

  getFavorites: async (): Promise<FavoriteBusinessListing[]> => {
    return loadFavorites();
  },

  isBusinessFavorited: async (businessId: string): Promise<boolean> => {
    if (!businessId) return false;
    const favorites = await loadFavorites();
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
};
