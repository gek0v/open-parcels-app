import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { Parcel, TrackRequestParams } from '../../domain/models/parcel';

export interface ITrackingEngine {
  readonly engineName: string;
  readonly isLocal: boolean;

  track(params: TrackRequestParams): Promise<Parcel>;
  detect(trackingNumber: string, countryHint?: string): Promise<DetectedCarrier[]>;
  getCarriers(): Promise<Carrier[]>;
}
