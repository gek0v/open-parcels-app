import { describe, expect, it, mock, beforeEach } from 'bun:test';

let mockStorage: Record<string, string> = {};

mock.module('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Platform: { OS: 'android', select: (obj: any) => obj.android ?? obj.default },
  StyleSheet: {
    create: (styles: any) => styles,
    absoluteFill: {},
  },
  Linking: { openURL: async () => {}, canOpenURL: async () => true },
  AppState: {
    addEventListener: () => ({ remove: () => {} }),
  },
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

mock.module('expo-sqlite', () => ({
  openDatabaseAsync: async () => {
    throw new Error('SQLite mocked out in unit test');
  },
}));

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => mockStorage[key] ?? null,
    setItem: async (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: async (key: string) => {
      delete mockStorage[key];
    },
  },
}));

const { ParcelRepository } = await import('../src/infrastructure/storage/ParcelRepository');
const { CARRIERS_CATALOG, findCarrierBySlug, detectCandidateCarriers } = await import('../src/domain/validators/detection');
import type { Parcel } from '../src/domain/models/parcel';

describe('ParcelRepository Subscriptions & Real-Time Sync', () => {
  let repository: InstanceType<typeof ParcelRepository>;

  beforeEach(() => {
    mockStorage = {};
    repository = new ParcelRepository();
  });

  it('notifies subscribers when a parcel is saved', async () => {
    let callCount = 0;
    const unsubscribe = repository.subscribe(() => {
      callCount++;
    });

    const mockParcel: Parcel = {
      id: 'test-123',
      trackingNumber: 'RR123456785ES',
      carrier: findCarrierBySlug('correos-spain'),
      status: 'in_transit',
      statusText: 'En Tránsito',
      progress: 0.5,
      daysInTransit: 2,
      isArchived: false,
      events: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.save(mockParcel);
    expect(callCount).toBe(1);

    // Unsubscribe cleanly
    unsubscribe();
    await repository.save(mockParcel);
    expect(callCount).toBe(1);
  });

  it('notifies subscribers when a parcel is deleted', async () => {
    let notified = false;
    repository.subscribe(() => {
      notified = true;
    });

    await repository.delete('non-existent-id');
    expect(notified).toBe(true);
  });

  it('notifies subscribers on updateAlias and toggleArchive', async () => {
    const mockParcel: Parcel = {
      id: 'test-archive-alias',
      trackingNumber: '1Z9999999999999999',
      carrier: findCarrierBySlug('ups'),
      status: 'pending',
      statusText: 'Pendiente',
      progress: 0.1,
      daysInTransit: 0,
      isArchived: false,
      events: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.save(mockParcel);

    let notifyCount = 0;
    repository.subscribe(() => {
      notifyCount++;
    });

    await repository.updateAlias('test-archive-alias', 'Nuevo Alias');
    expect(notifyCount).toBe(1);

    await repository.toggleArchive('test-archive-alias');
    expect(notifyCount).toBe(2);
  });
});

describe('Carrier Catalog & Recommended Detection', () => {
  it('contains full catalog of 28 carriers with valid slugs and names', () => {
    expect(CARRIERS_CATALOG.length).toBeGreaterThanOrEqual(28);
    for (const carrier of CARRIERS_CATALOG) {
      expect(carrier.slug).toBeDefined();
      expect(carrier.slug.length).toBeGreaterThan(0);
      expect(carrier.name).toBeDefined();
      expect(carrier.name.length).toBeGreaterThan(0);
    }
  });

  it('finds any carrier in the catalog by slug or alias', () => {
    const correos = findCarrierBySlug('correos-spain');
    expect(correos.name).toBe('Correos España');
    expect(correos.slug).toBe('correos-spain');

    const seur = findCarrierBySlug('seur');
    expect(seur.name).toBe('SEUR');
    expect(seur.requiresPostalCode).toBe(true);

    const inpost = findCarrierBySlug('inpost');
    expect(inpost.name).toContain('InPost');
    expect(inpost.requiresPostalCode).toBe(true);

    const cainiao = findCarrierBySlug('cainiao');
    expect(cainiao.name).toContain('Cainiao');
  });

  it('detects candidate carriers and provides confidence scores', () => {
    const candidates = detectCandidateCarriers('RR123456785ES');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].carrier).toBeDefined();
    expect(candidates[0].carrier.slug).toBe('correos-spain');
    expect(candidates[0].confidence).toBeGreaterThan(0);
    expect(candidates[0].confidence).toBeLessThanOrEqual(1.0);
  });

  it('detects candidate carriers for UPS 1Z tracking numbers', () => {
    const candidates = detectCandidateCarriers('1Z12345E0205271686');
    expect(candidates.length).toBeGreaterThan(0);
    const ups = candidates.find((c) => c.carrier.slug === 'ups');
    expect(ups).toBeDefined();
  });
});
