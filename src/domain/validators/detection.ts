import { Carrier, DetectedCarrier } from '../models/carrier';
import {
  cleanTrackingNumber,
  verifyUpuS10,
  verifyUps1Z,
  verifyIataAwb,
  verifyContainerIso6346,
} from './checksums';

export const CARRIERS_CATALOG: Carrier[] = [
  {
    slug: 'correos-spain',
    name: 'Correos España',
    country: 'ES',
    countryName: 'Spain',
    type: 'postal',
    website: 'https://correos.es',
    trackingUrl: 'https://www.correos.es/es/es/herramientas/localizador/envios?tracking-number=%s',
    region: 'es',
    color: '#FFCC00',
    hasLiveTracking: true,
    capabilities: {
      supportsLiveApi: true,
      supportsWebScraping: true,
    },
  },
  {
    slug: 'correosexpress',
    name: 'Correos Express',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://correosexpress.com',
    trackingUrl: 'https://www.correosexpress.com/web/correosexpress/consultanos?shippingNumber=%s',
    region: 'es',
    color: '#002B49',
    hasLiveTracking: true,
    capabilities: {
      supportsLiveApi: true,
      supportsWebScraping: true,
    },
  },
  {
    slug: 'inpost',
    name: 'InPost / Mondial Relay',
    country: 'GLOBAL',
    countryName: 'Global',
    type: 'logistics',
    website: 'https://inpost.es',
    trackingUrl: 'https://www.inpost.es/seguimiento-del-envio?parcelNumber=%s',
    requiresPostalCode: true,
    region: 'eu',
    color: '#FFCC00',
    hasLiveTracking: true,
    capabilities: {
      requiresPostalCode: true,
      supportsWebScraping: true,
    },
  },
  {
    slug: 'inpost-es',
    name: 'InPost Spain',
    country: 'ES',
    countryName: 'Spain',
    type: 'logistics',
    website: 'https://inpost.es',
    trackingUrl: 'https://www.inpost.es/seguimiento-del-envio?parcelNumber=%s',
    requiresPostalCode: true,
    region: 'es',
    color: '#FFCC00',
    hasLiveTracking: true,
    capabilities: {
      requiresPostalCode: true,
      supportsWebScraping: true,
    },
  },
  {
    slug: 'cainiao',
    name: 'Cainiao Global',
    country: 'CN',
    countryName: 'China',
    type: 'cross_border',
    website: 'https://global.cainiao.com',
    trackingUrl: 'https://global.cainiao.com/detail.htm?mailNoList=%s',
    region: 'china',
    color: '#FF5000',
    hasLiveTracking: true,
    capabilities: {
      supportsLiveApi: true,
    },
  },
  {
    slug: 'ups',
    name: 'UPS',
    country: 'US',
    countryName: 'United States',
    type: 'express',
    website: 'https://ups.com',
    trackingUrl: 'https://www.ups.com/track?tracknum=%s',
    requiresAuth: true,
    hasLiveTracking: true,
    region: 'global',
    color: '#351C15',
    capabilities: {
      requiresAuth: true,
      supportsLiveApi: true,
    },
  },
  {
    slug: 'dhl-express',
    name: 'DHL Express',
    country: 'GLOBAL',
    countryName: 'Global',
    type: 'express',
    website: 'https://dhl.com',
    trackingUrl: 'https://www.dhl.com/en/express/tracking.html?AWB=%s',
    requiresAuth: true,
    hasLiveTracking: true,
    region: 'global',
    color: '#D40511',
    capabilities: {
      requiresAuth: true,
      supportsLiveApi: true,
    },
  },
  {
    slug: 'dhl-parcel',
    name: 'DHL Parcel',
    country: 'DE',
    countryName: 'Germany',
    type: 'logistics',
    website: 'https://dhl.de',
    trackingUrl: 'https://www.dhl.de/en/privatkunden/pakete-empfangen/verfolgen.html?piececode=%s',
    requiresAuth: true,
    hasLiveTracking: true,
    region: 'eu',
    color: '#D40511',
    capabilities: {
      requiresAuth: true,
      supportsLiveApi: true,
    },
  },
  {
    slug: 'dhl-parcel-es',
    name: 'DHL Parcel Spain',
    country: 'ES',
    countryName: 'Spain',
    type: 'logistics',
    website: 'https://dhl.es',
    region: 'es',
    color: '#D40511',
  },
  {
    slug: 'fedex',
    name: 'FedEx',
    country: 'US',
    countryName: 'United States',
    type: 'express',
    website: 'https://fedex.com',
    trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=%s',
    requiresAuth: true,
    hasLiveTracking: true,
    region: 'global',
    color: '#4D148C',
    capabilities: {
      requiresAuth: true,
      supportsLiveApi: true,
    },
  },
  {
    slug: 'asm-gls-spain',
    name: 'GLS Spain (ASM)',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://gls-spain.es',
    trackingUrl: 'https://www.gls-spain.es/es/seguimiento-envios/?match=%s',
    requiresPostalCode: true,
    hasLiveTracking: true,
    region: 'es',
    color: '#002663',
    capabilities: {
      requiresPostalCode: true,
      supportsLiveApi: true,
      supportsWebScraping: true,
    },
  },
  {
    slug: 'gls',
    name: 'GLS',
    country: 'GLOBAL',
    countryName: 'Global',
    type: 'express',
    website: 'https://gls-group.eu',
    trackingUrl: 'https://gls-group.eu/track/%s',
    region: 'eu',
    color: '#002663',
  },
  {
    slug: 'seur',
    name: 'SEUR',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://seur.com',
    trackingUrl: 'https://www.seur.com/livetracking/?segOnlineIdioma=es&segOnlineIdentificador=%s',
    requiresPostalCode: true,
    hasLiveTracking: true,
    region: 'es',
    color: '#E30613',
    capabilities: {
      requiresPostalCode: true,
      supportsLiveApi: true,
      supportsWebScraping: true,
    },
  },
  {
    slug: 'ctt-express',
    name: 'CTT Express',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://cttexpress.com',
    trackingUrl: 'https://www.cttexpress.com/localizador-de-envios/?sc=%s',
    requiresPostalCode: true,
    region: 'es',
    color: '#E2001A',
    capabilities: {
      requiresPostalCode: true,
    },
  },
  {
    slug: 'usps',
    name: 'USPS',
    country: 'US',
    countryName: 'United States',
    type: 'postal',
    website: 'https://usps.com',
    trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=%s',
    region: 'us',
    color: '#004B87',
  },
  {
    slug: 'paack',
    name: 'Paack Logistics',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://paack.co',
    region: 'es',
    color: '#00A859',
  },
  {
    slug: 'mrw-spain',
    name: 'MRW',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://mrw.es',
    region: 'es',
    color: '#E30613',
  },
  {
    slug: 'nacex-spain',
    name: 'Nacex',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://nacex.com',
    region: 'es',
    color: '#F68B1F',
  },
  {
    slug: 'tipsa',
    name: 'TIPSA',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://tip-sa.com',
    region: 'es',
    color: '#D91C24',
  },
  {
    slug: 'zeleris',
    name: 'Zeleris',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://zeleris.com',
    region: 'es',
    color: '#0055A5',
  },
  {
    slug: 'ontime',
    name: 'Ontime',
    country: 'ES',
    countryName: 'Spain',
    type: 'express',
    website: 'https://ontime.es',
    region: 'es',
    color: '#002B49',
  },
  {
    slug: 'packlink',
    name: 'Packlink',
    country: 'ES',
    countryName: 'Spain',
    type: 'logistics',
    website: 'https://packlink.es',
    region: 'es',
    color: '#0072CE',
  },
  {
    slug: 'royal-mail',
    name: 'Royal Mail',
    country: 'GB',
    countryName: 'United Kingdom',
    type: 'postal',
    website: 'https://royalmail.com',
    region: 'eu',
    color: '#D40511',
  },
  {
    slug: 'colissimo',
    name: 'Colissimo / La Poste',
    country: 'FR',
    countryName: 'France',
    type: 'postal',
    website: 'https://laposte.fr',
    region: 'eu',
    color: '#FFCC00',
  },
  {
    slug: 'yunexpress',
    name: 'YunExpress',
    country: 'CN',
    countryName: 'China',
    type: 'cross_border',
    website: 'https://yunexpress.com',
    region: 'china',
    color: '#0066B3',
  },
  {
    slug: 'air-cargo',
    name: 'IATA Air Cargo',
    country: 'GLOBAL',
    countryName: 'International',
    type: 'freight',
    website: 'https://iata.org',
    region: 'global',
    color: '#003366',
  },
  {
    slug: 'ocean-container',
    name: 'ISO Ocean Container',
    country: 'GLOBAL',
    countryName: 'International',
    type: 'freight',
    website: 'https://bic-code.org',
    region: 'global',
    color: '#1B365D',
  },
];

const CARRIER_ALIASES: Record<string, string> = {
  'correos-es': 'correos-spain',
  'correos-express': 'correosexpress',
  'gls-spain': 'asm-gls-spain',
  mrw: 'mrw-spain',
  nacex: 'nacex-spain',
  'four-px': '4px',
  royalmail: 'royal-mail',
};

export function findCarrierBySlug(slug: string): Carrier {
  const normalized = (slug || '').trim().toLowerCase();
  const canonical = CARRIER_ALIASES[normalized] || normalized;

  const found = CARRIERS_CATALOG.find(
    (c) => c.slug.toLowerCase() === canonical || c.slug.toLowerCase() === normalized
  );

  if (found) {
    return { ...found };
  }

  // Fallback for custom or catalog carriers
  return {
    slug: normalized,
    name: normalized.toUpperCase().replace(/[-_]/g, ' '),
    region: 'global',
  };
}

interface PatternRuleInternal {
  carrierSlug: string;
  carrierName: string;
  country: string;
  countryName: string;
  priority: number;
  confidenceBase: number;
  regex: RegExp;
  validator?: (clean: string) => boolean;
  description: string;
  minLen: number;
  maxLen: number;
  digitsOnly: boolean;
  requiresAlpha: boolean;
}

function deriveRegexLengthBounds(pattern: string): [number, number] {
  if (pattern.includes('\\d{3}-\\d{8}')) {
    return [12, 12];
  }
  if (pattern.includes('|')) {
    return [0, 0];
  }

  let p = pattern.replace(/^\^/, '').replace(/\$$/, '');

  if (p.includes('[A-Z]{2}\\d{9}[A-Z]{2}')) {
    return [13, 13];
  }
  if (p.includes('[A-Z]{3}[UJZ]\\d{7}') || p.endsWith('\\d{7}')) {
    return [11, 11];
  }
  if (p.startsWith('1Z') && p.endsWith('{16}')) {
    return [18, 18];
  }

  const quantifierMatch = p.match(/^(\\d|\[0-9\])\{(\d+)(?:,(\d+))?\}$/);
  if (quantifierMatch) {
    const minVal = parseInt(quantifierMatch[2], 10);
    const maxVal = quantifierMatch[3] ? parseInt(quantifierMatch[3], 10) : minVal;
    return [minVal, maxVal];
  }

  return [0, 0];
}

const VALIDATOR_MAP: Record<string, (clean: string) => boolean> = {
  validateAWB: verifyIataAwb,
  validateContainer: verifyContainerIso6346,
  validateUPS: verifyUps1Z,
  validateUPUS10: verifyUpuS10,
};

const RAW_RULES = [
  {
    "carrierSlug": "air-cargo",
    "carrierName": "IATA Air Cargo",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 100,
    "confidenceBase": 0.99,
    "pattern": "^\\d{3}-\\d{8}$",
    "validatorName": "validateAWB",
    "description": "IATA Air Waybill standard with Mod 7 checksum"
  },
  {
    "carrierSlug": "msc",
    "carrierName": "MSC",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 99,
    "confidenceBase": 0.99,
    "pattern": "^MSCU\\d{7}$",
    "validatorName": "validateContainer",
    "description": "MSC Mediterranean Shipping Company container code"
  },
  {
    "carrierSlug": "maersk-line",
    "carrierName": "Maersk Line",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 99,
    "confidenceBase": 0.99,
    "pattern": "^(MAEU|MSKU)\\d{7}$",
    "validatorName": "validateContainer",
    "description": "Maersk Line ISO container code"
  },
  {
    "carrierSlug": "cma-cgm",
    "carrierName": "CMA CGM",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 99,
    "confidenceBase": 0.99,
    "pattern": "^CMAU\\d{7}$",
    "validatorName": "validateContainer",
    "description": "CMA CGM container code"
  },
  {
    "carrierSlug": "evergreen",
    "carrierName": "Evergreen",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 99,
    "confidenceBase": 0.99,
    "pattern": "^(EGLV|EGHU)[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Evergreen Marine container / B/L code"
  },
  {
    "carrierSlug": "cosco",
    "carrierName": "COSCO Shipping",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 99,
    "confidenceBase": 0.99,
    "pattern": "^(COSU|CBHU)\\d{7}$",
    "validatorName": "validateContainer",
    "description": "COSCO Shipping container code"
  },
  {
    "carrierSlug": "hapag-lloyd",
    "carrierName": "Hapag-Lloyd",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 99,
    "confidenceBase": 0.99,
    "pattern": "^HLCU\\d{7}$",
    "validatorName": "validateContainer",
    "description": "Hapag-Lloyd container code"
  },
  {
    "carrierSlug": "one-line",
    "carrierName": "ONE Ocean Network Express",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 99,
    "confidenceBase": 0.99,
    "pattern": "^ONEU\\d{7}$",
    "validatorName": "validateContainer",
    "description": "ONE Ocean Network Express container code"
  },
  {
    "carrierSlug": "zim",
    "carrierName": "ZIM",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 99,
    "confidenceBase": 0.99,
    "pattern": "^ZIMU\\d{7}$",
    "validatorName": "validateContainer",
    "description": "ZIM Integrated Shipping container code"
  },
  {
    "carrierSlug": "ocean-container",
    "carrierName": "ISO Ocean Container",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeFreight",
    "priority": 95,
    "confidenceBase": 0.98,
    "pattern": "^[A-Z]{3}[UJZ]\\d{7}$",
    "validatorName": "validateContainer",
    "description": "ISO 6346 standard container identification code"
  },
  {
    "carrierSlug": "ups",
    "carrierName": "UPS",
    "country": "US",
    "countryName": "United States",
    "carrierType": "CarrierTypeExpress",
    "priority": 90,
    "confidenceBase": 0.98,
    "pattern": "^1Z[0-9A-Z]{16}$",
    "validatorName": "validateUPS",
    "description": "UPS 1Z Tracking number with Mod 10 check digit"
  },
  {
    "carrierSlug": "yunexpress",
    "carrierName": "YunExpress",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 85,
    "confidenceBase": 0.96,
    "pattern": "^YT\\d{16,18}$",
    "validatorName": "",
    "description": "YunExpress cross-border parcel format (YT prefix)"
  },
  {
    "carrierSlug": "cainiao",
    "carrierName": "Cainiao Global",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 88,
    "confidenceBase": 0.96,
    "pattern": "^(LP\\d{14,16}|CAINIAO\\d+|CNESP\\d+|UN\\d{9}CN|SYB\\d+|SYA\\d+|323\\d{20})$",
    "validatorName": "",
    "description": "Cainiao / AliExpress standard tracking (LP, CAINIAO, CNESP, UN...CN, 323... 23 digits)"
  },
  {
    "carrierSlug": "4px",
    "carrierName": "4PX Express",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 84,
    "confidenceBase": 0.95,
    "pattern": "^(4PX\\d{10,16}|MP\\d{10,16}|FPX[0-9A-Z]+)$",
    "validatorName": "",
    "description": "4PX Express international tracking number"
  },
  {
    "carrierSlug": "china-post",
    "carrierName": "China Post",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypePostal",
    "priority": 85,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}CN$",
    "validatorName": "validateUPUS10",
    "description": "China Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "china-post",
    "carrierName": "China Post",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypePostal",
    "priority": 79,
    "confidenceBase": 0.88,
    "pattern": "^(10|11|98|99)\\d{11}$",
    "validatorName": "",
    "description": "China Post domestic 13-digit barcode"
  },
  {
    "carrierSlug": "hongkong-post",
    "carrierName": "Hong Kong Post",
    "country": "HK",
    "countryName": "Hong Kong",
    "carrierType": "CarrierTypePostal",
    "priority": 85,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}HK$",
    "validatorName": "validateUPUS10",
    "description": "Hong Kong Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "sf-express",
    "carrierName": "SF Express",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeExpress",
    "priority": 86,
    "confidenceBase": 0.95,
    "pattern": "^SF\\d{12,14}$",
    "validatorName": "",
    "description": "SF Express standard tracking (SF prefix)"
  },
  {
    "carrierSlug": "sf-express",
    "carrierName": "SF Express",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeExpress",
    "priority": 75,
    "confidenceBase": 0.82,
    "pattern": "^\\d{15}$",
    "validatorName": "",
    "description": "SF Express domestic 15-digit barcode"
  },
  {
    "carrierSlug": "yanwen",
    "carrierName": "Yanwen Logistics",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 86,
    "confidenceBase": 0.95,
    "pattern": "^((UD|VR|LP|UB|UV|YT)\\d{9}YP|YW\\d{11,15})$",
    "validatorName": "",
    "description": "Yanwen Logistics cross-border tracking format"
  },
  {
    "carrierSlug": "sytrack",
    "carrierName": "SunYou - Sytrack",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 85,
    "confidenceBase": 0.95,
    "pattern": "^(SY\\d{11,13}|SY[A-Z]{2,4}\\d{8,14}|LP\\d{14}SY)$",
    "validatorName": "",
    "description": "SunYou / Sytrack tracking format"
  },
  {
    "carrierSlug": "cne-express",
    "carrierName": "CNE Express",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^(3A[0-9A-Z]{10,16}|CNE\\d{10,14})$",
    "validatorName": "",
    "description": "CNE Express cross-border tracking format"
  },
  {
    "carrierSlug": "yto-express",
    "carrierName": "YTO Express",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeExpress",
    "priority": 82,
    "confidenceBase": 0.9,
    "pattern": "^(YT\\d{10,13}|DD\\d{10,13}|8\\d{11,13})$",
    "validatorName": "",
    "description": "YTO Express domestic/international barcode"
  },
  {
    "carrierSlug": "zto-international",
    "carrierName": "ZTO International",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 82,
    "confidenceBase": 0.9,
    "pattern": "^(ZTO\\d{10,14}|7\\d{11,13})$",
    "validatorName": "",
    "description": "ZTO Express / International tracking number"
  },
  {
    "carrierSlug": "deppon",
    "carrierName": "Deppon",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeLogistics",
    "priority": 84,
    "confidenceBase": 0.92,
    "pattern": "^DPK\\d{11,14}$",
    "validatorName": "",
    "description": "Deppon Logistics DPK barcode"
  },
  {
    "carrierSlug": "jdl-cn",
    "carrierName": "JD Logistics",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeLogistics",
    "priority": 83,
    "confidenceBase": 0.91,
    "pattern": "^(JD\\d{10,14}|JDX\\d{10,14})$",
    "validatorName": "",
    "description": "JD Logistics tracking number"
  },
  {
    "carrierSlug": "cirro",
    "carrierName": "Cirro",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 83,
    "confidenceBase": 0.9,
    "pattern": "^(CIR\\d{10,14}|LL\\d{9}CN)$",
    "validatorName": "",
    "description": "Cirro cross-border tracking format"
  },
  {
    "carrierSlug": "sfc-service",
    "carrierName": "SFC - SendFromChina",
    "country": "CN",
    "countryName": "China",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 82,
    "confidenceBase": 0.89,
    "pattern": "^SFC[0-9A-Z]{10,16}$",
    "validatorName": "",
    "description": "SendFromChina tracking number"
  },
  {
    "carrierSlug": "cxc-express-hk",
    "carrierName": "CXC Express Hong Kong",
    "country": "HK",
    "countryName": "Hong Kong",
    "carrierType": "CarrierTypeExpress",
    "priority": 82,
    "confidenceBase": 0.89,
    "pattern": "^CXC\\d{10,14}$",
    "validatorName": "",
    "description": "CXC Express Hong Kong tracking number"
  },
  {
    "carrierSlug": "correos-spain",
    "carrierName": "Correos España",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypePostal",
    "priority": 85,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}ES$",
    "validatorName": "validateUPUS10",
    "description": "Correos España UPU S10 postal code (XX123456789ES)"
  },
  {
    "carrierSlug": "correos-spain",
    "carrierName": "Correos España",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypePostal",
    "priority": 82,
    "confidenceBase": 0.94,
    "pattern": "^(PK|PQ|PA|72|00|ES)\\w{21}$",
    "validatorName": "",
    "description": "Correos España 23-digit domestic parcel barcode"
  },
  {
    "carrierSlug": "correosexpress",
    "carrierName": "Correos Express",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 82,
    "confidenceBase": 0.93,
    "pattern": "^(69|32|00|08)\\d{14}$",
    "validatorName": "",
    "description": "Correos Express 16-digit parcel tracking number"
  },
  {
    "carrierSlug": "correosexpress",
    "carrierName": "Correos Express",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 81,
    "confidenceBase": 0.8,
    "pattern": "^(32\\d{21}|69\\d{21})$",
    "validatorName": "",
    "description": "Correos Express 23-digit shipment identifier"
  },
  {
    "carrierSlug": "ctt-express",
    "carrierName": "CTT Express",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.92,
    "pattern": "^(000\\d{19,21}|EXP\\d{10,14}|CTT\\d{10,14}|6\\d{12,13})$",
    "validatorName": "",
    "description": "CTT Express tracking number (000..., EXP..., 6...)"
  },
  {
    "carrierSlug": "seur",
    "carrierName": "SEUR",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 78,
    "confidenceBase": 0.88,
    "pattern": "^(SEUR\\d{10,14}|36\\d{12})$",
    "validatorName": "",
    "description": "SEUR Spain parcel number"
  },
  {
    "carrierSlug": "paack",
    "carrierName": "Paack Logistics",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 78,
    "confidenceBase": 0.9,
    "pattern": "^(PCK|PK|PAACK)[0-9A-Z]{9,15}$",
    "validatorName": "",
    "description": "Paack Logistics parcel code (PCK/PAACK prefix)"
  },
  {
    "carrierSlug": "mrw-spain",
    "carrierName": "MRW",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 77,
    "confidenceBase": 0.87,
    "pattern": "^\\d{5}/\\d{7}$|^\\d{12}$",
    "validatorName": "",
    "description": "MRW Spain 12-digit franchise parcel code"
  },
  {
    "carrierSlug": "gls",
    "carrierName": "GLS",
    "country": "GLOBAL",
    "countryName": "Global",
    "carrierType": "CarrierTypeExpress",
    "priority": 75,
    "confidenceBase": 0.86,
    "pattern": "^(GLS[0-9A-Z]{8,14}|\\d{8}|\\d{11}|\\d{12}|\\d{20})$",
    "validatorName": "",
    "description": "GLS parcel tracking number (8, 11, 12 digits or GLS prefix)"
  },
  {
    "carrierSlug": "usps",
    "carrierName": "USPS",
    "country": "US",
    "countryName": "United States",
    "carrierType": "CarrierTypePostal",
    "priority": 82,
    "confidenceBase": 0.94,
    "pattern": "^(94|92|93|95|91)\\d{18,20}$",
    "validatorName": "",
    "description": "USPS 20-22 digit domestic package barcode"
  },
  {
    "carrierSlug": "usps",
    "carrierName": "USPS",
    "country": "US",
    "countryName": "United States",
    "carrierType": "CarrierTypePostal",
    "priority": 85,
    "confidenceBase": 0.95,
    "pattern": "^[A-Z]{2}\\d{9}US$",
    "validatorName": "validateUPUS10",
    "description": "USPS International UPU S10 (e.g. EA123456789US)"
  },
  {
    "carrierSlug": "fedex",
    "carrierName": "FedEx",
    "country": "US",
    "countryName": "United States",
    "carrierType": "CarrierTypeExpress",
    "priority": 76,
    "confidenceBase": 0.88,
    "pattern": "^(\\d{12}|\\d{15}|\\d{20}|96\\d{20})$",
    "validatorName": "",
    "description": "FedEx Ground or Express tracking number (12, 15, or 20 digits)"
  },
  {
    "carrierSlug": "dhl-express",
    "carrierName": "DHL Express",
    "country": "GLOBAL",
    "countryName": "Global",
    "carrierType": "CarrierTypeExpress",
    "priority": 78,
    "confidenceBase": 0.9,
    "pattern": "^\\d{10}$",
    "validatorName": "",
    "description": "DHL Express 10-digit Air Waybill / Tracking Number"
  },
  {
    "carrierSlug": "dhl-parcel",
    "carrierName": "DHL Parcel",
    "country": "DE",
    "countryName": "Germany",
    "carrierType": "CarrierTypeLogistics",
    "priority": 83,
    "confidenceBase": 0.94,
    "pattern": "^(GM\\d{16,18}|JJ\\d{16}|JJD\\d{16,18}|0034043\\d{11})$",
    "validatorName": "",
    "description": "DHL eCommerce & Parcel international barcode"
  },
  {
    "carrierSlug": "royal-mail",
    "carrierName": "Royal Mail",
    "country": "GB",
    "countryName": "United Kingdom",
    "carrierType": "CarrierTypePostal",
    "priority": 85,
    "confidenceBase": 0.95,
    "pattern": "^[A-Z]{2}\\d{9}GB$",
    "validatorName": "validateUPUS10",
    "description": "Royal Mail International UPU S10 postal format"
  },
  {
    "carrierSlug": "colissimo",
    "carrierName": "Colissimo / La Poste",
    "country": "FR",
    "countryName": "France",
    "carrierType": "CarrierTypePostal",
    "priority": 83,
    "confidenceBase": 0.93,
    "pattern": "^(6A|6M|6C|6H|9V)\\d{11}$|^[A-Z]{2}\\d{9}FR$",
    "validatorName": "",
    "description": "Colissimo / La Poste French postal tracking"
  },
  {
    "carrierSlug": "inpost",
    "carrierName": "InPost / Mondial Relay",
    "country": "GLOBAL",
    "countryName": "Global",
    "carrierType": "CarrierTypeLogistics",
    "priority": 74,
    "confidenceBase": 0.85,
    "pattern": "^(6\\d{23}|\\d{7,10})$",
    "validatorName": "",
    "description": "InPost Locker / Mondial Relay parcel number"
  },
  {
    "carrierSlug": "poste-italiane",
    "carrierName": "Poste Italiane",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}(IT|SM)$",
    "validatorName": "validateUPUS10",
    "description": "Poste Italiane / San Marino UPU S10 postal code (XX123456789IT/SM)"
  },
  {
    "carrierSlug": "poste-italiane",
    "carrierName": "Poste Italiane",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypePostal",
    "priority": 84,
    "confidenceBase": 0.93,
    "pattern": "^(CRONO\\d{8,14}|(38|05|20)\\d{10})$",
    "validatorName": "",
    "description": "Poste Italiane domestic Crono or raccomandata parcel barcode"
  },
  {
    "carrierSlug": "brt-bartolini",
    "carrierName": "BRT Bartolini",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.88,
    "pattern": "^(BRT\\d{9,12}|01\\d{10}|\\d{12})$",
    "validatorName": "",
    "description": "BRT Bartolini 12-digit shipment code"
  },
  {
    "carrierSlug": "brt-italy-parcelid",
    "carrierName": "BRT Bartolini (Parcel ID)",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeExpress",
    "priority": 83,
    "confidenceBase": 0.93,
    "pattern": "^(055\\d{11}|055\\d{15}|\\d{14}|\\d{18})$",
    "validatorName": "",
    "description": "BRT Bartolini 14 or 18-digit Parcel ID (ID Collo)"
  },
  {
    "carrierSlug": "mybrt-it",
    "carrierName": "myBRT.it",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeExpress",
    "priority": 83,
    "confidenceBase": 0.93,
    "pattern": "^(MYBRT[0-9A-Z]{8,14}|074\\d{11})$",
    "validatorName": "",
    "description": "myBRT.it tracking code (MYBRT... or 074...)"
  },
  {
    "carrierSlug": "gls-italy",
    "carrierName": "GLS Italy",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeExpress",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(GLSIT[0-9A-Z]+|[A-Z]\\d{8,9}|\\d{9})$",
    "validatorName": "",
    "description": "GLS Italy parcel tracking number (GLSIT prefix, branch code or 9 digits)"
  },
  {
    "carrierSlug": "inpost-it",
    "carrierName": "InPost.it",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeLogistics",
    "priority": 80,
    "confidenceBase": 0.91,
    "pattern": "^(IT\\d{22}|6\\d{23})$",
    "validatorName": "",
    "description": "InPost.it Locker parcel tracking number"
  },
  {
    "carrierSlug": "tnt-italy",
    "carrierName": "TNT Italy",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeExpress",
    "priority": 82,
    "confidenceBase": 0.92,
    "pattern": "^(TNTIT\\d+|(MY|GE|VV|BA|NA)\\d{7,9})$",
    "validatorName": "",
    "description": "TNT Italy consignment tracking number"
  },
  {
    "carrierSlug": "amazon-it",
    "carrierName": "Amazon Italy",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeLogistics",
    "priority": 83,
    "confidenceBase": 0.93,
    "pattern": "^(IT\\d{10,12}|TB[A-Z0-9]{10,16})$",
    "validatorName": "",
    "description": "Amazon Italy tracking barcode"
  },
  {
    "carrierSlug": "sailpost",
    "carrierName": "Sailpost",
    "country": "IT",
    "countryName": "Italy & San Marino",
    "carrierType": "CarrierTypePostal",
    "priority": 83,
    "confidenceBase": 0.92,
    "pattern": "^(SP\\d{9,12}|SLP\\d{9,12})$",
    "validatorName": "",
    "description": "Sailpost Italy & San Marino postal barcode"
  },
  {
    "carrierSlug": "alfred-it",
    "carrierName": "Alfred 24",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeLogistics",
    "priority": 83,
    "confidenceBase": 0.92,
    "pattern": "^ALF[0-9A-Z]{8,14}$",
    "validatorName": "",
    "description": "Alfred 24 smart locker parcel identifier"
  },
  {
    "carrierSlug": "arco-spedizioni",
    "carrierName": "Arco Spedizioni",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeFreight",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(ARC|ARCO)\\d{6,10}$",
    "validatorName": "",
    "description": "Arco Spedizioni freight tracking number"
  },
  {
    "carrierSlug": "ceva-it",
    "carrierName": "CEVA Logistics Italy",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeFreight",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(CEVA|ITCEVA)\\d{6,12}$",
    "validatorName": "",
    "description": "CEVA Logistics Italy consignment number"
  },
  {
    "carrierSlug": "bdm-it",
    "carrierName": "CST Italia",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeLogistics",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(BDM|CST)\\d{6,10}$",
    "validatorName": "",
    "description": "CST Italia / BDM shipment tracking code"
  },
  {
    "carrierSlug": "deliver-it",
    "carrierName": "Deliver It",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeExpress",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(DIT|DLV)[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Deliver It courier tracking code"
  },
  {
    "carrierSlug": "liccardi-it",
    "carrierName": "Liccardi Trasporti",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeFreight",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(LIC|LCC)\\d{6,10}$",
    "validatorName": "",
    "description": "Liccardi Trasporti freight tracking code"
  },
  {
    "carrierSlug": "mbe-it",
    "carrierName": "Mail Boxes Etc. Italy",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeLogistics",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(MBE|MBEIT)\\d{7,12}$",
    "validatorName": "",
    "description": "Mail Boxes Etc. Italy parcel tracking code"
  },
  {
    "carrierSlug": "rhenus-it",
    "carrierName": "Rhenus Italia",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeFreight",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(RH|RHIT)\\d{7,12}$",
    "validatorName": "",
    "description": "Rhenus Italia logistics tracking code"
  },
  {
    "carrierSlug": "spediamo-it",
    "carrierName": "Spediamo",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeLogistics",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(SPD|SPED)\\d{6,10}$",
    "validatorName": "",
    "description": "Spediamo.it online parcel tracking code"
  },
  {
    "carrierSlug": "unieuro-it",
    "carrierName": "Unieuro",
    "country": "IT",
    "countryName": "Italy",
    "carrierType": "CarrierTypeLogistics",
    "priority": 82,
    "confidenceBase": 0.91,
    "pattern": "^(UNI|UNIEURO)\\d{6,10}$",
    "validatorName": "",
    "description": "Unieuro order and delivery tracking code"
  },
  {
    "carrierSlug": "portugal-post",
    "carrierName": "Portugal Post - CTT",
    "country": "PT",
    "countryName": "Portugal",
    "carrierType": "CarrierTypePostal",
    "priority": 85,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}PT$",
    "validatorName": "validateUPUS10",
    "description": "Portugal Post CTT UPU S10 postal format (XX123456789PT)"
  },
  {
    "carrierSlug": "portugal-post",
    "carrierName": "Portugal Post - CTT",
    "country": "PT",
    "countryName": "Portugal",
    "carrierType": "CarrierTypePostal",
    "priority": 82,
    "confidenceBase": 0.93,
    "pattern": "^(DA|RA|LX|EM|CO|RH)\\d{9}PT$",
    "validatorName": "validateUPUS10",
    "description": "Portugal Post domestic express/registered barcode"
  },
  {
    "carrierSlug": "dpd-portugal",
    "carrierName": "DPD Portugal",
    "country": "PT",
    "countryName": "Portugal",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^(098|099|058)\\d{11}$|^098\\d{8}$",
    "validatorName": "",
    "description": "DPD Portugal parcel tracking format (098, 099, 058)"
  },
  {
    "carrierSlug": "delnext",
    "carrierName": "Delnext",
    "country": "PT",
    "countryName": "Portugal",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^(DLN|DLX)[0-9A-Z]{7,13}$|^DLN\\d{8,12}$",
    "validatorName": "",
    "description": "Delnext Portugal tracking number (DLN/DLX prefix)"
  },
  {
    "carrierSlug": "wepickup-pt",
    "carrierName": "WePickUp",
    "country": "PT",
    "countryName": "Portugal",
    "carrierType": "CarrierTypeLogistics",
    "priority": 82,
    "confidenceBase": 0.92,
    "pattern": "^WPU[0-9A-Z]{8,14}$",
    "validatorName": "",
    "description": "WePickUp locker & PUDO network tracking number (WPU prefix)"
  },
  {
    "carrierSlug": "upu-s10",
    "carrierName": "Universal Postal Union (UPU S10)",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypePostal",
    "priority": 60,
    "confidenceBase": 0.8,
    "pattern": "^[A-Z]{2}\\d{9}[A-Z]{2}$",
    "validatorName": "validateUPUS10",
    "description": "UPU S10 Standard International Postal barcode"
  },
  {
    "carrierSlug": "postnl",
    "carrierName": "PostNL",
    "country": "NL",
    "countryName": "Netherlands",
    "carrierType": "CarrierTypePostal",
    "priority": 87,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}NL$|^3S[0-9A-Z]{10,20}$",
    "validatorName": "",
    "description": "PostNL 3S barcode / UPU S10 tracking format"
  },
  {
    "carrierSlug": "bpost-local",
    "carrierName": "Bpost Belgium",
    "country": "BE",
    "countryName": "Belgium",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}BE$|^3232\\d{20}$",
    "validatorName": "",
    "description": "Bpost Belgium tracking barcode format"
  },
  {
    "carrierSlug": "luxembourg-post",
    "carrierName": "Luxembourg Post",
    "country": "LU",
    "countryName": "Luxembourg",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}LU$",
    "validatorName": "validateUPUS10",
    "description": "Luxembourg Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "dhl-nl-private",
    "carrierName": "DHL Parcel Netherlands",
    "country": "NL",
    "countryName": "Netherlands",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^JVGL\\d{14,18}$",
    "validatorName": "",
    "description": "DHL Parcel Netherlands JVGL barcode"
  },
  {
    "carrierSlug": "correios-brazil",
    "carrierName": "Correios Brazil",
    "country": "BR",
    "countryName": "Brazil",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}BR$",
    "validatorName": "validateUPUS10",
    "description": "Correios Brazil UPU S10 tracking format"
  },
  {
    "carrierSlug": "mexico-post",
    "carrierName": "Correos de México",
    "country": "MX",
    "countryName": "Mexico",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}MX$",
    "validatorName": "validateUPUS10",
    "description": "Correos de México UPU S10 format"
  },
  {
    "carrierSlug": "correo-argentino",
    "carrierName": "Correo Argentino",
    "country": "AR",
    "countryName": "Argentina",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}AR$",
    "validatorName": "validateUPUS10",
    "description": "Correo Argentino UPU S10 format"
  },
  {
    "carrierSlug": "peru-post",
    "carrierName": "Serpost Peru",
    "country": "PE",
    "countryName": "Peru",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}PE$",
    "validatorName": "validateUPUS10",
    "description": "Serpost Peru UPU S10 format"
  },
  {
    "carrierSlug": "uruguay-post",
    "carrierName": "Correo Uruguayo",
    "country": "UY",
    "countryName": "Uruguay",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}UY$",
    "validatorName": "validateUPUS10",
    "description": "Correo Uruguayo UPU S10 format"
  },
  {
    "carrierSlug": "estafeta",
    "carrierName": "Estafeta",
    "country": "MX",
    "countryName": "Mexico",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^22\\d{20}$",
    "validatorName": "",
    "description": "Estafeta 22-digit waybill barcode"
  },
  {
    "carrierSlug": "swiss-post",
    "carrierName": "Swiss Post",
    "country": "CH",
    "countryName": "Switzerland",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}CH$|^99\\d{16}$",
    "validatorName": "",
    "description": "Swiss Post tracking format (UPU S10 / 18-digit)"
  },
  {
    "carrierSlug": "austria-mail",
    "carrierName": "Austrian Post",
    "country": "AT",
    "countryName": "Austria",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}AT$",
    "validatorName": "validateUPUS10",
    "description": "Austrian Post UPU S10 format"
  },
  {
    "carrierSlug": "deutsche-post",
    "carrierName": "Deutsche Post / DHL Paket",
    "country": "DE",
    "countryName": "Germany",
    "carrierType": "CarrierTypePostal",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^(0034043\\d{11}|10\\d{10})$",
    "validatorName": "",
    "description": "Deutsche Post DHL Paket national barcode"
  },
  {
    "carrierSlug": "myhermes-de",
    "carrierName": "Hermes Germany",
    "country": "DE",
    "countryName": "Germany",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^H\\d{19}$",
    "validatorName": "",
    "description": "Hermes Germany 20-digit barcode"
  },
  {
    "carrierSlug": "trans-o-flex",
    "carrierName": "Trans-o-Flex",
    "country": "DE",
    "countryName": "Germany",
    "carrierType": "CarrierTypeExpress",
    "priority": 84,
    "confidenceBase": 0.93,
    "pattern": "^TOF\\d{8,12}$",
    "validatorName": "",
    "description": "Trans-o-Flex shipment identifier"
  },
  {
    "carrierSlug": "emirates-post-group",
    "carrierName": "Emirates Post",
    "country": "AE",
    "countryName": "United Arab Emirates",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}AE$",
    "validatorName": "validateUPUS10",
    "description": "Emirates Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "saudi-post",
    "carrierName": "Saudi Post (SPL)",
    "country": "SA",
    "countryName": "Saudi Arabia",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}SA$",
    "validatorName": "validateUPUS10",
    "description": "Saudi Post (SPL) UPU S10 format"
  },
  {
    "carrierSlug": "turkey-post",
    "carrierName": "Turkey Post (PTT)",
    "country": "TR",
    "countryName": "Turkey",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}TR$",
    "validatorName": "validateUPUS10",
    "description": "Turkey Post (PTT) UPU S10 format"
  },
  {
    "carrierSlug": "israel-post",
    "carrierName": "Israel Post",
    "country": "IL",
    "countryName": "Israel",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}IL$",
    "validatorName": "validateUPUS10",
    "description": "Israel Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "south-africa-post",
    "carrierName": "South Africa Post",
    "country": "ZA",
    "countryName": "South Africa",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}ZA$",
    "validatorName": "validateUPUS10",
    "description": "South Africa Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "egypt-post",
    "carrierName": "Egypt Post",
    "country": "EG",
    "countryName": "Egypt",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}EG$",
    "validatorName": "validateUPUS10",
    "description": "Egypt Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "morocco-post",
    "carrierName": "Morocco Post",
    "country": "MA",
    "countryName": "Morocco",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}MA$",
    "validatorName": "validateUPUS10",
    "description": "Morocco Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "kazpost",
    "carrierName": "KazPost",
    "country": "KZ",
    "countryName": "Kazakhstan",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}KZ$",
    "validatorName": "validateUPUS10",
    "description": "KazPost Kazakhstan UPU S10 format"
  },
  {
    "carrierSlug": "naqel-express",
    "carrierName": "Naqel Express",
    "country": "SA",
    "countryName": "Saudi Arabia",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^NQ\\d{8,12}$",
    "validatorName": "",
    "description": "Naqel Express shipment barcode"
  },
  {
    "carrierSlug": "anpost",
    "carrierName": "An Post",
    "country": "IE",
    "countryName": "Ireland",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}IE$",
    "validatorName": "validateUPUS10",
    "description": "An Post Ireland UPU S10 tracking format"
  },
  {
    "carrierSlug": "parcel-force",
    "carrierName": "Parcelforce",
    "country": "GB",
    "countryName": "United Kingdom",
    "carrierType": "CarrierTypeExpress",
    "priority": 86,
    "confidenceBase": 0.95,
    "pattern": "^([A-Z]{2}\\d{7}|[A-Z]{4}\\d{10})$",
    "validatorName": "",
    "description": "Parcelforce UK domestic shipment barcode"
  },
  {
    "carrierSlug": "myhermes-uk",
    "carrierName": "Evri",
    "country": "GB",
    "countryName": "United Kingdom",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^16\\d{14}$",
    "validatorName": "",
    "description": "Evri 16-digit tracking barcode format"
  },
  {
    "carrierSlug": "yodel",
    "carrierName": "Yodel",
    "country": "GB",
    "countryName": "United Kingdom",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^(JD\\d{16,18}|1\\d{17})$",
    "validatorName": "",
    "description": "Yodel parcel barcode format"
  },
  {
    "carrierSlug": "dpd-uk",
    "carrierName": "DPD UK",
    "country": "GB",
    "countryName": "United Kingdom",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^1550\\d{10}$",
    "validatorName": "",
    "description": "DPD UK 14-digit consignment number"
  },
  {
    "carrierSlug": "chronopost-france",
    "carrierName": "Chronopost France",
    "country": "FR",
    "countryName": "France",
    "carrierType": "CarrierTypeExpress",
    "priority": 87,
    "confidenceBase": 0.96,
    "pattern": "^(XY|EE|EW|DB|DT)\\d{9}FR$",
    "validatorName": "validateUPUS10",
    "description": "Chronopost France express barcode"
  },
  {
    "carrierSlug": "colis-prive",
    "carrierName": "Colis Privé",
    "country": "FR",
    "countryName": "France",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^CP[0-9A-Z]{10,14}$",
    "validatorName": "",
    "description": "Colis Privé delivery barcode"
  },
  {
    "carrierSlug": "relais-colis",
    "carrierName": "Relais Colis",
    "country": "FR",
    "countryName": "France",
    "carrierType": "CarrierTypeLogistics",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^RC[0-9A-Z]{10,14}$",
    "validatorName": "",
    "description": "Relais Colis parcel barcode"
  },
  {
    "carrierSlug": "sweden-post",
    "carrierName": "PostNord Sweden",
    "country": "SE",
    "countryName": "Sweden",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}SE$",
    "validatorName": "validateUPUS10",
    "description": "PostNord Sweden UPU S10 tracking format"
  },
  {
    "carrierSlug": "posten-norway",
    "carrierName": "Posten Norge",
    "country": "NO",
    "countryName": "Norway",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}NO$",
    "validatorName": "validateUPUS10",
    "description": "Posten Norge UPU S10 tracking format"
  },
  {
    "carrierSlug": "posti-finland",
    "carrierName": "Posti Finland",
    "country": "FI",
    "countryName": "Finland",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}FI$|^JJFI\\d{16}$",
    "validatorName": "",
    "description": "Posti Finland tracking format (UPU S10 / JJFI barcode)"
  },
  {
    "carrierSlug": "omniva",
    "carrierName": "Omniva Estonia",
    "country": "EE",
    "countryName": "Estonia",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}EE$",
    "validatorName": "validateUPUS10",
    "description": "Omniva Estonia UPU S10 tracking format"
  },
  {
    "carrierSlug": "latvia-post",
    "carrierName": "Latvia Post",
    "country": "LV",
    "countryName": "Latvia",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}LV$",
    "validatorName": "validateUPUS10",
    "description": "Latvia Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "post-litva",
    "carrierName": "Lithuania Post",
    "country": "LT",
    "countryName": "Lithuania",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}LT$",
    "validatorName": "validateUPUS10",
    "description": "Lithuania Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "iceland-post",
    "carrierName": "Iceland Post",
    "country": "IS",
    "countryName": "Iceland",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}IS$",
    "validatorName": "validateUPUS10",
    "description": "Iceland Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "bring",
    "carrierName": "Bring",
    "country": "NO",
    "countryName": "Norway",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^70\\d{16}$",
    "validatorName": "",
    "description": "Bring Nordic parcel shipment format"
  },
  {
    "carrierSlug": "dao",
    "carrierName": "DAO",
    "country": "DK",
    "countryName": "Denmark",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^DAO\\d{8,12}$",
    "validatorName": "",
    "description": "DAO Denmark express parcel format"
  },
  {
    "carrierSlug": "canada-post",
    "carrierName": "Canada Post",
    "country": "CA",
    "countryName": "Canada",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}CA$",
    "validatorName": "validateUPUS10",
    "description": "Canada Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "canada-post",
    "carrierName": "Canada Post",
    "country": "CA",
    "countryName": "Canada",
    "carrierType": "CarrierTypePostal",
    "priority": 81,
    "confidenceBase": 0.9,
    "pattern": "^\\d{16}$",
    "validatorName": "",
    "description": "Canada Post domestic 16-digit barcode"
  },
  {
    "carrierSlug": "purolator",
    "carrierName": "Purolator",
    "country": "CA",
    "countryName": "Canada",
    "carrierType": "CarrierTypeExpress",
    "priority": 84,
    "confidenceBase": 0.92,
    "pattern": "^(PIN\\d{9,12}|\\d{12})$",
    "validatorName": "",
    "description": "Purolator PIN parcel tracking number"
  },
  {
    "carrierSlug": "canpar",
    "carrierName": "Canpar",
    "country": "CA",
    "countryName": "Canada",
    "carrierType": "CarrierTypeExpress",
    "priority": 84,
    "confidenceBase": 0.92,
    "pattern": "^(D\\d{10}|[A-Z]\\d{10}|\\d{11})$",
    "validatorName": "",
    "description": "Canpar courier tracking barcode"
  },
  {
    "carrierSlug": "ontrac",
    "carrierName": "OnTrac",
    "country": "US",
    "countryName": "United States",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^[CD]\\d{14}$",
    "validatorName": "",
    "description": "OnTrac delivery barcode format"
  },
  {
    "carrierSlug": "intelcom-express",
    "carrierName": "Intelcom Express",
    "country": "CA",
    "countryName": "Canada",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^(INTLC|IN)\\d{8,12}$",
    "validatorName": "",
    "description": "Intelcom Express Canada tracking code"
  },
  {
    "carrierSlug": "chitchats",
    "carrierName": "Chit Chats",
    "country": "CA",
    "countryName": "Canada",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^CC[0-9A-Z]{10,14}$",
    "validatorName": "",
    "description": "Chit Chats parcel tracking number"
  },
  {
    "carrierSlug": "poland-post",
    "carrierName": "Poland Post",
    "country": "PL",
    "countryName": "Poland",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}PL$",
    "validatorName": "validateUPUS10",
    "description": "Poland Post (Poczta Polska) UPU S10 format"
  },
  {
    "carrierSlug": "inpost-poland",
    "carrierName": "InPost Poland",
    "country": "PL",
    "countryName": "Poland",
    "carrierType": "CarrierTypeLogistics",
    "priority": 87,
    "confidenceBase": 0.97,
    "pattern": "^6\\d{23}$",
    "validatorName": "",
    "description": "InPost Poland 24-digit locker parcel number"
  },
  {
    "carrierSlug": "czech-republic-post",
    "carrierName": "Czech Post",
    "country": "CZ",
    "countryName": "Czech Republic",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}CZ$",
    "validatorName": "validateUPUS10",
    "description": "Czech Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "romania-post",
    "carrierName": "Romania Post",
    "country": "RO",
    "countryName": "Romania",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}RO$",
    "validatorName": "validateUPUS10",
    "description": "Romania Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "elta-hellenic-post",
    "carrierName": "Greece Post (ELTA)",
    "country": "GR",
    "countryName": "Greece",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}GR$",
    "validatorName": "validateUPUS10",
    "description": "Greece Post (ELTA) UPU S10 format"
  },
  {
    "carrierSlug": "bulgaria-post",
    "carrierName": "Bulgaria Post",
    "country": "BG",
    "countryName": "Bulgaria",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}BG$",
    "validatorName": "validateUPUS10",
    "description": "Bulgaria Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "slovakia-post",
    "carrierName": "Slovakia Post",
    "country": "SK",
    "countryName": "Slovakia",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}SK$",
    "validatorName": "validateUPUS10",
    "description": "Slovakia Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "sameday-ro",
    "carrierName": "Sameday",
    "country": "RO",
    "countryName": "Romania",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^(00|10)\\d{12,16}$",
    "validatorName": "",
    "description": "Sameday courier parcel barcode"
  },
  {
    "carrierSlug": "fan-courier",
    "carrierName": "Fan Courier",
    "country": "RO",
    "countryName": "Romania",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^(00|01|02)\\d{10,14}$",
    "validatorName": "",
    "description": "Fan Courier Romania waybill number"
  },
  {
    "carrierSlug": "australia-post",
    "carrierName": "Australia Post",
    "country": "AU",
    "countryName": "Australia",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}AU$",
    "validatorName": "validateUPUS10",
    "description": "Australia Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "japan-post",
    "carrierName": "Japan Post",
    "country": "JP",
    "countryName": "Japan",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}JP$",
    "validatorName": "validateUPUS10",
    "description": "Japan Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "korea-post",
    "carrierName": "Korea Post",
    "country": "KR",
    "countryName": "South Korea",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}KR$",
    "validatorName": "validateUPUS10",
    "description": "Korea Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "india-post",
    "carrierName": "India Post",
    "country": "IN",
    "countryName": "India",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}IN$",
    "validatorName": "validateUPUS10",
    "description": "India Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "singapore-post",
    "carrierName": "Singapore Post",
    "country": "SG",
    "countryName": "Singapore",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}SG$",
    "validatorName": "validateUPUS10",
    "description": "Singapore Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "new-zealand-post",
    "carrierName": "New Zealand Post",
    "country": "NZ",
    "countryName": "New Zealand",
    "carrierType": "CarrierTypePostal",
    "priority": 86,
    "confidenceBase": 0.96,
    "pattern": "^[A-Z]{2}\\d{9}NZ$",
    "validatorName": "validateUPUS10",
    "description": "New Zealand Post UPU S10 tracking format"
  },
  {
    "carrierSlug": "ninja-van",
    "carrierName": "Ninja Van",
    "country": "SG",
    "countryName": "Singapore",
    "carrierType": "CarrierTypeExpress",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^(NIN|NINJA|NVAU|NVSG|NVPH|NVMY)[0-9A-Z]{8,16}$",
    "validatorName": "",
    "description": "Ninja Van southeast asia parcel format"
  },
  {
    "carrierSlug": "delhivery",
    "carrierName": "Delhivery",
    "country": "IN",
    "countryName": "India",
    "carrierType": "CarrierTypeExpress",
    "priority": 84,
    "confidenceBase": 0.93,
    "pattern": "^(DEL|DLV)\\d{10,14}$",
    "validatorName": "",
    "description": "Delhivery express barcode"
  },
  {
    "carrierSlug": "speedpak",
    "carrierName": "SpeedPAK",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 87,
    "confidenceBase": 0.96,
    "pattern": "^(EE|ES)\\d{16}$",
    "validatorName": "",
    "description": "SpeedPAK Orange Connex tracking format (EE/ES prefix)"
  },
  {
    "carrierSlug": "pitney-bowes",
    "carrierName": "Pitney Bowes",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeLogistics",
    "priority": 86,
    "confidenceBase": 0.95,
    "pattern": "^(UPAAB|PB|PBI)\\d{10,16}$",
    "validatorName": "",
    "description": "Pitney Bowes Global Shipping Program barcode"
  },
  {
    "carrierSlug": "aramex",
    "carrierName": "Aramex",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeExpress",
    "priority": 74,
    "confidenceBase": 0.86,
    "pattern": "^(AWB\\d{8,11}|\\d{11})$",
    "validatorName": "",
    "description": "Aramex international waybill barcode"
  },
  {
    "carrierSlug": "landmark-global",
    "carrierName": "Landmark Global",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^(LTN|LDN)\\d{8,12}$",
    "validatorName": "",
    "description": "Landmark Global tracking format"
  },
  {
    "carrierSlug": "wanbexpress",
    "carrierName": "WANBExpress",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 85,
    "confidenceBase": 0.94,
    "pattern": "^WNB[0-9A-Z]{10,16}$",
    "validatorName": "",
    "description": "WANBExpress cross-border format"
  },
  {
    "carrierSlug": "winit",
    "carrierName": "Winit",
    "country": "GLOBAL",
    "countryName": "International",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 84,
    "confidenceBase": 0.93,
    "pattern": "^(ID|WN)\\d{10,16}$",
    "validatorName": "",
    "description": "Winit cross-border tracking number"
  },
  {
    "carrierSlug": "nacex-spain",
    "carrierName": "Nacex",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^(NCX[0-9A-Z]{7,12}|\\d{4}\\d{7})$",
    "validatorName": "",
    "description": "Nacex Spain tracking number (NCX... or 11 digits)"
  },
  {
    "carrierSlug": "tipsa",
    "carrierName": "TIPSA",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^TIP[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "TIPSA Spain parcel tracking code"
  },
  {
    "carrierSlug": "zeleris",
    "carrierName": "Zeleris",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^ZEL[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Zeleris express tracking number"
  },
  {
    "carrierSlug": "sending-es",
    "carrierName": "Sending",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^SND[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Sending Spain parcel code"
  },
  {
    "carrierSlug": "celeritas",
    "carrierName": "Celeritas Transporte",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeLogistics",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^CEL[0-9A-Z]{8,14}$",
    "validatorName": "",
    "description": "Celeritas tracking code"
  },
  {
    "carrierSlug": "envialia",
    "carrierName": "Envialia",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^(ENV[0-9A-Z]{7,12}|010\\d{8,10})$",
    "validatorName": "",
    "description": "Envialia parcel tracking number"
  },
  {
    "carrierSlug": "asm-gls-spain",
    "carrierName": "GLS Spain (ASM)",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 81,
    "confidenceBase": 0.91,
    "pattern": "^ASM[0-9A-Z]{8,14}$",
    "validatorName": "",
    "description": "GLS Spain / ASM express barcode"
  },
  {
    "carrierSlug": "ontime",
    "carrierName": "Ontime",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^ONT[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Ontime parcel tracking number"
  },
  {
    "carrierSlug": "packlink",
    "carrierName": "Packlink",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeLogistics",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^(ES\\d{10,12}[A-Z]{0,2}|PL[0-9A-Z]{8,14})$",
    "validatorName": "",
    "description": "Packlink tracking code"
  },
  {
    "carrierSlug": "asendia-es",
    "carrierName": "Asendia Spain",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeCrossBorder",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^(AE\\d{9,16}|EPA\\d{9,16})$",
    "validatorName": "",
    "description": "Asendia Spain cross-border parcel number"
  },
  {
    "carrierSlug": "asigna-es",
    "carrierName": "Asigna",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^ASG[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Asigna parcel tracking code"
  },
  {
    "carrierSlug": "activos24",
    "carrierName": "Activos24",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^ACT[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Activos24 shipment tracking number"
  },
  {
    "carrierSlug": "instapack-es",
    "carrierName": "Instapack",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^IPK[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Instapack courier parcel number"
  },
  {
    "carrierSlug": "mbe-es",
    "carrierName": "Mail Boxes Etc. Spain",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeExpress",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^MBE[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Mail Boxes Etc. Spain parcel code"
  },
  {
    "carrierSlug": "redur-spain",
    "carrierName": "Redur Spain",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeLogistics",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^RDR[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Redur Spain standard albaran code"
  },
  {
    "carrierSlug": "redur-spain-ref",
    "carrierName": "Redur Spain Reference",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeLogistics",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^REF[0-9A-Z]{7,12}$",
    "validatorName": "",
    "description": "Redur Spain customer reference format"
  },
  {
    "carrierSlug": "redur-tracking",
    "carrierName": "Redur Tracking",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeLogistics",
    "priority": 80,
    "confidenceBase": 0.9,
    "pattern": "^RD\\d{10,12}$",
    "validatorName": "",
    "description": "Redur standard tracking format"
  },
  {
    "carrierSlug": "inpost-es",
    "carrierName": "InPost Spain",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeLogistics",
    "priority": 76,
    "confidenceBase": 0.86,
    "pattern": "^6\\d{23}$",
    "validatorName": "",
    "description": "InPost Spain 24-digit locker barcode"
  },
  {
    "carrierSlug": "dhl-parcel-es",
    "carrierName": "DHL Parcel Spain",
    "country": "ES",
    "countryName": "Spain",
    "carrierType": "CarrierTypeLogistics",
    "priority": 83,
    "confidenceBase": 0.94,
    "pattern": "^(JJD\\d{16,18}|JJ\\d{16}|0034043\\d{11})$",
    "validatorName": "",
    "description": "DHL Parcel Spain barcode format"
  }
];

const COMPILED_RULES: PatternRuleInternal[] = RAW_RULES.map((r) => {
  const [minLen, maxLen] = deriveRegexLengthBounds(r.pattern);
  const regex = new RegExp(r.pattern);

  let digitsOnly = false;
  if (!r.pattern.includes('|') && !r.pattern.includes('-') && (r.pattern.startsWith('^\\d{') || r.pattern.startsWith('^[0-9]{')) && r.pattern.endsWith('$')) {
    digitsOnly = true;
  }

  let requiresAlpha = false;
  if (!r.pattern.includes('|')) {
    if (r.pattern.startsWith('^1Z') || r.pattern.startsWith('^[A-Z]') || r.pattern.startsWith('^MSCU') || r.pattern.startsWith('^CMAU')) {
      requiresAlpha = true;
    }
  }

  return {
    carrierSlug: r.carrierSlug,
    carrierName: r.carrierName,
    country: r.country,
    countryName: r.countryName,
    priority: r.priority,
    confidenceBase: r.confidenceBase,
    regex,
    validator: r.validatorName ? VALIDATOR_MAP[r.validatorName] : undefined,
    description: r.description,
    minLen,
    maxLen,
    digitsOnly,
    requiresAlpha,
  };
});

function isDigitsOnly(s: string): boolean {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 48 || code > 57) return false;
  }
  return true;
}

/**
 * Real-time carrier auto-detection engine
 * Analyzes format, lengths, prefixes, mathematical checksums, and destination country boost.
 * Exactly mirrors Open Parcels Go Engine (pkg/detector/detector.go).
 */
export function detectCandidateCarriers(
  rawNumber: string,
  countryHint?: string
): DetectedCarrier[] {
  const clean = cleanTrackingNumber(rawNumber);
  if (!clean) return [];

  const cleanLen = clean.length;
  const cleanIsDigits = isDigitsOnly(clean);
  const destUpper = (countryHint || '').trim().toUpperCase();

  const scoredCandidates: {
    result: DetectedCarrier;
    priority: number;
  }[] = [];
  const seenCarrier = new Set<string>();

  for (const rule of COMPILED_RULES) {
    // Fast pre-filter: length bounds
    if (rule.minLen > 0 && cleanLen < rule.minLen) continue;
    if (rule.maxLen > 0 && cleanLen > rule.maxLen) continue;

    // Fast pre-filter: character set constraints
    if (rule.digitsOnly && !cleanIsDigits) continue;
    if (rule.requiresAlpha && cleanIsDigits) continue;

    if (!rule.regex.test(clean)) continue;

    let conf = rule.confidenceBase;
    if (rule.validator) {
      if (!rule.validator(clean)) {
        conf = Math.max(0.3, conf - 0.2);
      } else {
        conf = Math.min(1.0, conf + 0.05);
      }
    }

    // Boost confidence if country matches destination hint (+0.35)
    if (destUpper && rule.country) {
      if (
        rule.country.toUpperCase() === destUpper ||
        (destUpper === 'SM' && rule.country === 'IT') ||
        (destUpper === 'IT' && rule.country === 'SM')
      ) {
        conf = Math.min(1.0, conf + 0.35);
      } else if (rule.country !== 'GLOBAL' && rule.country !== 'CN') {
        // Slight penalty if carrier is country-specific and does not match hint
        conf = Math.max(0.3, conf - 0.1);
      }
    }

    if (seenCarrier.has(rule.carrierSlug)) {
      continue;
    }
    seenCarrier.add(rule.carrierSlug);

    const carrierObj = findCarrierBySlug(rule.carrierSlug);
    // Enrich with rule metadata if not in static catalog
    if (!carrierObj.country && rule.country) carrierObj.country = rule.country;
    if (!carrierObj.countryName && rule.countryName) carrierObj.countryName = rule.countryName;

    scoredCandidates.push({
      result: {
        carrier: carrierObj,
        confidence: Math.round(conf * 1000) / 1000,
        matchedRule: rule.description,
        reason: 'Matched pattern: ' + rule.description,
      },
      priority: rule.priority,
    });
  }

  // Sort candidates by confidence descending with priority tie-breaker
  scoredCandidates.sort((a, b) => {
    const diff = a.result.confidence - b.result.confidence;
    if (Math.abs(diff) > 0.0001) {
      return b.result.confidence - a.result.confidence;
    }
    return b.priority - a.priority;
  });

  return scoredCandidates.map((c) => c.result);
}

/**
 * Returns the highest confidence carrier match or null
 */
export function bestMatch(
  rawNumber: string,
  countryHint?: string
): DetectedCarrier | null {
  const matches = detectCandidateCarriers(rawNumber, countryHint);
  return matches.length > 0 ? matches[0] : null;
}
