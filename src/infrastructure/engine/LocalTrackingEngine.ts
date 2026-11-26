import { ITrackingEngine } from './ITrackingEngine';
import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { Parcel, TrackRequestParams } from '../../domain/models/parcel';
import { CanonicalStatus, CANONICAL_STATUS_MAP } from '../../domain/models/status';
import {
  CARRIERS_CATALOG,
  detectCandidateCarriers,
  findCarrierBySlug,
} from '../../domain/validators/detection';
import { TrackingEngineError, isPostalCodeRequiredError } from './errors';
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
    const rawNumber = (params.trackingNumber || '').trim();
    if (!rawNumber) {
      throw new TrackingEngineError(
        'El número de seguimiento no puede estar vacío',
        'MISSING_NUMBER',
        400
      );
    }

    const hint = params.carrierHint?.trim();
    if (hint) {
      const selectedCarrier = findCarrierBySlug(hint);
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
        (isPostalCodeRequiredError(err) || err.code === 'SHIPMENT_NOT_FOUND')
      ) {
        for (const candidate of candidates) {
          if (candidate.carrier.slug === primaryCarrier.slug) continue;
          try {
            return await this.executeTrackForCarrier(rawNumber, candidate.carrier, params);
          } catch (fallbackErr) {
            if (
              fallbackErr instanceof TrackingEngineError &&
              (isPostalCodeRequiredError(fallbackErr) ||
                fallbackErr.code === 'SHIPMENT_NOT_FOUND' ||
                fallbackErr.code === 'CARRIER_NOT_IMPLEMENTED')
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

  private async runLiveAdapter(
    slug: string,
    rawNumber: string,
    postalCode: string,
    selectedCarrier: Carrier,
    params: TrackRequestParams
  ): Promise<Parcel | null> {
    if (slug === 'inpost' || slug === 'inpost-es') {
      return await fetchInPostLive(
        rawNumber,
        postalCode,
        selectedCarrier,
        params.destinationCountry,
        params.lang
      );
    }
    if (slug === 'inpost-it') {
      return await fetchInPostItalyShipXLive(rawNumber, selectedCarrier, params.lang);
    }
    if (slug === 'correos-spain') {
      return await fetchCorreosSpainLive(rawNumber, selectedCarrier, params.lang);
    }
    if (slug === 'correosexpress') {
      return await fetchCorreosExpressLive(rawNumber, selectedCarrier, params.lang);
    }
    if (slug === 'asm-gls-spain') {
      return await fetchGLSSpainLive(rawNumber, postalCode, selectedCarrier, params.lang);
    }
    if (slug === 'seur') {
      return await fetchSEURLive(rawNumber, postalCode, selectedCarrier, params.lang);
    }
    return null;
  }

  private async executeTrackForCarrier(
    rawNumber: string,
    selectedCarrier: Carrier,
    params: TrackRequestParams
  ): Promise<Parcel> {
    const postalCode = params.postalCode?.trim() || '';

    if (selectedCarrier.requiresPostalCode && !postalCode) {
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

    try {
      const liveResult = await this.runLiveAdapter(
        slug,
        rawNumber,
        postalCode,
        selectedCarrier,
        params
      );
      if (liveResult) {
        return liveResult;
      }
    } catch (err) {
      if (isPostalCodeRequiredError(err) || params.allowSimulated === false) {
        throw err;
      }
      console.warn(
        `${selectedCarrier.name} live fetch failed, falling back to canonical pending record:`,
        err
      );
    }

    // Canonical initial tracking record when live tracking is unavailable or fails (unless allowSimulated === false)
    const nowIso = new Date().toISOString();
    const status: CanonicalStatus = 'pending';

    const trackingUrl = selectedCarrier.trackingUrl
      ? selectedCarrier.trackingUrl.replace(/%s/g, encodeURIComponent(rawNumber))
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
      origin:
        selectedCarrier.country && selectedCarrier.country !== 'GLOBAL'
          ? {
              code: selectedCarrier.country,
              name: selectedCarrier.countryName || selectedCarrier.country,
            }
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
