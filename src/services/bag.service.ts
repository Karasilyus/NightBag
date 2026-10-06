const MOCK_BAGS = [
  {
    id: '1',
    businessName: 'Moda Fırını',
    bagType: 'Sürpriz Çanta',
    category: 'Fırın',
    distance: '850m',
    timeInfo: 'Bugün 20:00-21:00',
    price: 125,
    originalPrice: 350,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop',
    remainingBags: 4,
    coordinate: { latitude: 40.9840, longitude: 29.0250 },
  },
  {
    id: '2',
    businessName: 'Dem Kafe',
    bagType: 'Kahvaltı Çantası',
    category: 'Kafe',
    distance: '1.2km',
    timeInfo: 'Yarın 19:30-20:30',
    price: 95,
    originalPrice: 340,
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000&auto=format&fit=crop',
    remainingBags: 2,
    coordinate: { latitude: 40.9850, longitude: 29.0270 },
  },
  {
    id: '3',
    businessName: 'Yeşil Tabak',
    bagType: 'Sağlıklı Akşam',
    category: 'Yemek',
    distance: '3.5km',
    timeInfo: 'Bugün 20:00-21:00',
    price: 145,
    originalPrice: 400,
    imageUrl: 'https://images.unsplash.com/photo-1495147466023-b6589fc41953?q=80&w=1000&auto=format&fit=crop',
    remainingBags: 1,
    coordinate: { latitude: 40.9860, longitude: 29.0240 },
  },
  {
    id: '4',
    businessName: 'Tatlıcı Hasan',
    bagType: 'Tatlı Çantası',
    category: 'Fırın',
    distance: '2.1km',
    timeInfo: 'Bugün 21:00-22:00',
    price: 85,
    originalPrice: 200,
    imageUrl: 'https://images.unsplash.com/photo-1495147466023-b6589fc41953?q=80&w=1000&auto=format&fit=crop',
    remainingBags: 0,
    coordinate: { latitude: 40.9830, longitude: 29.0280 },
  }
];

export const bagService = {
  getBags: async (category: string = 'Tümü', searchQuery: string = ''): Promise<{ data: any[] }> => {
    return new Promise((resolve) => {
      // 800ms internet beklemesi simülasyonu
      setTimeout(() => {
        let filteredBags = [...MOCK_BAGS];
        
        // Kategori filtresi
        if (category !== 'Tümü') {
          filteredBags = filteredBags.filter(bag => bag.category === category);
        }
        
        // Arama filtresi
        if (searchQuery.trim() !== '') {
          const lowerQuery = searchQuery.toLowerCase();
          filteredBags = filteredBags.filter(bag => 
            bag.businessName.toLowerCase().includes(lowerQuery) || 
            bag.bagType.toLowerCase().includes(lowerQuery)
          );
        }
        
        resolve({ data: filteredBags });
      }, 800); 
    });
  }
};
