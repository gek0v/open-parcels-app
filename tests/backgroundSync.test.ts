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
const {
  ENGINE_LOCAL_FIRST_KEY,
  REST_BASE_URL_KEY,
  trackingEngineManager,
} = await import('../src/infrastructure/engine');
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
    trackingNumber: 'LP00561234567890',
    customAlias: 'Teclado Mecánico',
    carrier: findCarrierBySlug('cainiao'),
    status: 'in_transit',
    statusText: 'En tránsito',
    progress: 45,
    origin: { code: 'CN', name: 'China' },
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
        description: 'En tránsito internacional',
        carrierSlug: 'cainiao',
        carrierName: 'Cainiao Global',
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
  await trackingEngineManager.setLocalFirst(true);
  await trackingEngineManager.setRestBaseUrl('http://localhost:8080');

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

describe('BackgroundSyncService & Anti-False-Notification Guards', () => {
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

  it('NEVER notifies or overwrites when an engine returns isLiveData: false (simulated response)', async () => {
    const originalParcel = makeParcel({
      trackingNumber: 'LP00561234567890',
      carrier: findCarrierBySlug('cainiao'),
      status: 'in_transit',
      isLiveData: true,
    });
    storedParcels = [originalParcel];

    // Switch to REST mode and have server return a simulated payload (is_live_data: false)
    mockStorage[ENGINE_LOCAL_FIRST_KEY] = 'false';
    mockStorage[REST_BASE_URL_KEY] = 'http://192.168.1.50:8080';

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          tracking_number: 'LP00561234567890',
          carrier: { slug: 'cainiao', name: 'Cainiao Global' },
          status: 'out_for_delivery',
          status_text: 'En reparto',
          progress: 85,
          days_in_transit: 5,
          is_live_data: false,
          updated_at: '2026-11-12T10:00:00Z',
          events: [
            {
              date: '2026-11-12T09:00:00Z',
              status: 'out_for_delivery',
              stage: 'last_mile',
              description: 'Simulated out for delivery',
              carrier_slug: 'cainiao',
              carrier_name: 'Cainiao Global',
            },
            {
              date: '2026-11-11T09:00:00Z',
              status: 'in_transit',
              stage: 'transit',
              description: 'Simulated transit',
              carrier_slug: 'cainiao',
              carrier_name: 'Cainiao Global',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as unknown as typeof fetch;

    const result = await executeBackgroundSync();

    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(scheduledNotifications).toHaveLength(0);
    expect(storedParcels[0].status).toBe('in_transit');
  });

  it('does NOT send a notification when returned live status equals current status', async () => {
    const originalParcel = makeParcel({
      trackingNumber: 'LP00561234567890',
      carrier: findCarrierBySlug('cainiao'),
      status: 'in_transit',
      events: [
        {
          id: 'ev-1',
          date: '2026-11-10T10:00:00Z',
          status: 'in_transit',
          stage: 'transit',
          description: 'En tránsito internacional',
          carrierSlug: 'cainiao',
          carrierName: 'Cainiao Global',
        },
      ],
    });
    storedParcels = [originalParcel];

    mockStorage[ENGINE_LOCAL_FIRST_KEY] = 'false';
    mockStorage[REST_BASE_URL_KEY] = 'http://192.168.1.50:8080';

    // Case 1: Identical status and identical event count -> NoData, no save, no notification
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          tracking_number: 'LP00561234567890',
          carrier: { slug: 'cainiao', name: 'Cainiao Global' },
          status: 'in_transit',
          status_text: 'En tránsito',
          progress: 45,
          days_in_transit: 5,
          is_live_data: true,
          updated_at: '2026-11-12T10:00:00Z',
          events: [
            {
              date: '2026-11-10T10:00:00Z',
              status: 'in_transit',
              stage: 'transit',
              description: 'En tránsito internacional',
              carrier_slug: 'cainiao',
              carrier_name: 'Cainiao Global',
            },
          ],
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
          tracking_number: 'LP00561234567890',
          carrier: { slug: 'cainiao', name: 'Cainiao Global' },
          status: 'in_transit',
          status_text: 'En tránsito',
          progress: 55,
          days_in_transit: 5,
          is_live_data: true,
          updated_at: '2026-11-12T11:00:00Z',
          events: [
            {
              date: '2026-11-12T10:00:00Z',
              status: 'in_transit',
              stage: 'customs',
              description: 'Despacho de aduana completado',
              carrier_slug: 'cainiao',
              carrier_name: 'Cainiao Global',
            },
            {
              date: '2026-11-10T10:00:00Z',
              status: 'in_transit',
              stage: 'transit',
              description: 'En tránsito internacional',
              carrier_slug: 'cainiao',
              carrier_name: 'Cainiao Global',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as unknown as typeof fetch;

    const secondResult = await executeBackgroundSync();
    expect(secondResult).toBe(BackgroundFetch.BackgroundFetchResult.NewData);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(scheduledNotifications).toHaveLength(0);
    expect(storedParcels[0].events).toHaveLength(2);
  });

  it('hydrates persisted REST mode & URL in background and sends allowSimulated: false', async () => {
    // Reset in-memory engine manager to defaults (Local = true, localhost:8080)
    // while AsyncStorage holds user-configured REST mode + custom server URL
    trackingEngineManager.rest.setBaseUrl('http://localhost:8080');
    (trackingEngineManager as any).useLocalFirst = true;
    mockStorage[ENGINE_LOCAL_FIRST_KEY] = 'false';
    mockStorage[REST_BASE_URL_KEY] = 'https://tracking.mi-servidor.local:8443';

    storedParcels = [
      makeParcel({
        trackingNumber: '1Z12345E0205271686',
        carrier: findCarrierBySlug('ups'),
        status: 'info_received',
        postalCode: undefined,
        destination: { code: 'ES', name: 'España' },
      }),
    ];

    let capturedUrl = '';
    let capturedBody: Record<string, any> = {};

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          tracking_number: '1Z12345E0205271686',
          carrier: { slug: 'ups', name: 'UPS' },
          status: 'info_received',
          status_text: 'Información recibida',
          progress: 15,
          days_in_transit: 1,
          is_live_data: true,
          updated_at: '2026-11-12T10:00:00Z',
          events: [
            {
              date: '2026-11-10T10:00:00Z',
              status: 'info_received',
              stage: 'created',
              description: 'Etiqueta creada',
              carrier_slug: 'ups',
              carrier_name: 'UPS',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    await executeBackgroundSync();

    expect(trackingEngineManager.isLocalFirst()).toBe(false);
    expect(trackingEngineManager.rest.getBaseUrl()).toBe('https://tracking.mi-servidor.local:8443');
    expect(capturedUrl).toBe('https://tracking.mi-servidor.local:8443/api/v1/track');
    expect(capturedBody.allow_simulated).toBe(false);
    expect(capturedBody.destination_country).toBe('ES');
    expect(capturedBody.carrier_hint).toBe('ups');
  });

  it('updates parcel, preserves metadata, and emits exactly ONE coherent notification on verified live status change', async () => {
    mockStorage[ENGINE_LOCAL_FIRST_KEY] = 'false';
    mockStorage[REST_BASE_URL_KEY] = 'http://192.168.1.50:8080';

    const originalParcel = makeParcel({
      id: 'parcel-live-1',
      trackingNumber: 'LP00561234567890',
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
          tracking_number: 'LP00561234567890',
          carrier: { slug: 'cainiao', name: 'Cainiao Global' },
          status: 'out_for_delivery',
          status_text: 'En reparto',
          progress: 85,
          days_in_transit: 6,
          is_live_data: true,
          updated_at: '2026-11-12T08:30:00Z',
          events: [
            {
              date: '2026-11-12T08:15:00Z',
              status: 'out_for_delivery',
              stage: 'last_mile',
              description: 'En reparto para entrega hoy',
              carrier_slug: 'correosexpress',
              carrier_name: 'Correos Express',
            },
            {
              date: '2026-11-10T10:00:00Z',
              status: 'in_transit',
              stage: 'transit',
              description: 'En tránsito internacional',
              carrier_slug: 'cainiao',
              carrier_name: 'Cainiao Global',
            },
          ],
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

    // Deduplication: even if sendParcelStatusNotification is invoked again for the same status, it does not duplicate
    const duplicateSent = await notificationService.sendParcelStatusNotification(
      saved,
      'in_transit',
      'out_for_delivery'
    );
    expect(duplicateSent).toBe(false);
    expect(scheduledNotifications).toHaveLength(1);
  });

  it('ignores transient pending or empty responses so they do not regress status or notify', async () => {
    mockStorage[ENGINE_LOCAL_FIRST_KEY] = 'false';
    mockStorage[REST_BASE_URL_KEY] = 'http://192.168.1.50:8080';

    storedParcels = [makeParcel({ status: 'in_transit' })];

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          tracking_number: 'LP00561234567890',
          carrier: { slug: 'cainiao', name: 'Cainiao Global' },
          status: 'pending',
          status_text: 'Pendiente',
          progress: 5,
          days_in_transit: 0,
          is_live_data: true,
          updated_at: '2026-11-12T08:30:00Z',
          events: [],
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
