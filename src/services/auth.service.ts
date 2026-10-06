import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  login: async (credentials: any) => {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const usersJson = await AsyncStorage.getItem('mockUsers');
          const users = usersJson ? JSON.parse(usersJson) : [];
          
          const user = users.find((u: any) => u.email === credentials.email && u.password === credentials.password);
          
          if (user) {
            await AsyncStorage.setItem('currentUser', JSON.stringify(user));
            resolve({ data: { token: 'fake-jwt-token-123', user } });
          } else {
            reject(new Error('E-posta veya şifre hatalı!'));
          }
        } catch(e) {
          reject(new Error('Giriş yapılırken bir sorun oluştu.'));
        }
      }, 1000); 
    });
  },

  register: async (userData: any) => {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        if (!userData.email || !userData.password || !userData.fullName) {
          return reject(new Error('Lütfen tüm alanları doldurun.'));
        }

        try {
          const usersJson = await AsyncStorage.getItem('mockUsers');
          const users = usersJson ? JSON.parse(usersJson) : [];
          
          const exists = users.find((u: any) => u.email === userData.email);
          if (exists) {
            return reject(new Error('Bu e-posta adresi zaten kayıtlı!'));
          }

          const newUser = {
            id: Date.now(),
            fullName: userData.fullName,
            email: userData.email,
            password: userData.password // Sadece test amaçlı, normalde asla böyle kaydedilmez!
          };
          
          users.push(newUser);
          await AsyncStorage.setItem('mockUsers', JSON.stringify(users));
          await AsyncStorage.setItem('currentUser', JSON.stringify(newUser));
          
          resolve({ data: { token: 'fake-jwt-token-123', user: newUser } });
        } catch(e) {
          reject(new Error('Kayıt olurken bir sorun oluştu.'));
        }
      }, 1000);
    });
  },

  getCurrentUser: async () => {
    try {
      const userJson = await AsyncStorage.getItem('currentUser');
      const user = userJson ? JSON.parse(userJson) : null;
      if (user) {
        return {
          ...user,
          profileStats: {
            savedBags: 2,
            moneySaved: 420
          },
          savedBusinesses: [
            { id: '1', name: 'Moda Fırını', type: 'Fırın', distance: '850m', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000&auto=format&fit=crop' },
            { id: '2', name: 'Dem Kafe', type: 'Kafe', distance: '1.2km', imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000&auto=format&fit=crop' }
          ]
        };
      }
      return null;
    } catch(e) {
      return null;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('currentUser');
  }
};
