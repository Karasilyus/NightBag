import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';

type Props = {
  context: 'registration' | 'order' | 'privacy';
  acknowledged?: boolean;
  onAcknowledgedChange?: (value: boolean) => void;
  inlineDetails?: boolean;
};

const LegalDraftNotice = ({ context, acknowledged, onAcknowledgedChange, inlineDetails = false }: Props) => {
  const [visible, setVisible] = useState(false);

  const details = (
    <>
      <Text style={styles.modalTitle}>Bilgilendirme taslağı</Text>
      <Text style={styles.paragraph}>
        Bu taslak yasal metin yerine geçmez. Veri sorumlusunun kimliği, iletişim bilgileri, işleme amaçları,
        hukuki sebepler, veri aktarımı ve başvuru yöntemleri işletme tarafından tamamlanıp hukuk uzmanınca incelenmelidir.
      </Text>
      <Text style={styles.paragraph}>
        Aydınlatma, açık rızadan ayrıdır. Açık rıza gerektiren işlemler varsa amaçlarına özel ve isteğe bağlı
        olarak ayrıca sunulmalı; pazarlama izni kayıt veya sipariş koşulu yapılmamalıdır.
      </Text>
      {context === 'order' && (
        <Text style={styles.paragraph}>
          Sipariş öncesinde satıcı, ürün, toplam fiyat, teslim koşulları, alerjen bilgileri ve tüketici hakları
          ilgili mevzuata uygun şekilde ayrıca sunulmalıdır. Sürpriz çanta içeriği değişebilir; alerjen bilgilerini
          işletmeden doğrulamadan tüketmeyin.
        </Text>
      )}
      <Text style={styles.paragraph}>Bu ekrandaki işlem bir açık rıza veya hukuki sözleşme kaydı oluşturmaz.</Text>
      <Pressable style={styles.close} onPress={() => setVisible(false)} accessibilityRole="button">
        <Text style={styles.closeText}>Kapat</Text>
      </Pressable>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
        <Text style={styles.title}>
          {context === 'order' ? 'Sipariş bilgilendirmesi' : 'Kişisel veriler ve gizlilik'}
        </Text>
      </View>
      <Text style={styles.warning}>
        Taslaktır: Hukuken onaylanmış metin veya geçerli KVKK onayı değildir. Bu işlem sunucuya kaydedilmez.
      </Text>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.link} accessibilityRole="button">
        <Text style={styles.linkText}>Taslak bilgilendirmeyi oku</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>
      {onAcknowledgedChange && (
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => onAcknowledgedChange(!acknowledged)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Boolean(acknowledged) }}
        >
          <Ionicons name={acknowledged ? 'checkbox' : 'square-outline'} size={22} color={COLORS.primary} />
          <Text style={styles.checkboxText}>Bu bilgilendirmenin taslak olduğunu anladım.</Text>
        </TouchableOpacity>
      )}
      {inlineDetails ? (visible ? <View>{details}</View> : null) : (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <View style={styles.backdrop}>
            <View style={styles.modal}>
              <ScrollView contentContainerStyle={styles.modalContent}>{details}</ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: SIZES.m, borderRadius: SIZES.radius, backgroundColor: COLORS.tagBackground, marginBottom: SIZES.m },
  heading: { flexDirection: 'row', alignItems: 'center', gap: SIZES.s },
  title: { ...FONTS.body2, fontWeight: '700', color: COLORS.text, flex: 1 },
  warning: { ...FONTS.caption, color: COLORS.textSecondary, lineHeight: 18, marginTop: SIZES.s },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: SIZES.xs },
  linkText: { ...FONTS.body2, color: COLORS.primary, fontWeight: '700' },
  checkbox: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: SIZES.s },
  checkboxText: { ...FONTS.body2, flex: 1, color: COLORS.text },
  backdrop: { flex: 1, justifyContent: 'center', padding: SIZES.l, backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { maxHeight: '85%', width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: COLORS.card, borderRadius: SIZES.cardRadius },
  modalContent: { padding: SIZES.l },
  modalTitle: { ...FONTS.h3, color: COLORS.text, marginBottom: SIZES.m },
  paragraph: { ...FONTS.body2, color: COLORS.text, lineHeight: 22, marginBottom: SIZES.m },
  close: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: SIZES.buttonRadius, backgroundColor: COLORS.primary },
  closeText: { ...FONTS.body2, color: COLORS.card, fontWeight: '700' },
});

export default LegalDraftNotice;
