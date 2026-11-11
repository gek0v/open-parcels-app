import { ITrackingEngine } from './ITrackingEngine';
import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { Parcel, TrackRequestParams, TrackResponsePayload } from '../../domain/models/parcel';
import { CARRIERS_CATALOG } from '../../domain/validators/detection';
import { TrackingEngineError, normalizeTrackingErrorCode, parseApiError } from './errors';
import {
  ParcelsAppResponse,
  ParcelsAppTrackingRequest,
  mapCarrierFromApi,
  mapParcelsAppShipmentToParcel,
  mapTrackResponseToParcel,
} from './mapper';

export interface AsyncTrackingOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  webhookUrl?: string;
}

export class RestTrackingEngine implements ITrackingEngine {
  readonly engineName = 'Open Parcels REST API Daemon';
  readonly isLocal = false;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  async getCarriers(query?: string): Promise<Carrier[]> {
    try {
      const queryParam = query ? `?query=${encodeURIComponent(query)}` : '';
      const res = await fetch(`${this.baseUrl}/api/v1/carriers${queryParam}`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.carriers)) {
        return CARRIERS_CATALOG;
      }
      return data.carriers.map((c: any) => mapCarrierFromApi(c));
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
      return (data.candidates || []).map((c: any) => {
        const carrierPayload = c.carrier || {
          slug: c.slug || '',
          name: c.name || '',
        };
        return {
          carrier: mapCarrierFromApi(carrierPayload),
          confidence: typeof c.confidence === 'number' ? c.confidence : 0.9,
          matchedRule: c.matched_pattern || c.matched_rule || 'API Detection',
          reason: c.reason,
        };
      });
    } catch {
      return [];
    }
  }

  async track(params: TrackRequestParams): Promise<Parcel> {
    const payload: Record<string, unknown> = {
      tracking_number: params.trackingNumber,
      language: params.lang || 'es',
    };

    if (params.carrierHint) payload.carrier_hint = params.carrierHint;
    if (params.postalCode) payload.postal_code = params.postalCode;
    if (params.destinationCountry) payload.destination_country = params.destinationCountry;
    if (params.allowSimulated !== undefined) payload.allow_simulated = params.allowSimulated;
    if (params.forceRefresh !== undefined) payload.force_refresh = params.forceRefresh;
    if (params.email) payload.email = params.email;
    if (params.phone) payload.phone = params.phone;
    if (params.additionalFields) payload.additional_fields = params.additionalFields;

    const res = await fetch(`${this.baseUrl}/api/v1/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw parseApiError(res.status, errorJson);
    }

    const data: TrackResponsePayload = await res.json();
    return mapTrackResponseToParcel(data, params);
  }

  async getTrackingRequest(requestId: string): Promise<ParcelsAppResponse> {
    const res = await fetch(
      `${this.baseUrl}/trackings/${encodeURIComponent(requestId)}`
    );
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw parseApiError(res.status, errorJson);
    }
    return (await res.json()) as ParcelsAppResponse;
  }

  async trackAsync(
    params: TrackRequestParams,
    options: AsyncTrackingOptions = {}
  ): Promise<Parcel> {
    const pollIntervalMs = options.pollIntervalMs ?? 400;
    const timeoutMs = options.timeoutMs ?? 30000;

    const reqBody: ParcelsAppTrackingRequest = {
      language: params.lang || 'es',
      webhook_url: options.webhookUrl,
      shipments: [
        {
          tracking_number: params.trackingNumber,
          carrier_hint: params.carrierHint,
          destination_country: params.destinationCountry,
          postal_code: params.postalCode,
          allow_simulated: params.allowSimulated,
          email: params.email,
          phone: params.phone,
          additional_fields: params.additionalFields,
        },
      ],
    };

    const res = await fetch(`${this.baseUrl}/trackings?async=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw parseApiError(res.status, errorJson);
    }

    let current = (await res.json()) as ParcelsAppResponse;
    const deadline = Date.now() + timeoutMs;

    while (!current.done && current.status === 'processing') {
      if (Date.now() >= deadline) {
        throw new TrackingEngineError(
          `Tiempo de espera agotado para la solicitud asíncrona ${current.request_id}`,
          'ASYNC_TIMEOUT',
          408
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      current = await this.getTrackingRequest(current.request_id);
    }

    if (
      (!current.results || current.results.length === 0) &&
      Array.isArray(current.rejected) &&
      current.rejected.length > 0
    ) {
      const rej = current.rejected[0];
      throw new TrackingEngineError(
        rej.message || 'Tracking rejected',
        normalizeTrackingErrorCode(rej.code, 422),
        422,
        current.rejected,
        rej.code
      );
    }

    if (!current.results || current.results.length === 0 || !current.results[0].shipment) {
      throw new TrackingEngineError(
        'No se recibieron resultados de seguimiento.',
        'SHIPMENT_NOT_FOUND',
        404
      );
    }

    return mapParcelsAppShipmentToParcel(current.results[0], params);
  }
}
