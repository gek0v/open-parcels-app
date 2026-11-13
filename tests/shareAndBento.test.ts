(globalThis as any).__DEV__ = false;
import { describe, expect, it, mock } from 'bun:test';
import type { Parcel } from '../src/domain/models/parcel';

// Mock expo-clipboard and react-native Share BEFORE importing ShareService
let clipboardContent = '';
let shareCalls: any[] = [];

mock.module('expo-clipboard', () => ({
  setStringAsync: async (text: string) => {
    clipboardContent = text;
    return true;
  },
  getStringAsync: async () => clipboardContent,
}));

(globalThis as any).__mockShareFn = async (content: any) => {
  shareCalls.push(content);
  return { action: 'sharedAction' };
};

mock.module('react-native', () => ({
  Share: {
    share: async (content: any) => {
      shareCalls.push(content);
      return { action: 'sharedAction' };
    },
  },
  Platform: {
    OS: 'android',
  },
}));

const {
  formatParcelShareSummary,
  formatShortDateTime,
  formatTransitTimeAgo,
  ShareService,
} = await import('../src/infrastructure/services/ShareService');
const { computeBentoStats } = await import('../src/domain/metrics/bentoStats');

const mockParcel: Parcel = {
  id: 'parcel_sample',
  trackingNumber: 'PQ4F6P078912345',
  customAlias: 'Teclado Mecánico Keychron',
  carrier: {
    slug: 'correos-spain',
    name: 'Correos España',
    website: 'https://correos.es',
    trackingUrl: 'https://www.correos.es/es/es/herramientas/localizador/envios?tracking-number=%s',
  },
  status: 'in_transit',
  statusText: 'En tránsito',
  progress: 55,
  daysInTransit: 3,
  events: [
    {
      id: 'ev_1',
      date: '2026-03-30T09:30:00.000Z',
      status: 'in_transit',
      stage: 'transit',
      description: 'En camino a centro de distribución',
      location: 'Madrid',
      carrierSlug: 'correos-spain',
      carrierName: 'Correos España',
    },
  ],
  createdAt: '2026-03-27T10:00:00.000Z',
  updatedAt: '2026-03-30T09:30:00.000Z',
  isArchived: false,
};

describe('Share Parcel Formatted Summary (ShareService)', () => {
  it('formats short date and time correctly', () => {
    const formatted = formatShortDateTime('2026-03-30T09:30:00.000Z');
    expect(formatted).toContain('30/03');
  });

  it('formats transit time ago in Spanish and English', () => {
    expect(formatTransitTimeAgo(0, 'es')).toBe('hoy');
    expect(formatTransitTimeAgo(0, 'en')).toBe('today');
    expect(formatTransitTimeAgo(1, 'es')).toBe('hace 1 día');
    expect(formatTransitTimeAgo(1, 'en')).toBe('1 day ago');
    expect(formatTransitTimeAgo(3, 'es')).toBe('hace 3 días');
    expect(formatTransitTimeAgo(3, 'en')).toBe('3 days ago');
  });

  it('generates structured and readable summary matching specification in Spanish', () => {
    const summary = formatParcelShareSummary(mockParcel, { lang: 'es' });

    expect(summary).toContain('📦 Teclado Mecánico Keychron');
    expect(summary).toContain('🚚 Transportista: Correos España');
    expect(summary).toContain('🔢 Seguimiento: PQ4F6P078912345');
    expect(summary).toContain('📍 Estado: En tránsito (hace 3 días)');
    expect(summary).toContain('🕒 Último evento: En camino a centro de distribución (Madrid) - ');
    expect(summary).toContain('🔗 Rastrear: https://www.correos.es/es/es/herramientas/localizador/envios?tracking-number=PQ4F6P078912345');
    expect(summary).toContain('— Compartido con Open Parcels');
  });

  it('generates structured summary in English when requested', () => {
    const summary = formatParcelShareSummary(mockParcel, { lang: 'en' });

    expect(summary).toContain('📦 Teclado Mecánico Keychron');
    expect(summary).toContain('🚚 Carrier: Correos España');
    expect(summary).toContain('🔢 Tracking: PQ4F6P078912345');
    expect(summary).toContain('📍 Status: En tránsito (3 days ago)');
    expect(summary).toContain('🕒 Latest event:');
    expect(summary).toContain('— Shared with Open Parcels');
  });

  it('handles chained multi-carrier international shipments in carrier line', () => {
    const chainedParcel: Parcel = {
      ...mockParcel,
      lastMileCarrier: {
        slug: 'correosexpress',
        name: 'Correos Express',
      },
    };

    const summary = formatParcelShareSummary(chainedParcel, { lang: 'es' });
    expect(summary).toContain('🚚 Transportista: Correos España ➔ Correos Express');
  });

  it('falls back to tracking number if customAlias is omitted', () => {
    const noAliasParcel: Parcel = {
      ...mockParcel,
      customAlias: undefined,
    };

    const summary = formatParcelShareSummary(noAliasParcel, { lang: 'es' });
    expect(summary).toContain('📦 PQ4F6P078912345');
  });

  it('copies summary to clipboard via ShareService.copyParcelSummary', async () => {
    clipboardContent = '';
    const ok = await ShareService.copyParcelSummary(mockParcel);
    expect(ok).toBe(true);
    expect(clipboardContent).toContain('📦 Teclado Mecánico Keychron');
    expect(clipboardContent).toContain('— Compartido con Open Parcels');
  });

  it('triggers native share via ShareService.shareParcel', async () => {
    shareCalls = [];
    const ok = await ShareService.shareParcel(mockParcel);
    expect(ok).toBe(true);
    expect(shareCalls.length).toBe(1);
    expect(shareCalls[0].message).toContain('📦 Teclado Mecánico Keychron');
  });
});

describe('Bento Stats Computation (computeBentoStats)', () => {
  it('handles empty parcel lists gracefully', () => {
    const stats = computeBentoStats([]);
    expect(stats.activeCount).toBe(0);
    expect(stats.outForDeliveryCount).toBe(0);
    expect(stats.deliveredCount).toBe(0);
    expect(stats.avgDeliveryDays).toBe(0);
    expect(stats.topCarrier).toBeUndefined();
    expect(stats.activePace.rate).toBe(100);
    expect(stats.activePace.label).toBe('AL DÍA');
  });

  it('calculates average delivery days for delivered parcels accurately', () => {
    const parcels: Parcel[] = [
      {
        ...mockParcel,
        id: 'p1',
        status: 'delivered',
        daysInTransit: 2,
        isArchived: false,
      },
      {
        ...mockParcel,
        id: 'p2',
        status: 'delivered',
        daysInTransit: 5,
        isArchived: false,
      },
      {
        ...mockParcel,
        id: 'p3',
        status: 'in_transit', // should be excluded from avg delivery days!
        daysInTransit: 10,
        isArchived: false,
      },
    ];

    const stats = computeBentoStats(parcels);
    expect(stats.deliveredCount).toBe(2);
    expect(stats.activeCount).toBe(1);
    // (2 + 5) / 2 = 3.5
    expect(stats.avgDeliveryDays).toBe(3.5);
  });

  it('identifies top carrier and its distribution percentage', () => {
    const parcels: Parcel[] = [
      {
        ...mockParcel,
        id: 'p1',
        carrier: { slug: 'correos-spain', name: 'Correos España' },
      },
      {
        ...mockParcel,
        id: 'p2',
        carrier: { slug: 'correos-spain', name: 'Correos España' },
      },
      {
        ...mockParcel,
        id: 'p3',
        carrier: { slug: 'inpost', name: 'InPost' },
      },
      {
        ...mockParcel,
        id: 'p4',
        carrier: { slug: 'gls-spain', name: 'GLS Spain' },
      },
    ];

    const stats = computeBentoStats(parcels);
    expect(stats.topCarrier).toBeDefined();
    expect(stats.topCarrier?.slug).toBe('correos-spain');
    expect(stats.topCarrier?.name).toBe('Correos España');
    expect(stats.topCarrier?.count).toBe(2);
    // 2 out of 4 = 50%
    expect(stats.topCarrier?.percentage).toBe(50);
  });

  it('computes active pace and alert indicator correctly', () => {
    const parcels: Parcel[] = [
      { ...mockParcel, id: 'p1', status: 'in_transit' },
      { ...mockParcel, id: 'p2', status: 'out_for_delivery' },
      { ...mockParcel, id: 'p3', status: 'exception' }, // 1 issue
    ];

    const stats = computeBentoStats(parcels);
    expect(stats.activeCount).toBe(3);
    expect(stats.outForDeliveryCount).toBe(1);
    // 2 out of 3 = 67%
    expect(stats.activePace.rate).toBe(67);
    expect(stats.activePace.hasAlerts).toBe(true);
    expect(stats.activePace.label).toBe('ATENCIÓN');

    // Test optimal pace (no exceptions)
    const healthyParcels: Parcel[] = [
      { ...mockParcel, id: 'p1', status: 'in_transit' },
      { ...mockParcel, id: 'p2', status: 'in_transit' },
    ];
    const healthyStats = computeBentoStats(healthyParcels);
    expect(healthyStats.activePace.rate).toBe(100);
    expect(healthyStats.activePace.hasAlerts).toBe(false);
    expect(healthyStats.activePace.label).toBe('ÓPTIMO');
  });

  it('excludes archived parcels from active metrics', () => {
    const parcels: Parcel[] = [
      { ...mockParcel, id: 'p1', status: 'in_transit', isArchived: true },
      { ...mockParcel, id: 'p2', status: 'in_transit', isArchived: false },
    ];

    const stats = computeBentoStats(parcels);
    expect(stats.activeCount).toBe(1);
  });
});
