import { ITrackingEngine } from './ITrackingEngine';
import { LocalTrackingEngine } from './LocalTrackingEngine';
import { NativeOpenParcelsCore } from './native/NativeOpenParcelsCore';
import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { Parcel, TrackRequestParams } from '../../domain/models/parcel';

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
        const rawJson = await NativeOpenParcelsCore.trackShipment(JSON.stringify(params));
        const parsed = JSON.parse(rawJson);
        return parsed as Parcel;
      } catch (err) {
        console.warn('Native Go trackShipment call failed, falling back to TypeScript engine:', err);
      }
    }

    return this.fallbackEngine.track(params);
  }

  async detect(trackingNumber: string, countryHint?: string): Promise<DetectedCarrier[]> {
    if (this.isNativeLoaded && NativeOpenParcelsCore) {
      try {
        const rawJson = await NativeOpenParcelsCore.detectCarriers(trackingNumber);
        const candidates = JSON.parse(rawJson);
        return candidates as DetectedCarrier[];
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
