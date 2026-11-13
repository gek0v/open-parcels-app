import * as ReactNative from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Parcel } from '../../domain/models/parcel';

export interface ShareOptions {
  lang?: 'es' | 'en';
}

/**
 * Formats a short date and time as 'DD/MM HH:mm' or fallback.
 */
export function formatShortDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats relative transit duration description.
 */
export function formatTransitTimeAgo(days: number, lang: 'es' | 'en' = 'es'): string {
  if (days <= 0) {
    return lang === 'es' ? 'hoy' : 'today';
  }
  if (days === 1) {
    return lang === 'es' ? 'hace 1 día' : '1 day ago';
  }
  return lang === 'es' ? `hace ${days} días` : `${days} days ago`;
}

/**
 * Builds a structured, elegant, and readable parcel share summary text.
 */
export function formatParcelShareSummary(parcel: Parcel, options?: ShareOptions): string {
  const lang = options?.lang || 'es';
  const isEs = lang === 'es';

  // Title: Custom alias or fallback to tracking number
  const title = parcel.customAlias || parcel.trackingNumber;

  // Carrier: Primary carrier with optional chained last-mile carrier
  let carrierText = parcel.carrier?.name || 'Transportista';
  if (parcel.lastMileCarrier && parcel.lastMileCarrier.name !== parcel.carrier?.name) {
    carrierText = `${carrierText} ➔ ${parcel.lastMileCarrier.name}`;
  }

  // Status with transit duration
  const daysLabel = formatTransitTimeAgo(parcel.daysInTransit || 0, lang);
  const statusLine = isEs
    ? `📍 Estado: ${parcel.statusText} (${daysLabel})`
    : `📍 Status: ${parcel.statusText} (${daysLabel})`;

  // Latest milestone event
  let eventLine = '';
  if (parcel.events && parcel.events.length > 0) {
    const latest = parcel.events[parcel.events.length - 1];
    const formattedDate = formatShortDateTime(latest.date);
    const locationSuffix = latest.location ? ` (${latest.location})` : '';
    eventLine = isEs
      ? `🕒 Último evento: ${latest.description}${locationSuffix} - ${formattedDate}`
      : `🕒 Latest event: ${latest.description}${locationSuffix} - ${formattedDate}`;
  } else {
    eventLine = isEs
      ? `🕒 Último evento: ${parcel.statusText}`
      : `🕒 Latest event: ${parcel.statusText}`;
  }

  // Official or web tracking link
  let trackingUrl = '';
  if (parcel.carrier?.trackingUrl) {
    trackingUrl = parcel.carrier.trackingUrl.replace(
      '%s',
      encodeURIComponent(parcel.trackingNumber)
    );
  } else if (parcel.carrier?.website) {
    trackingUrl = parcel.carrier.website;
  } else {
    trackingUrl = 'https://openparcels.com';
  }

  const lines = [
    `📦 ${title}`,
    `${isEs ? '🚚 Transportista' : '🚚 Carrier'}: ${carrierText}`,
    `${isEs ? '🔢 Seguimiento' : '🔢 Tracking'}: ${parcel.trackingNumber}`,
    statusLine,
    eventLine,
    `${isEs ? '🔗 Rastrear' : '🔗 Track'}: ${trackingUrl}`,
    `— ${isEs ? 'Compartido con Open Parcels' : 'Shared with Open Parcels'}`,
  ];

  return lines.join('\n');
}

export class ShareService {
  /**
   * Invokes native Share dialog with formatted parcel summary.
   */
  static async shareParcel(parcel: Parcel, options?: ShareOptions): Promise<boolean> {
    try {
      const message = formatParcelShareSummary(parcel, options);
      const title = parcel.customAlias || parcel.trackingNumber;
      if (ReactNative.Share && typeof ReactNative.Share.share === 'function') {
        await ReactNative.Share.share({
          message,
          title,
        });
      }
      return true;
    } catch (err) {
      console.warn('ShareService.shareParcel failed:', err);
      return false;
    }
  }

  /**
   * Copies formatted parcel summary directly to clipboard.
   */
  static async copyParcelSummary(parcel: Parcel, options?: ShareOptions): Promise<boolean> {
    try {
      const message = formatParcelShareSummary(parcel, options);
      await Clipboard.setStringAsync(message);
      return true;
    } catch (err) {
      console.warn('ShareService.copyParcelSummary failed:', err);
      return false;
    }
  }
}
