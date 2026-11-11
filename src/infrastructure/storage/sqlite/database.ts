import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Parcel } from '../../../domain/models/parcel';

const DB_NAME = 'open_parcels.db';
const MIGRATION_KEY = '@open_parcels:sqlite_migrated_v1';
const ASYNC_STORAGE_KEY = '@open_parcels:saved_parcels_v1';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables and indices
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS parcels (
      id TEXT PRIMARY KEY,
      tracking_number TEXT NOT NULL UNIQUE,
      custom_alias TEXT,
      carrier_slug TEXT NOT NULL,
      carrier_name TEXT NOT NULL,
      carrier_website TEXT,
      carrier_color TEXT,
      requires_postal_code INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      status_text TEXT NOT NULL,
      progress INTEGER NOT NULL,
      origin_code TEXT,
      origin_name TEXT,
      destination_code TEXT,
      destination_name TEXT,
      postal_code TEXT,
      delivered_at TEXT,
      days_in_transit INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      additional_carriers_json TEXT,
      last_mile_carrier_json TEXT,
      last_mile_tracking_number TEXT,
      estimated_delivery TEXT,
      weight TEXT,
      service_type TEXT,
      flight_legs_json TEXT,
      from_cache INTEGER DEFAULT 0,
      is_live_data INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracking_events (
      id TEXT PRIMARY KEY,
      parcel_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      stage TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT,
      carrier_slug TEXT NOT NULL,
      carrier_name TEXT,
      event_code TEXT,
      FOREIGN KEY (parcel_id) REFERENCES parcels (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
    CREATE INDEX IF NOT EXISTS idx_parcels_archived ON parcels(is_archived);
    CREATE INDEX IF NOT EXISTS idx_events_parcel ON tracking_events(parcel_id);
  `);

  // Safe migration for newly added columns if table already existed
  const alterColumns = [
    'ALTER TABLE parcels ADD COLUMN last_mile_tracking_number TEXT;',
    'ALTER TABLE parcels ADD COLUMN estimated_delivery TEXT;',
    'ALTER TABLE parcels ADD COLUMN weight TEXT;',
    'ALTER TABLE parcels ADD COLUMN service_type TEXT;',
    'ALTER TABLE parcels ADD COLUMN flight_legs_json TEXT;',
    'ALTER TABLE parcels ADD COLUMN from_cache INTEGER DEFAULT 0;',
    'ALTER TABLE parcels ADD COLUMN is_live_data INTEGER DEFAULT 0;',
  ];
  for (const q of alterColumns) {
    try {
      await db.execAsync(q);
    } catch {
      // Column already exists, safe to ignore
    }
  }

  // Migrate from AsyncStorage if previous parcels exist
  await migrateFromAsyncStorage(db);

  dbInstance = db;
  return dbInstance;
}

async function migrateFromAsyncStorage(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (alreadyMigrated === 'true') {
      return;
    }

    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (raw) {
      const parcels: Parcel[] = JSON.parse(raw);
      if (Array.isArray(parcels) && parcels.length > 0) {
        await db.withTransactionAsync(async () => {
          for (const p of parcels) {
            await db.runAsync(
              `INSERT OR REPLACE INTO parcels (
                id, tracking_number, custom_alias, carrier_slug, carrier_name, carrier_website, carrier_color,
                requires_postal_code, status, status_text, progress, origin_code, origin_name,
                destination_code, destination_name, postal_code, delivered_at, days_in_transit,
                is_archived, additional_carriers_json, last_mile_carrier_json, last_mile_tracking_number,
                estimated_delivery, weight, service_type, flight_legs_json, from_cache, is_live_data,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                p.id,
                p.trackingNumber,
                p.customAlias || null,
                p.carrier.slug,
                p.carrier.name,
                p.carrier.website || null,
                p.carrier.color || null,
                p.carrier.requiresPostalCode ? 1 : 0,
                p.status,
                p.statusText,
                p.progress,
                p.origin?.code || null,
                p.origin?.name || null,
                p.destination?.code || null,
                p.destination?.name || null,
                p.postalCode || null,
                p.deliveredAt || null,
                p.daysInTransit,
                p.isArchived ? 1 : 0,
                p.additionalCarriers ? JSON.stringify(p.additionalCarriers) : null,
                p.lastMileCarrier ? JSON.stringify(p.lastMileCarrier) : null,
                p.lastMileTrackingNumber || null,
                p.estimatedDelivery || null,
                p.weight || null,
                p.serviceType || null,
                p.flightLegs ? JSON.stringify(p.flightLegs) : null,
                p.fromCache ? 1 : 0,
                p.isLiveData ? 1 : 0,
                p.createdAt,
                p.updatedAt,
              ]
            );

            if (Array.isArray(p.events)) {
              for (let i = 0; i < p.events.length; i++) {
                const ev = p.events[i];
                const eventId = `${p.id}_ev_${i}_${ev.date}`;
                await db.runAsync(
                  `INSERT OR REPLACE INTO tracking_events (
                    id, parcel_id, date, status, stage, description, location, carrier_slug, carrier_name, event_code
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                  [
                    eventId,
                    p.id,
                    ev.date,
                    ev.status,
                    ev.stage,
                    ev.description,
                    ev.location || null,
                    ev.carrierSlug,
                    ev.carrierName || null,
                    ev.eventCode || null,
                  ]
                );
              }
            }
          }
        });
      }
    }

    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch (err) {
    console.warn('SQLite migration warning:', err);
  }
}
