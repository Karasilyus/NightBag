import {
  NotificationPermissionResult,
  PickupReminderReservation,
  PickupReminderScheduleResult,
} from './notifications.types';

export const notificationsService = {
  requestPermission: async (): Promise<NotificationPermissionResult> => 'unsupported',
  schedulePickupReminder: async (
    _reservation: PickupReminderReservation
  ): Promise<PickupReminderScheduleResult> => 'unsupported',
  cancelPickupReminder: async (_reservationId: string): Promise<void> => undefined,
  cancelAllPickupReminders: async (): Promise<void> => undefined,
};
