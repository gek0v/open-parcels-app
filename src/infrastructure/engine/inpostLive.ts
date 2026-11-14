import { Carrier } from '../../domain/models/carrier';
import { EventStage, TrackingEvent } from '../../domain/models/event';
import { CountryRef, Parcel } from '../../domain/models/parcel';
import { CanonicalStatus } from '../../domain/models/status';
import { TrackingEngineError } from './errors';
import { getLocalizedStatusText } from './mapper';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function unwrapAstroValue(v: unknown): any {
  if (!Array.isArray(v) || v.length < 2) return null;
  const [tag, payload] = v;
  if (tag === 0) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const obj: Record<string, any> = {};
      for (const [k, val] of Object.entries(payload)) obj[k] = unwrapAstroValue(val);
      return obj;
    }
    return payload;
  }
  if (tag === 1 && Array.isArray(payload)) return payload.map(unwrapAstroValue);
  return payload;
}

export function extractInPostPropsFromHtml(htmlContent: string): Record<string, any> {
  const idx = htmlContent.indexOf('trackingDetailsStatus');
  if (idx === -1) throw new Error('trackingDetailsStatus not found');
  const propsStart = htmlContent.lastIndexOf('props="', idx);
  if (propsStart === -1) throw new Error('props attribute not found');
  const jsonStart = propsStart + 'props="'.length;
  const propsEnd = htmlContent.indexOf('"', jsonStart);
  if (propsEnd === -1) throw new Error('props attribute end not found');

  const parsed = JSON.parse(decodeHtmlEntities(htmlContent.slice(jsonStart, propsEnd)));
  const unwrapped: Record<string, any> = {};
  for (const [k, v] of Object.entries(parsed)) unwrapped[k] = unwrapAstroValue(v);
  return unwrapped;
}

export function normalizeInPostEventStatus(
  name: string,
  typeStr: string,
  desc: string,
  code?: string
): { status: CanonicalStatus; stage: EventStage } {
  const upperCode = (code || '').trim().toUpperCase();
  const upperType = (typeStr || '').trim().toUpperCase();
  const c = `${name} ${typeStr} ${desc}`.toLowerCase();

  // 1. Official InPost event code mapping when available (from open-parcels core)
  if (upperCode) {
    if (upperCode === 'EOL.9004') {
      return { status: 'exception', stage: 'exception' };
    }
    if (upperCode.startsWith('EOL.')) {
      return { status: 'delivered', stage: 'delivery' };
    }
    if (upperCode.startsWith('RTS.')) {
      return { status: 'exception', stage: 'exception' };
    }
    if (upperCode.startsWith('LMD.9')) {
      return { status: 'failed_attempt', stage: 'exception' };
    }
    if (upperCode.startsWith('LMD.')) {
      if (
        upperType === 'DELIVERED' ||
        (!c.includes('no entregado') &&
          !c.includes('courier') &&
          (c.includes('entregado') || c.includes('delivered')))
      ) {
        return { status: 'delivered', stage: 'delivery' };
      }
      return { status: 'out_for_delivery', stage: 'last_mile' };
    }
    if (upperCode.startsWith('MMD.')) {
      return { status: 'in_transit', stage: 'transit' };
    }
    if (upperCode === 'FMD.1001') {
      return { status: 'info_received', stage: 'created' };
    }
    if (upperCode === 'FMD.9001') {
      return { status: 'exception', stage: 'exception' };
    }
    if (upperCode.startsWith('FMD.')) {
      return { status: 'in_transit', stage: 'picked_up' };
    }
    if (upperCode.startsWith('CRE.') || upperCode.startsWith('FUL.')) {
      return { status: 'info_received', stage: 'created' };
    }
  }

  // 2. Official InPost milestone type enum mapping
  if (upperType === 'DELIVERED') {
    return { status: 'delivered', stage: 'delivery' };
  }
  if (upperType === 'AWAITING_COLLECTION' || upperType === 'IN_TRANSIT_LAST_MILE') {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }
  if (upperType === 'RETURN') {
    return { status: 'exception', stage: 'exception' };
  }

  // 3. Text heuristics with anti-false-delivered safeguards
  const isDeliveredText =
    !c.includes('no entregado') &&
    !c.includes('not delivered') &&
    !c.includes('undelivered') &&
    !c.includes('listo para') &&
    !c.includes('será') &&
    !c.includes('sera') &&
    !c.includes('mensajero') &&
    !c.includes('courier') &&
    (c.includes('entregado') ||
      c.includes('delivered') ||
      c.includes('recogido por el destinatario') ||
      c.includes('recogido por el cliente') ||
      c.includes('retiré par le destinataire') ||
      c.includes('collected by customer') ||
      c.includes('collected by recipient'));

  if (isDeliveredText) {
    return { status: 'delivered', stage: 'delivery' };
  }

  if (
    c.includes('disponible') ||
    c.includes('punto pack') ||
    c.includes('locker') ||
    c.includes('reparto') ||
    c.includes('out_for_delivery') ||
    c.includes('available_for_pickup') ||
    c.includes('ready_for_pickup')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }

  if (
    c.includes('preparación') ||
    c.includes('preparacion') ||
    c.includes('será recogido') ||
    c.includes('sera recogido') ||
    c.includes('listo para ser recogido') ||
    c.includes('registrado informáticamente') ||
    c.includes('registrado informaticamente') ||
    c.includes('info received') ||
    c.includes('cre.') ||
    c.includes('created')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  if (
    c.includes('tránsito') ||
    c.includes('transito') ||
    c.includes('in_transit') ||
    c.includes('en ruta') ||
    c.includes('en camino') ||
    c.includes('clasificación') ||
    c.includes('clasificacion') ||
    c.includes('hub') ||
    c.includes('depot') ||
    c.includes('sorting') ||
    c.includes('recogido por el mensajero') ||
    c.includes('recogido por el repartidor') ||
    c.includes('centro logístico') ||
    c.includes('centro logistico')
  ) {
    return { status: 'in_transit', stage: 'transit' };
  }

  if (
    c.includes('incidencia') ||
    c.includes('fallido') ||
    c.includes('exception') ||
    c.includes('devuelto') ||
    c.includes('error')
  ) {
    return { status: 'exception', stage: 'exception' };
  }

  return { status: 'info_received', stage: 'created' };
}

function resolveDestination(
  carrier: Carrier,
  postalCode: string,
  destCountry?: string,
  lang?: string
): CountryRef {
  const isEn = (lang || 'es').toLowerCase().startsWith('en');
  const clean = postalCode.trim();
  const isEsCp =
    /^\d{5}$/.test(clean) &&
    parseInt(clean.slice(0, 2), 10) >= 1 &&
    parseInt(clean.slice(0, 2), 10) <= 52;
  const upper = (destCountry || '').trim().toUpperCase();

  if (isEsCp || upper === 'ES' || carrier.country === 'ES') {
    return { code: 'ES', name: isEn ? 'Spain' : 'España' };
  }
  if (upper) return { code: upper, name: upper };
  return { code: '', name: 'Unknown' };
}

export function parseInPostHtmlToParcel(
  htmlContent: string,
  trackingNumber: string,
  postalCode: string,
  carrier: Carrier,
  destCountry?: string,
  lang?: string
): Parcel {
  if (
    htmlContent.includes('Paquete no encontrado') ||
    htmlContent.includes('paquete no encontrado')
  ) {
    throw new TrackingEngineError(
      'Envío no encontrado en InPost. Revisa el código de seguimiento y el código postal.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  let props: Record<string, any>;
  try {
    props = extractInPostPropsFromHtml(htmlContent);
  } catch {
    throw new TrackingEngineError(
      'Envío no encontrado o formato inesperado en InPost.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  if (props.trackingDetailsStatus !== 200 || !props.trackingDetails) {
    throw new TrackingEngineError(
      'Envío no encontrado en InPost. Revisa el código de seguimiento y el código postal.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const milestones: any[] = Array.isArray(props.trackingDetails.milestones)
    ? props.trackingDetails.milestones
    : [];
  if (milestones.length === 0) {
    throw new TrackingEngineError('Sin hitos disponibles en InPost.', 'SHIPMENT_NOT_FOUND', 404);
  }

  const events: TrackingEvent[] = [];
  for (const m of milestones) {
    if (!m || typeof m !== 'object') continue;
    const mType = String(m.type || '');
    const mName = String(m.name || '');
    const mDate = String(m.date || '');
    const mLoc = String(m.location || m.place || m.city || '');
    const mEvents: any[] = Array.isArray(m.events) ? m.events : [];

    if (mEvents.length > 0) {
      for (const ev of mEvents) {
        if (!ev || typeof ev !== 'object') continue;
        const evCode = ev.code ? String(ev.code) : undefined;
        const evName = String(ev.name || '');
        const evDate = String(ev.date || mDate || '');
        const evDesc = String(ev.description || evName || mName);
        const evLoc = String(
          ev.location || ev.place || ev.city || ev.agency || ev.depot || mLoc || ''
        );
        const norm = normalizeInPostEventStatus(evName, mType, evDesc, evCode);
        events.push({
          id: `inpost-${events.length}-${evCode || evDate}`,
          date: evDate,
          rawDate: evDate,
          status: norm.status,
          stage: norm.stage,
          description: evDesc,
          location: evLoc || undefined,
          carrierSlug: carrier.slug,
          carrierName: carrier.name,
          eventCode: evCode,
        });
      }
    } else if (mName || mDate) {
      const norm = normalizeInPostEventStatus(mName, mType, '');
      events.push({
        id: `inpost-${events.length}-${mDate}`,
        date: mDate || '',
        rawDate: mDate || undefined,
        status: norm.status,
        stage: norm.stage,
        description: mName,
        location: mLoc || undefined,
        carrierSlug: carrier.slug,
        carrierName: carrier.name,
      });
    }
  }

  if (events.length === 0) {
    throw new TrackingEngineError('No se encontraron eventos en InPost.', 'SHIPMENT_NOT_FOUND', 404);
  }

  events.sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  let status: CanonicalStatus = events[0].status;
  let deliveredAt: string | null = null;
  for (const ev of events) {
    if (ev.status === 'delivered') {
      status = 'delivered';
      if (!deliveredAt) deliveredAt = ev.date || null;
      break;
    }
  }

  const earliestValid = [...events]
    .reverse()
    .find((ev) => ev.date && !Number.isNaN(new Date(ev.date).getTime()));
  const earliestMs = earliestValid ? new Date(earliestValid.date).getTime() : NaN;
  const endMs = deliveredAt && !Number.isNaN(new Date(deliveredAt).getTime())
    ? new Date(deliveredAt).getTime()
    : Date.now();
  const diffHours = !Number.isNaN(earliestMs)
    ? Math.max(0, (endMs - earliestMs) / 3600000)
    : 0;
  let daysInTransit = Math.floor(diffHours / 24);
  if (daysInTransit < 1 && diffHours > 0) daysInTransit = 1;

  const progress =
    status === 'delivered'
      ? 100
      : status === 'out_for_delivery'
        ? 85
        : status === 'in_transit'
          ? 35
          : status === 'exception'
            ? 60
            : 15;

  const nowIso = new Date().toISOString();
  return {
    id: 'p-' + Math.random().toString(36).substring(2, 9),
    trackingNumber,
    carrier,
    status,
    statusText: getLocalizedStatusText(status, lang),
    progress,
    origin: { code: '', name: 'Unknown' },
    destination: resolveDestination(carrier, postalCode, destCountry, lang),
    postalCode,
    deliveredAt,
    daysInTransit,
    fromCache: false,
    isLiveData: true,
    events,
    updatedAt: nowIso,
    createdAt: nowIso,
    isArchived: false,
  };
}

export function inpostCountryName(code: string): string {
  switch ((code || '').trim().toUpperCase()) {
    case 'IT':
      return 'Italy';
    case 'ES':
      return 'Spain';
    case 'FR':
      return 'France';
    case 'PT':
      return 'Portugal';
    case 'PL':
      return 'Poland';
    case 'BE':
      return 'Belgium';
    case 'NL':
      return 'Netherlands';
    case 'LU':
      return 'Luxembourg';
    case 'DE':
      return 'Germany';
    case 'GB':
    case 'UK':
      return 'United Kingdom';
    default:
      return (code || '').trim().toUpperCase();
  }
}

export function parseInPostShipXPayloadToParcel(
  payload: any,
  trackingNumber: string,
  carrier: Carrier,
  lang = 'es'
): Parcel {
  const results = Array.isArray(payload) ? payload : [payload];
  if (
    results.length === 0 ||
    !results[0] ||
    !Array.isArray(results[0].events) ||
    results[0].events.length === 0
  ) {
    throw new TrackingEngineError('Envío no encontrado en InPost.', 'SHIPMENT_NOT_FOUND', 404);
  }

  const res = results[0];
  const events: TrackingEvent[] = [];

  for (const ev of res.events) {
    if (!ev || typeof ev !== 'object') continue;
    const evDateStr = String(ev.timestamp || '');
    const title = String(ev.eventTitle || '');
    const desc = String(ev.eventDescription || title || '');
    const code = ev.eventCode ? String(ev.eventCode) : undefined;

    let locStr = '';
    if (ev.location && typeof ev.location === 'object') {
      const city = String(ev.location.city || '').trim();
      const countryCode = String(ev.location.countryCode || '').trim();
      const country = countryCode ? inpostCountryName(countryCode) : '';
      if (city && country) {
        locStr = `${city}, ${country}`;
      } else if (city) {
        locStr = city;
      } else if (country) {
        locStr = country;
      }
    }

    const norm = normalizeInPostEventStatus(title, '', desc, code);
    events.push({
      id: `inpost-it-${events.length}-${code || evDateStr}`,
      date: evDateStr,
      rawDate: evDateStr,
      status: norm.status,
      stage: norm.stage,
      description: desc,
      location: locStr || undefined,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
      eventCode: code,
    });
  }

  if (events.length === 0) {
    throw new TrackingEngineError(
      'Sin eventos disponibles en InPost.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  events.sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  let status: CanonicalStatus = events[0].status;
  let deliveredAt: string | null = null;
  for (const ev of events) {
    if (ev.status === 'delivered') {
      status = 'delivered';
      if (!deliveredAt) deliveredAt = ev.date || null;
      break;
    }
  }

  const earliestValid = [...events]
    .reverse()
    .find((ev) => ev.date && !Number.isNaN(new Date(ev.date).getTime()));
  const earliestMs = earliestValid ? new Date(earliestValid.date).getTime() : NaN;
  const endMs =
    deliveredAt && !Number.isNaN(new Date(deliveredAt).getTime())
      ? new Date(deliveredAt).getTime()
      : Date.now();
  const diffHours = !Number.isNaN(earliestMs)
    ? Math.max(0, (endMs - earliestMs) / 3600000)
    : 0;
  let daysInTransit = Math.floor(diffHours / 24);
  if (daysInTransit < 1 && diffHours > 0) daysInTransit = 1;

  const progress =
    status === 'delivered'
      ? 100
      : status === 'out_for_delivery'
        ? 85
        : status === 'in_transit'
          ? 35
          : status === 'exception'
            ? 60
            : 15;

  let origin: CountryRef = { code: 'IT', name: 'Italy' };
  if (res.origin && typeof res.origin === 'object') {
    const cCode = String(res.origin.countryCode || 'IT').trim().toUpperCase();
    const cName = inpostCountryName(cCode);
    const city = String(res.origin.city || '').trim();
    origin = {
      code: cCode,
      name: city ? `${city}, ${cName}` : cName,
    };
  }

  let destination: CountryRef = { code: 'IT', name: 'Italy' };
  if (res.destination && typeof res.destination === 'object') {
    const cCode = String(res.destination.countryCode || 'IT').trim().toUpperCase();
    const cName = inpostCountryName(cCode);
    const city = String(res.destination.city || '').trim();
    destination = {
      code: cCode,
      name: city ? `${city}, ${cName}` : cName,
    };
  }

  const nowIso = new Date().toISOString();
  return {
    id: 'p-' + Math.random().toString(36).substring(2, 9),
    trackingNumber,
    carrier,
    status,
    statusText: getLocalizedStatusText(status, lang),
    progress,
    origin,
    destination,
    deliveredAt,
    daysInTransit,
    fromCache: false,
    isLiveData: true,
    events,
    updatedAt: nowIso,
    createdAt: nowIso,
    isArchived: false,
  };
}

export function enrichInPostParcelWithShipX(
  parcel: Parcel,
  shipxPayload: any,
  lang = 'es'
): Parcel {
  if (shipxPayload) {
    try {
      const results = Array.isArray(shipxPayload) ? shipxPayload : [shipxPayload];
      if (results.length > 0 && results[0]) {
        const res = results[0];

        // 1. Enrich Origin if missing or Unknown
        if (
          res.origin &&
          (!parcel.origin || parcel.origin.name === 'Unknown' || !parcel.origin.name)
        ) {
          const cCode = String(res.origin.countryCode || 'IT').trim().toUpperCase();
          const cName = inpostCountryName(cCode);
          const city = String(res.origin.city || '').trim();
          parcel.origin = {
            code: cCode,
            name: city ? `${city}, ${cName}` : cName,
          };
        }

        // 2. Enrich Destination city if available and matching destination code (or code empty)
        if (res.destination) {
          const cCode = String(res.destination.countryCode || '').trim().toUpperCase();
          const cName = inpostCountryName(cCode);
          const city = String(res.destination.city || '').trim();
          const currentDestCode = parcel.destination?.code || '';
          if (cName && (currentDestCode === '' || currentDestCode === cCode)) {
            parcel.destination = {
              code: cCode || currentDestCode,
              name: city ? `${city}, ${cName}` : cName,
            };
          }
        }

        // 3. Enrich event locations via time-proximity matching (within 10 minutes)
        const shipxEvents: any[] = Array.isArray(res.events) ? res.events : [];
        for (let i = 0; i < parcel.events.length; i++) {
          if (parcel.events[i].location) continue;
          const evTime = new Date(parcel.events[i].date).getTime();
          if (Number.isNaN(evTime)) continue;

          let bestMatch: any = null;
          let bestDiff = 10 * 60 * 1000; // 10 minutes maximum window

          for (const itEv of shipxEvents) {
            const itTime = new Date(itEv.timestamp).getTime();
            if (Number.isNaN(itTime)) continue;
            const diff = Math.abs(evTime - itTime);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestMatch = itEv;
            }
          }

          if (bestMatch && bestMatch.location && typeof bestMatch.location === 'object') {
            const city = String(bestMatch.location.city || '').trim();
            const countryCode = String(bestMatch.location.countryCode || '').trim();
            const country = countryCode ? inpostCountryName(countryCode) : '';
            if (city && country) {
              parcel.events[i].location = `${city}, ${country}`;
            } else if (city) {
              parcel.events[i].location = city;
            } else if (country) {
              parcel.events[i].location = country;
            }
          }
        }
      }
    } catch {
      // Enrichment failed, proceed to fallback
    }
  }

  // 4. Apply smart regional / stage fallback for any remaining events without location (commit 2faeace)
  for (let i = 0; i < parcel.events.length; i++) {
    if (parcel.events[i].location) continue;
    const ev = parcel.events[i];
    if (
      ev.stage === 'last_mile' ||
      ev.stage === 'delivery' ||
      ev.status === 'out_for_delivery' ||
      ev.status === 'delivered'
    ) {
      if (parcel.destination?.name && parcel.destination.name !== 'Unknown') {
        ev.location = parcel.destination.name;
      }
    } else if (ev.stage === 'created' || ev.status === 'info_received') {
      if (parcel.origin?.name && parcel.origin.name !== 'Unknown') {
        ev.location = parcel.origin.name;
      }
    }
  }

  return parcel;
}

export async function fetchInPostItalyShipXLive(
  trackingNumber: string,
  carrier: Carrier,
  lang = 'es'
): Promise<Parcel> {
  const isEn = (lang || '').toLowerCase().startsWith('en');
  const url = `https://inpost.it/shipx-proxy/?number=${encodeURIComponent(
    trackingNumber
  )}&returnTranslations=true&language=${isEn ? 'en' : 'es'}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: 'https://inpost.it/',
      },
    });

    if (res.status === 404) {
      throw new TrackingEngineError('Envío no encontrado en InPost.', 'SHIPMENT_NOT_FOUND', 404);
    }
    if (!res.ok) {
      throw new TrackingEngineError(
        `Error al consultar InPost ShipX (HTTP ${res.status}).`,
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        res.status
      );
    }
    const data = await res.json();
    return parseInPostShipXPayloadToParcel(data, trackingNumber, carrier, lang);
  } catch (err) {
    if (err instanceof TrackingEngineError) throw err;
    throw new TrackingEngineError(
      'No se pudo conectar con InPost ShipX. Verifica tu conexión a internet.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502,
      err
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchInPostLive(
  trackingNumber: string,
  postalCode: string,
  carrier: Carrier,
  destCountry?: string,
  lang?: string
): Promise<Parcel> {
  const url = `https://www.inpost.es/seguimiento-del-envio?parcelNumber=${encodeURIComponent(
    trackingNumber
  )}&zipCode=${encodeURIComponent(postalCode)}`;

  const isEn = (lang || '').toLowerCase().startsWith('en');
  const shipxUrl = `https://inpost.it/shipx-proxy/?number=${encodeURIComponent(
    trackingNumber
  )}&returnTranslations=true&language=${isEn ? 'en' : 'es'}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const [htmlRes, shipxRes] = await Promise.allSettled([
      fetch(url, {
        method: 'GET',
        signal: ctrl.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      }),
      fetch(shipxUrl, {
        method: 'GET',
        signal: ctrl.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: 'https://inpost.it/',
        },
      }),
    ]);

    if (htmlRes.status === 'rejected') {
      throw htmlRes.reason;
    }
    const res = htmlRes.value;
    if (res.status === 404) {
      throw new TrackingEngineError('Envío no encontrado en InPost.', 'SHIPMENT_NOT_FOUND', 404);
    }
    if (!res.ok) {
      throw new TrackingEngineError(
        `Error al consultar InPost (HTTP ${res.status}).`,
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        res.status
      );
    }
    const html = await res.text();
    const parcel = parseInPostHtmlToParcel(
      html,
      trackingNumber,
      postalCode,
      carrier,
      destCountry,
      lang
    );

    let shipxData: any = null;
    if (shipxRes.status === 'fulfilled' && shipxRes.value.ok) {
      try {
        shipxData = await shipxRes.value.json();
      } catch {
        // Silently continue if JSON parse fails
      }
    }

    return enrichInPostParcelWithShipX(parcel, shipxData, lang);
  } catch (err) {
    if (err instanceof TrackingEngineError) throw err;
    throw new TrackingEngineError(
      'No se pudo conectar con InPost. Verifica tu conexión a internet.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502,
      err
    );
  } finally {
    clearTimeout(timer);
  }
}