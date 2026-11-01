import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';

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
  };
};

const persistAuthResponse = async (data: AuthResponse) => {
  if (!data.token || !data.user?.id) {
    throw new Error('Sunucudan geçerli bir oturum yanıtı alınamadı.');
  }

  const user = {
    ...data.user,
    fullName: data.user.full_name,
  };
  await AsyncStorage.setItem('authToken', data.token);
  await AsyncStorage.setItem('currentUser', JSON.stringify(user));
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
    return persistAuthResponse(response.data);
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
    await AsyncStorage.multiRemove(['currentUser', 'authToken']);
  },
};
