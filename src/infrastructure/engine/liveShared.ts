import { Carrier } from '../../domain/models/carrier';
import { TrackingEvent } from '../../domain/models/event';
import { CountryRef, Parcel } from '../../domain/models/parcel';
import { CanonicalStatus } from '../../domain/models/status';
import { TrackingEngineError } from './errors';
import { getLocalizedStatusText } from './mapper';

export const LIVE_BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html, application/xhtml+xml, */*',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

export interface LiveFetchResult {
  text: string;
  contentType: string;
  status: number;
}

export interface TabularHtmlRow {
  date: string;
  status: string;
  location: string;
  description: string;
}

export interface ParsedTabularHtml {
  origin?: string;
  destination?: string;
  status?: string;
  rows: TabularHtmlRow[];
}

export function decodeHtmlEntities(str: string): string {
  return (str || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ');
}

export function stripHtmlTags(raw: string): string {
  const withoutTags = (raw || '').replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

export function isWafOrAntiBot(
  statusCode: number,
  body: string,
  extraMarkers: string[] = []
): boolean {
  if (statusCode === 403 || statusCode === 429) {
    return true;
  }
  const upper = (body || '').toUpperCase();
  const baseMarkers = [
    'CF-BROWSER-VERIFICATION',
    'CF_CHL_OPT',
    '__CF_CHL_RT_TK',
    '/CDN-CGI/CHALLENGE-PLATFORM/',
    'INCAPSULA',
    '_INCAPSULA_RESOURCE',
    'CLOUDFLARE',
    'DATADOME',
    'PERIMETERX',
    'PX-CAPTCHA',
    'G-RECAPTCHA',
    'H-CAPTCHA',
    'CF-TURNSTILE',
    'CAPTCHA',
    'SEC_CHALLENGE',
    'PUNISH_ACTION',
    'RGV587_FLAG',
    'ANTI_BOT',
    'ANTI-BOT',
    'ACCESS DENIED',
    'ACCESO DENEGADO',
    'ACCESO NO AUTORIZADO',
    'BOT PROTECTION',
  ];

  for (const marker of [...baseMarkers, ...extraMarkers]) {
    if (upper.includes(marker.toUpperCase())) {
      return true;
    }
  }

  if (
    upper.includes('JUST A MOMENT...') &&
    (upper.includes('CLOUDFLARE') || upper.includes('RAY ID') || upper.includes('<HTML'))
  ) {
    return true;
  }

  return false;
}

export async function fetchLiveText(
  url: string,
  carrierName: string,
  options?: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    extraWafMarkers?: string[];
  }
): Promise<LiveFetchResult> {
  const timeoutMs = options?.timeoutMs ?? 10000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        ...LIVE_BROWSER_HEADERS,
        ...(options?.headers || {}),
      },
    });

    if (res.status === 404) {
      throw new TrackingEngineError(
        `Envío no encontrado en ${carrierName}.`,
        'SHIPMENT_NOT_FOUND',
        404
      );
    }
    if (res.status === 429) {
      throw new TrackingEngineError(
        `Límite de peticiones excedido en ${carrierName}.`,
        'CARRIER_RATE_LIMITED',
        429
      );
    }
    if (res.status === 403) {
      throw new TrackingEngineError(
        `Acceso bloqueado temporalmente por ${carrierName} (HTTP 403).`,
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        403
      );
    }

    const text = await res.text();
    const contentType = res.headers?.get?.('content-type') || '';

    if (!res.ok) {
      throw new TrackingEngineError(
        `Error al consultar ${carrierName} (HTTP ${res.status}).`,
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        res.status
      );
    }

    if (isWafOrAntiBot(res.status, text, options?.extraWafMarkers)) {
      throw new TrackingEngineError(
        `${carrierName} devolvió una verificación anti-bot o WAF temporal.`,
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        403
      );
    }

    return { text, contentType, status: res.status };
  } catch (err) {
    if (err instanceof TrackingEngineError) throw err;
    throw new TrackingEngineError(
      `No se pudo conectar con ${carrierName}. Verifica tu conexión a internet.`,
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502,
      err
    );
  } finally {
    clearTimeout(timer);
  }
}

export function parseFlexibleDateToIso(dateInput: unknown, timeStr?: string): string {
  if (typeof dateInput === 'number' && Number.isFinite(dateInput) && dateInput > 0) {
    return new Date(dateInput).toISOString();
  }

  const cleanDate = typeof dateInput === 'string' ? dateInput.trim() : '';
  const cleanTime = (timeStr || '').trim();
  if (!cleanDate) return '';

  const combined =
    cleanTime && !cleanDate.includes(':') ? `${cleanDate} ${cleanTime}` : cleanDate;

  // 1. YYYY-MM-DD[T ]HH:mm[:ss]
  const ymdMatch = combined.match(
    /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (ymdMatch) {
    const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = ymdMatch;
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(
      2,
      '0'
    )}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}.000Z`;
    const ts = Date.parse(iso);
    if (!Number.isNaN(ts)) return new Date(ts).toISOString();
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY [HH:mm[:ss]]
  const dmyMatch = combined.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (dmyMatch) {
    const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = dmyMatch;
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(
      2,
      '0'
    )}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}.000Z`;
    const ts = Date.parse(iso);
    if (!Number.isNaN(ts)) return new Date(ts).toISOString();
  }

  // 3. Standard ISO / RFC3339 fallback
  const nativeTs = Date.parse(combined);
  if (!Number.isNaN(nativeTs)) {
    return new Date(nativeTs).toISOString();
  }

  return cleanDate;
}

export function parseTabularTrackingHtml(
  htmlContent: string,
  dateRegex: RegExp,
  options?: {
    originRegex?: RegExp;
    destinationRegex?: RegExp;
    statusRegex?: RegExp;
    extraIgnoreKeywords?: string[];
  }
): ParsedTabularHtml {
  const result: ParsedTabularHtml = { rows: [] };

  if (options?.originRegex) {
    const m = htmlContent.match(options.originRegex);
    if (m?.[1]) result.origin = stripHtmlTags(m[1]);
  }
  if (options?.destinationRegex) {
    const m = htmlContent.match(options.destinationRegex);
    if (m?.[1]) result.destination = stripHtmlTags(m[1]);
  }
  if (options?.statusRegex) {
    const m = htmlContent.match(options.statusRegex);
    if (m?.[1]) result.status = stripHtmlTags(m[1]);
  }

  const ignoreKeywords = [
    'cookie',
    'consent',
    'analytics',
    ...(options?.extraIgnoreKeywords || []),
  ];

  const rowMatches = htmlContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const rowMatch of rowMatches) {
    const rowBody = rowMatch[1] || '';
    const rowLower = rowBody.toLowerCase();
    if (ignoreKeywords.some((kw) => rowLower.includes(kw))) {
      continue;
    }

    const cleanedCells: string[] = [];
    const cellMatches = rowBody.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
    for (const cellMatch of cellMatches) {
      const text = stripHtmlTags(cellMatch[1] || '');
      if (text) cleanedCells.push(text);
    }

    if (cleanedCells.length < 2) continue;

    const dateIdx = cleanedCells.findIndex((col) => dateRegex.test(col));
    if (dateIdx === -1) continue;

    const dateVal = cleanedCells[dateIdx];
    const rest = cleanedCells.filter((_, idx) => idx !== dateIdx);

    let statusVal = '';
    let locationVal = '';
    let descVal = '';

    if (rest.length === 1) {
      descVal = rest[0];
      statusVal = rest[0];
    } else if (rest.length === 2) {
      statusVal = rest[0];
      descVal = rest[1];
    } else {
      statusVal = rest[0];
      locationVal = rest[1];
      descVal = rest[2];
    }

    result.rows.push({
      date: dateVal,
      status: statusVal,
      location: locationVal,
      description: descVal,
    });
  }

  return result;
}

export function sortEventsNewestFirst(events: TrackingEvent[]): TrackingEvent[] {
  return events
    .map((ev, idx) => ({
      ev,
      idx,
      ts: ev.date ? Date.parse(ev.date) : NaN,
    }))
    .sort((a, b) => {
      const aValid = !Number.isNaN(a.ts);
      const bValid = !Number.isNaN(b.ts);
      if (aValid && bValid && b.ts !== a.ts) {
        return b.ts - a.ts;
      }
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      return a.idx - b.idx;
    })
    .map((entry) => entry.ev);
}

export function computeProgressAndDays(
  status: CanonicalStatus,
  events: TrackingEvent[],
  deliveredAt: string | null
): { progress: number; daysInTransit: number } {
  const progress =
    status === 'delivered'
      ? 100
      : status === 'out_for_delivery'
        ? 85
        : status === 'in_transit'
          ? 55
          : status === 'exception' || status === 'failed_attempt'
            ? 75
            : 15;

  const validTimestamps = events
    .map((ev) => (ev.date ? Date.parse(ev.date) : NaN))
    .filter((ts) => !Number.isNaN(ts));

  let daysInTransit = validTimestamps.length > 0 ? 1 : 0;
  if (validTimestamps.length >= 2) {
    const earliestMs = Math.min(...validTimestamps);
    const deliveredMs =
      deliveredAt && !Number.isNaN(Date.parse(deliveredAt)) ? Date.parse(deliveredAt) : NaN;
    const latestMs = !Number.isNaN(deliveredMs) ? deliveredMs : Math.max(...validTimestamps);
    const diffDays = Math.floor(Math.max(0, latestMs - earliestMs) / (24 * 3600000));
    if (diffDays > 1) {
      daysInTransit = diffDays;
    }
  }

  return { progress, daysInTransit };
}

export function buildLiveParcel(params: {
  trackingNumber: string;
  carrier: Carrier;
  status: CanonicalStatus;
  events: TrackingEvent[];
  origin?: CountryRef;
  destination?: CountryRef;
  deliveredAt?: string | null;
  statusText?: string;
  progressOverride?: number;
  lastMileTrackingNumber?: string;
  lastMileCarrier?: Carrier;
  additionalCarriers?: Carrier[];
  postalCode?: string;
  lang?: string;
}): Parcel {
  const sortedEvents = sortEventsNewestFirst(params.events);
  const deliveredAt = params.deliveredAt ?? null;
  const { progress: computedProgress, daysInTransit } = computeProgressAndDays(
    params.status,
    sortedEvents,
    deliveredAt
  );
  const nowIso = new Date().toISOString();

  return {
    id: 'p-' + Math.random().toString(36).substring(2, 9),
    trackingNumber: params.trackingNumber,
    carrier: params.carrier,
    ...(params.additionalCarriers && params.additionalCarriers.length > 0
      ? { additionalCarriers: params.additionalCarriers }
      : {}),
    ...(params.lastMileTrackingNumber
      ? { lastMileTrackingNumber: params.lastMileTrackingNumber }
      : {}),
    ...(params.lastMileCarrier ? { lastMileCarrier: params.lastMileCarrier } : {}),
    status: params.status,
    statusText: params.statusText?.trim() || getLocalizedStatusText(params.status, params.lang),
    progress: params.progressOverride ?? computedProgress,
    origin: params.origin,
    destination: params.destination,
    ...(params.postalCode ? { postalCode: params.postalCode } : {}),
    deliveredAt,
    daysInTransit,
    fromCache: false,
    isLiveData: true,
    events: sortedEvents,
    updatedAt: nowIso,
    createdAt: nowIso,
    isArchived: false,
  };
}
