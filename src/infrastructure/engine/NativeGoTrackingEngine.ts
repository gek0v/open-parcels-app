import { ITrackingEngine } from './ITrackingEngine';
import { LocalTrackingEngine } from './LocalTrackingEngine';
import { NativeOpenParcelsCore } from './native/NativeOpenParcelsCore';
import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { Parcel, TrackRequestParams, TrackResponsePayload } from '../../domain/models/parcel';
import { parseApiError, TrackingEngineError } from './errors';
import { mapCarrierFromApi, mapTrackResponseToParcel } from './mapper';

export class NativeGoTrackingEngine implements ITrackingEngine {
  readonly engineName = 'Open Parcels (Native Go JSI / gomobile)';
  private fallbackEngine = new LocalTrackingEngine();

  get isLocal(): boolean {
    return true;
  }

  get isNativeLoaded(): boolean {
    try {
      return !!NativeOpenParcelsCore && NativeOpenParcelsCore.isAvailable();
    } catch {
      return false;
    }
  }

  async track(params: TrackRequestParams): Promise<Parcel> {
    if (this.isNativeLoaded && NativeOpenParcelsCore) {
      try {
        const nativePayload = {
          tracking_number: params.trackingNumber,
          carrier_hint: params.carrierHint,
          postal_code: params.postalCode,
          destination_country: params.destinationCountry,
          language: params.lang || 'es',
          allow_simulated: params.allowSimulated,
          force_refresh: params.forceRefresh,
          email: params.email,
          phone: params.phone,
          additional_fields: params.additionalFields,
        };

        const rawJson = await NativeOpenParcelsCore.trackShipment(JSON.stringify(nativePayload));
        const parsed = JSON.parse(rawJson);

        if (parsed && parsed.error) {
          throw parseApiError(422, parsed);
        }

        if (parsed && parsed.tracking_number) {
          return mapTrackResponseToParcel(parsed as TrackResponsePayload, params);
        }

        return parsed as Parcel;
      } catch (err) {
        if (err instanceof TrackingEngineError) {
          throw err;
        }
        console.warn('Native Go trackShipment call failed, falling back to TypeScript engine:', err);
      }
    }

    return this.fallbackEngine.track(params);
  }

  async detect(trackingNumber: string, countryHint?: string): Promise<DetectedCarrier[]> {
    if (this.isNativeLoaded && NativeOpenParcelsCore) {
      try {
        const rawJson = await NativeOpenParcelsCore.detectCarriers(trackingNumber, countryHint);
        const candidates = JSON.parse(rawJson);
        if (Array.isArray(candidates)) {
          return candidates.map((c: any) => ({
            carrier: mapCarrierFromApi(c.carrier || { slug: c.slug || '', name: c.name || '' }),
            confidence: typeof c.confidence === 'number' ? c.confidence : 0.9,
            matchedRule: c.matched_pattern || c.matchedRule || 'Native Go Detection',
            reason: c.reason,
          }));
        }
      } catch (err) {
        console.warn('Native Go detectCarriers call failed, falling back to TypeScript engine:', err);
      }
    }

    return this.fallbackEngine.detect(trackingNumber, countryHint);
  }

  async getCarriers(): Promise<Carrier[]> {
    return this.fallbackEngine.getCarriers();
  }
}
