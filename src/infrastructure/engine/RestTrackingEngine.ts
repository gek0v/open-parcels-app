import { ITrackingEngine } from './ITrackingEngine';
import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { Parcel, TrackRequestParams, TrackResponsePayload } from '../../domain/models/parcel';
import { CARRIERS_CATALOG, findCarrierBySlug } from '../../domain/validators/detection';
import { CANONICAL_STATUS_MAP } from '../../domain/models/status';

export class RestTrackingEngine implements ITrackingEngine {
  readonly engineName = 'Open Parcels REST API Daemon';
  readonly isLocal = false;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async getCarriers(): Promise<Carrier[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/carriers`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      return data.carriers || CARRIERS_CATALOG;
    } catch {
      return CARRIERS_CATALOG;
    }
  }

  async detect(trackingNumber: string, countryHint?: string): Promise<DetectedCarrier[]> {
    try {
      const countryParam = countryHint ? `&country=${encodeURIComponent(countryHint)}` : '';
      const res = await fetch(
        `${this.baseUrl}/api/v1/detect?number=${encodeURIComponent(trackingNumber)}${countryParam}`
      );
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      return (data.candidates || []).map((c: any) => ({
        carrier: findCarrierBySlug(c.slug || c.carrier?.slug),
        confidence: c.confidence || 0.9,
        matchedRule: c.matched_rule || 'API Detection',
      }));
    } catch {
      return [];
    }
  }

  async track(params: TrackRequestParams): Promise<Parcel> {
    const payload = {
      tracking_number: params.trackingNumber,
      carrier_hint: params.carrierHint,
      postal_code: params.postalCode,
      destination_country: params.destinationCountry,
      lang: params.lang || 'es',
    };

    const res = await fetch(`${this.baseUrl}/api/v1/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const err = new Error(errorJson.error || `Error ${res.status} al rastrear paquete`);
      (err as any).code = errorJson.code || 'UNKNOWN_ERROR';
      throw err;
    }

    const data: TrackResponsePayload = await res.json();

    const parcel: Parcel = {
      id: 'p-' + Math.random().toString(36).substring(2, 9),
      trackingNumber: data.tracking_number,
      carrier: findCarrierBySlug(data.carrier.slug),
      additionalCarriers: data.additional_carriers?.map((c) => findCarrierBySlug(c.slug)),
      lastMileCarrier: data.last_mile_carrier
        ? findCarrierBySlug(data.last_mile_carrier.slug)
        : undefined,
      status: data.status,
      statusText: data.status_text || CANONICAL_STATUS_MAP[data.status]?.labelEs || data.status,
      progress: data.progress,
      origin: data.origin,
      destination: data.destination,
      deliveredAt: data.delivered_at,
      daysInTransit: data.days_in_transit,
      events: data.events.map((e, idx) => ({
        id: `ev-${idx}-${Date.now()}`,
        date: e.date,
        status: e.status,
        stage: (e.stage as any) || 'transit',
        description: e.description,
        location: e.location,
        carrierSlug: e.carrier_slug,
        carrierName: e.carrier_name,
        eventCode: e.event_code,
      })),
      updatedAt: data.updated_at || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isArchived: false,
    };

    return parcel;
  }
}
