import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import type { Parcel } from '../src/domain/models/parcel';
import { findCarrierBySlug } from '../src/domain/validators/detection';

// In-memory state for mocked native modules
let mockStorage: Record<string, string> = {};
let scheduledNotifications: Array<{ content: any; trigger: any }> = [];
let definedTasks: Record<string, () => Promise<any>> = {};

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => mockStorage[key] ?? null,
    setItem: async (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: async (key: string) => {
      delete mockStorage[key];
    },
  },
}));

mock.module('react-native', () => ({
  Platform: {
    OS: 'android',
    select: (obj: Record<string, unknown>) => obj.android ?? obj.default,
  },
  Linking: { openURL: async () => {} },
  TurboModuleRegistry: {
    get: () => null,
  },
  Share: {
    share: async (content: any) => {
      if ((globalThis as any).__mockShareFn) {
        return (globalThis as any).__mockShareFn(content);
      }
      return { action: 'sharedAction' };
    },
  },
}));

mock.module('expo-task-manager', () => ({
  defineTask: (name: string, fn: () => Promise<any>) => {
    definedTasks[name] = fn;
  },
  isTaskRegisteredAsync: async (name: string) => Boolean(definedTasks[name]),
}));

mock.module('expo-background-fetch', () => ({
  BackgroundFetchResult: {
    NoData: 1,
    NewData: 2,
    Failed: 3,
  },
  registerTaskAsync: async () => {},
}));

mock.module('expo-notifications', () => ({
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  requestPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  scheduleNotificationAsync: async (req: { content: any; trigger: any }) => {
    scheduledNotifications.push(req);
    return 'mock-notif-id';
  },
}));

mock.module('expo-sqlite', () => ({
  openDatabaseAsync: async () => {
    throw new Error('SQLite mocked out in unit test');
  },
}));

const BackgroundFetch = await import('expo-background-fetch');
const { trackingEngineManager } = await import('../src/infrastructure/engine');
const { parseInPostHtmlToParcel } = await import('../src/infrastructure/engine/inpostLive');
const { parcelRepository } = await import('../src/infrastructure/storage/ParcelRepository');
const { notificationService } = await import('../src/infrastructure/services/NotificationService');
const {
  BACKGROUND_SYNC_TASK,
  executeBackgroundSync,
} = await import('../src/infrastructure/services/BackgroundSyncService');

const originalFetch = globalThis.fetch;

function makeParcel(overrides: Partial<Parcel> = {}): Parcel {
  return {
    id: 'parcel-1',
    trackingNumber: 'PQ4F6P0703418520134120K',
    customAlias: 'Teclado Mecánico',
    carrier: findCarrierBySlug('correos-spain'),
    status: 'in_transit',
    statusText: 'En tránsito',
    progress: 45,
    origin: { code: 'ES', name: 'España' },
    destination: { code: 'ES', name: 'España' },
    postalCode: '28001',
    daysInTransit: 4,
    isLiveData: true,
    events: [
      {
        id: 'ev-1',
        date: '2026-11-10T10:00:00Z',
        status: 'in_transit',
        stage: 'transit',
        description: 'En tránsito hacia el centro de distribución',
        carrierSlug: 'correos-spain',
        carrierName: 'Correos España',
      },
    ],
    createdAt: '2026-11-08T08:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
    isArchived: false,
    notes: 'Dejar en portería',
    ...overrides,
  };
}

let getAllSpy: ReturnType<typeof spyOn>;
let saveSpy: ReturnType<typeof spyOn>;
let storedParcels: Parcel[] = [];

beforeEach(async () => {
  mockStorage = {};
  scheduledNotifications = [];
  storedParcels = [];
  notificationService.clearDeduplicationCache();
  await trackingEngineManager.hydrate();

  getAllSpy = spyOn(parcelRepository, 'getAll').mockImplementation(async () => storedParcels);
  saveSpy = spyOn(parcelRepository, 'save').mockImplementation(async (p: Parcel) => {
    const idx = storedParcels.findIndex((item) => item.id === p.id);
    if (idx >= 0) {
      storedParcels[idx] = p;
    } else {
      storedParcels.push(p);
    }
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  getAllSpy?.mockRestore();
  saveSpy?.mockRestore();
});

describe('BackgroundSyncService & Anti-False-Notification Guards (100% Local-First)', () => {
  it('registers the background sync task with TaskManager', () => {
    expect(typeof definedTasks[BACKGROUND_SYNC_TASK]).toBe('function');
  });

  it('does NOT notify or overwrite parcels when LocalTrackingEngine lacks a live adapter (allowSimulated: false)', async () => {
    const originalParcel = makeParcel({
      trackingNumber: 'LP00561234567890',
      carrier: findCarrierBySlug('cainiao'),
      status: 'in_transit',
      isLiveData: true,
    });
    storedParcels = [originalParcel];

    const result = await executeBackgroundSync();

    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(scheduledNotifications).toHaveLength(0);
    expect(storedParcels[0].status).toBe('in_transit');
  });

  it('does NOT send a notification when returned live status equals current status', async () => {
    const originalParcel = makeParcel({
      trackingNumber: 'PQ4F6P0703418520134120K',
      carrier: findCarrierBySlug('correos-spain'),
      status: 'in_transit',
      events: [
        {
          id: 'ev-1',
          date: '2026-11-10T10:00:00Z',
          status: 'in_transit',
          stage: 'transit',
          description: 'En tránsito',
          carrierSlug: 'correos-spain',
          carrierName: 'Correos España',
        },
      ],
    });
    storedParcels = [originalParcel];

    // Case 1: Identical status and events -> NoData, no save, no notification
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          shipment: {
            shipmentCode: 'PQ4F6P0703418520134120K',
            status: 'TRANSITO',
            statusDescription: 'En tránsito',
            deliveryDate: null,
            events: [
              {
                eventDate: '2026-11-10T10:00:00Z',
                status: 'TRANSITO',
                description: 'En tránsito',
                location: 'Madrid',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as unknown as typeof fetch;

    const firstResult = await executeBackgroundSync();
    expect(firstResult).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(scheduledNotifications).toHaveLength(0);

    // Case 2: New intermediate event arrived, status STILL in_transit -> saves events, NO notification
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          shipment: {
            shipmentCode: 'PQ4F6P0703418520134120K',
            status: 'TRANSITO',
            statusDescription: 'En tránsito',
            deliveryDate: null,
            events: [
              {
                eventDate: '2026-11-12T10:00:00Z',
                status: 'CLASIFICADO',
                description: 'Clasificado en centro logístico destino',
                location: 'Sevilla CTA',
              },
              {
                eventDate: '2026-11-10T10:00:00Z',
                status: 'TRANSITO',
                description: 'En tránsito',
                location: 'Madrid',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as unknown as typeof fetch;

    const secondResult = await executeBackgroundSync();
    expect(secondResult).toBe(BackgroundFetch.BackgroundFetchResult.NewData);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(scheduledNotifications).toHaveLength(0);
    expect(storedParcels[0].events).toHaveLength(2);
  });

  it('updates parcel, preserves metadata, and emits exactly ONE coherent notification on verified live status change', async () => {
    const originalParcel = makeParcel({
      id: 'parcel-live-1',
      trackingNumber: 'PQ4F6P0703418520134120K',
      customAlias: 'Monitor 4K',
      notes: 'Llamar al timbre 2B',
      postalCode: '28001',
      createdAt: '2026-11-01T09:30:00Z',
      status: 'in_transit',
      isLiveData: true,
    });
    storedParcels = [originalParcel];

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          shipment: {
            shipmentCode: 'PQ4F6P0703418520134120K',
            status: 'EN_REPARTO',
            statusDescription: 'En reparto',
            deliveryDate: null,
            events: [
              {
                eventDate: '2026-11-13T08:15:00Z',
                status: 'EN_REPARTO',
                description: 'En reparto para entrega hoy',
                location: 'Madrid',
              },
              {
                eventDate: '2026-11-10T10:00:00Z',
                status: 'TRANSITO',
                description: 'En tránsito',
                location: 'Madrid',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as unknown as typeof fetch;

    const result = await executeBackgroundSync();

    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NewData);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(scheduledNotifications).toHaveLength(1);

    // Metadata preserved
    const saved = storedParcels[0];
    expect(saved.id).toBe('parcel-live-1');
    expect(saved.customAlias).toBe('Monitor 4K');
    expect(saved.notes).toBe('Llamar al timbre 2B');
    expect(saved.createdAt).toBe('2026-11-01T09:30:00Z');
    expect(saved.postalCode).toBe('28001');
    expect(saved.status).toBe('out_for_delivery');
    expect(saved.isLiveData).toBe(true);

    // Notification content coherent
    const notif = scheduledNotifications[0];
    expect(notif.content.title).toContain('Monitor 4K');
    expect(notif.content.title).toContain('EN REPARTO');
    expect(notif.content.data.oldStatus).toBe('in_transit');
    expect(notif.content.data.newStatus).toBe('out_for_delivery');

    // Deduplication test
    const duplicateSent = await notificationService.sendParcelStatusNotification(
      saved,
      'in_transit',
      'out_for_delivery'
    );
    expect(duplicateSent).toBe(false);
    expect(scheduledNotifications).toHaveLength(1);
  });

  it('ignores transient pending or empty responses so they do not regress status or notify', async () => {
    storedParcels = [makeParcel({ status: 'in_transit' })];

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          shipment: {
            shipmentCode: 'PQ4F6P0703418520134120K',
            status: '',
            statusDescription: '',
            events: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as unknown as typeof fetch;

    const result = await executeBackgroundSync();

    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(scheduledNotifications).toHaveLength(0);
    expect(storedParcels[0].status).toBe('in_transit');
  });

  it('does not classify InPost "No entregado" event as delivered', () => {
    const html = `<!DOCTYPE html><html><body>
<astro-island uid="test" props="{&quot;trackingDetailsStatus&quot;:[0,200],&quot;trackingDetails&quot;:[0,{&quot;milestones&quot;:[1,[[0,{&quot;type&quot;:[0,&quot;EXCEPTION&quot;],&quot;name&quot;:[0,&quot;No entregado&quot;],&quot;date&quot;:[0,&quot;2026-11-12T10:00:00Z&quot;],&quot;events&quot;:[1,[[0,{&quot;code&quot;:[0,&quot;EXC.01&quot;],&quot;name&quot;:[0,&quot;No entregado&quot;],&quot;date&quot;:[0,&quot;2026-11-12T10:00:00Z&quot;],&quot;description&quot;:[0,&quot;Paquete no entregado por ausencia del destinatario&quot;]}]]]}]]]}]}"></astro-island>
</body></html>`;

    const parsed = parseInPostHtmlToParcel(
      html,
      '75616714',
      '47140',
      findCarrierBySlug('inpost'),
      'ES',
      'es'
    );

    expect(parsed.status).not.toBe('delivered');
    expect(parsed.isLiveData).toBe(true);
  });
});
