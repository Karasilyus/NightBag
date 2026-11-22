import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';

export interface CustomerProfileDetails {
  fullName: string;
  phone: string;
}

export interface BusinessProfileDetails {
  name: string;
  category: string;
  address: string;
  district: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  imageUri: string | null;
  photoUrl: string | null;
  description: string;
}

interface BusinessResponse {
  id: string;
  name: string;
  category: string;
  address: string;
  district: string;
  phone: string;
  lat: number;
  lon: number;
  photo_url?: string | null;
  description?: string;
}

const BUSINESS_PROFILE_KEY = 'businessProfile:';
const categoryToApi: Record<string, string> = {
  'Fırın': 'firin',
  'Kafe': 'kafe',
  'Tatlı': 'tatli',
  'Yemek': 'yemek',
};
const categoryFromApi: Record<string, string> = {
  firin: 'Fırın',
  kafe: 'Kafe',
  tatli: 'Tatlı',
  yemek: 'Yemek',
};

const readStoredBusinessImage = async (businessId: string): Promise<string | null> => {
  const stored = await AsyncStorage.getItem(`${BUSINESS_PROFILE_KEY}${businessId}`);
  if (!stored) return null;
  const parsed: unknown = JSON.parse(stored);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('İşletme profili geçersiz.');
  }
  const imageUri = 'imageUri' in parsed ? parsed.imageUri : null;
  return typeof imageUri === 'string' ? imageUri : null;
};

export const profileService = {
  getCustomerDetails: async (_userId: string, fallbackName: string): Promise<CustomerProfileDetails> => {
    const response = await apiClient.get<{ full_name: string; phone?: string }>('/users/me');
    if (typeof response.data.full_name !== 'string') {
      throw new Error('Profil bilgileri yanıtı geçersiz.');
    }
    return {
      fullName: response.data.full_name.trim() || fallbackName,
      phone: response.data.phone || '',
    };
  },

  saveCustomerDetails: async (_userId: string, details: CustomerProfileDetails): Promise<void> => {
    const response = await apiClient.put<{ id: string; full_name: string; phone?: string }>('/users/me', {
      full_name: details.fullName,
      phone: details.phone,
    });
    const storedUser = await AsyncStorage.getItem('currentUser');
    if (storedUser) {
      const user: unknown = JSON.parse(storedUser);
      if (typeof user === 'object' && user !== null && 'id' in user && user.id === response.data.id) {
        await AsyncStorage.setItem('currentUser', JSON.stringify({
          ...user,
          full_name: response.data.full_name,
          fullName: response.data.full_name,
          phone: response.data.phone || '',
        }));
      }
    }
  },

  getBusinessDetails: async (businessId: string, fallbackName: string): Promise<BusinessProfileDetails> => {
    const response = await apiClient.get<BusinessResponse>('/business/me');
    const business = response.data;
    if (!business?.id || !business.name) {
      throw new Error('İşletme profili yanıtı geçersiz.');
    }
    const localImageUri = await readStoredBusinessImage(businessId);
    return {
      name: business.name || fallbackName,
      category: categoryFromApi[business.category] || 'Fırın',
      address: business.address || '',
      district: business.district || '',
      phone: business.phone || '',
      latitude: Number.isFinite(business.lat) ? business.lat : null,
      longitude: Number.isFinite(business.lon) ? business.lon : null,
      imageUri: localImageUri || business.photo_url || null,
      photoUrl: business.photo_url || null,
      description: business.description || '',
    };
  },

  saveBusinessDetails: async (businessId: string, details: BusinessProfileDetails): Promise<void> => {
    const remotePhotoUrl = details.imageUri?.startsWith('https://')
      ? details.imageUri
      : details.photoUrl;
    await apiClient.put('/business/me', {
      name: details.name,
      category: categoryToApi[details.category] || details.category,
      description: details.description,
      address: details.address,
      district: details.district,
      phone: details.phone,
      lat: details.latitude,
      lon: details.longitude,
      photo_url: remotePhotoUrl,
    });
    await AsyncStorage.setItem(`${BUSINESS_PROFILE_KEY}${businessId}`, JSON.stringify({
      imageUri: details.imageUri,
    }));
  },
};
