import { TrackingEvent, EventStage } from '../models/event';

export type { TrackingEvent, EventStage };

/**
 * Returns the most recent tracking event from an array of tracking events.
 * Robustly handles undefined/empty arrays and any chronological ordering
 * (ascending, descending, or mixed) by parsing ISO-8601 timestamps.
 */
export function getLatestEvent(events?: TrackingEvent[]): TrackingEvent | undefined {
  if (!events || !Array.isArray(events) || events.length === 0) {
    return undefined;
  }
  if (events.length === 1) {
    return events[0];
  }

  let latest = events[0];
  let latestTime = parseTimestamp(latest.date);

  for (let i = 1; i < events.length; i++) {
    const ev = events[i];
    const evTime = parseTimestamp(ev.date);
    if (evTime > latestTime) {
      latest = ev;
      latestTime = evTime;
    }
  }

  return latest;
}

function parseTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
