import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { getLatestEvent } from '../../domain/entities/events';
import { parcelRepository } from '../storage/ParcelRepository';
import { trackingEngineManager, normalizeCanonicalStatus } from '../engine';
import { LANGUAGE_KEY } from '../i18n/constants';
import { notificationService } from './NotificationService';

export const BACKGROUND_SYNC_TASK = 'OPEN_PARCELS_BACKGROUND_SYNC';

let isSyncRunning = false;

function getLatestEventKey(parcel: Pick<Parcel, 'events'>): string {
  const latest = getLatestEvent(parcel.events);
  if (!latest) return '';
  const parsedTs = latest.date ? Date.parse(latest.date) : NaN;
  const normalizedDate = !Number.isNaN(parsedTs) ? String(parsedTs) : (latest.date || '');
  return `${normalizedDate}|${latest.eventCode || ''}|${latest.description || ''}`;
}

export async function executeBackgroundSync(): Promise<BackgroundFetch.BackgroundFetchResult> {
  if (isSyncRunning) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  isSyncRunning = true;
  try {
    // On-device local engine initialization
    await trackingEngineManager.hydrate();

    const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY).catch(() => null);
    const lang = storedLang === 'en' || storedLang === 'es' ? storedLang : 'es';

    const all = await parcelRepository.getAll();
    const activeParcels = all.filter(
      (p) => p.status !== 'delivered' && p.status !== 'expired' && !p.isArchived
    );

    if (activeParcels.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const engine = trackingEngineManager.current;
    let hasNewData = false;

    for (const parcel of activeParcels) {
      try {
        const carrierHint =
          parcel.carrier?.slug && parcel.carrier.slug !== 'unknown'
            ? parcel.carrier.slug
            : undefined;

        const response = await engine.track({
          trackingNumber: parcel.trackingNumber,
          carrierHint,
          postalCode: parcel.postalCode,
          destinationCountry: parcel.destination?.code,
          allowSimulated: false,
          forceRefresh: true,
          lang,
        });

        // Never overwrite stored parcels or emit notifications from simulated or error responses
        if (!response || response.isLiveData === false || response.error) {
          continue;
        }

        const responseEventsCount = Array.isArray(response.events) ? response.events.length : 0;
        if (engine.isLocal && response.isLiveData !== true && responseEventsCount === 0) {
          continue;
        }

        const normalizedOldStatus = normalizeCanonicalStatus(parcel.status);
        const normalizedNewStatus = normalizeCanonicalStatus(response.status);
        const parcelEventsCount = Array.isArray(parcel.events) ? parcel.events.length : 0;

        // Ignore transient uninitialized or empty responses that would regress known tracking history
        if (normalizedNewStatus === 'pending' && normalizedOldStatus !== 'pending') {
          continue;
        }
        if (responseEventsCount === 0 && parcelEventsCount > 0 && normalizedNewStatus !== 'delivered') {
          continue;
        }

        const oldLatestKey = getLatestEventKey(parcel);
        const newLatestKey = getLatestEventKey(response);

        const statusChanged = normalizedNewStatus !== normalizedOldStatus;
        const hasMoreEvents = responseEventsCount > parcelEventsCount;
        const latestEventChanged = Boolean(newLatestKey) && newLatestKey !== oldLatestKey;
        const metadataChanged =
          (Boolean(response.estimatedDelivery) &&
            response.estimatedDelivery !== parcel.estimatedDelivery) ||
          (Boolean(response.lastMileTrackingNumber) &&
            response.lastMileTrackingNumber !== parcel.lastMileTrackingNumber) ||
          (typeof response.progress === 'number' && response.progress > (parcel.progress ?? 0));

        if (statusChanged || hasMoreEvents || latestEventChanged || metadataChanged) {
          hasNewData = true;

          const mergedCarrier =
            response.carrier && response.carrier.slug && response.carrier.slug !== 'unknown'
              ? {
                  ...parcel.carrier,
                  ...response.carrier,
                  trackingUrl: response.carrier.trackingUrl || parcel.carrier.trackingUrl,
                  website: response.carrier.website || parcel.carrier.website,
                }
              : parcel.carrier;

          const updated: Parcel = {
            ...parcel,
            ...response,
            id: parcel.id,
            trackingNumber: parcel.trackingNumber,
            carrier: mergedCarrier,
            additionalCarriers:
              response.additionalCarriers && response.additionalCarriers.length > 0
                ? response.additionalCarriers
                : parcel.additionalCarriers,
            lastMileCarrier: response.lastMileCarrier || parcel.lastMileCarrier,
            lastMileTrackingNumber: response.lastMileTrackingNumber || parcel.lastMileTrackingNumber,
            customAlias: parcel.customAlias,
            notes: parcel.notes,
            createdAt: parcel.createdAt,
            isArchived: parcel.isArchived,
            postalCode: parcel.postalCode || response.postalCode,
            origin: response.origin || parcel.origin,
            destination: response.destination || parcel.destination,
            estimatedDelivery: response.estimatedDelivery ?? parcel.estimatedDelivery,
            deliveredAt: response.deliveredAt ?? parcel.deliveredAt,
            flightLegs:
              response.flightLegs && response.flightLegs.length > 0
                ? response.flightLegs
                : parcel.flightLegs,
            weight: response.weight || parcel.weight,
            serviceType: response.serviceType || parcel.serviceType,
            events: responseEventsCount > 0 ? response.events : parcel.events,
            progress:
              typeof response.progress === 'number' ? response.progress : parcel.progress,
            daysInTransit:
              typeof response.daysInTransit === 'number'
                ? response.daysInTransit
                : parcel.daysInTransit,
            isLiveData: response.isLiveData ?? !engine.isLocal,
            status: normalizedNewStatus,
            updatedAt: new Date().toISOString(),
          };

          await parcelRepository.save(updated);

          // Emit local push notification ONLY if status actually changed
          if (statusChanged) {
            await notificationService.sendParcelStatusNotification(
              updated,
              normalizedOldStatus,
              normalizedNewStatus,
              lang
            );
          }
        }
      } catch (err) {
        console.warn(`Background sync error for parcel ${parcel.trackingNumber}:`, err);
      }
    }

    return hasNewData
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    console.warn('Background sync task failed:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  } finally {
    isSyncRunning = false;
  }
}

// Define the background task outside React components on native platforms
if (Platform.OS !== 'web' && typeof TaskManager?.defineTask === 'function') {
  const isDefined =
    typeof TaskManager.isTaskDefined === 'function' &&
    TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK);
  if (!isDefined) {
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
      return await executeBackgroundSync();
    });
  }
}

export async function registerBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    if (typeof BackgroundFetch.getStatusAsync === 'function') {
      const status = await BackgroundFetch.getStatusAsync();
      if (
        status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
        status === BackgroundFetch.BackgroundFetchStatus.Denied
      ) {
        console.warn('Background fetch is unavailable on this device:', status);
        return;
      }
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (minimum recommended on mobile)
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (err) {
    console.warn('Failed to register background sync task:', err);
  }
}
