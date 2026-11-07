import { ITrackingEngine } from './ITrackingEngine';
import { LocalTrackingEngine } from './LocalTrackingEngine';
import { RestTrackingEngine } from './RestTrackingEngine';

class TrackingEngineManager {
  private localEngine = new LocalTrackingEngine();
  private restEngine = new RestTrackingEngine();
  private useLocalFirst: boolean = true;

  get current(): ITrackingEngine {
    return this.useLocalFirst ? this.localEngine : this.restEngine;
  }

  setLocalFirst(enabled: boolean) {
    this.useLocalFirst = enabled;
  }

  isLocalFirst(): boolean {
    return this.useLocalFirst;
  }

  get local(): LocalTrackingEngine {
    return this.localEngine;
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
