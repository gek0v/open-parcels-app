import { Parcel } from '../../../domain/models/parcel';
import { TrackingEvent } from '../../../domain/models/event';
import { getDatabase } from './database';

export class SqliteParcelRepository {
  async getAll(): Promise<Parcel[]> {
    try {
      const db = await getDatabase();
      const parcelRows = await db.getAllAsync<any>(
        'SELECT * FROM parcels ORDER BY created_at DESC;'
      );

      const eventRows = await db.getAllAsync<any>(
        'SELECT * FROM tracking_events ORDER BY date ASC;'
      );

      // Group events by parcel_id
      const eventsByParcel = new Map<string, TrackingEvent[]>();
      for (const ev of eventRows) {
        const list = eventsByParcel.get(ev.parcel_id) || [];
        list.push({
          id: ev.id,
          date: ev.date,
          status: ev.status,
          stage: ev.stage,
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
      return [];
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
        'SELECT * FROM tracking_events WHERE parcel_id = ? ORDER BY date ASC;',
        [id]
      );

      const events: TrackingEvent[] = eventRows.map((ev) => ({
        id: ev.id,
        date: ev.date,
        status: ev.status,
        stage: ev.stage,
        description: ev.description,
        location: ev.location || undefined,
        carrierSlug: ev.carrier_slug,
        carrierName: ev.carrier_name || '',
        eventCode: ev.event_code || undefined,
      }));

      return this.mapRowToParcel(row, events);
    } catch (err) {
      console.warn('Error getById from SQLite:', err);
      return null;
    }
  }

  async save(parcel: Parcel): Promise<void> {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO parcels (
          id, tracking_number, custom_alias, carrier_slug, carrier_name, carrier_website, carrier_color,
          requires_postal_code, status, status_text, progress, origin_code, origin_name,
          destination_code, destination_name, postal_code, delivered_at, days_in_transit,
          is_archived, additional_carriers_json, last_mile_carrier_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          parcel.id,
          parcel.trackingNumber,
          parcel.customAlias || null,
          parcel.carrier.slug,
          parcel.carrier.name,
          parcel.carrier.website || null,
          parcel.carrier.color || null,
          parcel.carrier.requiresPostalCode ? 1 : 0,
          parcel.status,
          parcel.statusText,
          parcel.progress,
          parcel.origin?.code || null,
          parcel.origin?.name || null,
          parcel.destination?.code || null,
          parcel.destination?.name || null,
          parcel.postalCode || null,
          parcel.deliveredAt || null,
          parcel.daysInTransit,
          parcel.isArchived ? 1 : 0,
          parcel.additionalCarriers ? JSON.stringify(parcel.additionalCarriers) : null,
          parcel.lastMileCarrier ? JSON.stringify(parcel.lastMileCarrier) : null,
          parcel.createdAt,
          parcel.updatedAt,
        ]
      );

      // Clean old events and insert updated events
      await db.runAsync('DELETE FROM tracking_events WHERE parcel_id = ?;', [parcel.id]);

      if (Array.isArray(parcel.events)) {
        for (let i = 0; i < parcel.events.length; i++) {
          const ev = parcel.events[i];
          const eventId = `${parcel.id}_ev_${i}_${ev.date}`;
          await db.runAsync(
            `INSERT INTO tracking_events (
              id, parcel_id, date, status, stage, description, location, carrier_slug, carrier_name, event_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              eventId,
              parcel.id,
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
    });
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM parcels WHERE id = ?;', [id]);
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

  private mapRowToParcel(row: any, events: TrackingEvent[]): Parcel {
    return {
      id: row.id,
      trackingNumber: row.tracking_number,
      customAlias: row.custom_alias || undefined,
      carrier: {
        slug: row.carrier_slug,
        name: row.carrier_name,
        website: row.carrier_website || undefined,
        color: row.carrier_color || undefined,
        requiresPostalCode: row.requires_postal_code === 1,
      },
      additionalCarriers: row.additional_carriers_json
        ? JSON.parse(row.additional_carriers_json)
        : undefined,
      lastMileCarrier: row.last_mile_carrier_json
        ? JSON.parse(row.last_mile_carrier_json)
        : undefined,
      status: row.status,
      statusText: row.status_text,
      progress: row.progress,
      origin: row.origin_code ? { code: row.origin_code, name: row.origin_name || '' } : undefined,
      destination: row.destination_code
        ? { code: row.destination_code, name: row.destination_name || '' }
        : undefined,
      postalCode: row.postal_code || undefined,
      deliveredAt: row.delivered_at || null,
      daysInTransit: row.days_in_transit,
      events,
      updatedAt: row.updated_at,
      isArchived: row.is_archived === 1,
      createdAt: row.created_at,
    };
  }
}

export const sqliteParcelRepository = new SqliteParcelRepository();
