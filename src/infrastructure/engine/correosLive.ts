import { Carrier } from '../../domain/models/carrier';
import { EventStage, TrackingEvent } from '../../domain/models/event';
import { CountryRef, Parcel } from '../../domain/models/parcel';
import { CanonicalStatus } from '../../domain/models/status';
import { TrackingEngineError } from './errors';
import { getLocalizedStatusText } from './mapper';

/**
 * Parses date string in common Spanish formats (DD/MM/YYYY, ISO, etc.) to ISO 8601 string.
 */
export function parseSpanishDateToIso(dateStr: string, timeStr?: string): string {
  const cleanDate = (dateStr || '').trim();
  const cleanTime = (timeStr || '').trim();
  if (!cleanDate) return new Date().toISOString();

  // Combined e.g. "13/11/2026 14:30:00"
  const combined = cleanTime ? `${cleanDate} ${cleanTime}` : cleanDate;

  // 1. Parse DD/MM/YYYY [HH:mm[:ss]] (Spanish standard format) FIRST
  const dmyMatch = combined.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dmyMatch) {
    const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = dmyMatch;
    const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}.000Z`;
    const ts = Date.parse(isoString);
    if (!Number.isNaN(ts)) {
      return new Date(ts).toISOString();
    }
  }

  // 2. Parse YYYY-MM-DD [HH:mm[:ss]]
  const ymdMatch = combined.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (ymdMatch) {
    const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = ymdMatch;
    const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}.000Z`;
    const ts = Date.parse(isoString);
    if (!Number.isNaN(ts)) {
      return new Date(ts).toISOString();
    }
  }

  // 3. Fallback to native Date parse (handles standard ISO format e.g. 2026-11-13T10:00:00Z)
  const nativeTs = Date.parse(combined);
  if (!Number.isNaN(nativeTs)) {
    return new Date(nativeTs).toISOString();
  }

  return cleanDate;
}

export function normalizeCorreosStatus(
  statusStr: string,
  descStr: string
): { status: CanonicalStatus; stage: EventStage } {
  const upper = `${statusStr || ''} ${descStr || ''}`.toUpperCase().trim();

  // Delivered check (avoiding false positives like "NO ENTREGADO")
  if (
    !upper.includes('NO ENTREGADO') &&
    !upper.includes('FALLIDO') &&
    !upper.includes('INTENTO') &&
    (upper.includes('ENTREGADO') || upper.includes('DELIVERED'))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }

  // Out for delivery / pickup ready
  if (
    upper.includes('EN_REPARTO') ||
    upper.includes('EN REPARTO') ||
    upper.includes('DISPONIBLE_OFICINA') ||
    upper.includes('EN LISTA') ||
    upper.includes('DISPONIBLE EN OFICINA') ||
    upper.includes('AVISO_LLEGADA') ||
    upper.includes('AVISO PARA RECOGIDA') ||
    upper.includes('OUT FOR DELIVERY')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }

  // In transit / processing
  if (
    upper.includes('ADMITIDO') ||
    upper.includes('RECOGIDO') ||
    upper.includes('TRANSITO') ||
    upper.includes('TRÁNSITO') ||
    upper.includes('CLASIFICADO') ||
    upper.includes('CAMINO') ||
    upper.includes('CTA') ||
    upper.includes('EN CAMINO') ||
    upper.includes('CENTRO LOG') ||
    upper.includes('CENTRO DE TRATAMIENTO')
  ) {
    return { status: 'in_transit', stage: 'transit' };
  }

  // Pre-registration / Info received
  if (
    upper.includes('PRE_REGISTRADO') ||
    upper.includes('PREREGISTRADO') ||
    upper.includes('INFORMADO') ||
    upper.includes('PREPARACION') ||
    upper.includes('PREPARACIÓN') ||
    upper.includes('INFO RECEIVED')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  // Failed attempts
  if (
    upper.includes('INCIDENCIA') ||
    upper.includes('AUSENTE') ||
    upper.includes('FALLIDO') ||
    upper.includes('DIRECCION INCORRECTA') ||
    upper.includes('NO ENTREGADO')
  ) {
    return { status: 'failed_attempt', stage: 'exception' };
  }

  // Return / Exceptions
  if (
    upper.includes('DEVUELTO') ||
    upper.includes('DEVOLUCION') ||
    upper.includes('DEVOLUCIÓN') ||
    upper.includes('EXTRAVIO') ||
    upper.includes('EXTRAVÍO') ||
    upper.includes('RETENIDO')
  ) {
    return { status: 'exception', stage: 'exception' };
  }

  return { status: 'in_transit', stage: 'transit' };
}

export function normalizeCorreosExpressStatus(
  descStr: string,
  tipoStr: string
): { status: CanonicalStatus; stage: EventStage } {
  const upperDesc = (descStr || '').toUpperCase().trim();
  const upperTipo = (tipoStr || '').toUpperCase().trim();

  if (
    !upperDesc.includes('NO ENTREGADO') &&
    (upperTipo === 'D' || upperDesc.includes('ENTREGADO') || upperDesc.includes('DELIVERED'))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }

  if (
    upperTipo === 'R' ||
    upperDesc.includes('REPARTO') ||
    upperDesc.includes('OUT FOR DELIVERY')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }

  if (
    upperTipo === 'T' ||
    upperDesc.includes('TRANSITO') ||
    upperDesc.includes('TRÁNSITO') ||
    upperDesc.includes('NAVE') ||
    upperDesc.includes('CLASIFICADO') ||
    upperDesc.includes('EN CAMINO')
  ) {
    return { status: 'in_transit', stage: 'transit' };
  }

  if (
    upperTipo === 'I' ||
    upperDesc.includes('SIN RECIBIR') ||
    upperDesc.includes('INFORMADO') ||
    upperDesc.includes('REGISTRADO') ||
    upperDesc.includes('PREPARACION') ||
    upperDesc.includes('PREPARACIÓN')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  if (
    upperDesc.includes('INCIDENCIA') ||
    upperDesc.includes('AUSENTE') ||
    upperDesc.includes('FALLIDO') ||
    upperDesc.includes('NO ENTREGADO')
  ) {
    return { status: 'failed_attempt', stage: 'exception' };
  }

  if (upperDesc.includes('DEVUELTO') || upperDesc.includes('DEVOLUCION')) {
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
          ? 45
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
 * Parses JSON response from Correos España public API.
 */
export function parseCorreosSpainPayload(
  payload: any,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  if (!payload || typeof payload !== 'object') {
    throw new TrackingEngineError(
      'Respuesta inesperada de Correos España.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const shipment = payload.shipment;
  if (!shipment || typeof shipment !== 'object') {
    throw new TrackingEngineError(
      'Envío no encontrado en Correos España.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const rawEvents: any[] = Array.isArray(shipment.events) ? shipment.events : [];
  if (rawEvents.length === 0 && !shipment.status && !shipment.statusDescription) {
    throw new TrackingEngineError(
      'Envío sin datos ni hitos en Correos España.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const events: TrackingEvent[] = [];
  for (const ev of rawEvents) {
    if (!ev || typeof ev !== 'object') continue;
    const evStatusStr = String(ev.status || '');
    const evDesc = String(ev.description || evStatusStr || 'Actualización de estado');
    const evDateIso = parseSpanishDateToIso(String(ev.eventDate || ''));
    const location = String(ev.location || ev.office || '').trim();
    const locWithCountry = location ? (location.toLowerCase().includes('spain') || location.toLowerCase().includes('españa') ? location : `${location}, España`) : undefined;

    const norm = normalizeCorreosStatus(evStatusStr, evDesc);
    events.push({
      id: `correos-${events.length}-${evDateIso}`,
      date: evDateIso,
      rawDate: String(ev.eventDate || evDateIso),
      status: norm.status,
      stage: norm.stage,
      description: evDesc,
      location: locWithCountry,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
    });
  }

  // Sort descending by date
  events.sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  const overallNorm = normalizeCorreosStatus(
    String(shipment.status || ''),
    String(shipment.statusDescription || '')
  );

  let status: CanonicalStatus = events.length > 0 ? events[0].status : overallNorm.status;
  let deliveredAt: string | null = shipment.deliveryDate
    ? parseSpanishDateToIso(String(shipment.deliveryDate))
    : null;

  for (const ev of events) {
    if (ev.status === 'delivered') {
      status = 'delivered';
      if (!deliveredAt) deliveredAt = ev.date;
      break;
    }
  }

  const originCountry = shipment.origin?.country || 'ES';
  const destCountry = shipment.destination?.country || 'ES';
  const origin: CountryRef = {
    code: originCountry,
    name: shipment.origin?.countryName || (originCountry === 'ES' ? 'España' : originCountry),
  };
  const destination: CountryRef = {
    code: destCountry,
    name: shipment.destination?.countryName || (destCountry === 'ES' ? 'España' : destCountry),
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
    postalCode: shipment.destination?.postalCode || undefined,
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
 * Parses JSON response from Correos Express public REST endpoint.
 */
export function parseCorreosExpressPayload(
  payload: any,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  if (!payload || typeof payload !== 'object') {
    throw new TrackingEngineError(
      'Respuesta inesperada de Correos Express.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  if (payload.codigoError && payload.codigoError !== '0') {
    throw new TrackingEngineError(
      payload.mensajeError || 'Envío no encontrado en Correos Express.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const rawPositions: any[] = Array.isArray(payload.posicion) ? payload.posicion : [];
  if (rawPositions.length === 0 && !payload.estado && !payload.descEstado) {
    throw new TrackingEngineError(
      'Envío no encontrado en Correos Express.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const events: TrackingEvent[] = [];
  for (const pos of rawPositions) {
    if (!pos || typeof pos !== 'object') continue;
    const desc = String(pos.descrip || pos.desc || 'Actualización Correos Express');
    const tipo = String(pos.tipo || '');
    const dateIso = parseSpanishDateToIso(String(pos.fecha || ''), String(pos.hora || ''));
    const location = String(pos.nomOfi || pos.codOfi || '').trim();
    const locWithCountry = location ? `${location}, España` : undefined;

    const norm = normalizeCorreosExpressStatus(desc, tipo);
    events.push({
      id: `cxp-${events.length}-${dateIso}`,
      date: dateIso,
      rawDate: `${pos.fecha || ''} ${pos.hora || ''}`.trim() || dateIso,
      status: norm.status,
      stage: norm.stage,
      description: desc,
      location: locWithCountry,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
      eventCode: tipo || undefined,
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

  const overallNorm = normalizeCorreosExpressStatus(
    String(payload.descEstado || ''),
    String(payload.estado || '')
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

  const { progress, daysInTransit } = computeProgressAndDays(status, events, deliveredAt);
  const nowIso = new Date().toISOString();

  return {
    id: 'p-' + Math.random().toString(36).substring(2, 9),
    trackingNumber,
    carrier,
    status,
    statusText: getLocalizedStatusText(status, lang),
    progress,
    origin: { code: 'ES', name: payload.origen || 'España' },
    destination: { code: 'ES', name: payload.destino || 'España' },
    deliveredAt,
    daysInTransit,
    serviceType: payload.referencia ? `Ref: ${payload.referencia}` : undefined,
    fromCache: false,
    isLiveData: true,
    events,
    updatedAt: nowIso,
    createdAt: nowIso,
    isArchived: false,
  };
}

/**
 * Direct HTTP fetcher for Correos España live API.
 */
export async function fetchCorreosSpainLive(
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Promise<Parcel> {
  const codIdioma = (lang || 'es').toLowerCase().startsWith('en') ? 'EN' : 'ES';
  const url = `https://api1.correos.es/digital-services/searches-b2c/api/v1/shipments?codEnvio=${encodeURIComponent(
    trackingNumber
  )}&codIdioma=${codIdioma}`;

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
        'Envío no encontrado en Correos España.',
        'SHIPMENT_NOT_FOUND',
        404
      );
    }
    if (!res.ok) {
      throw new TrackingEngineError(
        `Error al consultar Correos España (HTTP ${res.status}).`,
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        res.status
      );
    }

    const json = await res.json();
    return parseCorreosSpainPayload(json, trackingNumber, carrier, lang);
  } catch (err) {
    if (err instanceof TrackingEngineError) throw err;
    throw new TrackingEngineError(
      'No se pudo conectar con Correos España. Verifica tu conexión a internet.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502,
      err
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Direct HTTP fetcher for Correos Express live API.
 */
export async function fetchCorreosExpressLive(
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Promise<Parcel> {
  const url = `https://www.correosexpress.com/ws-cws-portal/rest/seguimientoEnvio/segEnvioWeb?codEnvio=${encodeURIComponent(
    trackingNumber
  )}`;

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
        'Envío no encontrado en Correos Express.',
        'SHIPMENT_NOT_FOUND',
        404
      );
    }
    if (!res.ok) {
      throw new TrackingEngineError(
        `Error al consultar Correos Express (HTTP ${res.status}).`,
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        res.status
      );
    }

    const json = await res.json();
    return parseCorreosExpressPayload(json, trackingNumber, carrier, lang);
  } catch (err) {
    if (err instanceof TrackingEngineError) throw err;
    throw new TrackingEngineError(
      'No se pudo conectar con Correos Express. Verifica tu conexión a internet.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502,
      err
    );
  } finally {
    clearTimeout(timer);
  }
}
