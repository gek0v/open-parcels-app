import { Carrier } from '../../domain/models/carrier';
import { EventStage, TrackingEvent } from '../../domain/models/event';
import { Parcel } from '../../domain/models/parcel';
import { CanonicalStatus } from '../../domain/models/status';
import { TrackingEngineError } from './errors';
import {
  buildLiveParcel,
  fetchLiveText,
  parseFlexibleDateToIso,
  parseTabularTrackingHtml,
} from './liveShared';
import { getLocalizedStatusText } from './mapper';

const SPANISH_TABLE_DATE_REGEX =
  /\b\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b|\b\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?\b/;

interface NormalizedCarrierResponse {
  trackingNumber?: string;
  topStatus: string;
  topDesc: string;
  originCity: string;
  destCity: string;
  deliveryDate?: string;
  events: TrackingEvent[];
}

function buildSpanishCourierParcel(
  res: NormalizedCarrierResponse,
  trackingNumber: string,
  carrier: Carrier,
  normalizeFn: (status: string, desc: string) => { status: CanonicalStatus; stage: EventStage },
  lang?: string
): Parcel {
  let overallStatus = normalizeFn(res.topStatus, res.topDesc).status;
  if (res.events.length > 0) {
    if (res.events.some((ev) => ev.status === 'delivered')) {
      overallStatus = 'delivered';
    } else if (!res.topStatus && !res.topDesc) {
      overallStatus = res.events[0].status;
    }
  }

  let deliveredAt: string | null = res.deliveryDate
    ? parseFlexibleDateToIso(res.deliveryDate)
    : null;
  if (!deliveredAt) {
    const deliveredEv = res.events.find((ev) => ev.status === 'delivered' && ev.date);
    if (deliveredEv) deliveredAt = deliveredEv.date;
  }

  const statusText =
    res.topDesc || res.topStatus || getLocalizedStatusText(overallStatus, lang);

  return buildLiveParcel({
    trackingNumber,
    carrier,
    status: overallStatus,
    events: res.events,
    origin: { code: 'ES', name: res.originCity || 'Spain' },
    destination: { code: 'ES', name: res.destCity || 'Spain' },
    deliveredAt,
    statusText,
    lang,
  });
}

function extractCityField(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    for (const key of ['name', 'city', 'location']) {
      if (typeof obj[key] === 'string' && obj[key].trim()) {
        return String(obj[key]).trim();
      }
    }
  }
  return '';
}

function appendSpainIfMissing(location: string): string {
  const clean = location.trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();
  if (lower.includes('spain') || lower.includes('españa')) return clean;
  return `${clean}, Spain`;
}

/* ============================================================================
 * 1. CTT EXPRESS LIVE ADAPTER (ported from open-parcels pkg/carriers/ctt.go)
 * ============================================================================ */

export function normalizeCTTStatus(
  status: string,
  desc: string
): { status: CanonicalStatus; stage: EventStage } {
  const upper = `${status || ''} ${desc || ''}`.toUpperCase().trim();

  if (
    !upper.includes('NO ENTREGADO') &&
    !upper.includes('FALLID') &&
    (upper.includes('DELIVERED') ||
      upper.includes('ENTREGADO') ||
      upper.includes('ENTREGA REALIZADA'))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }
  if (
    upper.includes('OUT_FOR_DELIVERY') ||
    upper.includes('OUT FOR DELIVERY') ||
    upper.includes('EN REPARTO') ||
    upper.includes('EN RUTA')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }
  if (
    upper.includes('INCIDENCE') ||
    upper.includes('INCIDENCIA') ||
    upper.includes('AUSENTE') ||
    upper.includes('FALLID') ||
    upper.includes('FAILED') ||
    upper.includes('DIRECCION')
  ) {
    return { status: 'failed_attempt', stage: 'exception' };
  }
  if (
    upper.includes('RETENIDO') ||
    upper.includes('DEVUELTO') ||
    upper.includes('EXCEPTION')
  ) {
    return { status: 'exception', stage: 'exception' };
  }
  if (
    upper.includes('PICKED') ||
    upper.includes('RECOGIDO') ||
    upper.includes('ADMITIDO')
  ) {
    return { status: 'in_transit', stage: 'picked_up' };
  }
  if (
    upper.includes('PRE_REGISTERED') ||
    upper.includes('PREREGISTRADO') ||
    upper.includes('PRE-REGISTRADO') ||
    upper.includes('INFORMADO') ||
    upper.includes('INFO_RECEIVED')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  return { status: 'in_transit', stage: 'transit' };
}

function isCTTNotFoundBody(body: string): boolean {
  const upper = (body || '').toUpperCase();
  return (
    upper.includes('NO SE HA ENCONTRADO') ||
    upper.includes('ENVÍO NO ENCONTRADO') ||
    upper.includes('ENVIO NO ENCONTRADO') ||
    upper.includes('CÓDIGO NO ENCONTRADO') ||
    upper.includes('CODIGO NO ENCONTRADO') ||
    upper.includes('SIN DATOS') ||
    upper.includes('SIN RESULTADOS') ||
    upper.includes('NOT_FOUND') ||
    upper.includes('SHIPMENT NOT FOUND')
  );
}

export function parseCTTJsonPayload(
  payload: any,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  if (!payload || typeof payload !== 'object') {
    throw new TrackingEngineError(
      'Respuesta inesperada de CTT Express.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const errStr = String(payload.error || '').toUpperCase();
  const msgStr = String(payload.message || '').toUpperCase();
  if (
    errStr === 'NOT_FOUND' ||
    msgStr.includes('NOT FOUND') ||
    msgStr.includes('NO ENCONTRADO')
  ) {
    throw new TrackingEngineError(
      'Envío no encontrado en CTT Express.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const rawEvents: any[] = Array.isArray(payload.eventos)
    ? payload.eventos
    : Array.isArray(payload.events)
      ? payload.events
      : [];

  if (
    !payload.codigo &&
    !payload.shipmentCode &&
    !payload.trackingNumber &&
    !payload.estado &&
    !payload.status &&
    rawEvents.length === 0
  ) {
    throw new TrackingEngineError(
      'Esquema JSON inesperado de CTT Express.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const events: TrackingEvent[] = rawEvents.map((item: any, idx: number) => {
    const baseDate = String(item?.fecha || item?.date || '').trim();
    const hora = String(item?.hora || '').trim();
    const rawDate = hora && !baseDate.includes(':') ? `${baseDate} ${hora}` : baseDate;
    const dateIso = parseFlexibleDateToIso(baseDate, hora) || new Date().toISOString();

    const evStatus = String(item?.estado || item?.status || '').trim();
    const evDesc = String(item?.descripcion || item?.description || evStatus || '').trim();
    const norm = normalizeCTTStatus(evStatus, evDesc);
    const loc = appendSpainIfMissing(
      String(item?.location || item?.ubicacion || item?.centro || '')
    );

    return {
      id: `ctt-${idx}-${rawDate}`,
      date: dateIso,
      rawDate: rawDate || undefined,
      status: norm.status,
      stage: norm.stage,
      description: evDesc || getLocalizedStatusText(norm.status, lang),
      location: loc || undefined,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
    };
  });

  return buildSpanishCourierParcel(
    {
      trackingNumber,
      topStatus: String(payload.status || payload.estado || '').trim(),
      topDesc: String(payload.statusDescription || payload.descripcionEstado || '').trim(),
      originCity: extractCityField(payload.origin ?? payload.origen) || 'Spain',
      destCity: extractCityField(payload.destination ?? payload.destino) || 'Spain',
      deliveryDate: String(payload.deliveryDate || payload.fechaEntrega || '').trim(),
      events,
    },
    trackingNumber,
    carrier,
    normalizeCTTStatus,
    lang
  );
}

export function parseCTTHtmlPayload(
  htmlContent: string,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  const parsed = parseTabularTrackingHtml(htmlContent, SPANISH_TABLE_DATE_REGEX, {
    originRegex:
      /(?:Origen|Origin)\s*(?::\s*|">\s*|(?:<\/[^>]+>\s*)+:?\s*)(?:<[^>]+>\s*)*([^<\r\n]+)/i,
    destinationRegex:
      /(?:Destino|Destination)\s*(?::\s*|">\s*|(?:<\/[^>]+>\s*)+:?\s*)(?:<[^>]+>\s*)*([^<\r\n]+)/i,
    statusRegex:
      /(?:Estado\s*(?:actual)?|Situaci[oó]n|Status)\s*(?::\s*|">\s*|(?:<\/[^>]+>\s*)+:?\s*)(?:<[^>]+>\s*)*([^<\r\n]+)/i,
  });

  if (parsed.rows.length === 0 && !parsed.status) {
    throw new TrackingEngineError(
      'No se pudieron extraer datos del seguimiento de CTT Express.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const events: TrackingEvent[] = parsed.rows.map((r, idx) => {
    const norm = normalizeCTTStatus(r.status, r.description);
    return {
      id: `ctt-html-${idx}-${r.date}`,
      date: parseFlexibleDateToIso(r.date) || new Date().toISOString(),
      rawDate: r.date,
      status: norm.status,
      stage: norm.stage,
      description: r.description || r.status,
      location: appendSpainIfMissing(r.location) || undefined,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
    };
  });

  return buildSpanishCourierParcel(
    {
      trackingNumber,
      topStatus: parsed.status || '',
      topDesc: '',
      originCity: parsed.origin || 'Spain',
      destCity: parsed.destination || 'Spain',
      events,
    },
    trackingNumber,
    carrier,
    normalizeCTTStatus,
    lang
  );
}

export async function fetchCTTExpressLive(
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Promise<Parcel> {
  const cleanNum = (trackingNumber || '').trim();
  const url = `https://www.cttexpress.com/api/v1/tracking/${encodeURIComponent(cleanNum)}`;

  const { text, contentType } = await fetchLiveText(url, 'CTT Express', {
    extraWafMarkers: ['WAF'],
  });

  if (isCTTNotFoundBody(text)) {
    throw new TrackingEngineError(
      'Envío no encontrado en CTT Express.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const trimmed = text.trim();
  if (trimmed.startsWith('{') || contentType.toLowerCase().includes('application/json')) {
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new TrackingEngineError(
        'Respuesta JSON inválida de CTT Express.',
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        502,
        err
      );
    }
    return parseCTTJsonPayload(parsed, cleanNum, carrier, lang);
  }

  return parseCTTHtmlPayload(text, cleanNum, carrier, lang);
}

/* ============================================================================
 * 2. MRW LIVE ADAPTER (ported from open-parcels pkg/carriers/mrw.go)
 * ============================================================================ */

export function normalizeMRWStatus(
  status: string,
  desc: string
): { status: CanonicalStatus; stage: EventStage } {
  const upper = `${status || ''} ${desc || ''}`.toUpperCase().trim();

  if (
    !upper.includes('NO ENTREGADO') &&
    !upper.includes('FALLID') &&
    (upper.includes('ENTREGADO') ||
      upper.includes('DELIVERED') ||
      upper.includes('ENTREGA REALIZADA'))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }
  if (
    upper.includes('EN REPARTO') ||
    upper.includes('OUT FOR DELIVERY') ||
    upper.includes('OUT_FOR_DELIVERY') ||
    upper.includes('FURGONETA DE REPARTO')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }
  if (
    upper.includes('INCIDENCIA') ||
    upper.includes('AUSENTE') ||
    upper.includes('FALLID') ||
    upper.includes('DIRECCION INCORRECTA') ||
    upper.includes('FAILED')
  ) {
    return { status: 'failed_attempt', stage: 'exception' };
  }
  if (
    upper.includes('RETENIDO') ||
    upper.includes('DEVUELTO') ||
    upper.includes('EXCEPTION') ||
    upper.includes('CANCELADO')
  ) {
    return { status: 'exception', stage: 'exception' };
  }
  if (
    upper.includes('RECOGIDO') ||
    upper.includes('RECOGIDA') ||
    upper.includes('ADMITIDO') ||
    upper.includes('PICKED')
  ) {
    return { status: 'in_transit', stage: 'picked_up' };
  }
  if (
    upper.includes('DOCUMENTADO') ||
    upper.includes('GRABADO') ||
    upper.includes('PRE-REGISTRADO') ||
    upper.includes('INFORMADO') ||
    upper.includes('INFO_RECEIVED')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  return { status: 'in_transit', stage: 'transit' };
}

function isMRWNotFoundBody(body: string): boolean {
  const upper = (body || '').toUpperCase();
  return (
    upper.includes('NO SE HA ENCONTRADO') ||
    upper.includes('NO EXISTE NINGÚN ENVÍO') ||
    upper.includes('NO EXISTE NINGUN ENVIO') ||
    upper.includes('ENVÍO NO ENCONTRADO') ||
    upper.includes('ENVIO NO ENCONTRADO') ||
    upper.includes('SIN DATOS PARA EL ENVÍO') ||
    upper.includes('SIN DATOS PARA EL ENVIO') ||
    upper.includes('ENVÍO INEXISTENTE') ||
    upper.includes('ENVIO INEXISTENTE') ||
    upper.includes('ID="ERROR404"') ||
    upper.includes('NO ESTÁ DISPONIBLE') ||
    upper.includes('NOT_FOUND')
  );
}

export function parseMRWJsonPayload(
  payload: any,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  if (!payload || typeof payload !== 'object') {
    throw new TrackingEngineError(
      'Respuesta inesperada de MRW.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const codeUpper = String(payload.codigo || '').toUpperCase();
  const errUpper = String(payload.error || '').toUpperCase();
  if (
    codeUpper === 'NOT_FOUND' ||
    errUpper === 'NOT_FOUND' ||
    errUpper.includes('NO ENCONTRADO')
  ) {
    throw new TrackingEngineError('Envío no encontrado en MRW.', 'SHIPMENT_NOT_FOUND', 404);
  }

  const rawEvents: any[] = Array.isArray(payload.eventos)
    ? payload.eventos
    : Array.isArray(payload.events)
      ? payload.events
      : [];

  if (
    !payload.numeroEnvio &&
    !payload.trackingNumber &&
    !payload.estado &&
    !payload.status &&
    rawEvents.length === 0
  ) {
    throw new TrackingEngineError(
      'Esquema JSON inesperado de MRW.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const events: TrackingEvent[] = rawEvents.map((item: any, idx: number) => {
    const baseDate = String(item?.fecha || item?.date || '').trim();
    const hora = String(item?.hora || '').trim();
    const rawDate = hora && !baseDate.includes(':') ? `${baseDate} ${hora}` : baseDate;
    const dateIso = parseFlexibleDateToIso(baseDate, hora) || new Date().toISOString();

    const evStatus = String(item?.estado || item?.status || '').trim();
    const evDesc = String(item?.descripcion || item?.description || evStatus || '').trim();
    const norm = normalizeMRWStatus(evStatus, evDesc);
    const loc = appendSpainIfMissing(
      String(item?.ubicacion || item?.location || item?.franquicia || '')
    );

    return {
      id: `mrw-${idx}-${rawDate}`,
      date: dateIso,
      rawDate: rawDate || undefined,
      status: norm.status,
      stage: norm.stage,
      description: evDesc || getLocalizedStatusText(norm.status, lang),
      location: loc || undefined,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
    };
  });

  return buildSpanishCourierParcel(
    {
      trackingNumber,
      topStatus: String(payload.estado || payload.status || '').trim(),
      topDesc: String(payload.descripcionEstado || payload.statusDescription || '').trim(),
      originCity: String(payload.origen || payload.franquiciaOrigen || 'Spain').trim(),
      destCity: String(payload.destino || payload.franquiciaDestino || 'Spain').trim(),
      deliveryDate: String(payload.fechaEntrega || payload.deliveryDate || '').trim(),
      events,
    },
    trackingNumber,
    carrier,
    normalizeMRWStatus,
    lang
  );
}

export function parseMRWHtmlPayload(
  htmlContent: string,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  const parsed = parseTabularTrackingHtml(htmlContent, /\b\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b/, {
    originRegex:
      /(?:Franquicia\s*(?:de\s*)?[Oo]rigen|Origen)\s*(?::\s*|">\s*|(?:<\/[^>]+>\s*)+:?\s*)(?:<[^>]+>\s*)*([^<\r\n]+)/i,
    destinationRegex:
      /(?:Franquicia\s*(?:de\s*)?[Dd]estino|Destino)\s*(?::\s*|">\s*|(?:<\/[^>]+>\s*)+:?\s*)(?:<[^>]+>\s*)*([^<\r\n]+)/i,
    statusRegex:
      /(?:Estado\s*(?:actual)?|Situaci[oó]n)\s*(?::\s*|">\s*|(?:<\/[^>]+>\s*)+:?\s*)(?:<[^>]+>\s*)*([^<\r\n]+)/i,
  });

  if (parsed.rows.length === 0 && !parsed.status) {
    throw new TrackingEngineError(
      'No se pudieron extraer datos del seguimiento de MRW.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const events: TrackingEvent[] = parsed.rows.map((r, idx) => {
    const norm = normalizeMRWStatus(r.status, r.description);
    return {
      id: `mrw-html-${idx}-${r.date}`,
      date: parseFlexibleDateToIso(r.date) || new Date().toISOString(),
      rawDate: r.date,
      status: norm.status,
      stage: norm.stage,
      description: r.description || r.status,
      location: appendSpainIfMissing(r.location) || undefined,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
    };
  });

  return buildSpanishCourierParcel(
    {
      trackingNumber,
      topStatus: parsed.status || '',
      topDesc: '',
      originCity: parsed.origin || 'Spain',
      destCity: parsed.destination || 'Spain',
      events,
    },
    trackingNumber,
    carrier,
    normalizeMRWStatus,
    lang
  );
}

export async function fetchMRWLive(
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Promise<Parcel> {
  const cleanNum = (trackingNumber || '').trim();
  const url = `https://www.mrw.es/seguimiento_envios/mrw_resultados_consulta.asp?modo=nacional&envio=${encodeURIComponent(
    cleanNum
  )}`;

  const { text, contentType } = await fetchLiveText(url, 'MRW', {
    extraWafMarkers: ['WAF'],
  });

  if (isMRWNotFoundBody(text)) {
    throw new TrackingEngineError('Envío no encontrado en MRW.', 'SHIPMENT_NOT_FOUND', 404);
  }

  const trimmed = text.trim();
  if (trimmed.startsWith('{') || contentType.toLowerCase().includes('application/json')) {
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new TrackingEngineError(
        'Respuesta JSON inválida de MRW.',
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        502,
        err
      );
    }
    return parseMRWJsonPayload(parsed, cleanNum, carrier, lang);
  }

  return parseMRWHtmlPayload(text, cleanNum, carrier, lang);
}

/* ============================================================================
 * 3. NACEX LIVE ADAPTER (ported from open-parcels pkg/carriers/nacex.go)
 * ============================================================================ */

export function normalizeNacexStatus(
  status: string,
  desc: string
): { status: CanonicalStatus; stage: EventStage } {
  const upper = `${status || ''} ${desc || ''}`.toUpperCase().trim();

  if (
    !upper.includes('NO ENTREGADO') &&
    !upper.includes('FALLID') &&
    (upper.includes('ENTREGADO') ||
      upper.includes('DELIVERED') ||
      upper.includes('ENTREGA OK') ||
      upper.includes('ENTREGADO EN DESTINO'))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }
  if (
    upper.includes('EN REPARTO') ||
    upper.includes('OUT FOR DELIVERY') ||
    upper.includes('OUT_FOR_DELIVERY') ||
    upper.includes('EN RUTA') ||
    upper.includes('REPARTO')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }
  if (
    upper.includes('INCIDENCIA') ||
    upper.includes('AUSENTE') ||
    upper.includes('FALLID') ||
    upper.includes('DIRECCION INCORRECTA') ||
    upper.includes('FAILED')
  ) {
    return { status: 'failed_attempt', stage: 'exception' };
  }
  if (
    upper.includes('RETENIDO') ||
    upper.includes('DEVUELTO') ||
    upper.includes('EXCEPTION') ||
    upper.includes('CANCELADO')
  ) {
    return { status: 'exception', stage: 'exception' };
  }
  if (
    upper.includes('RECOGIDO') ||
    upper.includes('RECOGIDA') ||
    upper.includes('ADMITIDO') ||
    upper.includes('PICKED')
  ) {
    return { status: 'in_transit', stage: 'picked_up' };
  }
  if (
    upper.includes('DOCUMENTADO') ||
    upper.includes('GRABADO') ||
    upper.includes('PRE-REGISTRADO') ||
    upper.includes('INFORMADO') ||
    upper.includes('INFO_RECEIVED')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  return { status: 'in_transit', stage: 'transit' };
}

function isNacexNotFoundBody(body: string): boolean {
  const upper = (body || '').toUpperCase();
  return (
    upper.includes('NO SE HA ENCONTRADO') ||
    upper.includes('NO EXISTE EL ALBARÁN') ||
    upper.includes('NO EXISTE EL ALBARAN') ||
    upper.includes('ALBARÁN NO ENCONTRADO') ||
    upper.includes('ALBARAN NO ENCONTRADO') ||
    upper.includes('SIN DATOS PARA EL ALBARÁN') ||
    upper.includes('SIN DATOS PARA EL ALBARAN') ||
    upper.includes('ALBARÁN INEXISTENTE') ||
    upper.includes('ALBARAN INEXISTENTE') ||
    upper.includes('FORMULARIO DE SEGUIMIENTO') ||
    upper.includes('NOT_FOUND')
  );
}

export function parseNacexJsonPayload(
  payload: any,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  if (!payload || typeof payload !== 'object') {
    throw new TrackingEngineError(
      'Respuesta inesperada de Nacex.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const codeUpper = String(payload.codigo || '').toUpperCase();
  const errUpper = String(payload.error || '').toUpperCase();
  if (
    codeUpper === 'NOT_FOUND' ||
    errUpper === 'NOT_FOUND' ||
    errUpper.includes('NO ENCONTRADO')
  ) {
    throw new TrackingEngineError('Envío no encontrado en Nacex.', 'SHIPMENT_NOT_FOUND', 404);
  }

  const rawEvents: any[] = Array.isArray(payload.eventos)
    ? payload.eventos
    : Array.isArray(payload.events)
      ? payload.events
      : [];

  if (
    !payload.albaran &&
    !payload.trackingNumber &&
    !payload.estado &&
    !payload.status &&
    rawEvents.length === 0
  ) {
    throw new TrackingEngineError(
      'Esquema JSON inesperado de Nacex.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const events: TrackingEvent[] = rawEvents.map((item: any, idx: number) => {
    const baseDate = String(item?.fecha || item?.date || '').trim();
    const hora = String(item?.hora || '').trim();
    const rawDate = hora && !baseDate.includes(':') ? `${baseDate} ${hora}` : baseDate;
    const dateIso = parseFlexibleDateToIso(baseDate, hora) || new Date().toISOString();

    const evStatus = String(item?.estado || item?.status || '').trim();
    const evDesc = String(item?.descripcion || item?.description || evStatus || '').trim();
    const norm = normalizeNacexStatus(evStatus, evDesc);
    const loc = appendSpainIfMissing(
      String(item?.agencia || item?.location || item?.ubicacion || '')
    );

    return {
      id: `nacex-${idx}-${rawDate}`,
      date: dateIso,
      rawDate: rawDate || undefined,
      status: norm.status,
      stage: norm.stage,
      description: evDesc || getLocalizedStatusText(norm.status, lang),
      location: loc || undefined,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
    };
  });

  return buildSpanishCourierParcel(
    {
      trackingNumber,
      topStatus: String(payload.estado || payload.status || '').trim(),
      topDesc: String(payload.descripcionEstado || payload.statusDescription || '').trim(),
      originCity: String(payload.origen || payload.agenciaOrigen || 'Spain').trim(),
      destCity: String(payload.destino || payload.agenciaDestino || 'Spain').trim(),
      deliveryDate: String(payload.fechaEntrega || payload.deliveryDate || '').trim(),
      events,
    },
    trackingNumber,
    carrier,
    normalizeNacexStatus,
    lang
  );
}

export function parseNacexHtmlPayload(
  htmlContent: string,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Parcel {
  const parsed = parseTabularTrackingHtml(htmlContent, /\b\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b/, {
    originRegex:
      /(?:Agencia\s*(?:de\s*)?[Oo]rigen|Origen)\s*(?::\s*|">\s*|(?:<\/[^>]+>\s*)+:?\s*)(?:<[^>]+>\s*)*([^<\r\n]+)/i,
    destinationRegex:
      /(?:Agencia\s*(?:de\s*)?[Dd]estino|Destino)\s*(?::\s*|">\s*|(?:<\/[^>]+>\s*)+:?\s*)(?:<[^>]+>\s*)*([^<\r\n]+)/i,
    statusRegex:
      /(?:Estado\s*(?:actual)?|Situaci[oó]n)\s*(?::\s*|">\s*|(?:<\/[^>]+>\s*)+:?\s*)(?:<[^>]+>\s*)*([^<\r\n]+)/i,
    extraIgnoreKeywords: ['zendesk', 'duraci'],
  });

  if (parsed.rows.length === 0 && !parsed.status) {
    throw new TrackingEngineError(
      'No se pudieron extraer datos del seguimiento de Nacex.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const events: TrackingEvent[] = parsed.rows.map((r, idx) => {
    const norm = normalizeNacexStatus(r.status, r.description);
    return {
      id: `nacex-html-${idx}-${r.date}`,
      date: parseFlexibleDateToIso(r.date) || new Date().toISOString(),
      rawDate: r.date,
      status: norm.status,
      stage: norm.stage,
      description: r.description || r.status,
      location: appendSpainIfMissing(r.location) || undefined,
      carrierSlug: carrier.slug,
      carrierName: carrier.name,
    };
  });

  return buildSpanishCourierParcel(
    {
      trackingNumber,
      topStatus: parsed.status || '',
      topDesc: '',
      originCity: parsed.origin || 'Spain',
      destCity: parsed.destination || 'Spain',
      events,
    },
    trackingNumber,
    carrier,
    normalizeNacexStatus,
    lang
  );
}

export async function fetchNacexLive(
  trackingNumber: string,
  carrier: Carrier,
  lang?: string
): Promise<Parcel> {
  const cleanNum = (trackingNumber || '').trim();
  const url = `https://www.nacex.com/seguimientoDetalle.do?ag_rec=&albaran_rec=${encodeURIComponent(
    cleanNum
  )}`;

  const { text, contentType } = await fetchLiveText(url, 'Nacex', {
    extraWafMarkers: ['WAF'],
  });

  if (isNacexNotFoundBody(text)) {
    throw new TrackingEngineError('Envío no encontrado en Nacex.', 'SHIPMENT_NOT_FOUND', 404);
  }

  const trimmed = text.trim();
  if (trimmed.startsWith('{') || contentType.toLowerCase().includes('application/json')) {
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new TrackingEngineError(
        'Respuesta JSON inválida de Nacex.',
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        502,
        err
      );
    }
    return parseNacexJsonPayload(parsed, cleanNum, carrier, lang);
  }

  return parseNacexHtmlPayload(text, cleanNum, carrier, lang);
}
