import { apiClient } from './api';

export const businessService = {
  /**
   * İşletme genel bakış istatistiklerini getirir.
   * BusinessDashboardScreen'de kullanılır.
   */
  getDashboardData: async (): Promise<{ data: any }> => {
    try {
      const response = await apiClient.get('/business/overview');
      const overview = response.data;

      // Backend'den sadece istatistikler dönüyor (published, reserved, remaining).
      // Dashboard'da gösterilen diğer veriler (işletme adı, bugünün çantası, siparişler)
      // şu an backend'de ayrı endpoint'ler yok, ileride eklenecek.
      // Şimdilik istatistikleri mapleyip kalan alanları placeholder bırakıyoruz.
      return {
        data: {
          businessName: 'İşletmem',
          dateString: new Date().toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }),
          stats: {
            published: overview.published,
            sold: overview.reserved,
            remaining: overview.remaining,
          },
          // Bugünün çantası ve siparişler ileride ayrı endpoint'lerden çekilecek
          todaysBag: null,
          orders: [],
        },
      };
    } catch (error) {
      console.error('Dashboard verisi yüklenemedi:', error);
      return {
        data: {
          businessName: 'İşletmem',
          dateString: '',
          stats: { published: 0, sold: 0, remaining: 0 },
          todaysBag: null,
          orders: [],
        },
      };
    }
  },

  /**
   * Teslim alma kodunu doğrulayıp teslimi tamamlar.
   * BusinessDashboardScreen → "Teslim et" butonunda kullanılır.
   */
  completePickup: async (code: string): Promise<any> => {
    const response = await apiClient.post('/business/pickups', { code });
    return response.data;
  },

  /**
   * Yeni çanta ilanı oluşturur.
   * CreateBagScreen'de kullanılır.
   */
  createListing: async (businessId: string, listingData: {
    title: string;
    category: string;
    description?: string;
    contentTags?: string[];
    allergenNote?: string;
    originalValue: number;
    price: number;
    quantity: number;
    pickupDate: string;
    pickupStart: string;
    pickupEnd: string;
    photoUrl?: string;
  }): Promise<any> => {
    const response = await apiClient.post(`/business/${businessId}/listings`, {
      title: listingData.title,
      category: listingData.category,
      description: listingData.description || '',
      content_tags: listingData.contentTags || [],
      allergen_note: listingData.allergenNote || null,
      original_value: listingData.originalValue,
      price: listingData.price,
      quantity: listingData.quantity,
      pickup_date: listingData.pickupDate,
      pickup_start: listingData.pickupStart,
      pickup_end: listingData.pickupEnd,
      photo_url: listingData.photoUrl || null,
    });
    return response.data;
  },
};
