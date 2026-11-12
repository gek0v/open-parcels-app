import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { parcelRepository } from '../storage/ParcelRepository';
import { trackingEngineManager, normalizeCanonicalStatus } from '../engine';
import { LANGUAGE_KEY } from '../i18n';
import { notificationService } from './NotificationService';

export const BACKGROUND_SYNC_TASK = 'OPEN_PARCELS_BACKGROUND_SYNC';

export async function executeBackgroundSync(): Promise<BackgroundFetch.BackgroundFetchResult> {
  try {
    // Ensure engine mode and REST URL are hydrated in headless background runtime
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
        const response = await engine.track({
          trackingNumber: parcel.trackingNumber,
          carrierHint: parcel.carrier.slug,
          postalCode: parcel.postalCode,
          destinationCountry: parcel.destination?.code,
          allowSimulated: false,
          lang,
        });

        // Never overwrite stored parcels or emit notifications from simulated or error responses
        if (!response || response.isLiveData === false || response.error) {
          continue;
        }
        if (engine.isLocal && response.isLiveData !== true) {
          continue;
        }

        const normalizedOldStatus = normalizeCanonicalStatus(parcel.status);
        const normalizedNewStatus = normalizeCanonicalStatus(response.status);
        const responseEventsCount = Array.isArray(response.events) ? response.events.length : 0;
        const parcelEventsCount = Array.isArray(parcel.events) ? parcel.events.length : 0;

        // Ignore transient uninitialized or empty responses that would regress known tracking history
        if (normalizedNewStatus === 'pending' && normalizedOldStatus !== 'pending') {
          continue;
        }
        if (responseEventsCount === 0 && parcelEventsCount > 0 && normalizedNewStatus !== 'delivered') {
          continue;
        }

        const statusChanged = normalizedNewStatus !== normalizedOldStatus;
        const hasMoreEvents = responseEventsCount > parcelEventsCount;

        if (statusChanged || hasMoreEvents) {
          hasNewData = true;

          const updated: Parcel = {
            ...parcel,
            ...response,
            id: parcel.id,
            trackingNumber: parcel.trackingNumber,
            customAlias: parcel.customAlias,
            notes: parcel.notes,
            createdAt: parcel.createdAt,
            isArchived: parcel.isArchived,
            postalCode: parcel.postalCode || response.postalCode,
            origin: response.origin || parcel.origin,
            destination: response.destination || parcel.destination,
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
              normalizedNewStatus
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
  }
}

// Define the background task outside React components
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  return await executeBackgroundSync();
});

export async function registerBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
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
