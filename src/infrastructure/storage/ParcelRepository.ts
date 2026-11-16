import AsyncStorage from '@react-native-async-storage/async-storage';
import { Parcel } from '../../domain/models/parcel';
import { sqliteParcelRepository } from './sqlite/SqliteParcelRepository';

const STORAGE_KEY = '@open_parcels:saved_parcels_v1';

export type ParcelRepositoryListener = () => void;

export class ParcelRepository {
  private useSqlite = true;
  private listeners: Set<ParcelRepositoryListener> = new Set();

  subscribe(listener: ParcelRepositoryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.warn('ParcelRepository listener error:', err);
      }
    }
  }

  async getAll(): Promise<Parcel[]> {
    if (this.useSqlite) {
      try {
        return await sqliteParcelRepository.getAll();
      } catch (err) {
        console.warn('SQLite fallback to AsyncStorage in getAll:', err);
        this.useSqlite = false;
      }
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: Parcel[] = JSON.parse(raw);
      return parsed;
    } catch (e) {
      console.warn('Error reading parcels from storage:', e);
      return [];
    }
  }

  async getById(id: string): Promise<Parcel | null> {
    if (this.useSqlite) {
      try {
        return await sqliteParcelRepository.getById(id);
      } catch {
        this.useSqlite = false;
      }
    }

    const all = await this.getAll();
    return all.find((p) => p.id === id) || null;
  }

  async save(parcel: Parcel): Promise<void> {
    if (this.useSqlite) {
      try {
        await sqliteParcelRepository.save(parcel);
        this.notify();
        return;
      } catch {
        this.useSqlite = false;
      }
    }

    const all = await this.getAll();
    const existingIndex = all.findIndex(
      (p) => p.id === parcel.id || p.trackingNumber === parcel.trackingNumber
    );

    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...parcel };
    } else {
      all.unshift(parcel);
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    this.notify();
  }

  async delete(id: string): Promise<void> {
    if (this.useSqlite) {
      try {
        await sqliteParcelRepository.delete(id);
        this.notify();
        return;
      } catch {
        this.useSqlite = false;
      }
    }

    const all = await this.getAll();
    const filtered = all.filter((p) => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    this.notify();
  }

  async updateAlias(id: string, newAlias: string): Promise<Parcel | null> {
    if (this.useSqlite) {
      try {
        const res = await sqliteParcelRepository.updateAlias(id, newAlias);
        this.notify();
        return res;
      } catch {
        this.useSqlite = false;
      }
    }

    const all = await this.getAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const clean = newAlias.trim();
    all[index] = {
      ...all[index],
      customAlias: clean.length > 0 ? clean : undefined,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    this.notify();
    return all[index];
  }

  async toggleArchive(id: string): Promise<Parcel | null> {
    if (this.useSqlite) {
      try {
        const res = await sqliteParcelRepository.toggleArchive(id);
        this.notify();
        return res;
      } catch {
        this.useSqlite = false;
      }
    }

    const all = await this.getAll();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) return null;

    all[index] = {
      ...all[index],
      isArchived: !all[index].isArchived,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    this.notify();
    return all[index];
  }
}

export const parcelRepository = new ParcelRepository();
