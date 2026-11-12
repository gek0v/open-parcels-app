import AsyncStorage from '@react-native-async-storage/async-storage';
import { ITrackingEngine } from './ITrackingEngine';
import { LocalTrackingEngine } from './LocalTrackingEngine';
import { RestTrackingEngine } from './RestTrackingEngine';
import { NativeGoTrackingEngine } from './NativeGoTrackingEngine';

export const ENGINE_LOCAL_FIRST_KEY = '@open_parcels:engine_local_first';
export const REST_BASE_URL_KEY = '@open_parcels:rest_base_url';

export class TrackingEngineManager {
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

  async hydrate(): Promise<void> {
    try {
      const [storedLocalFirst, storedUrl] = await Promise.all([
        AsyncStorage.getItem(ENGINE_LOCAL_FIRST_KEY),
        AsyncStorage.getItem(REST_BASE_URL_KEY),
      ]);

      if (storedLocalFirst === 'false') {
        this.useLocalFirst = false;
      } else if (storedLocalFirst === 'true') {
        this.useLocalFirst = true;
      }

      if (storedUrl && storedUrl.trim()) {
        this.restEngine.setBaseUrl(storedUrl.trim());
      }
    } catch (err) {
      console.warn('Failed to hydrate TrackingEngineManager from AsyncStorage:', err);
    }
  }

  async setLocalFirst(enabled: boolean): Promise<void> {
    this.useLocalFirst = enabled;
    try {
      await AsyncStorage.setItem(ENGINE_LOCAL_FIRST_KEY, String(enabled));
    } catch (err) {
      console.warn('Failed to persist engine mode to AsyncStorage:', err);
    }
  }

  async setRestBaseUrl(url: string): Promise<void> {
    const trimmed = url.trim() || 'http://localhost:8080';
    this.restEngine.setBaseUrl(trimmed);
    try {
      await AsyncStorage.setItem(REST_BASE_URL_KEY, trimmed);
    } catch (err) {
      console.warn('Failed to persist REST base URL to AsyncStorage:', err);
    }
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
export * from './errors';
export * from './mapper';
export * from './inpostLive';
export * from './LocalTrackingEngine';
export * from './RestTrackingEngine';
export * from './NativeGoTrackingEngine';
export * from './native/NativeOpenParcelsCore';
