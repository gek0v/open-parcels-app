import { ITrackingEngine } from './ITrackingEngine';
import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { Parcel, TrackRequestParams } from '../../domain/models/parcel';
import { CanonicalStatus, CANONICAL_STATUS_MAP } from '../../domain/models/status';
import {
  CARRIERS_CATALOG,
  detectCandidateCarriers,
  findCarrierBySlug,
} from '../../domain/validators/detection';
import { TrackingEngineError } from './errors';
import { getLocalizedStatusText } from './mapper';
import { fetchInPostLive, fetchInPostItalyShipXLive } from './inpostLive';
import { fetchCorreosSpainLive, fetchCorreosExpressLive } from './correosLive';
import { fetchGLSSpainLive, fetchSEURLive } from './spainCouriersLive';

export class LocalTrackingEngine implements ITrackingEngine {
  readonly engineName = 'Open Parcels Embedded (Local-First)';
  readonly isLocal = true;

  async getCarriers(): Promise<Carrier[]> {
    return CARRIERS_CATALOG;
  }

  async detect(trackingNumber: string, countryHint?: string): Promise<DetectedCarrier[]> {
    return detectCandidateCarriers(trackingNumber, countryHint);
  }

  async track(params: TrackRequestParams): Promise<Parcel> {
    const rawNumber = params.trackingNumber.trim();
    if (!rawNumber) {
      throw new TrackingEngineError(
        'El número de seguimiento no puede estar vacío',
        'MISSING_NUMBER',
        400
      );
    }

    if (params.carrierHint) {
      const selectedCarrier = findCarrierBySlug(params.carrierHint);
      return await this.executeTrackForCarrier(rawNumber, selectedCarrier, params);
    }

    // Auto-detection mode (commit 2faeace / PR #70):
    // Fallback across candidate carriers if primary candidate fails with POSTAL_CODE_REQUIRED or SHIPMENT_NOT_FOUND
    const candidates = await this.detect(rawNumber, params.destinationCountry);
    let primaryCarrier: Carrier;

    if (candidates.length > 0) {
      const liveCandidate = candidates.find((c) => c.carrier.hasLiveTracking);
      primaryCarrier = liveCandidate ? liveCandidate.carrier : candidates[0].carrier;
    } else {
      primaryCarrier = {
        slug: 'unknown',
        name: 'Desconocido',
        country: 'GLOBAL',
      };
    }

    try {
      return await this.executeTrackForCarrier(rawNumber, primaryCarrier, params);
    } catch (err) {
      if (
        candidates.length > 1 &&
        err instanceof TrackingEngineError &&
        (err.code === 'POSTAL_CODE_REQUIRED' || err.code === 'SHIPMENT_NOT_FOUND')
      ) {
        for (const candidate of candidates) {
          if (candidate.carrier.slug === primaryCarrier.slug) continue;
          try {
            return await this.executeTrackForCarrier(rawNumber, candidate.carrier, params);
          } catch (fallbackErr) {
            if (
              fallbackErr instanceof TrackingEngineError &&
              (fallbackErr.code === 'POSTAL_CODE_REQUIRED' ||
                fallbackErr.code === 'SHIPMENT_NOT_FOUND')
            ) {
              continue;
            }
            throw fallbackErr;
          }
        }
      }
      throw err;
    }
  }

  private async executeTrackForCarrier(
    rawNumber: string,
    selectedCarrier: Carrier,
    params: TrackRequestParams
  ): Promise<Parcel> {
    if (selectedCarrier.requiresPostalCode && !params.postalCode?.trim()) {
      throw new TrackingEngineError(
        `Código postal obligatorio para ${selectedCarrier.name}`,
        'POSTAL_CODE_REQUIRED',
        422
      );
    }

    if (params.allowSimulated === false && !selectedCarrier.hasLiveTracking) {
      throw new TrackingEngineError(
        `El transportista ${selectedCarrier.name} no dispone de adaptador en vivo`,
        'CARRIER_NOT_IMPLEMENTED',
        501
      );
    }

    const slug = selectedCarrier.slug;
    const postalCode = params.postalCode?.trim() || '';

    // Real live tracking for InPost / Mondial Relay
    if (slug === 'inpost' || slug === 'inpost-es') {
      try {
        return await fetchInPostLive(
          rawNumber,
          postalCode,
          selectedCarrier,
          params.destinationCountry,
          params.lang
        );
      } catch (err) {
        if (err instanceof TrackingEngineError && err.code === 'POSTAL_CODE_REQUIRED') {
          throw err;
        }
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('InPost live fetch failed, falling back to canonical pending record:', err);
      }
    }

    // Real live tracking for InPost Italy (ShipX)
    if (slug === 'inpost-it') {
      try {
        return await fetchInPostItalyShipXLive(rawNumber, selectedCarrier, params.lang);
      } catch (err) {
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('InPost Italy live fetch failed, falling back to canonical pending record:', err);
      }
    }

    // Real live tracking for Correos España
    if (slug === 'correos-spain') {
      try {
        return await fetchCorreosSpainLive(rawNumber, selectedCarrier, params.lang);
      } catch (err) {
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('Correos Spain live fetch failed, falling back to canonical pending record:', err);
      }
    }

    // Real live tracking for Correos Express
    if (slug === 'correosexpress') {
      try {
        return await fetchCorreosExpressLive(rawNumber, selectedCarrier, params.lang);
      } catch (err) {
        if (err instanceof TrackingEngineError && err.code === 'POSTAL_CODE_REQUIRED') {
          throw err;
        }
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('Correos Express live fetch failed, falling back to canonical pending record:', err);
      }
    }

    // Real live tracking for GLS Spain
    if (slug === 'asm-gls-spain') {
      try {
        return await fetchGLSSpainLive(rawNumber, postalCode, selectedCarrier, params.lang);
      } catch (err) {
        if (err instanceof TrackingEngineError && err.code === 'POSTAL_CODE_REQUIRED') {
          throw err;
        }
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('GLS Spain live fetch failed, falling back to canonical pending record:', err);
      }
    }

    // Real live tracking for SEUR
    if (slug === 'seur') {
      try {
        return await fetchSEURLive(rawNumber, postalCode, selectedCarrier, params.lang);
      } catch (err) {
        if (err instanceof TrackingEngineError && err.code === 'POSTAL_CODE_REQUIRED') {
          throw err;
        }
        if (params.allowSimulated === false) {
          throw err;
        }
        console.warn('SEUR live fetch failed, falling back to canonical pending record:', err);
      }
    }

    // Canonical initial tracking record when live tracking is unavailable or fails
    const now = new Date();
    const nowIso = now.toISOString();
    const status: CanonicalStatus = 'pending';

    const trackingUrl = selectedCarrier.trackingUrl
      ? selectedCarrier.trackingUrl.replace('%s', encodeURIComponent(rawNumber))
      : selectedCarrier.website;

    const carrierWithResolvedUrl: Carrier = {
      ...selectedCarrier,
      ...(trackingUrl ? { trackingUrl } : {}),
    };

    return {
      id: 'p-' + Math.random().toString(36).substring(2, 9),
      trackingNumber: rawNumber,
      carrier: carrierWithResolvedUrl,
      status,
      statusText: getLocalizedStatusText(status, params.lang),
      progress: CANONICAL_STATUS_MAP[status].baseProgress,
      origin: selectedCarrier.country
        ? { code: selectedCarrier.country, name: selectedCarrier.countryName || selectedCarrier.country }
        : undefined,
      destination: params.destinationCountry
        ? { code: params.destinationCountry, name: params.destinationCountry }
        : undefined,
      postalCode: postalCode || undefined,
      daysInTransit: 0,
      fromCache: false,
      isLiveData: false,
      events: [],
      updatedAt: nowIso,
      createdAt: nowIso,
      isArchived: false,
    };
  }
}
