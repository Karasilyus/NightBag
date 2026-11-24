import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  NotificationPermissionResult,
  PickupReminderReservation,
  PickupReminderScheduleResult,
} from './notifications.types';

const PICKUP_REMINDERS_KEY = 'pickupReminderNotifications';
const PICKUP_REMINDER_CHANNEL = 'pickup-reminders';
const REMINDER_LEAD_TIME_MS = 30 * 60 * 1000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const getTrackedNotifications = async (): Promise<Record<string, string>> => {
  const stored = await AsyncStorage.getItem(PICKUP_REMINDERS_KEY);
  if (!stored) return {};

  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Hatırlatıcı kayıtları geçersiz.');
  }

  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
};

const parsePickupDate = (date: string | undefined, time: string | undefined): Date => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time || '');
  if (!dateMatch || !timeMatch) {
    throw new Error('Teslim tarihi veya saati hatırlatıcı için geçersiz.');
  }

  const [, year, month, day] = dateMatch;
  const [, hour, minute, second = '0'] = timeMatch;
  const pickupDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  if (
    pickupDate.getFullYear() !== Number(year)
    || pickupDate.getMonth() !== Number(month) - 1
    || pickupDate.getDate() !== Number(day)
    || pickupDate.getHours() !== Number(hour)
    || pickupDate.getMinutes() !== Number(minute)
    || pickupDate.getSeconds() !== Number(second)
  ) {
    throw new Error('Teslim tarihi veya saati hatırlatıcı için geçersiz.');
  }

  return pickupDate;
};

export const notificationsService = {
  requestPermission: async (): Promise<NotificationPermissionResult> => {
    await Notifications.setNotificationChannelAsync(PICKUP_REMINDER_CHANNEL, {
      name: 'Teslim alma hatırlatıcıları',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#163E2B',
    });

    const currentPermissions = await Notifications.getPermissionsAsync();
    const permissions = currentPermissions.granted
      ? currentPermissions
      : await Notifications.requestPermissionsAsync();

    const isGranted = permissions.granted
      || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      || permissions.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
    return isGranted ? 'granted' : 'denied';
  },

  schedulePickupReminder: async (
    reservation: PickupReminderReservation
  ): Promise<PickupReminderScheduleResult> => {
    const pickupDate = parsePickupDate(reservation.pickupDate, reservation.pickupStart);
    const reminderDate = new Date(pickupDate.getTime() - REMINDER_LEAD_TIME_MS);
    if (reminderDate.getTime() <= Date.now()) return 'too-late';

    const permissions = await Notifications.getPermissionsAsync();
    const permissionGranted = permissions.granted
      || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      || permissions.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
    if (!permissionGranted) return 'permission-denied';

    const trackedNotifications = await getTrackedNotifications();
    const previousNotificationId = trackedNotifications[reservation.id];
    if (previousNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(previousNotificationId);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Teslim saatin yaklaşıyor',
        body: `${reservation.businessName || 'İşletme'} işletmesinden ${reservation.bagTitle || 'çantanı'} teslim almayı unutma. ${reservation.timeInfo || ''}`.trim(),
        data: { reservationId: reservation.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        channelId: PICKUP_REMINDER_CHANNEL,
      },
    });

    try {
      await AsyncStorage.setItem(
        PICKUP_REMINDERS_KEY,
        JSON.stringify({ ...trackedNotifications, [reservation.id]: notificationId })
      );
    } catch (error) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      throw error;
    }

    return 'scheduled';
  },

  cancelPickupReminder: async (reservationId: string): Promise<void> => {
    const trackedNotifications = await getTrackedNotifications();
    const notificationId = trackedNotifications[reservationId];
    if (!notificationId) return;

    await Notifications.cancelScheduledNotificationAsync(notificationId);
    delete trackedNotifications[reservationId];
    await AsyncStorage.setItem(PICKUP_REMINDERS_KEY, JSON.stringify(trackedNotifications));
  },

  cancelAllPickupReminders: async (): Promise<void> => {
    const trackedNotifications = await getTrackedNotifications();
    for (const notificationId of Object.values(trackedNotifications)) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
    await AsyncStorage.removeItem(PICKUP_REMINDERS_KEY);
  },
};
