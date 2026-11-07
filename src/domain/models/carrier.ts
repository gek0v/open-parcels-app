export interface Carrier {
  slug: string;
  name: string;
  website?: string;
  logoUrl?: string;
  requiresPostalCode?: boolean;
  region?: 'es' | 'eu' | 'china' | 'us' | 'latam' | 'global';
  color?: string;
}

export interface DetectedCarrier {
  carrier: Carrier;
  confidence: number; // 0.0 to 1.0 (e.g. 0.98 for 98%)
  matchedRule: string; // e.g. "UPU S10 (Mod 11)", "UPS 1Z (Mod 10)", "InPost 24-digit"
}
