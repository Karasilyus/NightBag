const MOCK_RESERVATIONS = [
  {
    id: '1',
    businessName: 'Moda Fırını',
    bagTitle: 'Fırın sürpriz çantası',
    date: '6 Ekim, Salı',
    timeInfo: '20.00-21.00',
    price: 125,
    quantity: 1,
    code: 'NB-4826',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop',
    rating: null
  },
  {
    id: '2',
    businessName: 'Dem Kafe',
    bagTitle: 'Kahvaltı Çantası',
    date: '5 Ekim, Pazartesi',
    timeInfo: '19.30-20.30',
    price: 95,
    quantity: 1,
    code: 'NB-7210',
    status: 'past',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000&auto=format&fit=crop',
    rating: null
  },
  {
    id: '3',
    businessName: 'Yeşil Tabak',
    bagTitle: 'Sağlıklı Akşam',
    date: '3 Ekim, Cumartesi',
    timeInfo: '20.00-21.00',
    price: 145,
    quantity: 1,
    code: 'NB-1122',
    status: 'past',
    imageUrl: 'https://images.unsplash.com/photo-1495147466023-b6589fc41953?q=80&w=1000&auto=format&fit=crop',
    rating: 5
  }
];

export const reservationService = {
  getReservations: async (statusFilter: string = 'Tümü'): Promise<{ data: any[] }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = [...MOCK_RESERVATIONS];
        
        if (statusFilter === 'Aktif') {
          filtered = filtered.filter(r => r.status === 'active');
        } else if (statusFilter === 'Geçmiş') {
          filtered = filtered.filter(r => r.status === 'past');
        }
        
        resolve({ data: filtered });
      }, 800);
    });
  }
};
