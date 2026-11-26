import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { getLatestEvent } from '../../domain/entities/events';
import { CANONICAL_STATUS_MAP, CanonicalStatus } from '../../domain/models/status';
import { normalizeCanonicalStatus } from '../engine/mapper';

const LAST_NOTIFIED_PREFIX = '@open_parcels:last_notified:';
const ANDROID_CHANNEL_ID = 'default';

interface LastNotifiedRecord {
  status: CanonicalStatus;
  latestEventKey: string;
  notifiedAt: number;
}

// Configure notification behavior
if (typeof Notifications?.setNotificationHandler === 'function') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export class NotificationService {
  private hasPermission = false;
  private channelConfigured = false;
  private lastNotifiedCache = new Map<string, LastNotifiedRecord>();

  clearDeduplicationCache(): void {
    this.lastNotifiedCache.clear();
  }

  private async ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android' || this.channelConfigured) return;

    try {
      if (typeof Notifications.setNotificationChannelAsync === 'function') {
        const importance = (Notifications as any).AndroidImportance?.HIGH ?? 4;
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: 'Parcel Updates',
          importance,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D9FF38',
        });
      }
      this.channelConfigured = true;
    } catch (err) {
      console.warn('Failed to configure Android notification channel:', err);
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      await this.ensureAndroidChannel();

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
    const latest = getLatestEvent(parcel.events);
    if (!latest) return '';
    const parsedTs = latest.date ? Date.parse(latest.date) : NaN;
    const normalizedDate = !Number.isNaN(parsedTs) ? String(parsedTs) : (latest.date || '');
    return `${normalizedDate}|${latest.eventCode || ''}|${latest.description || ''}`;
  }

  async sendParcelStatusNotification(
    parcel: Parcel,
    oldStatus: string,
    newStatus: string,
    lang: 'es' | 'en' = 'es'
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
    if (
      cached &&
      cached.status === normNew &&
      (!latestEventKey || !cached.latestEventKey || cached.latestEventKey === latestEventKey)
    ) {
      return false;
    }

    try {
      if (typeof Notifications.getPermissionsAsync === 'function') {
        const perms = await Notifications.getPermissionsAsync();
        const granted = perms.granted || perms.status === 'granted';
        this.hasPermission = granted;
        if (!granted) {
          return false;
        }
      }

      const storageKey = `${LAST_NOTIFIED_PREFIX}${parcelKey}`;
      const rawStored = await AsyncStorage.getItem(storageKey).catch(() => null);
      if (rawStored) {
        try {
          const parsed = JSON.parse(rawStored) as Partial<LastNotifiedRecord>;
          if (
            parsed.status === normNew &&
            (!latestEventKey || !parsed.latestEventKey || parsed.latestEventKey === latestEventKey)
          ) {
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

      await this.ensureAndroidChannel();

      const meta = CANONICAL_STATUS_MAP[normNew] || CANONICAL_STATUS_MAP.in_transit;
      const isEn = lang === 'en';
      const statusLabel = isEn ? meta.labelEn : meta.labelEs;
      const title = `📦 ${parcel.customAlias || parcel.trackingNumber}: ${statusLabel.toUpperCase()}`;
      const body = isEn
        ? `Your shipment with ${parcel.carrier.name} has updated to "${statusLabel}".`
        : `Tu envío de ${parcel.carrier.name} ha avanzado a "${statusLabel}".`;

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
