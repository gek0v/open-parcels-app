import { CanonicalStatus } from './status';

export type EventStage =
  | 'created'
  | 'pickup'
  | 'customs'
  | 'transit'
  | 'delivery'
  | 'completed'
  | 'exception';

export interface TrackingEvent {
  id: string;
  date: string; // ISO-8601
  status: CanonicalStatus;
  stage: EventStage;
  description: string;
  location?: string;
  carrierSlug: string;
  carrierName: string;
  eventCode?: string;
}
