export const COLORS = {
  primary: '#163E2B', // Koyu yeşil marka rengi
  background: '#FDFBF7', // Krem/bej arka plan
  card: '#FFFFFF', // Kart arka planları
  text: '#1C1C1E', // Koyu ana metin
  textSecondary: '#6C6C70', // Gri alt metinler
  border: '#E5E5EA', // İnce gri çizgiler
  success: '#34C759', // Başarı/onay yeşili
  error: '#FF3B30', // Hata kırmızısı
  tagBackground: '#E8F3EB', // Açık yeşil etiket arka planı
  tagText: '#163E2B', // Açık yeşil etiket metni
};

export const SIZES = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 40,
  base: 16, // Temel boşluk
  radius: 12, // Genel köşe ovali
  buttonRadius: 24, // Düğme ovali
  cardRadius: 16, // Kart ovali
};

export const FONTS = {
  h1: { fontSize: 32, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body1: { fontSize: 16, fontWeight: '400' as const },
  body2: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};

export default { COLORS, SIZES, FONTS, SHADOWS };
