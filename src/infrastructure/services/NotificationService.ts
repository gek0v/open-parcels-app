import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { CANONICAL_STATUS_MAP, CanonicalStatus } from '../../domain/models/status';
import { normalizeCanonicalStatus } from '../engine/mapper';

const LAST_NOTIFIED_PREFIX = '@open_parcels:last_notified:';

interface LastNotifiedRecord {
  status: CanonicalStatus;
  latestEventKey: string;
  notifiedAt: number;
}

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
  private lastNotifiedCache = new Map<string, LastNotifiedRecord>();

  clearDeduplicationCache(): void {
    this.lastNotifiedCache.clear();
  }

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

  private getLatestEventKey(parcel: Parcel): string {
    if (!Array.isArray(parcel.events) || parcel.events.length === 0) {
      return '';
    }
    const sorted = [...parcel.events].sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    });
    const latest = sorted[0];
    return `${latest.date || ''}|${latest.eventCode || ''}|${latest.description || ''}`;
  }

  async sendParcelStatusNotification(
    parcel: Parcel,
    oldStatus: string,
    newStatus: string
  ): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    if (parcel.isLiveData === false) return false;

    const normOld = normalizeCanonicalStatus(oldStatus);
    const normNew = normalizeCanonicalStatus(newStatus);

    if (normOld === normNew) {
      return false;
    }

    if (normNew === 'pending' || !(normNew in CANONICAL_STATUS_MAP)) {
      return false;
    }

    const parcelKey = parcel.id || parcel.trackingNumber;
    const latestEventKey = this.getLatestEventKey(parcel);

    const cached = this.lastNotifiedCache.get(parcelKey);
    if (cached && cached.status === normNew) {
      return false;
    }

    try {
      const storageKey = `${LAST_NOTIFIED_PREFIX}${parcelKey}`;
      const rawStored = await AsyncStorage.getItem(storageKey).catch(() => null);
      if (rawStored) {
        try {
          const parsed = JSON.parse(rawStored) as Partial<LastNotifiedRecord>;
          if (parsed.status === normNew) {
            this.lastNotifiedCache.set(parcelKey, {
              status: normNew,
              latestEventKey: parsed.latestEventKey || latestEventKey,
              notifiedAt: parsed.notifiedAt || Date.now(),
            });
            return false;
          }
        } catch {
          if (rawStored === normNew) {
            return false;
          }
        }
      }

      const meta = CANONICAL_STATUS_MAP[normNew] || CANONICAL_STATUS_MAP.in_transit;
      const title = `📦 ${parcel.customAlias || parcel.trackingNumber}: ${meta.labelEs.toUpperCase()}`;
      const body = `Tu envío de ${parcel.carrier.name} ha avanzado a "${meta.labelEs}".`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            parcelId: parcel.id,
            trackingNumber: parcel.trackingNumber,
            oldStatus: normOld,
            newStatus: normNew,
          },
          sound: true,
        },
        trigger: null,
      });

      const record: LastNotifiedRecord = {
        status: normNew,
        latestEventKey,
        notifiedAt: Date.now(),
      };
      this.lastNotifiedCache.set(parcelKey, record);
      await AsyncStorage.setItem(storageKey, JSON.stringify(record)).catch(() => {});
      return true;
    } catch (err) {
      console.warn('Failed to schedule notification:', err);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
