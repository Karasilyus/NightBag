export interface PickupReminderReservation {
  id: string;
  pickupDate?: string;
  pickupStart?: string;
  businessName?: string;
  bagTitle?: string;
  timeInfo?: string;
}

export type NotificationPermissionResult = 'granted' | 'denied' | 'unsupported';

export type PickupReminderScheduleResult =
  | 'scheduled'
  | 'permission-denied'
  | 'too-late'
  | 'unsupported';
