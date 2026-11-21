import { describe, test, expect, beforeEach, mock } from 'bun:test';

(globalThis as any).__DEV__ = false;

// ---------------------------------------------------------------------------
// Module Mocks for Native Dependencies
// ---------------------------------------------------------------------------

const mockOpenURL = mock(async (url: string) => true);
mock.module('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (styles: any) => styles,
    absoluteFill: {},
  },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  AppState: {
    addEventListener: () => ({ remove: () => {} }),
  },
  Animated: {
    Value: class {
      val: number;
      constructor(val: number) { this.val = val; }
      stopAnimation = mock(() => {});
    },
    timing: () => ({ start: (cb?: any) => cb?.() }),
    spring: () => ({ start: (cb?: any) => cb?.() }),
    parallel: (anims: any[]) => ({ start: (cb?: any) => cb?.() }),
  },
  Linking: {
    openURL: mockOpenURL,
    canOpenURL: mock(async (url: string) => true),
  },
  Platform: {
    OS: 'android',
    select: (obj: any) => obj.android || obj.default,
  },
  Alert: {
    alert: mock(() => {}),
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

const asyncStorageStore = new Map<string, string>();
const mockAsyncStorage = {
  getItem: mock(async (key: string) => asyncStorageStore.get(key) ?? null),
  setItem: mock(async (key: string, value: string) => {
    asyncStorageStore.set(key, value);
  }),
  removeItem: mock(async (key: string) => {
    asyncStorageStore.delete(key);
  }),
  clear: mock(async () => {
    asyncStorageStore.clear();
  }),
};
mock.module('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));

let mockDbQueries: { query: string; params?: any[] }[] = [];
let mockDbFirstAsyncResult: any = null;
let mockDbGetAllAsyncResult: any[] = [];
const mockSqliteDb = {
  execAsync: mock(async (sql: string) => {
    mockDbQueries.push({ query: sql });
  }),
  getAllAsync: mock(async (query: string, params?: any[]) => {
    mockDbQueries.push({ query, params });
    return mockDbGetAllAsyncResult;
  }),
  getFirstAsync: mock(async (query: string, params?: any[]) => {
    mockDbQueries.push({ query, params });
    return mockDbFirstAsyncResult;
  }),
  runAsync: mock(async (query: string, params?: any[]) => {
    mockDbQueries.push({ query, params });
    return { changes: 1 };
  }),
  withTransactionAsync: mock(async (cb: () => Promise<void>) => {
    await cb();
  }),
  closeAsync: mock(async () => {}),
};

mock.module('expo-sqlite', () => ({
  openDatabaseAsync: mock(async (name: string) => mockSqliteDb),
}));

mock.module('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/data/',
  deleteAsync: mock(async () => {}),
  getInfoAsync: mock(async () => ({ exists: true, size: 2048 })),
  moveAsync: mock(async () => {}),
  getContentUriAsync: mock(async (uri: string) => `content://${uri}`),
  createDownloadResumable: mock(() => ({
    downloadAsync: mock(async () => ({ status: 200 })),
    cancelAsync: mock(async () => {}),
  })),
}));

mock.module('expo-intent-launcher', () => ({
  startActivityAsync: mock(async () => {}),
}));

// ---------------------------------------------------------------------------
// Dynamic Imports of Actual Implementation Modules after Mocking
// ---------------------------------------------------------------------------

const { safeJsonParse } = await import('../src/infrastructure/utils/safeJson');
const { isSafeWebUrl, openSafeWebUrl } = await import('../src/infrastructure/utils/url');
const { Linking } = await import('react-native');
const {
  isTrustedDownloadUrl,
  UpdateService,
  updateService,
} = await import('../src/infrastructure/services/UpdateService');
const {
  SqliteParcelRepository,
  sqliteParcelRepository,
} = await import('../src/infrastructure/storage/sqlite/SqliteParcelRepository');
const {
  getDatabase,
  closeDatabase,
  getDbInitPromise,
  MIGRATE_PARCEL_SQL,
  migrateFromAsyncStorage,
  DB_NAME,
} = await import('../src/infrastructure/storage/sqlite/database');
const {
  ParcelRepository,
  parcelRepository,
} = await import('../src/infrastructure/storage/ParcelRepository');
import type { Parcel } from '../src/domain/models/parcel';
import type { CanonicalStatus } from '../src/domain/models/status';

// ---------------------------------------------------------------------------
// Milestone 2 Test Suite
// ---------------------------------------------------------------------------

describe('Milestone 2: safeJsonParse', () => {
  test('parses valid JSON objects and arrays', () => {
    expect(safeJsonParse('{"key":"value"}', {})).toEqual({ key: 'value' });
    expect(safeJsonParse<number[]>('[1,2,3]', [])).toEqual([1, 2, 3]);
    expect(safeJsonParse('"simple string"', '')).toBe('simple string');
    expect(safeJsonParse('12345', 0)).toBe(12345);
    expect(safeJsonParse('true', false)).toBe(true);
  });

  test('returns fallback on null, undefined, empty, or whitespace-only input', () => {
    expect(safeJsonParse(null, { default: true })).toEqual({ default: true });
    expect(safeJsonParse<number[]>(undefined, [1])).toEqual([1]);
    expect(safeJsonParse('', 'fallback')).toBe('fallback');
    expect(safeJsonParse('   \t\n  ', 'fallback')).toBe('fallback');
    expect(safeJsonParse(undefined, undefined)).toBeUndefined();
  });

  test('returns fallback on malformed or corrupt JSON without throwing', () => {
    expect(safeJsonParse('{invalid:json}', { fallback: true })).toEqual({ fallback: true });
    expect(safeJsonParse<number[]>('[1,2,', [])).toEqual([]);
    expect(safeJsonParse('<xml>not json</xml>', null)).toBeNull();
    expect(safeJsonParse('{"incomplete":', undefined)).toBeUndefined();
  });
});

describe('Milestone 2: URL Safety & Protocols (url.ts)', () => {
  beforeEach(() => {
    mockOpenURL.mockClear();
  });

  test('isSafeWebUrl accepts valid http:// and https:// URLs', () => {
    expect(isSafeWebUrl('https://correos.es')).toBe(true);
    expect(isSafeWebUrl('http://openparcels.com/track/123')).toBe(true);
    expect(isSafeWebUrl('https://api.github.com/repos/owner/repo')).toBe(true);
    expect(isSafeWebUrl('  https://example.com/spaced  ')).toBe(true);
  });

  test('isSafeWebUrl rejects dangerous or unsupported protocols', () => {
    expect(isSafeWebUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeWebUrl('data:text/html;base64,...')).toBe(false);
    expect(isSafeWebUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeWebUrl('intent://com.example.app/#Intent;scheme=bad;end')).toBe(false);
    expect(isSafeWebUrl('blob:https://openparcels.com/123')).toBe(false);
    expect(isSafeWebUrl('')).toBe(false);
    expect(isSafeWebUrl(null)).toBe(false);
    expect(isSafeWebUrl(undefined)).toBe(false);
    expect(isSafeWebUrl('not a url')).toBe(false);
  });

  test('openSafeWebUrl invokes Linking.openURL with verified safe web URL', async () => {
    const result = await openSafeWebUrl('https://correos.es');

    expect(result).toBe(true);
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL).toHaveBeenCalledWith('https://correos.es');
  });

  test('openSafeWebUrl rejects dangerous URL and does NOT invoke Linking.openURL', async () => {
    const result = await openSafeWebUrl('javascript:alert(1)');

    expect(result).toBe(false);
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  test('openSafeWebUrl uses safe fallback URL when primary URL is unsafe', async () => {
    const result = await openSafeWebUrl(
      'javascript:alert(1)',
      'https://openparcels.com'
    );

    expect(result).toBe(true);
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL).toHaveBeenCalledWith('https://openparcels.com');
  });

  test('openSafeWebUrl returns false when both primary and fallback URLs are unsafe', async () => {
    const result = await openSafeWebUrl(
      'javascript:alert(1)',
      'file:///sdcard/malware.apk'
    );

    expect(result).toBe(false);
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  test('openSafeWebUrl returns false and catches error if Linking.openURL throws', async () => {
    mockOpenURL.mockImplementationOnce(async () => {
      throw new Error('Device has no browser activity');
    });

    const result = await openSafeWebUrl('https://failing-intent.com');

    expect(result).toBe(false);
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
  });
});

describe('Milestone 2: SqliteParcelRepository JSON Corruption Resilience', () => {
  const repo = new SqliteParcelRepository();

  test('mapRowToParcel parses corrupted SQLite JSON columns into undefined without throwing', () => {
    const corruptRow = {
      id: 'parcel-corrupt-1',
      tracking_number: 'TEST123456789',
      custom_alias: 'Paquete de Prueba',
      carrier_slug: 'correos-spain',
      carrier_name: 'Correos España',
      carrier_website: 'https://correos.es',
      carrier_color: '#FFCC00',
      requires_postal_code: 0,
      status: 'in_transit',
      status_text: 'En tránsito',
      progress: 50,
      origin_code: 'ES',
      origin_name: 'España',
      destination_code: 'ES',
      destination_name: 'Madrid',
      postal_code: '28001',
      delivered_at: null,
      days_in_transit: 2,
      is_archived: 0,
      // Corrupted JSON values in SQLite columns
      additional_carriers_json: '{corrupt json string...',
      last_mile_carrier_json: '{"unclosed object',
      flight_legs_json: '<<<not a json>>>',
      from_cache: 0,
      is_live_data: 1,
      notes: 'Nota importante de entrega',
      created_at: '2026-02-01T10:00:00.000Z',
      updated_at: '2026-02-01T10:00:00.000Z',
    };

    let mappedParcel: Parcel | null = null;
    expect(() => {
      mappedParcel = repo.mapRowToParcel(corruptRow, []);
    }).not.toThrow();

    expect(mappedParcel).not.toBeNull();
    expect(mappedParcel!.id).toBe('parcel-corrupt-1');
    expect(mappedParcel!.trackingNumber).toBe('TEST123456789');
    expect(mappedParcel!.status).toBe('in_transit');
    expect(mappedParcel!.notes).toBe('Nota importante de entrega');
    // Corrupt columns safely recovered to undefined
    expect(mappedParcel!.additionalCarriers).toBeUndefined();
    expect(mappedParcel!.lastMileCarrier).toBeUndefined();
    expect(mappedParcel!.flightLegs).toBeUndefined();
  });

  test('mapRowToParcel correctly parses valid JSON columns', () => {
    const validRow = {
      id: 'parcel-valid-1',
      tracking_number: 'VALID987654321',
      custom_alias: null,
      carrier_slug: 'ups',
      carrier_name: 'UPS',
      status: 'delivered',
      status_text: 'Entregado',
      progress: 100,
      days_in_transit: 4,
      is_archived: 1,
      additional_carriers_json: JSON.stringify([{ slug: 'dhl', name: 'DHL' }]),
      last_mile_carrier_json: JSON.stringify({ slug: 'seur', name: 'SEUR' }),
      flight_legs_json: JSON.stringify([{ departureAirport: 'MAD', arrivalAirport: 'JFK' }]),
      from_cache: 0,
      is_live_data: 1,
      notes: null,
      created_at: '2026-02-01T10:00:00.000Z',
      updated_at: '2026-02-02T15:00:00.000Z',
    };

    const parcel = repo.mapRowToParcel(validRow, []);

    expect(parcel.additionalCarriers).toEqual([{ slug: 'dhl', name: 'DHL' } as any]);
    expect(parcel.lastMileCarrier).toEqual({ slug: 'seur', name: 'SEUR' } as any);
    expect(parcel.flightLegs).toEqual([{ departureAirport: 'MAD', arrivalAirport: 'JFK' } as any]);
    expect(parcel.isArchived).toBe(true);
    expect(parcel.notes).toBeUndefined();
  });
});

describe('Milestone 2: SQLite Metadata Preservation on Re-tracking', () => {
  beforeEach(() => {
    mockDbQueries = [];
    mockDbFirstAsyncResult = null;
  });

  test('persistParcel preserves existing id, notes, customAlias, isArchived, and createdAt on re-tracking', async () => {
    const repo = new SqliteParcelRepository();

    // Mock existing parcel in database
    mockDbFirstAsyncResult = {
      id: 'original-local-uuid-1234',
      created_at: '2026-01-01T12:00:00.000Z',
      notes: 'Dejar en conserjería si no estoy',
      custom_alias: 'Zapatillas Running',
      is_archived: 1,
    };

    // Incoming freshly-tracked parcel from live carrier engine
    const incomingParcel: Parcel = {
      id: 'temp-generated-uuid-9999',
      trackingNumber: '1Z9999999999999999',
      carrier: { slug: 'ups', name: 'UPS', color: '#ffcc00' },
      status: 'delivered' as CanonicalStatus,
      statusText: 'Entregado',
      progress: 100,
      daysInTransit: 3,
      events: [],
      createdAt: '2026-02-15T08:00:00.000Z',
      updatedAt: '2026-02-15T08:00:00.000Z',
      isArchived: false,
    };

    await repo.persistParcel(mockSqliteDb, incomingParcel);

    // Verify incoming object had metadata preserved
    expect(incomingParcel.id).toBe('original-local-uuid-1234');
    expect(incomingParcel.createdAt).toBe('2026-01-01T12:00:00.000Z');
    expect(incomingParcel.notes).toBe('Dejar en conserjería si no estoy');
    expect(incomingParcel.customAlias).toBe('Zapatillas Running');
    expect(incomingParcel.isArchived).toBe(true);

    // Verify insert parameters sent to SQLite
    const insertQuery = mockDbQueries.find((q) =>
      q.query.includes('INSERT OR REPLACE INTO parcels')
    );
    expect(insertQuery).toBeDefined();
    const params = insertQuery!.params!;
    expect(params[0]).toBe('original-local-uuid-1234'); // id
    expect(params[1]).toBe('1Z9999999999999999'); // tracking_number
    expect(params[2]).toBe('Zapatillas Running'); // custom_alias
    expect(params[18]).toBe(1); // is_archived = 1
    expect(params[28]).toBe('Dejar en conserjería si no estoy'); // notes
    expect(params[29]).toBe('2026-01-01T12:00:00.000Z'); // created_at
  });
});

describe('Milestone 2: database.ts Migration & DDL Concurrency', () => {
  beforeEach(async () => {
    await closeDatabase();
    mockDbQueries = [];
    asyncStorageStore.clear();
  });

  test('MIGRATE_PARCEL_SQL includes notes column and matches parameter placeholder count', () => {
    // 1. Check notes column presence
    expect(MIGRATE_PARCEL_SQL).toContain('notes');

    // 2. Count columns defined in the INSERT statement
    const columnsMatch = MIGRATE_PARCEL_SQL.match(/INSERT OR REPLACE INTO parcels \(([\s\S]*?)\) VALUES/i);
    expect(columnsMatch).not.toBeNull();
    const columnsList = columnsMatch![1]
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    // 3. Count placeholders in the VALUES clause
    const valuesMatch = MIGRATE_PARCEL_SQL.match(/VALUES \(([\s\S]*?)\);/i);
    expect(valuesMatch).not.toBeNull();
    const placeholders = valuesMatch![1]
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p === '?');

    expect(columnsList).toContain('notes');
    expect(columnsList.length).toBe(31);
    expect(placeholders.length).toBe(31);
    expect(columnsList.length).toBe(placeholders.length);
  });

  test('migrateFromAsyncStorage migrates parcels with notes into SQLite', async () => {
    const rawParcels = [
      {
        id: 'p-migrate-1',
        trackingNumber: 'ES99887766',
        carrier: { slug: 'correos-spain', name: 'Correos España' },
        status: 'in_transit',
        statusText: 'En camino',
        progress: 40,
        daysInTransit: 1,
        notes: 'Código de puerta: 4321',
        createdAt: '2026-01-10T10:00:00.000Z',
        updatedAt: '2026-01-10T10:00:00.000Z',
      },
    ];
    await mockAsyncStorage.setItem('@open_parcels:saved_parcels_v1', JSON.stringify(rawParcels));

    await migrateFromAsyncStorage(mockSqliteDb as any);

    const insertCall = mockDbQueries.find((q) =>
      q.query.includes('INSERT OR REPLACE INTO parcels')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall!.params![28]).toBe('Código de puerta: 4321'); // notes index

    const migratedFlag = await mockAsyncStorage.getItem('@open_parcels:sqlite_migrated_v1');
    expect(migratedFlag).toBe('true');
  });

  test('getDatabase memoizes initialization promise to prevent DDL race conditions', async () => {
    // Concurrent calls before promise resolves
    const [dbPromise1, dbPromise2] = [getDatabase(), getDatabase()];

    expect(dbPromise1).toBe(dbPromise2); // Exactly identical promise reference
    const db1 = await dbPromise1;
    const db2 = await dbPromise2;
    expect(db1).toBe(db2);
  });

  test('closeDatabase cleanly tears down database and resets memoized promise', async () => {
    await getDatabase();
    expect(getDbInitPromise()).not.toBeNull();

    await closeDatabase();
    expect(getDbInitPromise()).toBeNull();
  });
});

describe('Milestone 2: ParcelRepository Batch Saving & Single Notification', () => {
  beforeEach(async () => {
    await closeDatabase();
    mockDbQueries = [];
  });

  test('saveAll executes batch save and triggers exactly ONE notification', async () => {
    let notificationCount = 0;
    const testRepo = new ParcelRepository();
    const unsubscribe = testRepo.subscribe(() => {
      notificationCount++;
    });

    const parcelsToSave: Parcel[] = [
      {
        id: 'batch-1',
        trackingNumber: 'TRK001',
        carrier: { slug: 'dhl', name: 'DHL' },
        status: 'in_transit' as CanonicalStatus,
        statusText: 'En tránsito',
        progress: 30,
        daysInTransit: 1,
        events: [],
        isArchived: false,
        createdAt: '2026-02-10T10:00:00.000Z',
        updatedAt: '2026-02-10T10:00:00.000Z',
      },
      {
        id: 'batch-2',
        trackingNumber: 'TRK002',
        carrier: { slug: 'ups', name: 'UPS' },
        status: 'delivered' as CanonicalStatus,
        statusText: 'Entregado',
        progress: 100,
        daysInTransit: 2,
        events: [],
        isArchived: false,
        createdAt: '2026-02-11T10:00:00.000Z',
        updatedAt: '2026-02-11T10:00:00.000Z',
      },
      {
        id: 'batch-3',
        trackingNumber: 'TRK003',
        carrier: { slug: 'correos-spain', name: 'Correos' },
        status: 'registered' as CanonicalStatus,
        statusText: 'Prerregistrado',
        progress: 10,
        daysInTransit: 0,
        events: [],
        isArchived: false,
        createdAt: '2026-02-12T10:00:00.000Z',
        updatedAt: '2026-02-12T10:00:00.000Z',
      },
    ];

    await testRepo.saveAll(parcelsToSave);

    // Must trigger exactly ONE notification, not 3
    expect(notificationCount).toBe(1);

    unsubscribe();
  });
});

describe('Milestone 2: UpdateService Security & AbortController Timeout', () => {
  test('isTrustedDownloadUrl accepts official GitHub release asset domains', () => {
    expect(isTrustedDownloadUrl('https://github.com/gek0v/open-parcels-app/releases/download/v1.5.4/app.apk')).toBe(true);
    expect(isTrustedDownloadUrl('https://objects.githubusercontent.com/github-production-release-asset-2e65be/123.apk')).toBe(true);
    expect(isTrustedDownloadUrl('https://api.github.com/repos/gek0v/open-parcels-app/releases')).toBe(true);
    expect(isTrustedDownloadUrl('https://raw.githubusercontent.com/gek0v/open-parcels-app/main/app.json')).toBe(true);
    expect(isTrustedDownloadUrl('https://github-releases.githubusercontent.com/release-asset.apk')).toBe(true);
  });

  test('isTrustedDownloadUrl rejects untrusted domains and insecure HTTP', () => {
    expect(isTrustedDownloadUrl('http://github.com/app.apk')).toBe(false); // HTTP rejected
    expect(isTrustedDownloadUrl('https://evil-server.com/malicious.apk')).toBe(false);
    expect(isTrustedDownloadUrl('https://github.com.attacker.com/app.apk')).toBe(false);
    expect(isTrustedDownloadUrl('https://objects.githubusercontent.com.phishing.io/asset.apk')).toBe(false);
    expect(isTrustedDownloadUrl('javascript:void(0)')).toBe(false);
    expect(isTrustedDownloadUrl('')).toBe(false);
  });

  test('downloadApk throws UNTRUSTED_DOWNLOAD_URL when URL domain is not trusted', async () => {
    const untrustedUpdate = {
      version: 'v2.0.0',
      title: 'Update',
      changelog: 'Changelog',
      publishedAt: '2026-02-01',
      apkDownloadUrl: 'https://attacker.com/fake-update.apk',
      htmlUrl: 'https://attacker.com/update',
      hasApkAsset: true,
    };

    expect(updateService.downloadApk(untrustedUpdate)).rejects.toThrow('UNTRUSTED_DOWNLOAD_URL');
  });

  test('checkForUpdate safely aborts on network timeout without unhandled error', async () => {
    // Override global fetch with a hanging promise that respects AbortSignal
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((url: string, init?: any) => {
      return new Promise((resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const abortError = new Error('The operation was aborted.');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }
      });
    }) as any;

    try {
      const service = new UpdateService();
      // Test timeout with 50ms to verify AbortController timeout catch
      const res = await service.checkForUpdate(true, 50);
      expect(res).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
