(globalThis as any).__DEV__ = false;
import { describe, expect, it, beforeEach, mock } from 'bun:test';
import type { Parcel } from '../src/domain/models/parcel';

// In-memory mock storage and filesystem
let inMemoryParcels: Parcel[] = [];
let mockFiles: Record<string, string> = {};
(globalThis as any).__backupMockFiles = mockFiles;
let sharedFiles: string[] = [];

mock.module('../src/infrastructure/storage/ParcelRepository', () => ({
  parcelRepository: {
    getAll: async () => [...inMemoryParcels],
    save: async (parcel: Parcel) => {
      const idx = inMemoryParcels.findIndex(
        (p) => p.trackingNumber === parcel.trackingNumber || p.id === parcel.id
      );
      if (idx >= 0) {
        inMemoryParcels[idx] = { ...inMemoryParcels[idx], ...parcel };
      } else {
        inMemoryParcels.push(parcel);
      }
    },
  },
}));

mock.module('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///data/cache/',
  documentDirectory: 'file:///data/docs/',
  writeAsStringAsync: async (uri: string, content: string) => {
    mockFiles[uri] = content;
    if ((globalThis as any).__backupMockFiles) {
      (globalThis as any).__backupMockFiles[uri] = content;
    }
  },
  readAsStringAsync: async (uri: string) => {
    return mockFiles[uri] || (globalThis as any).__backupMockFiles?.[uri] || '';
  },
  getInfoAsync: async (...args: any[]) => {
    if ((globalThis as any).__mockFsHandlers?.getInfoAsync) {
      return (globalThis as any).__mockFsHandlers.getInfoAsync(...args);
    }
    const uri = args[0];
    const exists = !!mockFiles[uri];
    return { exists, isDirectory: false, size: mockFiles[uri]?.length || 0, uri };
  },
  deleteAsync: async (...args: any[]) => {
    if ((globalThis as any).__mockFsHandlers?.deleteAsync) {
      return (globalThis as any).__mockFsHandlers.deleteAsync(...args);
    }
    delete mockFiles[args[0]];
  },
  moveAsync: async (...args: any[]) => {
    if ((globalThis as any).__mockFsHandlers?.moveAsync) {
      return (globalThis as any).__mockFsHandlers.moveAsync(...args);
    }
  },
  getContentUriAsync: async (...args: any[]) => {
    if ((globalThis as any).__mockFsHandlers?.getContentUriAsync) {
      return (globalThis as any).__mockFsHandlers.getContentUriAsync(...args);
    }
    return args[0]?.replace('file://', 'content://');
  },
  createDownloadResumable: (...args: any[]) => {
    if ((globalThis as any).__mockFsHandlers?.createDownloadResumable) {
      return (globalThis as any).__mockFsHandlers.createDownloadResumable(...args);
    }
    return {
      downloadAsync: async () => ({ uri: args[1], status: 200 }),
      cancelAsync: async () => {},
    };
  },
}));

mock.module('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: async (uri: string) => {
    sharedFiles.push(uri);
  },
}));

mock.module('expo-document-picker', () => ({
  getDocumentAsync: async () => ({
    canceled: false,
    assets: [
      {
        uri: 'file:///mock/backup.json',
        name: 'backup.json',
        mimeType: 'application/json',
        size: 100,
        lastModified: Date.now(),
      },
    ],
  }),
}));

mock.module('react-native', () => ({
  Platform: { OS: 'android', select: (obj: any) => obj.android || obj.default },
  Share: {
    share: async () => ({ action: 'sharedAction' }),
  },
}));

const {
  validateBackupData,
  mergeParcels,
  BackupService,
  BACKUP_APP_IDENTIFIER,
  BACKUP_CURRENT_VERSION,
} = await import('../src/infrastructure/services/BackupService');

type BackupData = import('../src/infrastructure/services/BackupService').BackupData;

const mockBaseCarrier = {
  slug: 'correos-spain',
  name: 'Correos España',
  country: 'ES',
  type: 'postal',
  color: '#FFCC00',
};

const createMockParcel = (overrides?: Partial<Parcel>): Parcel => ({
  id: 'parcel_123',
  trackingNumber: 'PQ481920391ES',
  customAlias: 'Teclado Mecánico',
  carrier: { ...mockBaseCarrier },
  status: 'in_transit',
  statusText: 'En tránsito hacia el centro de distribución',
  progress: 45,
  daysInTransit: 3,
  events: [
    {
      id: 'ev_1',
      date: '2026-03-28T09:00:00.000Z',
      status: 'info_received',
      stage: 'created',
      description: 'Envío registrado en origen',
      carrierSlug: 'correos-spain',
      carrierName: 'Correos España',
    },
    {
      id: 'ev_2',
      date: '2026-03-30T14:30:00.000Z',
      status: 'in_transit',
      stage: 'transit',
      description: 'En camino hacia la oficina de destino',
      carrierSlug: 'correos-spain',
      carrierName: 'Correos España',
    },
  ],
  createdAt: '2026-03-28T09:00:00.000Z',
  updatedAt: '2026-03-30T14:30:00.000Z',
  isArchived: false,
  ...overrides,
});

describe('Backup Validation (validateBackupData)', () => {
  it('rejects non-object and null values', () => {
    expect(validateBackupData(null).valid).toBe(false);
    expect(validateBackupData(undefined).valid).toBe(false);
    expect(validateBackupData('invalid string').valid).toBe(false);
    expect(validateBackupData([1, 2, 3]).valid).toBe(false);
  });

  it('rejects backup with wrong app identifier', () => {
    const raw = {
      app: 'other-app',
      version: 1,
      exportedAt: '2026-03-30T12:00:00.000Z',
      parcels: [],
    };
    const res = validateBackupData(raw);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Identificador de aplicación'))).toBe(true);
  });

  it('rejects backup with invalid version or invalid exportedAt timestamp', () => {
    const res1 = validateBackupData({
      app: BACKUP_APP_IDENTIFIER,
      version: 0,
      exportedAt: '2026-03-30T12:00:00.000Z',
      parcels: [],
    });
    expect(res1.valid).toBe(false);

    const res2 = validateBackupData({
      app: BACKUP_APP_IDENTIFIER,
      version: 1,
      exportedAt: 'not-a-valid-date',
      parcels: [],
    });
    expect(res2.valid).toBe(false);
  });

  it('rejects backup when parcels is not an array', () => {
    const res = validateBackupData({
      app: BACKUP_APP_IDENTIFIER,
      version: 1,
      exportedAt: '2026-03-30T12:00:00.000Z',
      parcels: 'not-an-array',
    });
    expect(res.valid).toBe(false);
  });

  it('rejects parcels with missing tracking number or carrier slug', () => {
    const res = validateBackupData({
      app: BACKUP_APP_IDENTIFIER,
      version: 1,
      exportedAt: '2026-03-30T12:00:00.000Z',
      parcels: [
        {
          trackingNumber: '',
          carrier: { slug: 'correos-spain', name: 'Correos' },
          status: 'in_transit',
        },
      ],
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('número de seguimiento ausente'))).toBe(true);

    const res2 = validateBackupData({
      app: BACKUP_APP_IDENTIFIER,
      version: 1,
      exportedAt: '2026-03-30T12:00:00.000Z',
      parcels: [
        {
          trackingNumber: '12345',
          carrier: null,
          status: 'in_transit',
        },
      ],
    });
    expect(res2.valid).toBe(false);
  });

  it('rejects invalid tracking event dates in parcel history', () => {
    const res = validateBackupData({
      app: BACKUP_APP_IDENTIFIER,
      version: 1,
      exportedAt: '2026-03-30T12:00:00.000Z',
      parcels: [
        {
          trackingNumber: 'PQ481920391ES',
          carrier: { slug: 'correos-spain', name: 'Correos España' },
          status: 'in_transit',
          events: [
            {
              date: 'invalid-date',
              status: 'in_transit',
              stage: 'transit',
              description: 'Hito',
            },
          ],
        },
      ],
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('fecha inválida'))).toBe(true);
  });

  it('accepts a fully compliant versioned backup payload', () => {
    const validPayload: BackupData = {
      version: BACKUP_CURRENT_VERSION,
      app: BACKUP_APP_IDENTIFIER,
      exportedAt: '2026-03-30T12:00:00.000Z',
      parcels: [createMockParcel()],
    };
    const res = validateBackupData(validPayload);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.data?.parcels.length).toBe(1);
  });
});

describe('Intelligent Merge & Deduplication (mergeParcels)', () => {
  it('adds brand new parcels without existing duplicates', () => {
    const existing: Parcel[] = [];
    const incoming: Parcel[] = [
      createMockParcel({ id: 'p1', trackingNumber: 'PQ111111111ES' }),
      createMockParcel({ id: 'p2', trackingNumber: 'PQ222222222ES' }),
    ];

    const result = mergeParcels(existing, incoming);
    expect(result.merged.length).toBe(2);
    expect(result.importedCount).toBe(2);
    expect(result.updatedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
  });

  it('deduplicates by trackingNumber regardless of spacing or case', () => {
    const existing: Parcel[] = [
      createMockParcel({ id: 'p1', trackingNumber: 'PQ481920391ES' }),
    ];
    const incoming: Parcel[] = [
      createMockParcel({
        id: 'p_other',
        trackingNumber: '  pq481920391es  ',
        status: 'delivered',
        statusText: 'Entregado en buzón',
        progress: 100,
        updatedAt: '2026-03-31T18:00:00.000Z',
      }),
    ];

    const result = mergeParcels(existing, incoming);
    expect(result.merged.length).toBe(1);
    expect(result.importedCount).toBe(0);
    expect(result.updatedCount).toBe(1);
    expect(result.merged[0].status).toBe('delivered');
  });

  it('preserves user customAlias when incoming parcel has none or different alias', () => {
    const existing: Parcel[] = [
      createMockParcel({
        trackingNumber: 'PQ481920391ES',
        customAlias: 'Mi Alias Guardado',
      }),
    ];
    const incoming: Parcel[] = [
      createMockParcel({
        trackingNumber: 'PQ481920391ES',
        customAlias: 'Otro Nombre',
        updatedAt: '2026-03-31T20:00:00.000Z',
      }),
    ];

    const result = mergeParcels(existing, incoming, { preserveCustomAlias: true });
    expect(result.merged[0].customAlias).toBe('Mi Alias Guardado');
  });

  it('adopts incoming customAlias when existing parcel had no customAlias', () => {
    const existing: Parcel[] = [
      createMockParcel({
        trackingNumber: 'PQ481920391ES',
        customAlias: undefined,
      }),
    ];
    const incoming: Parcel[] = [
      createMockParcel({
        trackingNumber: 'PQ481920391ES',
        customAlias: 'Zapatillas Running',
      }),
    ];

    const result = mergeParcels(existing, incoming);
    expect(result.merged[0].customAlias).toBe('Zapatillas Running');
    expect(result.updatedCount).toBe(1);
  });

  it('updates milestone events and status when incoming has newer tracking events', () => {
    const existing: Parcel[] = [
      createMockParcel({
        trackingNumber: 'PQ481920391ES',
        status: 'in_transit',
        events: [
          {
            id: 'ev_1',
            date: '2026-03-28T09:00:00.000Z',
            status: 'info_received',
            stage: 'created',
            description: 'Envío registrado',
            carrierSlug: 'correos-spain',
            carrierName: 'Correos',
          },
        ],
      }),
    ];

    const newerEvent = {
      id: 'ev_3',
      date: '2026-03-31T12:00:00.000Z',
      status: 'delivered' as const,
      stage: 'delivery' as const,
      description: 'Entregado al destinatario',
      carrierSlug: 'correos-spain',
      carrierName: 'Correos',
    };

    const incoming: Parcel[] = [
      createMockParcel({
        trackingNumber: 'PQ481920391ES',
        status: 'delivered',
        statusText: 'Entregado',
        progress: 100,
        events: [...existing[0].events, newerEvent],
        updatedAt: '2026-03-31T12:05:00.000Z',
      }),
    ];

    const result = mergeParcels(existing, incoming);
    expect(result.updatedCount).toBe(1);
    expect(result.merged[0].status).toBe('delivered');
    expect(result.merged[0].events.length).toBe(2);
  });

  it('skips parcel if incoming has older or identical data with no new alias', () => {
    const existing: Parcel[] = [createMockParcel()];
    const incoming: Parcel[] = [createMockParcel({ customAlias: 'Teclado Mecánico' })];

    const result = mergeParcels(existing, incoming);
    expect(result.skippedCount).toBe(1);
    expect(result.updatedCount).toBe(0);
    expect(result.importedCount).toBe(0);
  });
});

describe('BackupService Full Flow', () => {
  beforeEach(() => {
    inMemoryParcels = [];
    mockFiles = {};
    (globalThis as any).__backupMockFiles = mockFiles;
    sharedFiles = [];
  });

  it('creates versioned backup payload with current repository parcels', async () => {
    inMemoryParcels = [createMockParcel()];
    const payload = await BackupService.createBackupPayload();

    expect(payload.version).toBe(1);
    expect(payload.app).toBe('open-parcels');
    expect(payload.parcels.length).toBe(1);
    expect(payload.parcels[0].trackingNumber).toBe('PQ481920391ES');
    expect(isNaN(Date.parse(payload.exportedAt))).toBe(false);
  });

  it('exports backup to file and invokes sharing', async () => {
    inMemoryParcels = [createMockParcel()];
    const exportRes = await BackupService.exportBackup();

    expect(exportRes.success).toBe(true);
    expect(exportRes.parcelCount).toBe(1);
    expect(exportRes.fileName.startsWith('open-parcels-backup-')).toBe(true);
    expect(mockFiles[exportRes.fileUri]).toBeDefined();
    expect(sharedFiles.length).toBe(1);

    // Validate exported file content
    const parsed = JSON.parse(mockFiles[exportRes.fileUri]);
    expect(parsed.app).toBe('open-parcels');
    expect(parsed.version).toBe(1);
    expect(parsed.parcels.length).toBe(1);
  });

  it('handles malformed JSON string gracefully on import', async () => {
    const result = await BackupService.importBackupFromJsonString('{ invalid json string ...');
    expect(result.success).toBe(false);
    expect(result.error).toBe('El archivo seleccionado no tiene un formato JSON válido.');
  });

  it('handles schema validation errors gracefully on import', async () => {
    const invalidSchema = JSON.stringify({
      app: 'wrong-app',
      version: 1,
      parcels: [],
    });
    const result = await BackupService.importBackupFromJsonString(invalidSchema);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('successfully imports valid JSON string and saves merged parcels to repository', async () => {
    inMemoryParcels = [
      createMockParcel({
        trackingNumber: 'PQ481920391ES',
        customAlias: 'Mi Alias Local',
      }),
    ];

    const incomingPayload: BackupData = {
      version: 1,
      app: 'open-parcels',
      exportedAt: '2026-03-30T12:00:00.000Z',
      parcels: [
        createMockParcel({
          trackingNumber: 'PQ481920391ES',
          customAlias: 'Sobrescritura No Deseada',
          status: 'out_for_delivery',
          statusText: 'En reparto',
          progress: 85,
          updatedAt: '2026-03-31T08:00:00.000Z',
        }),
        createMockParcel({
          id: 'p_new',
          trackingNumber: '00340434567890123456',
          customAlias: 'Pedido Amazon',
          carrier: {
            slug: 'gls-spain',
            name: 'GLS Spain',
            country: 'ES',
          },
        }),
      ],
    };

    const res = await BackupService.importBackupFromJsonString(JSON.stringify(incomingPayload));
    expect(res.success).toBe(true);
    expect(res.totalInFile).toBe(2);
    expect(res.importedCount).toBe(1);
    expect(res.updatedCount).toBe(1);

    // Verify in-memory repository parcels state
    expect(inMemoryParcels.length).toBe(2);
    const existingMerged = inMemoryParcels.find((p) => p.trackingNumber === 'PQ481920391ES');
    expect(existingMerged?.customAlias).toBe('Mi Alias Local'); // Preserved!
    expect(existingMerged?.status).toBe('out_for_delivery'); // Updated!

    const newParcel = inMemoryParcels.find((p) => p.trackingNumber === '00340434567890123456');
    expect(newParcel).toBeDefined();
    expect(newParcel?.customAlias).toBe('Pedido Amazon');
  });
});
