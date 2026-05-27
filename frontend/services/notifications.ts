import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIFIED_IDS_KEY = 'navable:notified-alert-ids';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  /**
   * Request push notification permissions on iOS/Android.
   */
  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7B3FF3',
      });
    }

    return finalStatus === 'granted';
  },

  /**
   * Triggers an immediate local push notification on the device.
   */
  sendNotification: async (title: string, body: string) => {
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // send immediately
    });
  },

  /**
   * Processes a list of alerts and triggers notifications for any brand new alerts.
   */
  notifyNewAlerts: async (
    alerts: Array<{ id: string; title: string; description: string }>,
    prefix: string = 'Campus Alert'
  ) => {
    if (Platform.OS === 'web' || alerts.length === 0) return;

    try {
      // Load previously notified alert IDs
      const raw = await AsyncStorage.getItem(NOTIFIED_IDS_KEY);
      const notifiedIds: string[] = raw ? (JSON.parse(raw) as string[]) : [];

      const newAlerts = alerts.filter((a) => !notifiedIds.includes(a.id));

      if (newAlerts.length > 0) {
        // Request permissions just in case
        const granted = await notificationService.requestPermissions();
        if (!granted) return;

        // Notify for the latest new alert to prevent spamming many sounds at once
        const latestNewAlert = newAlerts[0];
        if (latestNewAlert) {
          await notificationService.sendNotification(
            `⚠️ ${prefix}: ${latestNewAlert.title}`,
            latestNewAlert.description
          );
        }

        // Save all current alert IDs so we don't notify them again
        const updatedIds = Array.from(new Set([...notifiedIds, ...alerts.map((a) => a.id)]));
        await AsyncStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(updatedIds));
      }
    } catch (err) {
      console.error('Failed to process notifications for new alerts:', err);
    }
  },
};
