import { Carrier } from './carrier';
import { CanonicalStatus } from './status';
import { TrackingEvent } from './event';

export interface CountryRef {
  code: string; // ISO 3166-1 alpha-2 (e.g. 'ES', 'CN', 'US')
  name: string;
}

export interface FlightLeg {
  flightNumber?: string;
  origin?: string;
  destination?: string;
  status?: string;
  scheduledDepartureDate?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
  actualDeparture?: string;
  actualArrival?: string;
}

export interface FlightLegPayload {
  flight_number?: string;
  origin?: string;
  destination?: string;
  status?: string;
  scheduled_departure_date?: string;
  scheduled_departure?: string;
  scheduled_arrival?: string;
  actual_departure?: string;
  actual_arrival?: string;
}

export interface Parcel {
  id: string; // Internal local UUID
  trackingNumber: string;
  customAlias?: string; // e.g. 'Zapatillas Nike'
  carrier: Carrier;
  additionalCarriers?: Carrier[]; // For chained multi-carrier international journeys
  lastMileTrackingNumber?: string;
  lastMileCarrier?: Carrier; // Local last-mile carrier (e.g. Correos Express)
  status: CanonicalStatus;
  statusText: string;
  progress: number; // 0 to 100
  origin?: CountryRef;
  destination?: CountryRef;
  postalCode?: string;
  estimatedDelivery?: string | null;
  deliveredAt?: string | null;
  daysInTransit: number;
  weight?: string;
  serviceType?: string;
  flightLegs?: FlightLeg[];
  fromCache?: boolean;
  isLiveData?: boolean;
  events: TrackingEvent[];
  updatedAt: string; // ISO-8601
  createdAt: string; // ISO-8601
  isArchived: boolean;
  notes?: string;
  error?: string;
}

export interface TrackRequestParams {
  trackingNumber: string;
  carrierHint?: string;
  postalCode?: string;
  destinationCountry?: string;
  lang?: 'es' | 'en' | string;
  allowSimulated?: boolean;
  forceRefresh?: boolean;
  email?: string;
  phone?: string;
  additionalFields?: Record<string, string>;
}

export interface TrackCarrierPayload {
  slug: string;
  name: string;
  country?: string;
  country_name?: string;
  type?: string;
  website?: string;
  tracking_url?: string;
  phone?: string;
  logo?: string;
}

export interface TrackResponsePayload {
  tracking_number: string;
  carrier: TrackCarrierPayload;
  additional_carriers?: TrackCarrierPayload[];
  last_mile_tracking_number?: string;
  last_mile_carrier?: TrackCarrierPayload | null;
  status: CanonicalStatus;
  status_text: string;
  progress: number;
  origin?: { code: string; name: string };
  destination?: { code: string; name: string };
  estimated_delivery?: string | null;
  delivered_at?: string | null;
  events: {
    date: string;
    raw_date?: string;
    status: CanonicalStatus;
    stage: string;
    description: string;
    location?: string;
    carrier_slug: string;
    carrier_name: string;
    event_code?: string;
    carrier_index?: number;
  }[];
  days_in_transit: number;
  weight?: string;
  service_type?: string;
  flight_legs?: FlightLegPayload[];
  from_cache?: boolean;
  is_live_data?: boolean;
  updated_at: string;
  error?: string;
}
