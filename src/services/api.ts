import axios from 'axios';

// Backend hazır olunca buraya gerçek URL gelecek. 
// Örn: 'https://api.nightbag.com/v1'
const API_URL = 'http://localhost:3000/api'; 

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Her istekten önce çalışır. 
// İleride kullanıcı giriş yaptığında Token'ı (JWT) buraya ekleyeceğiz.
apiClient.interceptors.request.use(
  async (config) => {
    // İleride eklenecek kod:
    // const token = await AsyncStorage.getItem('userToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Gelen cevapları dinler. 
// Global hata yönetimi (örn: 401 Unauthorized alınca otomatik çıkış yap) için kullanılır.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Örnek: if(error.response.status === 401) { logout(); }
    return Promise.reject(error);
  }
);
