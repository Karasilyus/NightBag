import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from './api';
import {
  NotificationPermissionResult,
  PickupReminderReservation,
  PickupReminderScheduleResult,
} from './notifications.types';

const PICKUP_REMINDERS_KEY = 'pickupReminderNotifications';
const PUSH_REGISTERED_USER_KEY = 'pushRegisteredUserId';
const PUSH_REGISTERED_TOKEN_KEY = 'pushRegisteredToken';
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

const hasPushPermission = (
  permissions: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>
) => (
  permissions.granted
  || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  || permissions.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
);

const getCurrentUserId = async (): Promise<string | null> => {
  const userJson = await AsyncStorage.getItem('currentUser');
  if (!userJson) return null;

  const user: unknown = JSON.parse(userJson);
  if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string') {
    throw new Error('Yerel kullanıcı bilgisi geçersiz.');
  }
  return user.id;
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

    return hasPushPermission(permissions) ? 'granted' : 'denied';
  },

  registerPushToken: async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    const authToken = await AsyncStorage.getItem('authToken');
    const userId = await getCurrentUserId();
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
    if (!authToken || !userId || !projectId) return false;

    const permissions = await Notifications.getPermissionsAsync();
    if (!hasPushPermission(permissions)) return false;

    const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await apiClient.post('/users/me/push-token', {
      token: pushToken,
      platform: Platform.OS,
    });
    await AsyncStorage.multiSet([
      [PUSH_REGISTERED_USER_KEY, userId],
      [PUSH_REGISTERED_TOKEN_KEY, pushToken],
    ]);
    await notificationsService.cancelAllPickupReminders();
    return true;
  },

  unregisterPushToken: async (): Promise<void> => {
    const authToken = await AsyncStorage.getItem('authToken');
    const userId = await getCurrentUserId();
    const registeredUserId = await AsyncStorage.getItem(PUSH_REGISTERED_USER_KEY);
    const registeredToken = await AsyncStorage.getItem(PUSH_REGISTERED_TOKEN_KEY);
    if (authToken && userId && registeredUserId === userId && registeredToken) {
      await apiClient.delete('/users/me/push-token', { data: { token: registeredToken } });
    }
    await AsyncStorage.multiRemove([PUSH_REGISTERED_USER_KEY, PUSH_REGISTERED_TOKEN_KEY]);
  },

  schedulePickupReminder: async (
    reservation: PickupReminderReservation
  ): Promise<PickupReminderScheduleResult> => {
    const pickupDate = parsePickupDate(reservation.pickupDate, reservation.pickupStart);
    const reminderDate = new Date(pickupDate.getTime() - REMINDER_LEAD_TIME_MS);
    if (reminderDate.getTime() <= Date.now()) return 'too-late';

    const permissions = await Notifications.getPermissionsAsync();
    if (!hasPushPermission(permissions)) return 'permission-denied';

    const trackedNotifications = await getTrackedNotifications();
    const previousNotificationId = trackedNotifications[reservation.id];
    if (previousNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(previousNotificationId);
    }

    const authToken = await AsyncStorage.getItem('authToken');
    const userId = await getCurrentUserId();
    const registeredUserId = await AsyncStorage.getItem(PUSH_REGISTERED_USER_KEY);
    if (authToken && userId && registeredUserId === userId) {
      delete trackedNotifications[reservation.id];
      await AsyncStorage.setItem(PICKUP_REMINDERS_KEY, JSON.stringify(trackedNotifications));
      return 'scheduled';
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
