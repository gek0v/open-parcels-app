import { describe, expect, it } from 'bun:test';
import {
  cleanTrackingNumber,
  verifyUpuS10,
  verifyUps1Z,
  verifyIataAwb,
  verifyContainerIso6346,
} from '../src/domain/validators/checksums';
import {
  detectCandidateCarriers,
  findCarrierBySlug,
} from '../src/domain/validators/detection';
import { LocalTrackingEngine } from '../src/infrastructure/engine/LocalTrackingEngine';
import { isPostalCodeRequiredError } from '../src/infrastructure/engine/errors';

describe('Open Parcels Checksums & Validation', () => {
  it('correctly cleans tracking numbers and preserves AWB hyphen', () => {
    expect(cleanTrackingNumber(' 157-52471764 ')).toBe('157-52471764');
    expect(cleanTrackingNumber('1z 12345e-0205271686')).toBe('1Z12345E0205271686');
  });

  it('correctly validates UPU S10 Modulo 11', () => {
    expect(verifyUpuS10('RR123456785ES')).toBe(true);
    expect(verifyUpuS10('RR123456789ES')).toBe(false);
  });

  it('correctly validates UPS 1Z Modulo 10', () => {
    expect(verifyUps1Z('1Z12345E0205271686')).toBe(true);
    expect(verifyUps1Z('1Z12345E0205271689')).toBe(false);
  });

  it('correctly validates IATA AWB Modulo 7 (hyphenated and clean)', () => {
    expect(verifyIataAwb('020-12345675')).toBe(true);
    expect(verifyIataAwb('02012345675')).toBe(true);
    expect(verifyIataAwb('02012345671')).toBe(false);
  });

  it('correctly validates ISO 6346 Shipping Containers', () => {
    expect(verifyContainerIso6346('MSCU1234567')).toBe(true);
    expect(verifyContainerIso6346('MRKU4656243')).toBe(true);
    expect(verifyContainerIso6346('ABCD1234567')).toBe(false);
  });
});

describe('Carrier Auto-Detection Engine', () => {
  it('detects Cainiao for LP numbers', () => {
    const candidates = detectCandidateCarriers('LP00561234567890');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].carrier.slug).toBe('cainiao');
    expect(candidates[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('detects InPost / Mondial Relay for 7-8 digit or 24-digit codes', () => {
    const candidates7 = detectCandidateCarriers('7561674');
    expect(candidates7.length).toBeGreaterThan(0);
    expect(candidates7[0].carrier.slug).toBe('inpost');
    expect(candidates7[0].carrier.requiresPostalCode).toBe(true);

    const candidates24 = detectCandidateCarriers('612345678901234567890123', 'ES');
    expect(candidates24.length).toBeGreaterThan(0);
    expect(candidates24[0].carrier.slug).toBe('inpost-es');
    expect(candidates24[0].carrier.requiresPostalCode).toBe(true);
  });

  it('detects UPS for 1Z codes', () => {
    const candidates = detectCandidateCarriers('1Z12345E0205271686');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].carrier.slug).toBe('ups');
  });

  it('detects Correos España for UPU S10 ending in ES and domestic codes', () => {
    const candidates = detectCandidateCarriers('RR123456785ES');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].carrier.slug).toBe('correos-spain');

    const domestic = detectCandidateCarriers('PQ4F6P07000000000000000', 'ES');
    expect(domestic[0].carrier.slug).toBe('correos-spain');
  });

  it('detects SEUR and GLS Spain with requiresPostalCode enabled', () => {
    const seur = detectCandidateCarriers('36150127630406', 'ES');
    expect(seur[0].carrier.slug).toBe('seur');
    expect(seur[0].carrier.requiresPostalCode).toBe(true);

    const gls = detectCandidateCarriers('ASM123456789', 'ES');
    expect(gls[0].carrier.slug).toBe('asm-gls-spain');
    expect(gls[0].carrier.requiresPostalCode).toBe(true);
  });

  it('resolves legacy aliases cleanly', () => {
    expect(findCarrierBySlug('correos-es').slug).toBe('correos-spain');
    expect(findCarrierBySlug('correos-express').slug).toBe('correosexpress');
    expect(findCarrierBySlug('gls-spain').slug).toBe('asm-gls-spain');
    expect(findCarrierBySlug('gls-spain').requiresPostalCode).toBe(true);
  });

  it('boosts carrier confidence when destination country matches', () => {
    const baseCandidates = detectCandidateCarriers('6912345678901234');
    const boostedCandidates = detectCandidateCarriers('6912345678901234', 'ES');
    expect(boostedCandidates[0].carrier.slug).toBe('correosexpress');
    expect(boostedCandidates[0].confidence).toBeGreaterThanOrEqual(baseCandidates[0].confidence);

    const c323NoHint = detectCandidateCarriers('32300035210642701471403');
    expect(c323NoHint[0].carrier.slug).toBe('cainiao');

    const c323WithEs = detectCandidateCarriers('32300035210642701471403', 'ES');
    expect(c323WithEs[0].carrier.slug).toBe('correosexpress');
  });
});

describe('LocalTrackingEngine (Local-First)', () => {
  const engine = new LocalTrackingEngine();

  it('enforces mandatory postal code for InPost, SEUR, and GLS Spain', async () => {
    for (const [number, hint] of [
      ['7561674', 'inpost'],
      ['36150127630406', 'seur'],
      ['ASM123456789', 'asm-gls-spain'],
    ] as const) {
      let caught: unknown;
      try {
        await engine.track({
          trackingNumber: number,
          carrierHint: hint,
        });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeDefined();
      expect((caught as any).code).toBe('POSTAL_CODE_REQUIRED');
      expect(isPostalCodeRequiredError(caught)).toBe(true);
    }
  });

  it('tracks InPost successfully when postal code is provided', async () => {
    const parcel = await engine.track({
      trackingNumber: '7561674',
      carrierHint: 'inpost',
      postalCode: '47140',
      allowSimulated: true,
    });
    expect(parcel.carrier.slug).toBe('inpost');
    expect(parcel.status).toBe('info_received');
    expect(parcel.postalCode).toBe('47140');
    expect(parcel.isLiveData).toBe(false);
  });

  it('tracks SEUR and GLS Spain when postal code is provided', async () => {
    const seurParcel = await engine.track({
      trackingNumber: '36150127630406',
      carrierHint: 'seur',
      postalCode: '28001',
    });
    expect(seurParcel.carrier.slug).toBe('seur');
    expect(seurParcel.status).toBe('out_for_delivery');
    expect(seurParcel.postalCode).toBe('28001');

    const glsParcel = await engine.track({
      trackingNumber: 'ASM123456789',
      carrierHint: 'asm-gls-spain',
      postalCode: '08001',
    });
    expect(glsParcel.carrier.slug).toBe('asm-gls-spain');
    expect(glsParcel.status).toBe('in_transit');
    expect(glsParcel.postalCode).toBe('08001');
  });

  it('rejects non-live catalog carriers when allowSimulated is explicitly false', async () => {
    let caught: unknown;
    try {
      await engine.track({
        trackingNumber: 'TIP123456789',
        carrierHint: 'tipsa',
        allowSimulated: false,
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    expect((caught as any).code).toBe('CARRIER_NOT_IMPLEMENTED');
  });

  it('performs multi-carrier chaining for Cainiao shipments', async () => {
    const parcel = await engine.track({
      trackingNumber: 'LP00561234567890',
    });
    expect(parcel.carrier.slug).toBe('cainiao');
    expect(parcel.lastMileCarrier).toBeDefined();
    expect(parcel.lastMileCarrier?.slug).toBe('correosexpress');
    expect(parcel.lastMileTrackingNumber).toBeDefined();
    expect(parcel.events.length).toBeGreaterThan(3);
  });
});