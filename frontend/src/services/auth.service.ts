import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiClient } from './api';
import { favoritesService } from './favorites.service';
import { notificationsService } from './notifications.service';
import { preferencesService } from './preferences.service';

type BusinessRegistration = {
  name: string;
  category: string;
  address: string;
  district: string;
  lat: number;
  lon: number;
};

type AuthResponse = {
  token: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    business_id?: string;
    phone?: string;
  };
};

type StoredUser = AuthResponse['user'] & {
  fullName: string;
};

const persistAuthResponse = async (data: AuthResponse, syncPreferences = false) => {
  if (!data.token || !data.user?.id) {
    throw new Error('Sunucudan geçerli bir oturum yanıtı alınamadı.');
  }

  const user: StoredUser = {
    ...data.user,
    fullName: data.user.full_name,
  };
  favoritesService.clearCache();
  await AsyncStorage.multiSet([
    ['authToken', data.token],
    ['currentUser', JSON.stringify(user)],
  ]);
  if (syncPreferences) {
    try {
      await preferencesService.syncLocalPreferences();
    } catch (error) {
      console.error('Kayıtlı keşfet tercihleri hesaba aktarılamadı:', error);
    }
  }
  return { data: { token: data.token, user } };
};

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    return persistAuthResponse(response.data);
  },

  register: async (userData: {
    email: string;
    password: string;
    fullName: string;
    role: 'customer' | 'business_owner';
    business?: BusinessRegistration;
  }) => {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      full_name: userData.fullName,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      business: userData.business,
    });
    return persistAuthResponse(response.data, true);
  },

  getCurrentUser: async () => {
    try {
      const userJson = await AsyncStorage.getItem('currentUser');
      const user = userJson ? JSON.parse(userJson) : null;
      if (user && typeof user === 'object' && typeof user.id === 'string') {
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
    } catch (error) {
      console.error('Yerel kullanıcı bilgisi okunamadı:', error);
      return null;
    }
  },

  getCurrentUserStats: async (): Promise<{ savedBags: number; moneySaved: number }> => {
    const response = await apiClient.get<{ bags_saved: number; money_saved: number }>('/users/me/stats');
    if (!Number.isFinite(response.data.bags_saved) || !Number.isFinite(response.data.money_saved)) {
      throw new Error('Profil istatistikleri yanıtı geçersiz.');
    }
    return {
      savedBags: response.data.bags_saved,
      moneySaved: response.data.money_saved,
    };
  },

  updateCurrentUser: async (updates: { fullName: string; phone: string }): Promise<{ fullName: string; phone: string }> => {
    const response = await apiClient.put<AuthResponse['user']>('/users/me', {
      full_name: updates.fullName,
      phone: updates.phone,
    });
    const userJson = await AsyncStorage.getItem('currentUser');
    const currentUser = userJson ? JSON.parse(userJson) as StoredUser : null;
    if (currentUser && currentUser.id === response.data.id) {
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        ...currentUser,
        ...response.data,
        fullName: response.data.full_name,
      }));
    }
    return { fullName: response.data.full_name, phone: response.data.phone || '' };
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const response = await apiClient.put<AuthResponse>('/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    await persistAuthResponse(response.data);
  },

  logout: async () => {
    favoritesService.clearCache();
    try {
      await notificationsService.unregisterPushToken();
    } catch (error) {
      console.error('Push bildirimi kaydı kaldırılamadı:', error);
    }
    try {
      await apiClient.post('/auth/logout');
    } finally {
      await AsyncStorage.multiRemove(['currentUser', 'authToken']);
      await preferencesService.clearLocalPreferences();
    }
  },

  restoreSession: async () => {
    const token = await AsyncStorage.getItem('authToken');
    const userJson = await AsyncStorage.getItem('currentUser');
    if (!token && !userJson) return null;
    if (!token || !userJson) {
      await AsyncStorage.multiRemove(['currentUser', 'authToken']);
      return null;
    }

    let user: StoredUser;
    try {
      const parsedUser: unknown = JSON.parse(userJson);
      if (
        !parsedUser
        || typeof parsedUser !== 'object'
        || !('id' in parsedUser)
        || typeof parsedUser.id !== 'string'
        || !('role' in parsedUser)
        || typeof parsedUser.role !== 'string'
      ) {
        throw new Error('Yerel kullanıcı bilgisi geçersiz.');
      }
      user = parsedUser as StoredUser;
    } catch {
      await AsyncStorage.multiRemove(['currentUser', 'authToken']);
      return null;
    }

    try {
      const response = await apiClient.get<AuthResponse['user']>('/users/me');
      const currentUser = response.data;
      if (!currentUser?.id || !currentUser.role) {
        throw new Error('Sunucudan geçerli kullanıcı bilgisi alınamadı.');
      }

      const refreshedUser: StoredUser = {
        ...user,
        ...currentUser,
        fullName: currentUser.full_name || user.fullName,
        business_id: currentUser.business_id || user.business_id,
      };
      await AsyncStorage.setItem('currentUser', JSON.stringify(refreshedUser));
      return refreshedUser;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return null;
      throw new Error('Oturum doğrulanamadı. İnternet bağlantınızı kontrol edip tekrar giriş yapın.');
    }
  },
};