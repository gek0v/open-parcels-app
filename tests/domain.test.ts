import { describe, expect, it } from 'bun:test';
import { verifyUpuS10, verifyUps1Z, verifyIataAwb } from '../src/domain/validators/checksums';
import { detectCandidateCarriers } from '../src/domain/validators/detection';
import { LocalTrackingEngine } from '../src/infrastructure/engine/LocalTrackingEngine';

describe('Open Parcels Checksums & Validation', () => {
  it('correctly validates UPU S10 Modulo 11', () => {
    // RR123456785ES:
    // digits 12345678, weights [8,6,4,2,3,5,9,7]
    // sum = 1*8 + 2*6 + 3*4 + 4*2 + 5*3 + 6*5 + 7*9 + 8*7 = 8 + 12 + 12 + 8 + 15 + 30 + 63 + 56 = 204
    // 204 % 11 = 6 -> 11 - 6 = 5. Check digit is 5.
    expect(verifyUpuS10('RR123456785ES')).toBe(true);
    expect(verifyUpuS10('RR123456789ES')).toBe(false);
  });

  it('correctly validates UPS 1Z Modulo 10', () => {
    // Standard UPS 1Z format length 18 (1Z12345E0205271686)
    expect(verifyUps1Z('1Z12345E0205271686')).toBe(true);
    expect(verifyUps1Z('1Z12345E0205271689')).toBe(false);
  });

  it('correctly validates IATA AWB Modulo 7', () => {
    // 020-12345675 -> prefix 020, first 7 digits 1234567, 1234567 % 7 = 5 -> last digit 5
    expect(verifyIataAwb('02012345675')).toBe(true);
    expect(verifyIataAwb('02012345671')).toBe(false);
  });
});

describe('Carrier Auto-Detection Engine', () => {
  it('detects Cainiao for LP numbers', () => {
    const candidates = detectCandidateCarriers('LP00561234567890');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].carrier.slug).toBe('cainiao');
    expect(candidates[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('detects InPost / Mondial Relay for 8-digit or 24-digit codes', () => {
    const candidates = detectCandidateCarriers('75616714');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].carrier.slug).toBe('inpost');
    expect(candidates[0].carrier.requiresPostalCode).toBe(true);
  });

  it('detects UPS for 1Z codes', () => {
    const candidates = detectCandidateCarriers('1Z12345E0205271688');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].carrier.slug).toBe('ups');
  });

  it('detects Correos España for UPU S10 ending in ES', () => {
    const candidates = detectCandidateCarriers('RR123456785ES');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].carrier.slug).toBe('correos-es');
  });

  it('boosts carrier confidence when destination country matches', () => {
    // Digits that could match multiple carriers
    const baseCandidates = detectCandidateCarriers('6912345678901234');
    const boostedCandidates = detectCandidateCarriers('6912345678901234', 'ES');
    expect(boostedCandidates[0].carrier.slug).toBe('correos-express');
    expect(boostedCandidates[0].confidence).toBeGreaterThanOrEqual(baseCandidates[0].confidence);
  });
});

describe('LocalTrackingEngine (Local-First)', () => {
  const engine = new LocalTrackingEngine();

  it('enforces mandatory postal code for InPost', async () => {
    try {
      await engine.track({
        trackingNumber: '75616714',
        carrierHint: 'inpost',
      });
      expect(true).toBe(false); // should have thrown
    } catch (err: any) {
      expect(err.code).toBe('MISSING_POSTAL_CODE');
    }
  });

  it('tracks InPost successfully when postal code is provided', async () => {
    const parcel = await engine.track({
      trackingNumber: '75616714',
      carrierHint: 'inpost',
      postalCode: '47140',
    });
    expect(parcel.carrier.slug).toBe('inpost');
    expect(parcel.status).toBe('info_received');
    expect(parcel.postalCode).toBe('47140');
  });

  it('performs multi-carrier chaining for Cainiao shipments', async () => {
    const parcel = await engine.track({
      trackingNumber: 'LP00561234567890',
    });
    expect(parcel.carrier.slug).toBe('cainiao');
    expect(parcel.lastMileCarrier).toBeDefined();
    expect(parcel.lastMileCarrier?.slug).toBe('correos-express');
    expect(parcel.events.length).toBeGreaterThan(3);
  });
});
