import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { sqliteParcelRepository } from './sqlite/SqliteParcelRepository';

const STORAGE_KEY = '@open_parcels:saved_parcels_v1';

export type ParcelRepositoryListener = () => void;

export class ParcelRepository {
  private useSqlite = Platform?.OS !== 'web';
  private listeners: Set<ParcelRepositoryListener> = new Set();

  subscribe(listener: ParcelRepositoryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch (err) {
        console.warn('ParcelRepository listener error:', err);
      }
    }
  }

  private mergeIntoArray(all: Parcel[], parcel: Parcel): void {
    const existingIndex = all.findIndex(
      (p) => p.id === parcel.id || p.trackingNumber === parcel.trackingNumber
    );

    if (existingIndex >= 0) {
      const existing = all[existingIndex];
      const hasIncomingAlias =
        parcel.customAlias !== undefined && parcel.customAlias !== null && parcel.customAlias.trim() !== '';
      const hasIncomingNotes =
        parcel.notes !== undefined && parcel.notes !== null && parcel.notes.trim() !== '';

      if (existing.id && parcel.id !== existing.id) {
        parcel.id = existing.id;
      }

      all[existingIndex] = {
        ...existing,
        ...parcel,
        id: existing.id || parcel.id,
        createdAt: existing.createdAt || parcel.createdAt,
        customAlias: hasIncomingAlias ? parcel.customAlias : existing.customAlias,
        notes: hasIncomingNotes ? parcel.notes : existing.notes,
        isArchived:
          existing.isArchived && !parcel.isArchived && !(parcel as any).isArchivedExplicit
            ? true
            : typeof parcel.isArchived === 'boolean'
              ? parcel.isArchived
              : existing.isArchived,
      };
    } else {
      all.unshift(parcel);
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
    this.mergeIntoArray(all, parcel);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('AsyncStorage.setItem error in save:', err);
    }
    this.notify();
  }

  async saveAll(parcels: Parcel[]): Promise<void> {
    if (!parcels || parcels.length === 0) return;

    if (this.useSqlite) {
      try {
        await sqliteParcelRepository.saveBatch(parcels);
        this.notify();
        return;
      } catch (err) {
        console.warn('SQLite fallback to AsyncStorage in saveAll:', err);
        this.useSqlite = false;
      }
    }

    const all = await this.getAll();
    for (const parcel of parcels) {
      this.mergeIntoArray(all, parcel);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('AsyncStorage.setItem error in saveAll:', err);
    }
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
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn('AsyncStorage.setItem error in delete:', err);
    }
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

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('AsyncStorage.setItem error in updateAlias:', err);
    }
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

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('AsyncStorage.setItem error in toggleArchive:', err);
    }
    this.notify();
    return all[index];
  }
}

export const parcelRepository = new ParcelRepository();
