import { ITrackingEngine } from './ITrackingEngine';
import { LocalTrackingEngine } from './LocalTrackingEngine';
import { RestTrackingEngine } from './RestTrackingEngine';
import { NativeGoTrackingEngine } from './NativeGoTrackingEngine';

class TrackingEngineManager {
  private localEngine = new LocalTrackingEngine();
  private nativeGoEngine = new NativeGoTrackingEngine();
  private restEngine = new RestTrackingEngine();
  private useLocalFirst: boolean = true;

  get current(): ITrackingEngine {
    if (!this.useLocalFirst) {
      return this.restEngine;
    }
    return this.nativeGoEngine.isNativeLoaded ? this.nativeGoEngine : this.localEngine;
  }

  setLocalFirst(enabled: boolean) {
    this.useLocalFirst = enabled;
  }

  isLocalFirst(): boolean {
    return this.useLocalFirst;
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

  get rest(): RestTrackingEngine {
    return this.restEngine;
  }
}

export const trackingEngineManager = new TrackingEngineManager();
export const defaultEngine = trackingEngineManager.current;
export * from './ITrackingEngine';
export * from './LocalTrackingEngine';
export * from './RestTrackingEngine';
export * from './NativeGoTrackingEngine';
export * from './native/NativeOpenParcelsCore';
