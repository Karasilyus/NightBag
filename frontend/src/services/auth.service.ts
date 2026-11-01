import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';
// NOT: Backend'de henüz auth endpoint'i bulunmuyor.
// Şu an kimlik doğrulama X-User-ID header'ı ile yapılıyor (geçici).
// Backend'e auth modülü eklendiğinde bu dosya güncellenecek.
// Şu an kayıt/giriş işlemleri AsyncStorage'da mock olarak tutuluyor,
// ancak user.id olarak backend'in beklediği UUID formatı kullanılıyor.



export const authService = {
  login: async (credentials: any) => {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const usersJson = await AsyncStorage.getItem('mockUsers');
          const users = usersJson ? JSON.parse(usersJson) : [];

          const user = users.find(
            (u: any) => u.email === credentials.email && u.password === credentials.password
          );

          if (user) {
            await AsyncStorage.setItem('currentUser', JSON.stringify(user));
            resolve({ data: { token: 'placeholder-token', user } });
          } else {
            reject(new Error('E-posta veya şifre hatalı!'));
          }
        } catch {
          reject(new Error('Giriş yapılırken bir sorun oluştu.'));
        }
      }, 500);
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

                   const res = await apiClient.post('/auth/register', {
            full_name: userData.fullName,
            email: userData.email,
          });

          const newUser = {
            id: res.data.id,
            fullName: userData.fullName,
            email: userData.email,
            password: userData.password,
            role: res.data.role || 'customer',
          };

          users.push(newUser);
          await AsyncStorage.setItem('mockUsers', JSON.stringify(users));
          await AsyncStorage.setItem('currentUser', JSON.stringify(newUser));

          resolve({ data: { token: 'placeholder-token', user: newUser } });
                } catch (e: any) {
          reject(new Error(e?.response?.data?.error || 'Kayıt olurken bir sorun oluştu. Sunucuya ulaşılamıyor olabilir.'));
        }
      }, 500);
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
            savedBags: 0,
            moneySaved: 0,
          },
          savedBusinesses: [],
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  updateCurrentUser: async (updates: Record<string, unknown>) => {
    const userJson = await AsyncStorage.getItem('currentUser');
    if (!userJson) {
      throw new Error('Düzenlenecek kullanıcı bulunamadı.');
    }

    const user = { ...JSON.parse(userJson), ...updates };
    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  },

  logout: async () => {
    await AsyncStorage.removeItem('currentUser');
  },
};
