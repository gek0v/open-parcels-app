import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Fast synchronous or asynchronous carrier detection directly from Go regex & rules
   * Returns a JSON string of Go models.DetectResult[]
   */
  detectCarriers(trackingNumber: string, countryHint?: string): Promise<string>;

  /**
   * Mathematical checksum validation (UPU S10, UPS 1Z, IATA AWB, ISO 6346)
   */
  verifyChecksum(trackingNumber: string, carrierSlug: string): boolean;

  /**
   * Tracks a parcel and returns the canonical Go models.Shipment JSON string
   */
  trackShipment(paramsJson: string): Promise<string>;

  /**
   * Returns true if the native Go binary is loaded in the current runtime
   */
  isAvailable(): boolean;
}

export function getNativeOpenParcelsCore(): Spec | null {
  return TurboModuleRegistry?.get<Spec>('OpenParcelsCore') ?? null;
}

export const NativeOpenParcelsCore = getNativeOpenParcelsCore();
