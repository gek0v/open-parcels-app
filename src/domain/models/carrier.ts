export type CarrierType =
  | 'postal'
  | 'express'
  | 'logistics'
  | 'freight'
  | 'cross_border'
  | string;

export interface CarrierCapabilities {
  requiresPostalCode?: boolean;
  requiresAuth?: boolean;
  supportsProofOfDelivery?: boolean;
  supportsLiveApi?: boolean;
  supportsWebScraping?: boolean;
}

export interface Carrier {
  slug: string;
  name: string;
  country?: string; // ISO-2 e.g. 'ES', 'CN', 'US', 'GLOBAL'
  countryName?: string;
  type?: CarrierType;
  website?: string;
  trackingUrl?: string; // Template e.g. 'https://...%s'
  phone?: string;
  logoUrl?: string;
  requiresPostalCode?: boolean;
  requiresAuth?: boolean;
  isLiveData?: boolean;
  hasLiveTracking?: boolean;
  capabilities?: CarrierCapabilities;
  region?: 'es' | 'eu' | 'china' | 'us' | 'latam' | 'global' | string;
  color?: string;
}

export interface DetectedCarrier {
  carrier: Carrier;
  confidence: number; // 0.0 to 1.0
  matchedRule: string;
  reason?: string;
}
