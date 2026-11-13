import { ITrackingEngine } from './ITrackingEngine';
import { LocalTrackingEngine } from './LocalTrackingEngine';
import { NativeGoTrackingEngine } from './NativeGoTrackingEngine';

export class TrackingEngineManager {
  private localEngine = new LocalTrackingEngine();
  private nativeGoEngine = new NativeGoTrackingEngine();

  get current(): ITrackingEngine {
    return this.nativeGoEngine.isNativeLoaded ? this.nativeGoEngine : this.localEngine;
  }

  async hydrate(): Promise<void> {
    // 100% Local-first and on-device runtime: no remote servers or daemons needed.
  }

  isLocalFirst(): boolean {
    return true;
  }

  get isNativeGoActive(): boolean {
    return this.nativeGoEngine.isNativeLoaded;
  }

  get local(): LocalTrackingEngine {
    return this.localEngine;
  }

  get nativeGo(): NativeGoTrackingEngine {
    return this.nativeGoEngine;
  }
}

export const trackingEngineManager = new TrackingEngineManager();
export const defaultEngine = trackingEngineManager.current;

export * from './ITrackingEngine';
export * from './errors';
export * from './mapper';
export * from './inpostLive';
export * from './correosLive';
export * from './spainCouriersLive';
export * from './LocalTrackingEngine';
export * from './NativeGoTrackingEngine';
export * from './native/NativeOpenParcelsCore';
