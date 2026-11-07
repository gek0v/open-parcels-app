import { Carrier } from './carrier';
import { CanonicalStatus } from './status';
import { TrackingEvent } from './event';

export interface CountryRef {
  code: string; // ISO 3166-1 alpha-2 (e.g. "ES", "CN", "US")
  name: string;
}

export interface Parcel {
  id: string; // Internal local UUID
  trackingNumber: string;
  customAlias?: string; // e.g. "Zapatillas Nike"
  carrier: Carrier;
  additionalCarriers?: Carrier[]; // For chained multi-carrier international journeys
  lastMileCarrier?: Carrier; // Local last-mile carrier (e.g. Correos Express)
  status: CanonicalStatus;
  statusText: string;
  progress: number; // 0 to 100
  origin?: CountryRef;
  destination?: CountryRef;
  postalCode?: string;
  deliveredAt?: string | null;
  daysInTransit: number;
  events: TrackingEvent[];
  updatedAt: string; // ISO-8601
  createdAt: string; // ISO-8601
  isArchived: boolean;
  notes?: string;
}

export interface TrackRequestParams {
  trackingNumber: string;
  carrierHint?: string;
  postalCode?: string;
  destinationCountry?: string;
  lang?: 'es' | 'en';
}

export interface TrackResponsePayload {
  tracking_number: string;
  carrier: {
    slug: string;
    name: string;
    website?: string;
  };
  additional_carriers?: {
    slug: string;
    name: string;
    website?: string;
  }[];
  last_mile_carrier?: {
    slug: string;
    name: string;
    website?: string;
  };
  status: CanonicalStatus;
  status_text: string;
  progress: number;
  origin?: { code: string; name: string };
  destination?: { code: string; name: string };
  delivered_at?: string | null;
  events: {
    date: string;
    status: CanonicalStatus;
    stage: string;
    description: string;
    location?: string;
    carrier_slug: string;
    carrier_name: string;
    event_code?: string;
  }[];
  days_in_transit: number;
  updated_at: string;
}
