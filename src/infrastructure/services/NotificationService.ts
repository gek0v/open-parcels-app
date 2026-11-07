import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { CANONICAL_STATUS_MAP } from '../../domain/models/status';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private hasPermission = false;

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted || settings.status === 'granted') {
        this.hasPermission = true;
        return true;
      }

      const request = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      this.hasPermission = request.granted || request.status === 'granted';
      return this.hasPermission;
    } catch (err) {
      console.warn('Failed to request notification permissions:', err);
      return false;
    }
  }

  async sendParcelStatusNotification(parcel: Parcel, oldStatus: string, newStatus: string): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const meta = CANONICAL_STATUS_MAP[parcel.status] || CANONICAL_STATUS_MAP.in_transit;
      const title = `📦 ${parcel.customAlias || parcel.trackingNumber}: ${meta.labelEs.toUpperCase()}`;
      const body = `Tu envío de ${parcel.carrier.name} ha avanzado a "${meta.labelEs}".`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            parcelId: parcel.id,
            trackingNumber: parcel.trackingNumber,
            oldStatus,
            newStatus,
          },
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (err) {
      console.warn('Failed to schedule notification:', err);
    }
  }
}

export const notificationService = new NotificationService();
