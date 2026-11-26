import { Carrier } from '../../domain/models/carrier';
import { EventStage, TrackingEvent } from '../../domain/models/event';
import { CountryRef, Parcel } from '../../domain/models/parcel';
import { CanonicalStatus } from '../../domain/models/status';
import { findCarrierBySlug } from '../../domain/validators/detection';
import { TrackingEngineError } from './errors';
import {
  buildLiveParcel,
  fetchLiveText,
  isWafOrAntiBot,
  parseFlexibleDateToIso,
  parseTabularTrackingHtml,
} from './liveShared';
import { getLocalizedStatusText } from './mapper';

/* ============================================================================
 * 1. CAINIAO GLOBAL LIVE ADAPTER (ported from open-parcels pkg/carriers/cainiao.go)
 * ============================================================================ */

export function normalizeCainiaoEvent(
  actionCode: string | undefined,
  desc: string | undefined,
  standardDesc?: string
): { status: CanonicalStatus; stage: EventStage } {
  const action = (actionCode || '').toUpperCase().trim();
  const combined = `${desc || ''} ${standardDesc || ''}`.toLowerCase();

  if (
    action === 'GTMS_SIGNED' ||
    ((!combined.includes('undelivered') && !combined.includes('no entregado')) &&
      (combined.includes('delivered') || combined.includes('entregado')))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }
  if (
    action === 'GTMS_DELIVERING' ||
    combined.includes('out for delivery') ||
    combined.includes('en reparto') ||
    combined.includes('en proceso de entrega')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }
  if (
    action === 'GTMS_ACCEPT' ||
    combined.includes('local delivery company') ||
    combined.includes('operador logístico')
  ) {
    return { status: 'in_transit', stage: 'handover' };
  }
  if (
    combined.includes('failed') ||
    combined.includes('fallido') ||
    combined.includes('exception') ||
    combined.includes('incidencia')
  ) {
    return { status: 'failed_attempt', stage: 'exception' };
  }
  if (
    combined.includes('customs') ||
    combined.includes('clearance') ||
    combined.includes('aduan') ||
    combined.includes('import')
  ) {
    return { status: 'in_transit', stage: 'customs' };
  }
  if (
    combined.includes('airline') ||
    combined.includes('departed') ||
    combined.includes('transit') ||
    combined.includes('flight') ||
    combined.includes('arrived at destination')
  ) {
    return { status: 'in_transit', stage: 'transit' };
  }
  if (
    combined.includes('sorting') ||
    combined.includes('outbound') ||
    combined.includes('inbound') ||
    combined.includes('warehouse')
  ) {
    return { status: 'in_transit', stage: 'picked_up' };
  }
  if (
    combined.includes('order received') ||
    combined.includes('electronic') ||
    combined.includes('pre-registered') ||
    combined.includes('recibida')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  return { status: 'in_transit', stage: 'transit' };
}

export function normalizeCainiaoShipmentStatus(
  status: string | undefined,
  events: TrackingEvent[]
): CanonicalStatus {
  const upper = (status || '').toUpperCase().trim();
  if (upper === 'DELIVERED' || upper === 'SIGNED') return 'delivered';
  if (upper === 'DELIVERING' || upper === 'OUT_FOR_DELIVERY') return 'out_for_delivery';
  if (upper === 'EXCEPTION' || upper === 'FAILED') return 'exception';
  if (upper === 'WAITING_FOR_DELIVERY' || upper === 'TRANSIT') return 'in_transit';

  for (const ev of events) {
    if (ev.status === 'delivered') return 'delivered';
  }
  for (const ev of events) {
    if (ev.status === 'out_for_delivery') return 'out_for_delivery';
  }
  return events[0]?.status || 'in_transit';
}

export function resolveCainiaoLastMileCarrier(
  destCp: string | undefined,
  trackingNumber: string,
  destCode: string
): Carrier | undefined {
  const cleanCp = (destCp || '').toLowerCase().trim();
  const cleanNum = trackingNumber.trim();
  const upperDest = (destCode || '').toUpperCase().trim();

  if (
    cleanCp.includes('correos express') ||
    (!cleanCp && cleanNum.startsWith('323') && upperDest === 'ES')
  ) {
    return findCarrierBySlug('correosexpress');
  }
  if (cleanCp.includes('correos')) {
    return findCarrierBySlug('correos-spain');
  }
  if (cleanCp.includes('ctt')) {
    return findCarrierBySlug('ctt-express');
  }
  if (cleanCp.includes('gls')) {
    return findCarrierBySlug('asm-gls-spain');
  }
  if (cleanCp.includes('inpost') || cleanCp.includes('mondial')) {
    return findCarrierBySlug('inpost-es');
  }
  if (cleanCp.includes('seur')) {
    return findCarrierBySlug('seur');
  }
  if (cleanCp) {
    const slug = cleanCp.replace(/\s+/g, '-');
    return {
      slug,
      name: (destCp || '').trim(),
      country: upperDest || 'GLOBAL',
    };
  }
  return undefined;
}

function isCainiaoNotFound(payload: any): boolean {
  const errCode = String(payload?.errorCode || '').toUpperCase().trim();
  const errMsg = String(payload?.errorMsg || '').toUpperCase().trim();
  return (
    errCode === 'ORDER_NOT_FOUND' ||
    errCode === 'PACKAGE_NOT_FOUND' ||
    errCode === 'NOT_FOUND' ||
    errCode === 'MAIL_NO_NOT_FOUND' ||
    errCode === 'PARAM_ERROR' ||
    errMsg.includes('NOT FOUND') ||
    errMsg.includes('NOT EXIST') ||
    errMsg.includes('INEXISTENTE') ||
    errMsg.includes('NO EXISTE')
  );
}

function normalizeCountryCode(raw: string | undefined, fallback: string): string {
  const clean = (raw || '').trim();
  const lower = clean.toLowerCase();
  if (lower === 'españa' || lower === 'spain' || lower === 'es') return 'ES';
  if (lower === 'china' || lower === 'cn') return 'CN';
  if (clean.length === 2) return clean.toUpperCase();
  return fallback;
}

export function parseCainiaoPayload(
  payload: any,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string,
  destinationCountry?: string
): Parcel {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TrackingEngineError(
      'Respuesta inesperada de Cainiao Global.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const hasExpectedKeys =
    'module' in payload ||
    'data' in payload ||
    'success' in payload ||
    'errorCode' in payload ||
    'errorMsg' in payload;
  if (!hasExpectedKeys) {
    throw new TrackingEngineError(
      'Formato JSON inesperado de Cainiao Global.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  const errCode = String(payload.errorCode || '').toUpperCase();
  if (errCode.includes('RGV') || errCode.includes('CHALLENGE')) {
    throw new TrackingEngineError(
      'Cainiao bloqueó la petición con verificación anti-bot.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      403
    );
  }

  if (isCainiaoNotFound(payload)) {
    throw new TrackingEngineError(
      'Envío no encontrado en Cainiao Global.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const items: any[] =
    Array.isArray(payload.module) && payload.module.length > 0
      ? payload.module
      : Array.isArray(payload.data)
        ? payload.data
        : [];

  if (items.length === 0) {
    throw new TrackingEngineError(
      'Envío no encontrado en Cainiao Global.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const item = items[0];
  let rawDetails: any[] = Array.isArray(item.detailList) ? item.detailList : [];
  if (rawDetails.length === 0 && Array.isArray(item.sectionList)) {
    for (const sec of item.sectionList) {
      if (Array.isArray(sec?.detailList)) {
        rawDetails = rawDetails.concat(sec.detailList);
      }
    }
  }

  if (rawDetails.length === 0) {
    throw new TrackingEngineError(
      'No hay eventos disponibles en Cainiao Global.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const originCode = normalizeCountryCode(item.originCountry, 'CN');
  const destCode = normalizeCountryCode(
    item.destCountry,
    destinationCountry ? destinationCountry.toUpperCase() : 'ES'
  );
  const origin: CountryRef = {
    code: originCode,
    name: String(item.originCountry || '').trim() || (originCode === 'ES' ? 'Spain' : 'China'),
  };
  const destination: CountryRef = {
    code: destCode,
    name: String(item.destCountry || '').trim() || (destCode === 'ES' ? 'Spain' : destCode),
  };

  const isEsLang = (lang || '').toLowerCase().startsWith('es');
  const isSpainShipment =
    destCode === 'ES' ||
    trackingNumber.startsWith('323') ||
    ['spain', 'españa'].includes(String(item.destCountry || '').toLowerCase());

  const lastMileCarrier = resolveCainiaoLastMileCarrier(item.destCp, trackingNumber, destCode);
  let lastMileTrackingNumber: string | undefined =
    typeof item.destMailNo === 'string' && item.destMailNo.trim()
      ? item.destMailNo.trim()
      : undefined;
  if (!lastMileTrackingNumber && lastMileCarrier && trackingNumber.startsWith('323')) {
    lastMileTrackingNumber = trackingNumber;
  }

  const events: TrackingEvent[] = rawDetails.map((det: any, idx: number) => {
    const rawTimeInput = det?.timeStr || det?.time || det?.date || '';
    const dateIso =
      parseFlexibleDateToIso(det?.timeStr || det?.time || det?.date) || new Date().toISOString();
    const norm = normalizeCainiaoEvent(det?.actionCode, det?.desc, det?.standerdDesc);

    let desc = String(det?.desc || '').trim();
    if (isEsLang && det?.standerdDesc) {
      desc = String(det.standerdDesc).trim();
    }
    if (!desc) {
      desc = String(det?.standerdDesc || det?.descTitle || 'Tracking update').trim();
    }

    const actionUpper = String(det?.actionCode || '').toUpperCase().trim();
    const combinedLower = `${det?.desc || ''} ${det?.standerdDesc || ''}`.toLowerCase();

    const isLocalDelivery =
      isSpainShipment &&
      (norm.stage === 'handover' ||
        norm.stage === 'last_mile' ||
        norm.stage === 'delivery' ||
        norm.status === 'delivered' ||
        norm.status === 'out_for_delivery' ||
        combinedLower.includes('local delivery company') ||
        combinedLower.includes('local  delivery company') ||
        combinedLower.includes('operador logístico') ||
        combinedLower.includes('en reparto') ||
        combinedLower.includes('en proceso de entrega') ||
        combinedLower.includes('entregado') ||
        combinedLower.includes('package delivered') ||
        actionUpper === 'GTMS_ACCEPT' ||
        actionUpper === 'GTMS_DELIVERING' ||
        actionUpper === 'GTMS_SIGNED');

    const evCarrierSlug = isLocalDelivery
      ? lastMileCarrier?.slug || 'correosexpress'
      : carrier.slug;
    const evCarrierName = isLocalDelivery
      ? lastMileCarrier?.name || 'Correos Express'
      : carrier.name;

    return {
      id: `cainiao-${idx}-${String(rawTimeInput)}`,
      date: dateIso,
      rawDate: rawTimeInput ? String(rawTimeInput) : undefined,
      status: norm.status,
      stage: norm.stage,
      description: desc,
      carrierSlug: evCarrierSlug,
      carrierName: evCarrierName,
      eventCode: actionUpper || undefined,
      carrierIndex: isLocalDelivery ? 1 : 0,
    };
  });

  const overallStatus = normalizeCainiaoShipmentStatus(item.status, events);
  const deliveredEvent = events.find((ev) => ev.status === 'delivered');
  const statusText =
    String(item.statusDesc || '').trim() || getLocalizedStatusText(overallStatus, lang);

  return buildLiveParcel({
    trackingNumber,
    carrier,
    status: overallStatus,
    events,
    origin,
    destination,
    deliveredAt: deliveredEvent ? deliveredEvent.date : null,
    statusText,
    progressOverride:
      overallStatus === 'delivered' ? 100 : overallStatus === 'out_for_delivery' ? 85 : 60,
    lastMileTrackingNumber,
    lastMileCarrier,
    additionalCarriers: lastMileCarrier ? [lastMileCarrier] : undefined,
    lang,
  });
}

export async function fetchCainiaoLive(
  trackingNumber: string,
  carrier: Carrier,
  lang?: string,
  destinationCountry?: string
): Promise<Parcel> {
  const cleanNum = (trackingNumber || '').trim();
  const cainiaoLang = (lang || '').toLowerCase().startsWith('es')
    ? 'es-ES'
    : lang
      ? lang
      : 'en-US';
  const url = `https://global.cainiao.com/global/detail.json?mailNos=${encodeURIComponent(
    cleanNum
  )}&lang=${encodeURIComponent(cainiaoLang)}`;

  const { text, status } = await fetchLiveText(url, 'Cainiao Global', {
    extraWafMarkers: ['DENIED'],
  });

  if (isWafOrAntiBot(status, text, ['DENIED'])) {
    throw new TrackingEngineError(
      'Cainiao bloqueó la petición con verificación anti-bot.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      403
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new TrackingEngineError(
      'Respuesta JSON inválida de Cainiao Global.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502,
      err
    );
  }

  return parseCainiaoPayload(parsed, cleanNum, carrier, lang, destinationCountry);
}

/* ============================================================================
 * 2. YUNEXPRESS LIVE ADAPTER (ported from open-parcels pkg/carriers/yunexpress.go)
 * ============================================================================ */

export function normalizeYunExpressStatus(
  status: string | undefined,
  desc: string | undefined
): { status: CanonicalStatus; stage: EventStage } {
  const upper = `${status || ''} ${desc || ''}`.toUpperCase().trim();

  if (
    !upper.includes('UNDELIVERED') &&
    !upper.includes('NO ENTREGADO') &&
    (upper.includes('DELIVERED') || upper.includes('SIGNED') || upper.includes('ENTREGADO'))
  ) {
    return { status: 'delivered', stage: 'delivery' };
  }
  if (
    upper.includes('OUT FOR DELIVERY') ||
    upper.includes('OUT_FOR_DELIVERY') ||
    upper.includes('DELIVERING') ||
    upper.includes('EN REPARTO')
  ) {
    return { status: 'out_for_delivery', stage: 'last_mile' };
  }
  if (
    upper.includes('FAILED') ||
    upper.includes('UNDELIVERED') ||
    upper.includes('INCIDENCIA')
  ) {
    return { status: 'failed_attempt', stage: 'exception' };
  }
  if (
    upper.includes('EXCEPTION') ||
    upper.includes('HELD') ||
    upper.includes('RETURNED')
  ) {
    return { status: 'exception', stage: 'exception' };
  }
  if (upper.includes('CUSTOMS') || upper.includes('ADUAN')) {
    return { status: 'in_transit', stage: 'customs' };
  }
  if (
    upper.includes('HANDED OVER TO LOCAL') ||
    upper.includes('HANDOVER') ||
    upper.includes('TRANSFERRED TO') ||
    upper.includes('DELIVERY PARTNER')
  ) {
    return { status: 'in_transit', stage: 'handover' };
  }
  if (
    upper.includes('PICKED UP') ||
    upper.includes('ACCEPTED') ||
    upper.includes('RECEIVED AT FACILITY') ||
    upper.includes('RECOGIDO')
  ) {
    return { status: 'in_transit', stage: 'picked_up' };
  }
  if (
    upper.includes('SHIPMENT INFORMATION RECEIVED') ||
    upper.includes('INFO RECEIVED') ||
    upper.includes('INFO_RECEIVED') ||
    upper.includes('CREATED') ||
    upper.includes('REGISTRADO')
  ) {
    return { status: 'info_received', stage: 'created' };
  }

  return { status: 'in_transit', stage: 'transit' };
}

export function resolveYunExpressLastMileCarrier(
  lastMileCarrier: string | undefined,
  lastMileNum: string | undefined,
  destCode: string | undefined
): Carrier | undefined {
  const clean = (lastMileCarrier || '').toLowerCase().trim();
  const cleanNum = (lastMileNum || '').trim();
  const cleanDest = (destCode || '').toUpperCase().trim();

  if (
    clean.includes('correos express') ||
    (!clean && cleanNum.startsWith('323') && cleanDest === 'ES')
  ) {
    return findCarrierBySlug('correosexpress');
  }
  if (
    clean.includes('correos') ||
    (!clean &&
      (cleanNum.startsWith('PQ') || cleanNum.startsWith('PK')) &&
      (cleanDest === 'ES' || !cleanDest))
  ) {
    return findCarrierBySlug('correos-spain');
  }
  if (clean.includes('ctt')) return findCarrierBySlug('ctt-express');
  if (clean.includes('gls')) return findCarrierBySlug('asm-gls-spain');
  if (clean.includes('inpost') || clean.includes('mondial')) return findCarrierBySlug('inpost-es');
  if (clean.includes('seur')) return findCarrierBySlug('seur');
  if (clean.includes('royal mail')) return findCarrierBySlug('royal-mail');
  if (clean.includes('usps')) return findCarrierBySlug('usps');
  if (clean.includes('colissimo') || clean.includes('la poste')) {
    return findCarrierBySlug('colissimo');
  }
  if (clean) {
    return {
      slug: clean.replace(/\s+/g, '-'),
      name: (lastMileCarrier || '').trim(),
      country: cleanDest || 'GLOBAL',
    };
  }
  return undefined;
}

function buildYunExpressParcelFromItem(
  yItem: any,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string,
  destinationCountry?: string
): Parcel {
  const destCode = String(yItem?.destinationCountry || destinationCountry || 'ES')
    .trim()
    .toUpperCase();
  const destCountry =
    String(yItem?.destinationCountryName || '').trim() ||
    (destCode === 'ES' ? 'Spain' : destCode);

  const originCode = String(yItem?.originCountry || 'CN').trim().toUpperCase();
  const originCountry =
    String(yItem?.originCountryName || '').trim() ||
    (originCode === 'CN' ? 'China' : originCode);

  let lastMileNum = String(yItem?.lastMileTrackingNumber || '').trim();
  let lastMileCarrierInfo = resolveYunExpressLastMileCarrier(
    yItem?.lastMileCarrier,
    lastMileNum,
    destCode
  );

  const rawEvents: any[] = Array.isArray(yItem?.events) ? yItem.events : [];
  const events: TrackingEvent[] = rawEvents.map((ev: any, idx: number) => {
    const rawDate = String(ev?.date || ev?.time || '').trim();
    const dateIso = parseFlexibleDateToIso(rawDate, ev?.time) || new Date().toISOString();
    const norm = normalizeYunExpressStatus(ev?.status, ev?.description);
    const stage: EventStage = ev?.stage ? (String(ev.stage).toLowerCase() as EventStage) : norm.stage;

    const desc = String(ev?.description || ev?.status || 'Tracking update').trim();
    const loc = String(ev?.location || '').trim();

    if (!lastMileNum && desc.toLowerCase().includes('number')) {
      const m = desc.match(/(?:number|no\.?|code)\s*[:\s]+([A-Za-z0-9]{8,30})/i);
      if (m?.[1]) {
        lastMileNum = m[1];
        if (!lastMileCarrierInfo) {
          lastMileCarrierInfo = resolveYunExpressLastMileCarrier('', lastMileNum, destCode);
        }
      }
    }

    let evCarrierSlug = carrier.slug;
    let evCarrierName = carrier.name;
    let carrierIndex = 0;

    if (ev?.carrierSlug) {
      evCarrierSlug = String(ev.carrierSlug);
      if (ev?.carrier) evCarrierName = String(ev.carrier);
      if (evCarrierSlug.toLowerCase() !== carrier.slug.toLowerCase()) {
        carrierIndex = 1;
      }
    } else if (
      lastMileCarrierInfo &&
      (norm.status === 'delivered' ||
        norm.status === 'out_for_delivery' ||
        stage === 'last_mile' ||
        stage === 'delivery')
    ) {
      evCarrierSlug = lastMileCarrierInfo.slug;
      evCarrierName = lastMileCarrierInfo.name;
      carrierIndex = 1;
    }

    return {
      id: `yun-${idx}-${rawDate}`,
      date: dateIso,
      rawDate: rawDate || undefined,
      status: norm.status,
      stage,
      description: desc,
      location: loc || undefined,
      carrierSlug: evCarrierSlug,
      carrierName: evCarrierName,
      carrierIndex,
    };
  });

  const topStatus = String(yItem?.status || '').trim();
  const topDesc = String(yItem?.statusDescription || '').trim();
  let overallStatus = normalizeYunExpressStatus(topStatus, topDesc).status;

  if (events.length > 0) {
    if (events.some((ev) => ev.status === 'delivered')) {
      overallStatus = 'delivered';
    } else if (!topStatus && !topDesc) {
      overallStatus = events[0].status;
    }
  }

  const deliveredEvent = events.find((ev) => ev.status === 'delivered');
  const statusText = topDesc || topStatus || getLocalizedStatusText(overallStatus, lang);

  return buildLiveParcel({
    trackingNumber,
    carrier,
    status: overallStatus,
    events,
    origin: { code: originCode, name: originCountry },
    destination: { code: destCode, name: destCountry },
    deliveredAt: deliveredEvent ? deliveredEvent.date : null,
    statusText,
    lastMileTrackingNumber: lastMileNum || undefined,
    lastMileCarrier: lastMileCarrierInfo,
    additionalCarriers: lastMileCarrierInfo ? [lastMileCarrierInfo] : undefined,
    lang,
  });
}

export function parseYunExpressJsonPayload(
  payload: any,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string,
  destinationCountry?: string
): Parcel {
  if (!payload || typeof payload !== 'object') {
    throw new TrackingEngineError(
      'Respuesta inesperada de YunExpress.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  let item: any = null;

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      throw new TrackingEngineError(
        'Envío no encontrado en YunExpress.',
        'SHIPMENT_NOT_FOUND',
        404
      );
    }
    item = payload[0];
  } else if (
    'success' in payload ||
    'data' in payload ||
    'items' in payload ||
    'code' in payload
  ) {
    const codeStr = String(payload.code || '');
    const msgUpper = String(payload.message || '').toUpperCase();
    if (
      (payload.success === false && codeStr && codeStr !== '200') ||
      msgUpper.includes('NOT FOUND')
    ) {
      throw new TrackingEngineError(
        'Envío no encontrado en YunExpress.',
        'SHIPMENT_NOT_FOUND',
        404
      );
    }

    const raw = payload.data ?? payload.items;
    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        throw new TrackingEngineError(
          'Envío no encontrado en YunExpress.',
          'SHIPMENT_NOT_FOUND',
          404
        );
      }
      item = raw[0];
    } else if (raw && typeof raw === 'object') {
      item = raw;
    } else if (payload.trackingNumber || Array.isArray(payload.events)) {
      item = payload;
    } else {
      throw new TrackingEngineError(
        'Envío no encontrado en YunExpress.',
        'SHIPMENT_NOT_FOUND',
        404
      );
    }
  } else if (payload.trackingNumber || Array.isArray(payload.events)) {
    item = payload;
  } else {
    throw new TrackingEngineError(
      'Esquema JSON inesperado de YunExpress.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  return buildYunExpressParcelFromItem(item, trackingNumber, carrier, lang, destinationCountry);
}

export function parseYunExpressHtmlPayload(
  htmlContent: string,
  trackingNumber: string,
  carrier: Carrier,
  lang?: string,
  destinationCountry?: string
): Parcel {
  const parsed = parseTabularTrackingHtml(
    htmlContent,
    /\b\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?\b|\b\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b/
  );
  if (parsed.rows.length === 0) {
    throw new TrackingEngineError(
      'No se pudieron extraer eventos del HTML de YunExpress.',
      'CARRIER_TEMPORARILY_UNAVAILABLE',
      502
    );
  }

  return buildYunExpressParcelFromItem(
    {
      trackingNumber,
      events: parsed.rows.map((r) => ({
        date: r.date,
        status: r.status,
        location: r.location,
        description: r.description,
      })),
    },
    trackingNumber,
    carrier,
    lang,
    destinationCountry
  );
}

function isYunExpressNotFound(body: string): boolean {
  const upper = (body || '').toUpperCase();
  return (
    upper.includes('ORDER_NOT_FOUND') ||
    upper.includes('PACKAGE_NOT_FOUND') ||
    upper.includes('TRACKING_NUMBER_NOT_FOUND') ||
    upper.includes('NOT_FOUND') ||
    upper.includes('NOT FOUND') ||
    upper.includes('NO TRACKING INFORMATION') ||
    upper.includes('INEXISTENTE') ||
    upper.includes('NO EXISTE')
  );
}

export async function fetchYunExpressLive(
  trackingNumber: string,
  carrier: Carrier,
  lang?: string,
  destinationCountry?: string
): Promise<Parcel> {
  const cleanNum = (trackingNumber || '').trim();
  const url = `https://www.yuntrack.com/api/tracker/track?nums=${encodeURIComponent(cleanNum)}`;

  const { text, contentType } = await fetchLiveText(url, 'YunExpress', {
    extraWafMarkers: ['RGV', 'WAF'],
  });

  if (isYunExpressNotFound(text)) {
    throw new TrackingEngineError(
      'Envío no encontrado en YunExpress.',
      'SHIPMENT_NOT_FOUND',
      404
    );
  }

  const trimmed = text.trim();
  if (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    contentType.toLowerCase().includes('application/json')
  ) {
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new TrackingEngineError(
        'Respuesta JSON inválida de YunExpress.',
        'CARRIER_TEMPORARILY_UNAVAILABLE',
        502,
        err
      );
    }
    return parseYunExpressJsonPayload(parsed, cleanNum, carrier, lang, destinationCountry);
  }

  return parseYunExpressHtmlPayload(text, cleanNum, carrier, lang, destinationCountry);
}
