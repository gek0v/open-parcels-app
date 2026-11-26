import { Parcel } from '../../../domain/models/parcel';
import { TrackingEvent, EventStage } from '../../../domain/models/event';
import { CanonicalStatus } from '../../../domain/models/status';
import { findCarrierBySlug } from '../../../domain/validators/detection';
import { getDatabase } from './database';
import { safeJsonParse } from '../../utils/safeJson';

export class SqliteParcelRepository {
  async getAll(): Promise<Parcel[]> {
    try {
      const db = await getDatabase();
      const parcelRows = await db.getAllAsync<any>(
        'SELECT * FROM parcels ORDER BY created_at DESC;'
      );

      const eventRows = await db.getAllAsync<any>(
        'SELECT * FROM tracking_events ORDER BY date DESC;'
      );

      // Group events by parcel_id
      const eventsByParcel = new Map<string, TrackingEvent[]>();
      for (const ev of eventRows) {
        const list = eventsByParcel.get(ev.parcel_id) || [];
        list.push({
          id: ev.id,
          date: ev.date,
          status: ev.status as CanonicalStatus,
          stage: ev.stage as EventStage,
          description: ev.description,
          location: ev.location || undefined,
          carrierSlug: ev.carrier_slug,
          carrierName: ev.carrier_name || '',
          eventCode: ev.event_code || undefined,
        });
        eventsByParcel.set(ev.parcel_id, list);
      }

      return parcelRows.map((row) => this.mapRowToParcel(row, eventsByParcel.get(row.id) || []));
    } catch (err) {
      console.warn('Error reading parcels from SQLite:', err);
      throw err;
    }
  }

  async getById(id: string): Promise<Parcel | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<any>(
        'SELECT * FROM parcels WHERE id = ?;',
        [id]
      );

      if (!row) return null;

      const eventRows = await db.getAllAsync<any>(
        'SELECT * FROM tracking_events WHERE parcel_id = ? ORDER BY date DESC;',
        [id]
      );

      const events: TrackingEvent[] = eventRows.map((ev) => ({
        id: ev.id,
        date: ev.date,
        status: ev.status as CanonicalStatus,
        stage: ev.stage as EventStage,
        description: ev.description,
        location: ev.location || undefined,
        carrierSlug: ev.carrier_slug,
        carrierName: ev.carrier_name || '',
        eventCode: ev.event_code || undefined,
      }));

      return this.mapRowToParcel(row, events);
    } catch (err) {
      console.warn('Error getById from SQLite:', err);
      throw err;
    }
  }

  async persistParcel(db: any, parcel: Parcel): Promise<void> {
    const nowIso = new Date().toISOString();
    if (!parcel.id) {
      parcel.id = 'p-' + Math.random().toString(36).substring(2, 9);
    }

    // Query if a parcel with the same tracking_number already exists
    const existing = await db.getFirstAsync(
      'SELECT id, created_at, notes, is_archived, custom_alias FROM parcels WHERE tracking_number = ? LIMIT 1;',
      [parcel.trackingNumber]
    );

    if (existing) {
      // Preserve existing id, createdAt, notes, and customAlias
      // unless incoming parcel explicitly supplies them.
      if (existing.id && parcel.id !== existing.id) {
        parcel.id = existing.id;
      }
      if (existing.created_at) {
        parcel.createdAt = existing.created_at;
      }
      const hasIncomingNotes =
        parcel.notes !== undefined && parcel.notes !== null && parcel.notes.trim() !== '';
      if (!hasIncomingNotes && existing.notes) {
        parcel.notes = existing.notes;
      }
      const hasIncomingAlias =
        parcel.customAlias !== undefined && parcel.customAlias !== null && parcel.customAlias.trim() !== '';
      if (!hasIncomingAlias && existing.custom_alias) {
        parcel.customAlias = existing.custom_alias;
      }
      if (existing.is_archived === 1 && !parcel.isArchived) {
        if (!(parcel as any).isArchivedExplicit) {
          parcel.isArchived = true;
        }
      }
    }

    const safeStatus = parcel.status || 'pending';
    const safeStatusText = parcel.statusText || safeStatus;
    const safeProgress = typeof parcel.progress === 'number' ? parcel.progress : 0;
    const safeDays = typeof parcel.daysInTransit === 'number' ? parcel.daysInTransit : 0;
    const safeCreatedAt = parcel.createdAt || nowIso;
    const safeUpdatedAt = parcel.updatedAt || nowIso;
    const safeCarrierSlug = parcel.carrier?.slug || 'unknown';
    const safeCarrierName = parcel.carrier?.name || safeCarrierSlug.toUpperCase();

    await db.runAsync(
      `INSERT OR REPLACE INTO parcels (
        id, tracking_number, custom_alias, carrier_slug, carrier_name, carrier_website, carrier_color,
        requires_postal_code, status, status_text, progress, origin_code, origin_name,
        destination_code, destination_name, postal_code, delivered_at, days_in_transit,
        is_archived, additional_carriers_json, last_mile_carrier_json, last_mile_tracking_number,
        estimated_delivery, weight, service_type, flight_legs_json, from_cache, is_live_data, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        parcel.id,
        parcel.trackingNumber,
        parcel.customAlias || null,
        safeCarrierSlug,
        safeCarrierName,
        parcel.carrier?.website || null,
        parcel.carrier?.color || null,
        parcel.carrier?.requiresPostalCode ? 1 : 0,
        safeStatus,
        safeStatusText,
        safeProgress,
        parcel.origin?.code || null,
        parcel.origin?.name || null,
        parcel.destination?.code || null,
        parcel.destination?.name || null,
        parcel.postalCode || null,
        parcel.deliveredAt || null,
        safeDays,
        parcel.isArchived ? 1 : 0,
        parcel.additionalCarriers ? JSON.stringify(parcel.additionalCarriers) : null,
        parcel.lastMileCarrier ? JSON.stringify(parcel.lastMileCarrier) : null,
        parcel.lastMileTrackingNumber || null,
        parcel.estimatedDelivery || null,
        parcel.weight || null,
        parcel.serviceType || null,
        parcel.flightLegs ? JSON.stringify(parcel.flightLegs) : null,
        parcel.fromCache ? 1 : 0,
        parcel.isLiveData ? 1 : 0,
        parcel.notes || null,
        safeCreatedAt,
        safeUpdatedAt,
      ]
    );

    // Clean old events and insert updated events
    await db.runAsync('DELETE FROM tracking_events WHERE parcel_id = ?;', [parcel.id]);

    if (Array.isArray(parcel.events)) {
      for (let i = 0; i < parcel.events.length; i++) {
        const ev = parcel.events[i];
        const evDate = ev.date || safeUpdatedAt;
        const eventId = `${parcel.id}_ev_${i}_${evDate}`;
        await db.runAsync(
          `INSERT INTO tracking_events (
            id, parcel_id, date, status, stage, description, location, carrier_slug, carrier_name, event_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            eventId,
            parcel.id,
            evDate,
            ev.status || safeStatus,
            ev.stage || 'transit',
            ev.description || '',
            ev.location || null,
            ev.carrierSlug || safeCarrierSlug,
            ev.carrierName || safeCarrierName,
            ev.eventCode || null,
          ]
        );
      }
    }
  }

  async save(parcel: Parcel): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await this.persistParcel(db, parcel);
    });
  }

  async saveBatch(parcels: Parcel[]): Promise<void> {
    if (!parcels || parcels.length === 0) return;
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const parcel of parcels) {
        await this.persistParcel(db, parcel);
      }
    });
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM tracking_events WHERE parcel_id = ?;', [id]);
      await db.runAsync('DELETE FROM parcels WHERE id = ?;', [id]);
    });
  }

  async updateAlias(id: string, newAlias: string): Promise<Parcel | null> {
    const db = await getDatabase();
    const clean = newAlias.trim();
    await db.runAsync(
      'UPDATE parcels SET custom_alias = ?, updated_at = ? WHERE id = ?;',
      [clean.length > 0 ? clean : null, new Date().toISOString(), id]
    );
    return this.getById(id);
  }

  async toggleArchive(id: string): Promise<Parcel | null> {
    const current = await this.getById(id);
    if (!current) return null;

    const db = await getDatabase();
    const nextArchived = !current.isArchived ? 1 : 0;
    await db.runAsync(
      'UPDATE parcels SET is_archived = ?, updated_at = ? WHERE id = ?;',
      [nextArchived, new Date().toISOString(), id]
    );
    return this.getById(id);
  }

  public mapRowToParcel(row: any, events: TrackingEvent[] = []): Parcel {
    const baseCarrier = findCarrierBySlug(row.carrier_slug);
    const requiresPostalCode =
      row.requires_postal_code === 1 || !!baseCarrier.requiresPostalCode;

    return {
      id: row.id,
      trackingNumber: row.tracking_number,
      customAlias: row.custom_alias || undefined,
      carrier: {
        ...baseCarrier,
        slug: baseCarrier.slug || row.carrier_slug,
        name: row.carrier_name || baseCarrier.name,
        website: row.carrier_website || baseCarrier.website,
        color: row.carrier_color || baseCarrier.color,
        requiresPostalCode,
      },
      additionalCarriers: row.additional_carriers_json
        ? safeJsonParse(row.additional_carriers_json, undefined)
        : undefined,
      lastMileTrackingNumber: row.last_mile_tracking_number || undefined,
      lastMileCarrier: row.last_mile_carrier_json
        ? safeJsonParse(row.last_mile_carrier_json, undefined)
        : undefined,
      status: row.status as CanonicalStatus,
      statusText: row.status_text,
      progress: row.progress,
      origin: row.origin_code ? { code: row.origin_code, name: row.origin_name || '' } : undefined,
      destination: row.destination_code
        ? { code: row.destination_code, name: row.destination_name || '' }
        : undefined,
      postalCode: row.postal_code || undefined,
      estimatedDelivery: row.estimated_delivery || undefined,
      deliveredAt: row.delivered_at || null,
      daysInTransit: row.days_in_transit,
      weight: row.weight || undefined,
      serviceType: row.service_type || undefined,
      flightLegs: row.flight_legs_json ? safeJsonParse(row.flight_legs_json, undefined) : undefined,
      fromCache: row.from_cache === 1,
      isLiveData: row.is_live_data === 1,
      events,
      updatedAt: row.updated_at,
      isArchived: row.is_archived === 1,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    };
  }
}

export const sqliteParcelRepository = new SqliteParcelRepository();
