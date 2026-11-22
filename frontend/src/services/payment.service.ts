import { apiClient } from './api';

export interface CheckoutInitResult {
  order_id: string;
  token: string;
  checkout_form_content?: string;
  payment_page_url?: string;
}

export interface PaymentStatus {
  order_id: string;
  status: 'pending_payment' | 'paid' | 'failed' | 'cancelled' | 'expired';
  reservation_id?: string;
}

export const paymentService = {
  startCheckout: async (
    listingId: string,
    quantity: number,
    acceptedTerms: boolean
  ): Promise<CheckoutInitResult> => {
    const response = await apiClient.post('/payments/checkout', {
      listing_id: listingId,
      quantity,
      accepted_terms: acceptedTerms,
    });
    return response.data;
  },

  getStatus: async (orderId: string): Promise<PaymentStatus> => {
    const response = await apiClient.get(`/payments/${orderId}`);
    return response.data;
  },

  waitForPaid: async (orderId: string, attempts = 60): Promise<PaymentStatus> => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const status = await paymentService.getStatus(orderId);
      if (status.status === 'paid' || status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
        return status;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Ödeme sonucu zaman aşımına uğradı.');
  },
};
