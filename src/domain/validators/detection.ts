import { Carrier, DetectedCarrier } from '../models/carrier';
import { verifyUpuS10, verifyUps1Z, verifyIataAwb } from './checksums';

export const CARRIERS_CATALOG: Carrier[] = [
  {
    slug: 'correos-es',
    name: 'Correos España',
    website: 'https://correos.es',
    region: 'es',
    color: '#FFCC00',
  },
  {
    slug: 'correos-express',
    name: 'Correos Express',
    website: 'https://correosexpress.com',
    region: 'es',
    color: '#002B49',
  },
  {
    slug: 'inpost',
    name: 'InPost / Mondial Relay',
    website: 'https://inpost.es',
    requiresPostalCode: true,
    region: 'eu',
    color: '#FFCC00',
  },
  {
    slug: 'cainiao',
    name: 'Cainiao Global (AliExpress)',
    website: 'https://global.cainiao.com',
    region: 'china',
    color: '#FF5000',
  },
  {
    slug: 'ups',
    name: 'UPS',
    website: 'https://ups.com',
    region: 'global',
    color: '#351C15',
  },
  {
    slug: 'dhl-express',
    name: 'DHL Express',
    website: 'https://dhl.com',
    region: 'global',
    color: '#D40511',
  },
  {
    slug: 'fedex',
    name: 'FedEx',
    website: 'https://fedex.com',
    region: 'global',
    color: '#4D148C',
  },
  {
    slug: 'gls-spain',
    name: 'GLS Spain',
    website: 'https://gls-spain.es',
    region: 'es',
    color: '#002663',
  },
  {
    slug: 'seur',
    name: 'SEUR / DPD',
    website: 'https://seur.com',
    region: 'es',
    color: '#E30613',
  },
  {
    slug: 'ctt-express',
    name: 'CTT Express',
    website: 'https://cttexpress.com',
    requiresPostalCode: true,
    region: 'es',
    color: '#E2001A',
  },
  {
    slug: 'usps',
    name: 'USPS',
    website: 'https://usps.com',
    region: 'us',
    color: '#004B87',
  },
];

export function findCarrierBySlug(slug: string): Carrier {
  const found = CARRIERS_CATALOG.find((c) => c.slug === slug);
  if (found) return found;
  return {
    slug,
    name: slug.toUpperCase().replace('-', ' '),
    region: 'global',
  };
}

/**
 * Real-time carrier auto-detection engine
 * Analyzes format, lengths, prefixes, and mathematical checksums.
 */
export function detectCandidateCarriers(rawNumber: string): DetectedCarrier[] {
  const clean = rawNumber.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!clean || clean.length < 4) return [];

  const candidates: DetectedCarrier[] = [];

  // 1. UPS 1Z check
  if (clean.startsWith('1Z') && clean.length === 18) {
    const valid = verifyUps1Z(clean);
    candidates.push({
      carrier: findCarrierBySlug('ups'),
      confidence: valid ? 0.99 : 0.85,
      matchedRule: valid ? 'UPS 1Z (Modulo 10 Validated)' : 'UPS 1Z Format',
    });
  }

  // 2. Cainiao / AliExpress (LP + digits or CN... / SY...)
  if (/^LP\d{14,}$/.test(clean)) {
    candidates.push({
      carrier: findCarrierBySlug('cainiao'),
      confidence: 0.98,
      matchedRule: 'Cainiao Global LP Standard',
    });
  }

  // 3. UPU S10 Universal Standard (e.g. RR123456785ES, PK123456789NL)
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(clean)) {
    const isUpuValid = verifyUpuS10(clean);
    const dest = clean.slice(-2);

    if (dest === 'ES') {
      candidates.push({
        carrier: findCarrierBySlug('correos-es'),
        confidence: isUpuValid ? 0.99 : 0.88,
        matchedRule: isUpuValid ? 'UPU S10 (ES Modulo 11)' : 'UPU S10 Format ES',
      });
    }

    if (dest === 'US') {
      candidates.push({
        carrier: findCarrierBySlug('usps'),
        confidence: isUpuValid ? 0.99 : 0.88,
        matchedRule: 'UPU S10 Format US',
      });
    }

    if (candidates.length === 0) {
      candidates.push({
        carrier: findCarrierBySlug('correos-es'),
        confidence: isUpuValid ? 0.92 : 0.75,
        matchedRule: 'UPU S10 Universal',
      });
    }
  }

  // 4. InPost / Mondial Relay (24 digits or 8 digits)
  if (/^\d{24}$/.test(clean) || (/^\d{8}$/.test(clean) && clean.startsWith('75'))) {
    candidates.push({
      carrier: findCarrierBySlug('inpost'),
      confidence: 0.95,
      matchedRule: 'InPost / Mondial Relay Parcel Code',
    });
  }

  // 5. Correos Express (16 digits starting with 69 or 90)
  if (/^69\d{14}$/.test(clean) || /^90\d{14}$/.test(clean)) {
    candidates.push({
      carrier: findCarrierBySlug('correos-express'),
      confidence: 0.96,
      matchedRule: 'Correos Express Domestic Barcode',
    });
  }

  // 6. SEUR (digits with length 12-14 or specific letter prefix)
  if (/^[A-Z]?\d{12,14}$/.test(clean)) {
    candidates.push({
      carrier: findCarrierBySlug('seur'),
      confidence: 0.78,
      matchedRule: 'SEUR / DPD Tracking Format',
    });
  }

  // 7. DHL Express (10 digits)
  if (/^\d{10}$/.test(clean)) {
    candidates.push({
      carrier: findCarrierBySlug('dhl-express'),
      confidence: 0.86,
      matchedRule: 'DHL Express 10-digit Waybill',
    });
  }

  // 8. FedEx (12 or 15 digits)
  if (/^\d{12}$/.test(clean) || /^\d{15}$/.test(clean)) {
    candidates.push({
      carrier: findCarrierBySlug('fedex'),
      confidence: 0.85,
      matchedRule: 'FedEx Express / Ground 12-15 digits',
    });
  }

  // 9. GLS (11 or 12 digits or alphanumeric)
  if (/^\d{11}$/.test(clean)) {
    candidates.push({
      carrier: findCarrierBySlug('gls-spain'),
      confidence: 0.75,
      matchedRule: 'GLS National / International ID',
    });
  }

  // Fallback if no specific rule matched but has reasonable length
  if (candidates.length === 0 && clean.length >= 6) {
    candidates.push(
      {
        carrier: findCarrierBySlug('correos-es'),
        confidence: 0.4,
        matchedRule: 'Generic Courier Heuristic',
      },
      {
        carrier: findCarrierBySlug('cainiao'),
        confidence: 0.35,
        matchedRule: 'Generic Courier Heuristic',
      }
    );
  }

  // Sort descending by confidence score
  return candidates.sort((a, b) => b.confidence - a.confidence);
}
