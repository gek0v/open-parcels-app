import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { parcelRepository } from '../storage/ParcelRepository';
import { trackingEngineManager } from '../engine';
import { notificationService } from './NotificationService';

export const BACKGROUND_SYNC_TASK = 'OPEN_PARCELS_BACKGROUND_SYNC';

// Define the background task outside React components
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const all = await parcelRepository.getAll();
    const activeParcels = all.filter(
      (p) => p.status !== 'delivered' && p.status !== 'expired' && !p.isArchived
    );

    if (activeParcels.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let hasNewData = false;

    for (const parcel of activeParcels) {
      try {
        const response = await trackingEngineManager.current.track({
          trackingNumber: parcel.trackingNumber,
          carrierHint: parcel.carrier.slug,
          postalCode: parcel.postalCode,
        });

        if (response.status !== parcel.status || response.events.length > parcel.events.length) {
          hasNewData = true;
          const oldStatus = parcel.status;

          const updated: typeof parcel = {
            ...parcel,
            ...response,
            id: parcel.id,
            customAlias: parcel.customAlias,
            updatedAt: new Date().toISOString(),
          };

          await parcelRepository.save(updated);

          // Emit local push notification if status changed
          if (response.status !== oldStatus) {
            await notificationService.sendParcelStatusNotification(
              updated,
              oldStatus,
              response.status
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
