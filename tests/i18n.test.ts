import { describe, expect, it } from 'bun:test';
import { es } from '../src/infrastructure/i18n/locales/es';
import { en } from '../src/infrastructure/i18n/locales/en';
import { CanonicalStatus } from '../src/domain/models/status';

describe('i18n Localization Integrity', () => {
  const canonicalStatuses: CanonicalStatus[] = [
    'pending',
    'info_received',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed_attempt',
    'exception',
    'expired',
  ];

  it('provides translations for all 8 canonical statuses in ES and EN', () => {
    for (const status of canonicalStatuses) {
      expect(es.status[status]).toBeDefined();
      expect(es.status[status].length).toBeGreaterThan(0);

      expect(en.status[status]).toBeDefined();
      expect(en.status[status].length).toBeGreaterThan(0);
    }
  });

  it('matches top-level keys between ES and EN catalogs', () => {
    const esKeys = Object.keys(es).sort();
    const enKeys = Object.keys(en).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it('matches sub-keys for critical sections', () => {
    expect(Object.keys(es.stats).sort()).toEqual(Object.keys(en.stats).sort());
    expect(Object.keys(es.filter).sort()).toEqual(Object.keys(en.filter).sort());
    expect(Object.keys(es.empty).sort()).toEqual(Object.keys(en.empty).sort());
    expect(Object.keys(es.detail).sort()).toEqual(Object.keys(en.detail).sort());
    expect(Object.keys(es.newParcelModal).sort()).toEqual(Object.keys(en.newParcelModal).sort());
    expect(Object.keys(es.updateModal).sort()).toEqual(Object.keys(en.updateModal).sort());
  });
});
