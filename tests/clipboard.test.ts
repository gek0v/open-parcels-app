import { describe, expect, it, beforeEach } from 'bun:test';
import {
  validateTrackingNumber,
  detectCarrierCandidates,
  detectCandidateCarriers,
} from '../src/domain/validators/detection';
import { cleanTrackingNumber } from '../src/domain/validators/checksums';
import { Parcel } from '../src/domain/models/parcel';

describe('Clipboard & Tracking Number Validation Engine', () => {
  it('detects valid Correos España tracking numbers from clipboard', () => {
    const result = validateTrackingNumber('  RR123456785ES  ');
    expect(result.isValid).toBe(true);
    expect(result.cleanNumber).toBe('RR123456785ES');
    expect(result.bestCarrier?.carrier.slug).toBe('correos-spain');
    expect(result.bestCarrier?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('detects valid Cainiao global numbers from clipboard', () => {
    const result = validateTrackingNumber('LP00561234567890');
    expect(result.isValid).toBe(true);
    expect(result.cleanNumber).toBe('LP00561234567890');
    expect(result.bestCarrier?.carrier.slug).toBe('cainiao');
  });

  it('detects valid UPS 1Z numbers from clipboard', () => {
    const result = validateTrackingNumber('1Z12345E0205271686');
    expect(result.isValid).toBe(true);
    expect(result.cleanNumber).toBe('1Z12345E0205271686');
    expect(result.bestCarrier?.carrier.slug).toBe('ups');
  });

  it('detects valid InPost / Mondial Relay domestic numbers from clipboard', () => {
    const result = validateTrackingNumber('75616714');
    expect(result.isValid).toBe(true);
    expect(result.cleanNumber).toBe('75616714');
    expect(result.bestCarrier?.carrier.slug).toBe('inpost');
    expect(result.bestCarrier?.carrier.requiresPostalCode).toBe(true);
  });

  it('detects valid IATA Air Waybill numbers from clipboard', () => {
    const result = validateTrackingNumber('157-52471764');
    expect(result.isValid).toBe(true);
    expect(result.cleanNumber).toBe('157-52471764');
    expect(result.bestCarrier?.carrier.slug).toBe('air-cargo');
  });

  it('rejects invalid inputs such as URLs, emails, arbitrary text, and multiline snippets', () => {
    expect(validateTrackingNumber('').isValid).toBe(false);
    expect(validateTrackingNumber('   ').isValid).toBe(false);
    expect(validateTrackingNumber('https://www.correos.es/rastreo').isValid).toBe(false);
    expect(validateTrackingNumber('support@openparcels.org').isValid).toBe(false);
    expect(validateTrackingNumber('hello world this is a note').isValid).toBe(false);
    expect(validateTrackingNumber('Line 1\nLine 2').isValid).toBe(false);
    expect(validateTrackingNumber('123').isValid).toBe(false);
  });

  it('supports detectCarrierCandidates alias identically to detectCandidateCarriers', () => {
    const fromAlias = detectCarrierCandidates('LP00561234567890');
    const fromOriginal = detectCandidateCarriers('LP00561234567890');
    expect(fromAlias.length).toBe(fromOriginal.length);
    expect(fromAlias[0].carrier.slug).toBe(fromOriginal[0].carrier.slug);
  });
});

describe('Dashboard Sorting Logic', () => {
  const dummyParcels: Parcel[] = [
    {
      id: '1',
      trackingNumber: 'RR123456785ES',
      carrier: { slug: 'correos-spain', name: 'Correos España' },
      status: 'in_transit',
      statusText: 'En tránsito',
      progress: 50,
      daysInTransit: 3,
      events: [],
      isArchived: false,
      createdAt: '2026-11-10T10:00:00.000Z',
      updatedAt: '2026-11-12T10:00:00.000Z',
    },
    {
      id: '2',
      trackingNumber: 'LP00561234567890',
      carrier: { slug: 'cainiao', name: 'Cainiao Global' },
      status: 'out_for_delivery',
      statusText: 'En reparto',
      progress: 80,
      daysInTransit: 12,
      events: [],
      isArchived: false,
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-13T08:00:00.000Z',
    },
    {
      id: '3',
      trackingNumber: '1Z12345E0205271686',
      carrier: { slug: 'ups', name: 'UPS' },
      status: 'delivered',
      statusText: 'Entregado',
      progress: 100,
      daysInTransit: 5,
      events: [],
      isArchived: false,
      createdAt: '2026-11-05T10:00:00.000Z',
      updatedAt: '2026-11-09T10:00:00.000Z',
    },
  ];

  it('correctly sorts parcels by most recently updated', () => {
    const sorted = [...dummyParcels].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    expect(sorted[0].id).toBe('2'); // Nov 13
    expect(sorted[1].id).toBe('1'); // Nov 12
    expect(sorted[2].id).toBe('3'); // Nov 9
  });

  it('correctly sorts parcels by days in transit descending', () => {
    const sorted = [...dummyParcels].sort((a, b) => b.daysInTransit - a.daysInTransit);

    expect(sorted[0].daysInTransit).toBe(12); // Cainiao (12d)
    expect(sorted[1].daysInTransit).toBe(5);  // UPS (5d)
    expect(sorted[2].daysInTransit).toBe(3);  // Correos (3d)
  });

  it('correctly sorts parcels by carrier name alphabetically', () => {
    const sorted = [...dummyParcels].sort((a, b) =>
      a.carrier.name.localeCompare(b.carrier.name)
    );

    expect(sorted[0].carrier.name).toBe('Cainiao Global');
    expect(sorted[1].carrier.name).toBe('Correos España');
    expect(sorted[2].carrier.name).toBe('UPS');
  });

  it('detects already-saved parcels to avoid duplicate prompt', () => {
    const clipboardInput = '  rr 123456785 es  ';
    const clean = cleanTrackingNumber(clipboardInput);

    const alreadySaved = dummyParcels.some(
      (p) => cleanTrackingNumber(p.trackingNumber) === clean
    );
    expect(alreadySaved).toBe(true);

    const newCode = '75616714';
    const isNewSaved = dummyParcels.some(
      (p) => cleanTrackingNumber(p.trackingNumber) === cleanTrackingNumber(newCode)
    );
    expect(isNewSaved).toBe(false);
  });
});
