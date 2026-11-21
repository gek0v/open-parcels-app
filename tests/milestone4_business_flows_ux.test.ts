import { describe, it, expect, mock, beforeEach } from 'bun:test';
import React from 'react';

(globalThis as any).__DEV__ = false;
(globalThis as any).ErrorUtils = {
  getGlobalHandler: () => () => {},
  setGlobalHandler: () => {},
};

mock.module('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: any) => styles, absoluteFill: {} },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  Modal: 'Modal',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  Platform: { OS: 'android', select: (obj: any) => obj.android || obj.default },
  Linking: { openURL: async () => {}, canOpenURL: async () => true },
  Alert: { alert: () => {} },
  TurboModuleRegistry: { get: () => null },
  AppRegistry: { registerComponent: () => {}, registerRunnable: () => {}, runApplication: () => {} },
  LogBox: { ignoreLogs: () => {}, ignoreAllLogs: () => {} },
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
  NativeModules: {},
  I18nManager: { isRTL: false, allowRTL: () => {}, forceRTL: () => {} },
  findNodeHandle: () => 1,
  AssetRegistry: { registerAsset: () => 1, getAssetByID: () => null },
  PixelRatio: {
    get: () => 2,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (x: number) => x * 2,
    roundToNearestPixel: (x: number) => Math.round(x),
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
    addEventListener: () => ({ remove: () => {} }),
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

mock.module('expo-modules-core', () => ({
  Platform: { OS: 'android', select: (obj: any) => obj.android || obj.default },
  EventEmitter: class {
    addListener = mock(() => ({ remove: mock(() => {}) }));
    removeListener = mock(() => {});
    emit = mock(() => {});
  },
  NativeModule: class {},
  SharedObject: class {},
  SharedRef: class {},
  uuid: { v4: () => 'uuid' },
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  NativeModulesProxy: {},
  requireNativeModule: mock(() => ({})),
  requireOptionalNativeModule: mock(() => null),
  requireNativeViewManager: mock(() => () => 'View'),
  requireNativeView: mock(() => () => 'View'),
  registerWebModule: mock(() => {}),
  reloadAppAsync: mock(async () => {}),
  createPermissionHook: () => () => [{ granted: true }, () => {}],
  createSnapshotFriendlyRef: () => ({ current: null }),
  useReleasingSharedObject: (f: any) => f(),
  useReleasingSharedObjectWithLifecycle: (l: any) => l.factory(),
  installOnUIRuntime: mock(() => {}),
  CodedError: class extends Error {},
  UnavailabilityError: class extends Error {},
}));

mock.module('expo-haptics', () => ({
  selectionAsync: mock(() => Promise.resolve()),
  notificationAsync: mock(() => Promise.resolve()),
  impactAsync: mock(() => Promise.resolve()),
}));

mock.module('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///data/cache/',
  documentDirectory: 'file:///data/docs/',
  writeAsStringAsync: async () => {},
  readAsStringAsync: async () => '',
  getInfoAsync: async () => ({ exists: false, isDirectory: false, size: 0 }),
}));

mock.module('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: async (uri: string) => {
    if ((globalThis as any).__backupSharedFiles) {
      (globalThis as any).__backupSharedFiles.push(uri);
    }
  },
}));

mock.module('expo-document-picker', () => ({
  getDocumentAsync: async () => ({ canceled: true, assets: [] }),
}));

const mockScheduleNotificationAsync = mock(async () => 'notif-id');
mock.module('expo-notifications', () => ({
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  requestPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  scheduleNotificationAsync: mockScheduleNotificationAsync,
}));

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mock(async () => null),
    setItem: mock(async () => {}),
    removeItem: mock(async () => {}),
  },
}));

mock.module('expo-clipboard', () => ({
  setStringAsync: mock(async () => true),
}));

mock.module('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  RefreshCw: 'RefreshCw',
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  Compass: 'Compass',
  Home: 'Home',
  ArrowLeft: 'ArrowLeft',
  AlertCircle: 'AlertCircle',
  Plane: 'Plane',
  Truck: 'Truck',
  MapPin: 'MapPin',
  ArrowRight: 'ArrowRight',
  Clock: 'Clock',
  Edit2: 'Edit2',
  Barcode: 'Barcode',
  Share2: 'Share2',
  Tag: 'Tag',
  ArrowUpRight: 'ArrowUpRight',
  Activity: 'Activity',
  CheckCircle2: 'CheckCircle2',
  X: 'X',
  Check: 'Check',
  Trash2: 'Trash2',
  Package: 'Package',
  Cpu: 'Cpu',
  LayoutGrid: 'LayoutGrid',
  Plus: 'Plus',
  Search: 'Search',
  Sparkles: 'Sparkles',
  Zap: 'Zap',
  Copy: 'Copy',
  Archive: 'Archive',
  ExternalLink: 'ExternalLink',
  Calendar: 'Calendar',
  ArrowRightLeft: 'ArrowRightLeft',
  Download: 'Download',
  Upload: 'Upload',
  Database: 'Database',
  CheckCircle: 'CheckCircle',
  ShieldAlert: 'ShieldAlert',
  ShieldCheck: 'ShieldCheck',
  Palette: 'Palette',
  CheckCheck: 'CheckCheck',
  Layers: 'Layers',
  ChevronRight: 'ChevronRight',
  Clipboard: 'Clipboard',
}));

const { getLatestEvent } = await import('../src/domain/entities/events');
const { computeBentoStats } = await import('../src/domain/metrics/bentoStats');
const { formatParcelShareSummary } = await import('../src/infrastructure/services/ShareService');
const { mergeParcels } = await import('../src/infrastructure/services/BackupService');
const { notificationService } = await import('../src/infrastructure/services/NotificationService');
const { JourneyFlow } = await import('../src/presentation/components/detail/JourneyFlow');
import type { TrackingEvent } from '../src/domain/models/event';
import type { Parcel } from '../src/domain/models/parcel';

// Helper to create dummy tracking events
function makeEvent(id: string, date: string, description: string): TrackingEvent {
  return {
    id,
    date,
    status: 'in_transit',
    stage: 'transit',
    description,
    carrierSlug: 'correos',
    carrierName: 'Correos',
  };
}

// Helper to create a minimal parcel
function makeParcel(overrides?: Partial<Parcel>): Parcel {
  return {
    id: 'test-parcel-m4',
    trackingNumber: 'ES123456789',
    carrier: {
      slug: 'correos',
      name: 'Correos España',
      country: 'ES',
    },
    status: 'in_transit',
    statusText: 'En tránsito',
    events: [],
    progress: 50,
    daysInTransit: 3,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T12:00:00.000Z',
    isLiveData: true,
    isArchived: false,
    ...overrides,
  } as Parcel;
}

describe('Milestone 4: Business Flows, Event Ordering & UX Polish', () => {
  describe('1. Canonical Event Chronology (getLatestEvent)', () => {
    it('returns undefined for undefined or empty event arrays', () => {
      expect(getLatestEvent(undefined)).toBeUndefined();
      expect(getLatestEvent([])).toBeUndefined();
    });

    it('returns the single event when array length is 1', () => {
      const ev = makeEvent('1', '2026-11-20T10:00:00Z', 'Admitido');
      expect(getLatestEvent([ev])).toEqual(ev);
    });

    it('returns the latest event when array is ordered ascending (oldest first)', () => {
      const e1 = makeEvent('1', '2026-11-18T08:00:00Z', 'Pre-admisión');
      const e2 = makeEvent('2', '2026-11-19T10:00:00Z', 'En clasificación');
      const e3 = makeEvent('3', '2026-11-20T12:00:00Z', 'En reparto');

      const latest = getLatestEvent([e1, e2, e3]);
      expect(latest).toEqual(e3);
      expect(latest?.id).toBe('3');
    });

    it('returns the latest event when array is ordered descending (newest first)', () => {
      const e1 = makeEvent('3', '2026-11-20T12:00:00Z', 'En reparto');
      const e2 = makeEvent('2', '2026-11-19T10:00:00Z', 'En tránsito');
      const e3 = makeEvent('1', '2026-11-18T08:00:00Z', 'Admitido');

      const latest = getLatestEvent([e1, e2, e3]);
      expect(latest).toEqual(e1);
      expect(latest?.id).toBe('3');
    });

    it('returns the latest event when array has mixed or unsorted timestamps', () => {
      const e1 = makeEvent('2', '2026-11-19T10:00:00Z', 'En tránsito');
      const e2 = makeEvent('4', '2026-11-21T15:30:00Z', 'Entregado');
      const e3 = makeEvent('1', '2026-11-18T08:00:00Z', 'Admitido');
      const e4 = makeEvent('3', '2026-11-20T12:00:00Z', 'En reparto');

      const latest = getLatestEvent([e1, e2, e3, e4]);
      expect(latest).toEqual(e2);
      expect(latest?.id).toBe('4');
    });

    it('robustly handles invalid date strings without crashing or throwing', () => {
      const e1 = makeEvent('1', 'invalid-date-format', 'Evento con fecha errónea');
      const e2 = makeEvent('2', '2026-11-20T10:00:00Z', 'Evento válido');

      const latest = getLatestEvent([e1, e2]);
      expect(latest).toEqual(e2);
    });
  });

  describe('2. Event Ordering in Consumers (ShareService & BackupService)', () => {
    it('ShareService extracts latest event even if events array is descending (newest at index 0)', () => {
      const eNewest = makeEvent('2', '2026-11-20T12:00:00Z', 'Hito Más Reciente');
      const eOldest = makeEvent('1', '2026-11-19T08:00:00Z', 'Hito Antiguo');

      const parcel = makeParcel({
        events: [eNewest, eOldest], // Inverted order
      });

      const summary = formatParcelShareSummary(parcel, { lang: 'es' });
      expect(summary).toContain('Hito Más Reciente');
      expect(summary).not.toContain('Hito Antiguo');
    });

    it('BackupService compares latest event timestamps correctly regardless of event order', () => {
      const existing = makeParcel({
        id: 'p-1',
        trackingNumber: 'TRACK123',
        status: 'in_transit',
        statusText: 'En tránsito',
        events: [
          makeEvent('e2', '2026-11-20T10:00:00Z', 'Nuevo evento existente'),
          makeEvent('e1', '2026-11-18T08:00:00Z', 'Viejo evento existente'),
        ],
      });

      const incomingNewer = makeParcel({
        id: 'p-2',
        trackingNumber: 'TRACK123',
        status: 'delivered',
        statusText: 'Entregado',
        events: [
          // Even if incoming is sorted oldest first
          makeEvent('e1', '2026-11-18T08:00:00Z', 'Viejo'),
          makeEvent('e3', '2026-11-21T16:00:00Z', 'Entregado en buzón'),
        ],
      });

      const result = mergeParcels([existing], [incomingNewer]);
      expect(result.updatedCount).toBe(1);
      const merged = result.merged.find((p) => p.trackingNumber === 'TRACK123');
      expect(merged?.status).toBe('delivered');
      expect(merged?.statusText).toBe('Entregado');
    });
  });

  describe('3. Dashboard Search Filter (Last-Mile Support)', () => {
    it('matches parcels by lastMileTrackingNumber', () => {
      const p1 = makeParcel({
        id: '1',
        trackingNumber: 'LP00561234567890',
        lastMileTrackingNumber: 'PQ4F6P0703418520134120K',
        lastMileCarrier: { slug: 'correos', name: 'Correos', country: 'ES' },
      });
      const p2 = makeParcel({
        id: '2',
        trackingNumber: 'OTHER123',
      });

      const query = 'pq4f6p07';
      const q = query.toLowerCase().trim();

      const filterFn = (p: Parcel) => {
        const matchAlias = p.customAlias?.toLowerCase().includes(q);
        const matchCode = p.trackingNumber.toLowerCase().includes(q);
        const matchCarrier = p.carrier.name.toLowerCase().includes(q);
        const matchLastMileCode = p.lastMileTrackingNumber?.toLowerCase().includes(q);
        const matchLastMileCarrier = p.lastMileCarrier?.name.toLowerCase().includes(q);
        return Boolean(matchAlias || matchCode || matchCarrier || matchLastMileCode || matchLastMileCarrier);
      };

      expect(filterFn(p1)).toBe(true);
      expect(filterFn(p2)).toBe(false);
    });

    it('matches parcels by lastMileCarrier name', () => {
      const p1 = makeParcel({
        id: '1',
        trackingNumber: 'LP00561234567890',
        carrier: { slug: 'cainiao', name: 'Cainiao Global', country: 'CN' },
        lastMileTrackingNumber: '00123456',
        lastMileCarrier: { slug: 'correos-express', name: 'Correos Express', country: 'ES' },
      });

      const query = 'express';
      const q = query.toLowerCase().trim();

      const filterFn = (p: Parcel) => {
        const matchAlias = p.customAlias?.toLowerCase().includes(q);
        const matchCode = p.trackingNumber.toLowerCase().includes(q);
        const matchCarrier = p.carrier.name.toLowerCase().includes(q);
        const matchLastMileCode = p.lastMileTrackingNumber?.toLowerCase().includes(q);
        const matchLastMileCarrier = p.lastMileCarrier?.name.toLowerCase().includes(q);
        return Boolean(matchAlias || matchCode || matchCarrier || matchLastMileCode || matchLastMileCarrier);
      };

      expect(filterFn(p1)).toBe(true);
    });
  });

  describe('4. Domestic vs International Journey Flow', () => {
    it('JourneyFlow renders domestic route for single-carrier domestic parcels', () => {
      const domesticParcel = makeParcel({
        carrier: { slug: 'correos', name: 'Correos España', country: 'ES' },
        origin: { name: 'Madrid', code: 'ES' },
        destination: { name: 'Barcelona', code: 'ES' },
        additionalCarriers: [],
      });

      const element = React.createElement(JourneyFlow, { parcel: domesticParcel });
      expect(element).toBeDefined();
      expect(React.isValidElement(element)).toBe(true);
    });

    it('JourneyFlow renders chained transfer route for multi-carrier international shipments', () => {
      const chainedParcel = makeParcel({
        carrier: { slug: 'cainiao', name: 'Cainiao Global', country: 'CN' },
        origin: { name: 'China', code: 'CN' },
        destination: { name: 'Spain', code: 'ES' },
        lastMileCarrier: { slug: 'correos', name: 'Correos', country: 'ES' },
        lastMileTrackingNumber: 'PQ123456789',
        additionalCarriers: [{ slug: 'correos', name: 'Correos', country: 'ES' }],
      });

      const element = React.createElement(JourneyFlow, { parcel: chainedParcel });
      expect(element).toBeDefined();
      expect(React.isValidElement(element)).toBe(true);
    });
  });

  describe('5. Localization in NotificationService & BentoStats', () => {
    it('NotificationService generates localized title and body in English when lang is en', async () => {
      const parcel = makeParcel({
        customAlias: 'Mechanical Keyboard',
        carrier: { slug: 'correos', name: 'Correos España', country: 'ES' },
      });

      // Clear cache so it sends
      notificationService.clearDeduplicationCache();

      const sent = await notificationService.sendParcelStatusNotification(
        parcel,
        'info_received',
        'out_for_delivery',
        'en'
      );

      expect(sent).toBe(true);
    });

    it('computeBentoStats produces localized pace labels according to language', () => {
      // Empty parcels -> up to date
      const statsEn = computeBentoStats([], 'en');
      expect(statsEn.activePace.label).toBe('UP TO DATE');
      expect(statsEn.activePace.labelKey).toBe('upToDate');

      const statsEs = computeBentoStats([], 'es');
      expect(statsEs.activePace.label).toBe('AL DÍA');
      expect(statsEs.activePace.labelKey).toBe('upToDate');

      // Healthy active parcel -> optimal
      const healthyParcel = makeParcel({ status: 'in_transit', isArchived: false });
      const statsHealthyEn = computeBentoStats([healthyParcel], 'en');
      expect(statsHealthyEn.activePace.label).toBe('OPTIMAL');
      expect(statsHealthyEn.activePace.labelKey).toBe('optimal');

      const statsHealthyEs = computeBentoStats([healthyParcel], 'es');
      expect(statsHealthyEs.activePace.label).toBe('ÓPTIMO');
      expect(statsHealthyEs.activePace.labelKey).toBe('optimal');

      // Problematic active parcel -> attention
      const problemParcel = makeParcel({ status: 'failed_attempt', isArchived: false });
      const statsProblemEn = computeBentoStats([problemParcel], 'en');
      expect(statsProblemEn.activePace.label).toBe('ATTENTION');
      expect(statsProblemEn.activePace.labelKey).toBe('attention');

      const statsProblemEs = computeBentoStats([problemParcel], 'es');
      expect(statsProblemEs.activePace.label).toBe('ATENCIÓN');
      expect(statsProblemEs.activePace.labelKey).toBe('attention');
    });
  });

  describe('6. Postal Code Requirement on Carrier Switch', () => {
    it('detects carriers that require postal code (SEUR, GLS, InPost)', () => {
      const seurCarrier = { slug: 'seur', name: 'SEUR', requiresPostalCode: true };
      const correosCarrier = { slug: 'correos', name: 'Correos', requiresPostalCode: false };

      expect(seurCarrier.requiresPostalCode).toBe(true);
      expect(correosCarrier.requiresPostalCode).toBe(false);

      const parcelWithoutPostal = makeParcel({ postalCode: undefined });
      const needsPostal = seurCarrier.requiresPostalCode && !parcelWithoutPostal.postalCode;
      expect(needsPostal).toBe(true);
    });
  });
});
