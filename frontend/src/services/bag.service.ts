import { apiClient } from './api';

// Backend'den dönen Listing tipini frontend'in beklediği formata dönüştürür.
const mapListingToBag = (listing: any) => ({
  id: listing.id,
  businessName: listing.business_name,
  bagType: listing.title,
  category: categoryDisplayName(listing.category),
  distance: listing.distance_m != null
    ? listing.distance_m < 1000
      ? `${Math.round(listing.distance_m)}m`
      : `${(listing.distance_m / 1000).toFixed(1)}km`
    : '',
  timeInfo: `${listing.pickup_date} ${listing.pickup_start}-${listing.pickup_end}`,
  price: listing.price,
  originalPrice: listing.original_value,
  imageUrl: listing.photo_url || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop',
  remainingBags: listing.quantity_remaining,
  coordinate: { latitude: listing.lat, longitude: listing.lon },
  // Ham veri (detay ekranında kullanılabilir)
  description: listing.description,
  contentTags: listing.content_tags || [],
  allergenNote: listing.allergen_note,
  status: listing.status,
  businessId: listing.business_id,
});

// Backend kategori → Ekran görüntüleme adı
const categoryDisplayName = (cat: string): string => {
  const map: Record<string, string> = {
    firin: 'Fırın',
    kafe: 'Kafe',
    tatli: 'Tatlı',
    yemek: 'Yemek',
  };
  return map[cat] || cat;
};

// Ekranda seçilen kategori → Backend'in beklediği değer
const categoryToApi = (displayName: string): string => {
  const map: Record<string, string> = {
    'Fırın': 'firin',
    'Kafe': 'kafe',
    'Tatlı': 'tatli',
    'Yemek': 'yemek',
    'Tümü': '',
  };
  return map[displayName] || '';
};

export const bagService = {
  /**
   * Yakındaki çantaları listeler.
   * HomeScreen ve MapScreen'de kullanılır.
   */
  getBags: async (
    category: string = 'Tümü',
    searchQuery: string = '',
    lat: number = 40.9845,
    lon: number = 29.0260,
    radius: number = 5000
  ): Promise<{ data: any[] }> => {
    try {
      const response = await apiClient.get('/listings/nearby', {
        params: {
          lat,
          lon,
          radius,
          category: categoryToApi(category),
          q: searchQuery.trim(),
          limit: 50,
        },
      });
      const listings = response.data || [];
      return { data: listings.map(mapListingToBag) };
    } catch (error) {
      console.error('Çantalar yüklenemedi:', error);
      return { data: [] };
    }
  },

  /**
   * Tek bir çanta ilanının detayını getirir.
   * BagDetailScreen'de kullanılır.
   */
  getBagDetail: async (id: string): Promise<any | null> => {
    try {
      const response = await apiClient.get(`/listings/${id}`);
      return mapListingToBag(response.data);
    } catch (error) {
      console.error('Çanta detayı yüklenemedi:', error);
      return null;
    }
  },
};
