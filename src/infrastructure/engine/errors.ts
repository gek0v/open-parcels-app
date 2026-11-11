export type TrackingErrorCode =
  | 'POSTAL_CODE_REQUIRED'
  | 'MISSING_POSTAL_CODE'
  | 'SHIPMENT_NOT_FOUND'
  | 'CARRIER_NOT_IMPLEMENTED'
  | 'CARRIER_RATE_LIMITED'
  | 'CARRIER_TEMPORARILY_UNAVAILABLE'
  | 'CARRIER_UNAVAILABLE'
  | 'TRACKING_FAILED'
  | 'MISSING_NUMBER'
  | 'INVALID_JSON'
  | 'INVALID_REQUEST'
  | 'NO_SHIPMENTS'
  | 'REQUEST_NOT_FOUND'
  | 'ASYNC_TIMEOUT'
  | 'UNKNOWN_ERROR';

export class TrackingEngineError extends Error {
  readonly code: TrackingErrorCode;
  readonly rawCode?: string;
  readonly httpStatus?: number;
  readonly details?: unknown;

  constructor(
    message: string,
    code: TrackingErrorCode = 'UNKNOWN_ERROR',
    httpStatus?: number,
    details?: unknown,
    rawCode?: string
  ) {
    super(message);
    this.name = 'TrackingEngineError';
    this.code = code;
    this.rawCode = rawCode || code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export function normalizeTrackingErrorCode(
  rawCode?: string,
  httpStatus?: number
): TrackingErrorCode {
  const upper = (rawCode || '').trim().toUpperCase();
  if (upper === 'POSTAL_CODE_REQUIRED') return 'POSTAL_CODE_REQUIRED';
  if (upper === 'MISSING_POSTAL_CODE') return 'MISSING_POSTAL_CODE';
  if (upper === 'SHIPMENT_NOT_FOUND') return 'SHIPMENT_NOT_FOUND';
  if (upper === 'CARRIER_NOT_IMPLEMENTED') return 'CARRIER_NOT_IMPLEMENTED';
  if (upper === 'CARRIER_RATE_LIMITED') return 'CARRIER_RATE_LIMITED';
  if (upper === 'CARRIER_TEMPORARILY_UNAVAILABLE' || upper === 'CARRIER_UNAVAILABLE') {
    return 'CARRIER_TEMPORARILY_UNAVAILABLE';
  }
  if (upper === 'TRACKING_FAILED') return 'TRACKING_FAILED';
  if (upper === 'MISSING_NUMBER') return 'MISSING_NUMBER';
  if (upper === 'INVALID_JSON') return 'INVALID_JSON';
  if (upper === 'INVALID_REQUEST') return 'INVALID_REQUEST';
  if (upper === 'NO_SHIPMENTS') return 'NO_SHIPMENTS';
  if (upper === 'REQUEST_NOT_FOUND') return 'REQUEST_NOT_FOUND';
  if (upper === 'ASYNC_TIMEOUT') return 'ASYNC_TIMEOUT';

  if (httpStatus === 422) return 'POSTAL_CODE_REQUIRED';
  if (httpStatus === 404) return 'SHIPMENT_NOT_FOUND';
  if (httpStatus === 501) return 'CARRIER_NOT_IMPLEMENTED';
  if (httpStatus === 429) return 'CARRIER_RATE_LIMITED';
  if (httpStatus === 502 || httpStatus === 503) return 'CARRIER_TEMPORARILY_UNAVAILABLE';

  return 'UNKNOWN_ERROR';
}

export function parseApiError(httpStatus: number, body: unknown): TrackingEngineError {
  const json = (body && typeof body === 'object' ? body : {}) as Record<string, any>;
  const errObj = json.error && typeof json.error === 'object' ? json.error : null;

  const rawCode: string | undefined = errObj?.code || json.code || undefined;
  const code = normalizeTrackingErrorCode(rawCode, httpStatus);

  let message: string | undefined =
    errObj?.message ||
    (typeof json.error === 'string' ? json.error : undefined) ||
    json.message;

  if (!message && Array.isArray(errObj?.rejected) && errObj.rejected.length > 0) {
    const firstRejected = errObj.rejected[0];
    const rejCode = normalizeTrackingErrorCode(firstRejected.code, httpStatus);
    return new TrackingEngineError(
      firstRejected.message || `Error ${httpStatus} al rastrear paquete`,
      rejCode,
      httpStatus,
      errObj.rejected,
      firstRejected.code
    );
  }

  if (!message) {
    switch (code) {
      case 'POSTAL_CODE_REQUIRED':
      case 'MISSING_POSTAL_CODE':
        message = 'Este transportista requiere el código postal de destino.';
        break;
      case 'SHIPMENT_NOT_FOUND':
        message = 'Envío no encontrado en el transportista.';
        break;
      case 'CARRIER_NOT_IMPLEMENTED':
        message = 'El transportista aún no dispone de adaptador en vivo.';
        break;
      case 'CARRIER_RATE_LIMITED':
        message = 'Límite de peticiones excedido en el transportista. Inténtalo más tarde.';
        break;
      case 'CARRIER_TEMPORARILY_UNAVAILABLE':
        message = 'El servicio del transportista no está disponible temporalmente.';
        break;
      default:
        message = `Error ${httpStatus} al rastrear paquete`;
    }
  }

  return new TrackingEngineError(message, code, httpStatus, errObj || json, rawCode);
}

export function isPostalCodeRequiredError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  return code === 'POSTAL_CODE_REQUIRED' || code === 'MISSING_POSTAL_CODE';
}
