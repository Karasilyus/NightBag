const MOCK_BUSINESS_DATA = {
  businessName: 'Moda Fırını',
  dateString: 'İyi akşamlar • 6 Ekim, Salı • Bugünün özeti',
  stats: {
    published: 12,
    sold: 8,
    remaining: 4
  },
  todaysBag: {
    title: 'Fırın sürpriz çantası',
    price: 125,
    originalPrice: 350,
    time: '20.00-21.00',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop'
  },
  orders: [
    { id: '1', name: 'Elif Y.', quantity: 1, code: 'NB-4826', status: 'pending' },
    { id: '2', name: 'Deniz K.', quantity: 1, code: 'NB-7210', status: 'delivered' },
    { id: '3', name: 'Ece A.', quantity: 1, code: 'NB-9054', status: 'pending' },
  ]
};

export const businessService = {
  getDashboardData: async (): Promise<{ data: any }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: MOCK_BUSINESS_DATA });
      }, 800);
    });
  },
  deliverOrder: async (orderId: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 400);
    });
  }
};
