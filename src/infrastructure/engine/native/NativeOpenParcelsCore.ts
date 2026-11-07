import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Fast synchronous or asynchronous carrier detection directly from Go regex & rules
   * Returns a JSON string of DetectedCarrier[]
   */
  detectCarriers(trackingNumber: string): Promise<string>;

  /**
   * Mathematical checksum validation (UPU S10, UPS 1Z, IATA AWB, Luhn)
   */
  verifyChecksum(trackingNumber: string, carrierSlug: string): boolean;

  /**
   * Tracks a parcel and returns the canonical payload JSON string
   */
  trackShipment(paramsJson: string): Promise<string>;

  /**
   * Returns true if the native Go binary is loaded in the current runtime
   */
  isAvailable(): boolean;
}

export const NativeOpenParcelsCore = TurboModuleRegistry.get<Spec>('OpenParcelsCore');
