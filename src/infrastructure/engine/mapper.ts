import { Carrier } from '../../domain/models/carrier';
import { EventStage, TrackingEvent } from '../../domain/models/event';
import {
  FlightLeg,
  FlightLegPayload,
  Parcel,
  TrackCarrierPayload,
  TrackRequestParams,
  TrackResponsePayload,
} from '../../domain/models/parcel';
import { CanonicalStatus, CANONICAL_STATUS_MAP } from '../../domain/models/status';
import { findCarrierBySlug } from '../../domain/validators/detection';

export interface ParcelsAppShipmentIn {
  tracking_number: string;
  destination_country?: string;
  carrier_hint?: string;
  postal_code?: string;
  allow_simulated?: boolean;
  email?: string;
  phone?: string;
  additional_fields?: Record<string, string>;
}

export interface ParcelsAppTrackingRequest {
  language?: string;
  webhook_url?: string;
  shipments: ParcelsAppShipmentIn[];
}

export interface ParcelsAppStateItem {
  state: string;
  location?: string;
  date: string;
  carrier: number;
}

export interface ParcelsAppServiceItem {
  slug: string;
  name: string;
}

export interface ParcelsAppAttribute {
  l: string;
  val: string;
  code?: string;
}

export interface ParcelsAppExternalTrack {
  slug: string;
  url: string;
  trackingId: string;
  method: string;
}

export interface ParcelsAppShipment {
  trackingId: string;
  status: string;
  origin?: string;
  destination?: string;
  originCode?: string;
  destinationCode?: string;
  states: ParcelsAppStateItem[];
  services: ParcelsAppServiceItem[];
  detectedCarrier: ParcelsAppServiceItem;
  detected?: number[];
  daysInTransit?: number;
  attributes?: ParcelsAppAttribute[];
  externalTracking?: ParcelsAppExternalTrack[];
  flight_legs?: FlightLegPayload[];
  error?: string;
}

export interface ParcelsAppResultItem {
  tracking_number: string;
  state: string;
  from_cache: boolean;
  shipment?: ParcelsAppShipment;
}

export interface ParcelsAppRejected {
  index: number;
  tracking_number?: string;
  code: string;
  message: string;
}

export interface ParcelsAppResponse {
  request_id: string;
  status: string; // 'completed' | 'processing'
  done: boolean;
  expires_at: string;
  results: ParcelsAppResultItem[];
  rejected?: ParcelsAppRejected[];
}

const VALID_STAGES = new Set<EventStage>([
  'created',
  'picked_up',
  'pickup',
  'transit',
  'customs',
  'handover',
  'last_mile',
  'delivery',
  'completed',
  'exception',
]);

export function normalizeEventStage(rawStage?: string): EventStage {
  const s = (rawStage || '').trim().toLowerCase() as EventStage;
  if (VALID_STAGES.has(s)) {
    return s;
  }
  return 'transit';
}

export function normalizeCanonicalStatus(rawStatus?: string): CanonicalStatus {
  const s = (rawStatus || '').trim().toLowerCase();
  if (s in CANONICAL_STATUS_MAP) {
    return s as CanonicalStatus;
  }
  if (s === 'in transit' || s === 'intransit' || s === 'transit') {
    return 'in_transit';
  }
  if (
    s === 'out for delivery' ||
    s === 'outfordelivery' ||
    s === 'available_for_pickup' ||
    s === 'ready_for_pickup'
  ) {
    return 'out_for_delivery';
  }
  if (s === 'info received' || s === 'inforeceived' || s === 'pre_transit' || s === 'created') {
    return 'info_received';
  }
  if (s === 'failed attempt' || s === 'failedattempt' || s === 'delivery_attempted') {
    return 'failed_attempt';
  }
  return 'pending';
}

export function inferStatusFromDescription(
  description: string,
  fallbackStatus: CanonicalStatus = 'in_transit'
): { status: CanonicalStatus; stage: EventStage } {
  const d = (description || '').toLowerCase();

  if (
    d.includes('out for delivery') ||
    d.includes('en reparto') ||
    d.includes('being delivered') ||
    d.includes('to be delivered') ||
    d.includes('in consegna') ||
    d.includes('repartidor')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }

  if (
    !d.includes('undelivered') &&
    !d.includes('not delivered') &&
    !d.includes('attempted') &&
    (d.includes('delivered') ||
      d.includes('entregado') ||
      d.includes('consegnat') ||
      d.includes('livré') ||
      d.includes('zugestellt'))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }

  if (
    d.includes('failed attempt') ||
    d.includes('ausente') ||
    d.includes('missed delivery') ||
    d.includes('notice left')
  ) {
    return { status: 'failed_attempt', stage: 'last_mile' };
  }

  if (
    d.includes('exception') ||
    d.includes('retenido') ||
    d.includes('incidencia') ||
    d.includes('undeliverable')
  ) {
    return { status: 'exception', stage: 'exception' };
  }

  if (d.includes('customs') || d.includes('aduana') || d.includes('clearance')) {
    return { status: 'in_transit', stage: 'customs' };
  }

  if (d.includes('hand over') || d.includes('handed over') || d.includes('transferred to')) {
    return { status: 'in_transit', stage: 'handover' };
  }

  if (d.includes('picked up') || d.includes('admitido')) {
    return { status: 'in_transit', stage: 'picked_up' };
  }

  if (
    d.includes('information received') ||
    d.includes('pre-registrado') ||
    d.includes('pre-registered') ||
    d.includes('label created')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  return { status: fallbackStatus, stage: 'transit' };
}

export function mapCarrierFromApi(payload: TrackCarrierPayload): Carrier {
  const base = findCarrierBySlug(payload.slug);
  return {
    ...base,
    slug: payload.slug || base.slug,
    name: payload.name || base.name,
    country: payload.country || base.country,
    countryName: payload.country_name || base.countryName,
    type: payload.type || base.type,
    website: payload.website || base.website,
    trackingUrl: payload.tracking_url || base.trackingUrl,
    phone: payload.phone || base.phone,
    logoUrl: payload.logo || base.logoUrl,
  };
}

export function mapFlightLegFromApi(leg: FlightLegPayload): FlightLeg {
  return {
    flightNumber: leg.flight_number,
    origin: leg.origin,
    destination: leg.destination,
    status: leg.status,
    scheduledDepartureDate: leg.scheduled_departure_date,
    scheduledDeparture: leg.scheduled_departure,
    scheduledArrival: leg.scheduled_arrival,
    actualDeparture: leg.actual_departure,
    actualArrival: leg.actual_arrival,
  };
}

export function getLocalizedStatusText(status: CanonicalStatus, lang?: string): string {
  const meta = CANONICAL_STATUS_MAP[status] || CANONICAL_STATUS_MAP.pending;
  return (lang || 'es').toLowerCase().startsWith('en') ? meta.labelEn : meta.labelEs;
}

export function mapTrackResponseToParcel(
  data: TrackResponsePayload,
  params?: Partial<TrackRequestParams>
): Parcel {
  const nowIso = new Date().toISOString();
  const status = normalizeCanonicalStatus(data.status);

  const events: TrackingEvent[] = (data.events || []).map((e, idx) => ({
    id: `ev-${idx}-${e.date || e.event_code || 'nodate'}`,
    date: e.date,
    rawDate: e.raw_date,
    status: normalizeCanonicalStatus(e.status),
    stage: normalizeEventStage(e.stage),
    description: e.description,
    location: e.location,
    carrierSlug: e.carrier_slug,
    carrierName: e.carrier_name,
    eventCode: e.event_code,
    carrierIndex: e.carrier_index,
  }));

  return {
    id: 'p-' + Math.random().toString(36).substring(2, 9),
    trackingNumber: data.tracking_number,
    carrier: mapCarrierFromApi(data.carrier),
    additionalCarriers: data.additional_carriers?.map(mapCarrierFromApi),
    lastMileTrackingNumber: data.last_mile_tracking_number || undefined,
    lastMileCarrier: data.last_mile_carrier
      ? mapCarrierFromApi(data.last_mile_carrier)
      : undefined,
    status,
    statusText: data.status_text || getLocalizedStatusText(status, params?.lang),
    progress:
      typeof data.progress === 'number'
        ? data.progress
        : CANONICAL_STATUS_MAP[status].baseProgress,
    origin: data.origin,
    destination: data.destination,
    postalCode: params?.postalCode,
    estimatedDelivery: data.estimated_delivery ?? undefined,
    deliveredAt: data.delivered_at ?? undefined,
    daysInTransit: typeof data.days_in_transit === 'number' ? data.days_in_transit : 0,
    weight: data.weight || undefined,
    serviceType: data.service_type || undefined,
    flightLegs: data.flight_legs?.map(mapFlightLegFromApi),
    fromCache: data.from_cache,
    isLiveData: data.is_live_data,
    events,
    updatedAt: data.updated_at || nowIso,
    createdAt: nowIso,
    isArchived: false,
    error: data.error || undefined,
  };
}

export function mapParcelsAppShipmentToParcel(
  item: ParcelsAppResultItem,
  params?: Partial<TrackRequestParams>
): Parcel {
  const nowIso = new Date().toISOString();
  const shipment = item.shipment;
  if (!shipment) {
    throw new Error('Missing shipment payload in ParcelsApp response item.');
  }

  const status = normalizeCanonicalStatus(shipment.status);
  const primaryCarrier = mapCarrierFromApi({
    slug: shipment.detectedCarrier?.slug || params?.carrierHint || 'unknown',
    name: shipment.detectedCarrier?.name || 'Unknown',
  });

  const additionalCarriers = (shipment.services || [])
    .filter((s) => s.slug.toLowerCase() !== primaryCarrier.slug.toLowerCase())
    .map((s) => mapCarrierFromApi({ slug: s.slug, name: s.name }));

  const lastMileCarrier =
    additionalCarriers.length > 0
      ? additionalCarriers[additionalCarriers.length - 1]
      : undefined;

  const events: TrackingEvent[] = (shipment.states || []).map((st, idx) => {
    const svc = shipment.services?.[st.carrier];
    const inferred = inferStatusFromDescription(st.state, status);
    return {
      id: `ev-${idx}-${st.date || 'nodate'}`,
      date: st.date,
      status: inferred.status,
      stage: inferred.stage,
      description: st.state,
      location: st.location || undefined,
      carrierSlug: svc?.slug || primaryCarrier.slug,
      carrierName: svc?.name || primaryCarrier.name,
      carrierIndex: st.carrier,
    };
  });

  const origin =
    shipment.origin || shipment.originCode
      ? { code: shipment.originCode || '', name: shipment.origin || shipment.originCode || '' }
      : undefined;

  const destination =
    shipment.destination || shipment.destinationCode
      ? {
          code: shipment.destinationCode || '',
          name: shipment.destination || shipment.destinationCode || '',
        }
      : undefined;

  const deliveredEvent = events.find((e) => e.status === 'delivered');

  return {
    id: 'p-' + Math.random().toString(36).substring(2, 9),
    trackingNumber: shipment.trackingId || item.tracking_number,
    carrier: primaryCarrier,
    additionalCarriers: additionalCarriers.length > 0 ? additionalCarriers : undefined,
    lastMileCarrier,
    status,
    statusText: getLocalizedStatusText(status, params?.lang),
    progress: CANONICAL_STATUS_MAP[status]?.baseProgress ?? 45,
    origin,
    destination,
    postalCode: params?.postalCode,
    deliveredAt: deliveredEvent ? deliveredEvent.date : undefined,
    daysInTransit: typeof shipment.daysInTransit === 'number' ? shipment.daysInTransit : 0,
    flightLegs: shipment.flight_legs?.map(mapFlightLegFromApi),
    fromCache: item.from_cache,
    isLiveData: !shipment.error,
    events,
    updatedAt: nowIso,
    createdAt: nowIso,
    isArchived: false,
    error: shipment.error || undefined,
  };
}
