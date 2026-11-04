import { apiClient } from './api';

interface BusinessOverviewResponse {
  published: number;
  reserved: number;
  remaining: number;
  todaysBag: { title: string; imageUrl?: string | null } | null;
}

interface BusinessResponse {
  id: string;
  name: string;
}

interface BusinessReservation {
  id: string;
  title: string;
  quantity: number;
  pickup_code: string;
  status: string;
  pickup_date: string;
  pickup_start: string;
  pickup_end: string;
  total_price: number;
}

const mapBusinessOrder = (reservation: BusinessReservation) => ({
  id: reservation.id,
  name: reservation.title || 'Çanta rezervasyonu',
  quantity: reservation.quantity,
  code: reservation.pickup_code,
  status: reservation.status === 'picked_up' ? 'delivered' : 'pending',
  title: reservation.title,
  date: reservation.pickup_date,
  time: `${reservation.pickup_start}-${reservation.pickup_end}`,
  totalPrice: reservation.total_price,
});

export const businessService = {
  getMyBusiness: async (): Promise<BusinessResponse> => {
    const response = await apiClient.get<BusinessResponse>('/business/me');
    if (!response.data?.id || !response.data.name) {
      throw new Error('İşletme bilgisi yanıtı geçersiz.');
    }
    return response.data;
  },

  /**
   * İşletme genel bakış istatistiklerini getirir.
   * BusinessDashboardScreen'de kullanılır.
   */
  getDashboardData: async (): Promise<{ data: any }> => {
    const [overviewResponse, businessResponse, ordersResponse] = await Promise.all([
      apiClient.get<BusinessOverviewResponse>('/business/overview'),
      businessService.getMyBusiness(),
      apiClient.get<BusinessReservation[]>('/business/reservations'),
    ]);
    const overview = overviewResponse.data;
    if (
      !overview
      || !Number.isFinite(overview.published)
      || !Number.isFinite(overview.reserved)
      || !Number.isFinite(overview.remaining)
    ) {
      throw new Error('İşletme özeti yanıtı geçersiz.');
    }
    if (!Array.isArray(ordersResponse.data)) {
      throw new Error('İşletme rezervasyonları yanıtı geçersiz.');
    }

    const todaysBag = overview.todaysBag;
    const imageUrl = typeof todaysBag?.imageUrl === 'string' ? todaysBag.imageUrl : '';

    return {
      data: {
        businessName: businessResponse.name,
        businessId: businessResponse.id,
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
        todaysBag: todaysBag
          ? {
              title: todaysBag.title,
              imageUrl: imageUrl || undefined,
            }
          : null,
        orders: ordersResponse.data.map(mapBusinessOrder),
      },
    };
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
