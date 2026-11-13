import { Carrier } from '../../domain/models/carrier';
import { EventStage, TrackingEvent } from '../../domain/models/event';
import { CountryRef, Parcel } from '../../domain/models/parcel';
import { CanonicalStatus } from '../../domain/models/status';
import { parseSpanishDateToIso } from './correosLive';
import { TrackingEngineError } from './errors';
import { getLocalizedStatusText } from './mapper';

export function normalizeGLSSpainStatus(
  statusStr: string,
  descStr: string
): { status: CanonicalStatus; stage: EventStage } {
  const upper = `${statusStr || ''} ${descStr || ''}`.toUpperCase().trim();

  if (
    !upper.includes('NO ENTREGADO') &&
    !upper.includes('NOT DELIVERED') &&
    (upper.includes('DELIVERED') || upper.includes('ENTREGADO'))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }

  if (
    upper.includes('OUT_FOR_DELIVERY') ||
    upper.includes('EN REPARTO') ||
    upper.includes('DISPONIBLE') ||
    upper.includes('PARCELSHOP')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }

  if (
    upper.includes('IN_TRANSIT') ||
    upper.includes('TRANSITO') ||
    upper.includes('TRÁNSITO') ||
    upper.includes('CENTRO') ||
    upper.includes('PLATAFORMA') ||
    upper.includes('HUB')
  ) {
    return { status: 'in_transit', stage: 'transit' };
  }

  if (
    upper.includes('REGISTERED') ||
    upper.includes('SISTEMA') ||
    upper.includes('INFO_RECEIVED') ||
    upper.includes('DOCUMENTADO') ||
    upper.includes('PREPARACION') ||
    upper.includes('PREPARACIÓN')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  if (
    upper.includes('FAILED') ||
    upper.includes('AUSENTE') ||
    upper.includes('FALLID') ||
    upper.includes('INCIDENCIA')
  ) {
    return { status: 'failed_attempt', stage: 'exception' };
  }

  if (upper.includes('EXCEPTION') || upper.includes('DEVUELTO')) {
    return { status: 'exception', stage: 'exception' };
  }

  return { status: 'in_transit', stage: 'transit' };
}

export function normalizeSEURStatus(
  estadoStr: string,
  descStr: string
): { status: CanonicalStatus; stage: EventStage } {
  const upper = `${estadoStr || ''} ${descStr || ''}`.toUpperCase().trim();

  if (
    !upper.includes('NO ENTREGADO') &&
    (upper.includes('ENTREGADO') || upper.includes('DELIVERED'))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }

  if (
    upper.includes('REPARTO') ||
    upper.includes('CONDUCTOR') ||
    upper.includes('REPARTIDOR') ||
    upper.includes('OUT FOR DELIVERY')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }

  if (
    upper.includes('TRANSITO') ||
    upper.includes('TRÁNSITO') ||
    upper.includes('PLATAFORMA') ||
    upper.includes('ARRASTRE') ||
    upper.includes('NAVE') ||
    upper.includes('CENTRO')
  ) {
    return { status: 'in_transit', stage: 'transit' };
  }

  if (
    upper.includes('REGISTRADO') ||
    upper.includes('INFORMADO') ||
    upper.includes('PRE_REGISTRADO') ||
    upper.includes('DOCUMENTADO')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  if (
    upper.includes('INCIDENCIA') ||
    upper.includes('AUSENTE') ||
    upper.includes('FALLIDO') ||
    upper.includes('NO ENTREGADO')
  ) {
    return { status: 'failed_attempt', stage: 'exception' };
  }

  if (upper.includes('DEVUELTO') || upper.includes('DEVOLUCION')) {
    return { status: 'exception', stage: 'exception' };
  }

  return { status: 'in_transit', stage: 'transit' };
}

function computeProgressAndDays(
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
          : status === 'exception'
            ? 60
            : status === 'failed_attempt'
              ? 70
              : 15;

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

  return { progress, daysInTransit: Math.max(1, daysInTransit) };
}

/**
 * Parses JSON response from GLS Spain API into canonical Parcel.
 */
export function parseGLSSpainPayload(
  payload: any,
  trackingNumber: string,
  postalCode: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  if (!payload || typeof payload !== 'object') {
    throw new TrackingEngineError(
      'Respuesta inesperada de GLS Spain.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const rawHistory: any[] = Array.isArray(payload.history) ? payload.history : [];
  if (rawHistory.length === 0 && !payload.status && !payload.statusDescription) {
    throw new TrackingEngineError(
      'Envío no encontrado en GLS Spain. Revisa el código y código postal.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const events: TrackingEvent[] = [];
  for (const item of rawHistory) {
    if (!item || typeof item !== 'object') continue;
    const desc = String(item.description || item.status || 'Actualización GLS Spain');
    const statusVal = String(item.status || '');
    const dateIso = parseSpanishDateToIso(String(item.date || ''));
    const location = String(item.location || '').trim();
    const locWithCountry = location ? `${location}, España` : undefined;

    const norm = normalizeGLSSpainStatus(statusVal, desc);
    events.push({
      id: `gls-${events.length}-${dateIso}`,
      date: dateIso,
      rawDate: String(item.date || dateIso),
      status: norm.status,
      stage: norm.stage,
      description: desc,
      location: locWithCountry,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
    });
  }

  events.sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  const overallNorm = normalizeGLSSpainStatus(
    String(payload.status || ''),
    String(payload.statusDescription || '')
  );

  let status: CanonicalStatus = events.length > 0 ? events[0].status : overallNorm.status;
  let deliveredAt: string | null = payload.deliveryDate
    ? parseSpanishDateToIso(String(payload.deliveryDate))
    : null;

  for (const ev of events) {
    if (ev.status === 'delivered') {
      status = 'delivered';
      if (!deliveredAt) deliveredAt = ev.date;
      break;
    }
  }

  const originCity = payload.origin?.city || '';
  const origin: CountryRef = {
    code: payload.origin?.country || 'ES',
    name: originCity ? `${originCity}, España` : 'España',
  };

  const destCity = payload.destination?.city || '';
  const destination: CountryRef = {
    code: payload.destination?.country || 'ES',
    name: destCity ? `${destCity}, España` : 'España',
  };

  const { progress, daysInTransit } = computeProgressAndDays(status, events, deliveredAt);
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
    postalCode: postalCode || payload.destination?.postalCode || undefined,
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

/**
 * Parses JSON response from SEUR API into canonical Parcel.
 */
export function parseSEURPayload(
  payload: any,
  trackingNumber: string,
  postalCode: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  if (!payload || typeof payload !== 'object') {
    throw new TrackingEngineError(
      'Respuesta inesperada de SEUR.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  if (payload.estado === 'NO_ENCONTRADO') {
    throw new TrackingEngineError(
      'Envío no encontrado en SEUR. Revisa el código y código postal.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const rawEventos: any[] = Array.isArray(payload.eventos) ? payload.eventos : [];
  if (rawEventos.length === 0 && !payload.estado && !payload.descripcionEstado) {
    throw new TrackingEngineError(
      'Envío no encontrado en SEUR.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const events: TrackingEvent[] = [];
  for (const ev of rawEventos) {
    if (!ev || typeof ev !== 'object') continue;
    const desc = String(ev.descripcion || ev.estado || 'Actualización SEUR');
    const estadoVal = String(ev.estado || '');
    const dateIso = parseSpanishDateToIso(String(ev.fecha || ''));
    const location = String(ev.centro || '').trim();
    const locWithCountry = location ? `${location}, España` : undefined;

    const norm = normalizeSEURStatus(estadoVal, desc);
    events.push({
      id: `seur-${events.length}-${dateIso}`,
      date: dateIso,
      rawDate: String(ev.fecha || dateIso),
      status: norm.status,
      stage: norm.stage,
      description: desc,
      location: locWithCountry,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
      eventCode: estadoVal || undefined,
    });
  }

  events.sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  const overallNorm = normalizeSEURStatus(
    String(payload.estado || ''),
    String(payload.descripcionEstado || '')
  );

  let status: CanonicalStatus = events.length > 0 ? events[0].status : overallNorm.status;
  let deliveredAt: string | null = payload.fechaEntrega
    ? parseSpanishDateToIso(String(payload.fechaEntrega))
    : null;

  for (const ev of events) {
    if (ev.status === 'delivered') {
      status = 'delivered';
      if (!deliveredAt) deliveredAt = ev.date;
      break;
    }
  }

  const origin: CountryRef = {
    code: 'ES',
    name: payload.origen || 'España',
  };
  const destination: CountryRef = {
    code: 'ES',
    name: payload.destino || 'España',
  };

  const { progress, daysInTransit } = computeProgressAndDays(status, events, deliveredAt);
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
    postalCode: postalCode || payload.codigoPostalDestino || undefined,
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

/**
 * Direct HTTP fetcher for GLS Spain live API.
 */
export async function fetchGLSSpainLive(
  trackingNumber: string,
  postalCode: string,
  carrier: Carrier,
  lang?: string
): Promise<Parcel> {
  const cleanCp = (postalCode || '').trim();
  if (!cleanCp) {
    throw new TrackingEngineError(
      'Código postal obligatorio para consultar GLS Spain.',
      'POSTAL_CODE_REQUIRED',
      422
    );
  }

  const url = `https://www.gls-spain.es/api/tracking/v1/shipments?trackingNumber=${encodeURIComponent(
    trackingNumber
  )}&postalCode=${encodeURIComponent(cleanCp)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (res.status === 404) {
      throw new TrackingEngineError(
        'Envío no encontrado en GLS Spain.',
        'SHIPMENT_NOT_FOUND',
        404
      );
    }
    if (!res.ok) {
      throw new TrackingEngineError(
        `Error al consultar GLS Spain (HTTP ${res.status}).`,
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        res.status
      );
    }

    const json = await res.json();
    return parseGLSSpainPayload(json, trackingNumber, cleanCp, carrier, lang);
  } catch (err) {
    if (err instanceof TrackingEngineError) throw err;
    throw new TrackingEngineError(
      'No se pudo conectar con GLS Spain. Verifica tu conexión a internet.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502,
      err
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Direct HTTP fetcher for SEUR live API.
 */
export async function fetchSEURLive(
  trackingNumber: string,
  postalCode: string,
  carrier: Carrier,
  lang?: string
): Promise<Parcel> {
  const cleanCp = (postalCode || '').trim();
  if (!cleanCp) {
    throw new TrackingEngineError(
      'Código postal obligatorio para consultar SEUR.',
      'POSTAL_CODE_REQUIRED',
      422
    );
  }

  const url = `https://www.seur.com/livetracking/api/v1/shipments?identificador=${encodeURIComponent(
    trackingNumber
  )}&codigoPostal=${encodeURIComponent(cleanCp)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (res.status === 404) {
      throw new TrackingEngineError(
        'Envío no encontrado en SEUR.',
        'SHIPMENT_NOT_FOUND',
        404
      );
    }
    if (!res.ok) {
      throw new TrackingEngineError(
        `Error al consultar SEUR (HTTP ${res.status}).`,
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        res.status
      );
    }

    const json = await res.json();
    return parseSEURPayload(json, trackingNumber, cleanCp, carrier, lang);
  } catch (err) {
    if (err instanceof TrackingEngineError) throw err;
    throw new TrackingEngineError(
      'No se pudo conectar con SEUR. Verifica tu conexión a internet.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502,
      err
    );
  } finally {
    clearTimeout(timer);
  }
}
