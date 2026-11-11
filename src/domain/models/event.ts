import { CanonicalStatus } from './status';

export type EventStage =
  | 'created'
  | 'picked_up'
  | 'pickup'
  | 'transit'
  | 'customs'
  | 'handover'
  | 'last_mile'
  | 'delivery'
  | 'completed'
  | 'exception';

export interface TrackingEvent {
  id: string;
  date: string; // ISO-8601
  rawDate?: string;
  status: CanonicalStatus;
  stage: EventStage;
  description: string;
  location?: string;
  carrierSlug: string;
  carrierName: string;
  eventCode?: string;
  carrierIndex?: number;
}
