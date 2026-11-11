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
  desc: string
): { status: CanonicalStatus; stage: EventStage } {
  const c = `${name} ${typeStr} ${desc}`.toLowerCase();

  if (
    c.includes('entregado') ||
    c.includes('delivered') ||
    c.includes('recogido por el destinatario') ||
    c.includes('recogido por el cliente') ||
    c.includes('retiré par le destinataire')
  ) {
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

  if (
    c.includes('preparación') ||
    c.includes('preparacion') ||
    c.includes('at_the_origin') ||
    c.includes('registrado informáticamente') ||
    c.includes('registrado informaticamente') ||
    c.includes('será recogido') ||
    c.includes('sera recogido') ||
    c.includes('listo para ser recogido') ||
    c.includes('info received') ||
    c.includes('cre.') ||
    c.includes('created')
  ) {
    return { status: 'info_received', stage: 'created' };
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
        const evDate = String(ev.date || mDate || new Date().toISOString());
        const evDesc = String(ev.description || evName || mName);
        const evLoc = String(
          ev.location || ev.place || ev.city || ev.agency || ev.depot || mLoc || ''
        );
        const norm = normalizeInPostEventStatus(evName, mType, evDesc);
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
        date: mDate || new Date().toISOString(),
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

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let status: CanonicalStatus = events[0].status;
  let deliveredAt: string | null = null;
  for (const ev of events) {
    if (ev.status === 'delivered') {
      status = 'delivered';
      if (!deliveredAt) deliveredAt = ev.date;
      break;
    }
  }

  const earliest = events[events.length - 1];
  const diffHours = Math.max(
    0,
    (new Date(deliveredAt || Date.now()).getTime() - new Date(earliest.date).getTime()) / 3600000
  );
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

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
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
    return parseInPostHtmlToParcel(html, trackingNumber, postalCode, carrier, destCountry, lang);
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