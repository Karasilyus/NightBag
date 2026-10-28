import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Android emülatör 10.0.2.2, iOS simülatör / web localhost kullanır.
// Gerçek cihazda bilgisayarınızın LAN IP'sini yazın.
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api/v1';
  }
  return 'http://localhost:8080/api/v1';
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Her istekten önce X-User-ID başlığını ekler.
// Backend şu an JWT yerine bu başlığı kullanıyor (geçici kimlik doğrulama).
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const userJson = await AsyncStorage.getItem('currentUser');
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user?.id) {
          config.headers['X-User-ID'] = user.id;
        }
      }
    } catch {
      // Token yoksa devam et (public endpoint'ler için sorun değil)
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global hata yönetimi.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Oturum süresi dolmuş, kullanıcıyı çıkış yaptır
      AsyncStorage.removeItem('currentUser');
    }
    return Promise.reject(error);
  }
);
