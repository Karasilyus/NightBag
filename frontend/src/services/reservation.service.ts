import { apiClient } from './api';

// Backend'den dönen Reservation tipini frontend'in beklediği formata dönüştürür.
const mapReservation = (r: any) => ({
  id: r.id,
  listingId: r.listing_id,
  businessName: r.business_name,
  businessAddress: r.business_address,
  bagTitle: r.title,
  date: r.pickup_date,
  timeInfo: `${r.pickup_start}-${r.pickup_end}`,
  price: r.total_price,
  quantity: r.quantity,
  code: r.pickup_code,
  status: r.status === 'pending_pickup' ? 'active' : 'past',
  imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop',
  rating: null,
  coordinate: { latitude: r.lat, longitude: r.lon },
  pickedUpAt: r.picked_up_at,
  createdAt: r.created_at,
  rawStatus: r.status, // picked_up, cancelled, expired vb.
});

// Frontend tab adı → Backend scope parametresi
const tabToScope = (tab: string): string => {
  const map: Record<string, string> = {
    'Tümü': 'all',
    'Aktif': 'active',
    'Geçmiş': 'past',
  };
  return map[tab] || 'all';
};

export const reservationService = {
  /**
   * Müşterinin rezervasyonlarını listeler.
   * MyOrdersScreen'de kullanılır.
   */
  getReservations: async (statusFilter: string = 'Tümü'): Promise<{ data: any[] }> => {
    try {
      const response = await apiClient.get('/reservations', {
        params: { status: tabToScope(statusFilter) },
      });
      const reservations = response.data || [];
      return { data: reservations.map(mapReservation) };
    } catch (error) {
      console.error('Rezervasyonlar yüklenemedi:', error);
      return { data: [] };
    }
  },

  /**
   * Yeni rezervasyon oluşturur.
   * CheckoutScreen → onay butonunda kullanılır.
   */
  reserve: async (listingId: string, quantity: number = 1): Promise<any> => {
    const response = await apiClient.post(`/listings/${listingId}/reserve`, {
      quantity,
    });
    return mapReservation(response.data);
  },

  /**
   * Bekleyen bir rezervasyonu iptal eder.
   */
  cancelReservation: async (reservationId: string): Promise<void> => {
    await apiClient.post(`/reservations/${reservationId}/cancel`);
  },
};
