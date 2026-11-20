import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

const CUSTOMER_PROFILE_KEY = 'customerProfile:';
const BUSINESS_PROFILE_KEY = 'businessProfile:';

const isStoredObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const profileService = {
  getCustomerDetails: async (userId: string, fallbackName: string): Promise<CustomerProfileDetails> => {
    const stored = await AsyncStorage.getItem(`${CUSTOMER_PROFILE_KEY}${userId}`);
    if (!stored) return { fullName: fallbackName, phone: '' };

    const parsed: unknown = JSON.parse(stored);
    if (!isStoredObject(parsed)) throw new Error('Profil bilgileri geçersiz.');

    return {
      fullName: typeof parsed.fullName === 'string' && parsed.fullName.trim()
        ? parsed.fullName.trim()
        : fallbackName,
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
    };
  },

  saveCustomerDetails: async (userId: string, details: CustomerProfileDetails): Promise<void> => {
    await AsyncStorage.setItem(`${CUSTOMER_PROFILE_KEY}${userId}`, JSON.stringify(details));
  },

  getBusinessDetails: async (businessId: string, fallbackName: string): Promise<BusinessProfileDetails> => {
    const stored = await AsyncStorage.getItem(`${BUSINESS_PROFILE_KEY}${businessId}`);
    if (!stored) {
      return {
        name: fallbackName,
        category: 'Fırın',
        address: '',
        district: '',
        phone: '',
        latitude: null,
        longitude: null,
        imageUri: null,
      };
    }

    const parsed: unknown = JSON.parse(stored);
    if (!isStoredObject(parsed)) throw new Error('İşletme profili geçersiz.');

    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallbackName,
      category: typeof parsed.category === 'string' ? parsed.category : 'Fırın',
      address: typeof parsed.address === 'string' ? parsed.address : '',
      district: typeof parsed.district === 'string' ? parsed.district : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      latitude: typeof parsed.latitude === 'number' && Number.isFinite(parsed.latitude) ? parsed.latitude : null,
      longitude: typeof parsed.longitude === 'number' && Number.isFinite(parsed.longitude) ? parsed.longitude : null,
      imageUri: typeof parsed.imageUri === 'string' ? parsed.imageUri : null,
    };
  },

  saveBusinessDetails: async (businessId: string, details: BusinessProfileDetails): Promise<void> => {
    await AsyncStorage.setItem(`${BUSINESS_PROFILE_KEY}${businessId}`, JSON.stringify(details));
  },
};
