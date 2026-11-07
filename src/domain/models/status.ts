/**
 * Canonical 8 shipment statuses defined by Open Parcels core v1.0.2
 */
export type CanonicalStatus =
  | 'pending'
  | 'info_received'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_attempt'
  | 'exception'
  | 'expired';

export interface StatusMeta {
  code: CanonicalStatus;
  labelEs: string;
  labelEn: string;
  baseProgress: number; // 0 - 100
  colorHex: string;
  iosIconName: string;
  materialIconName: string;
}

export const CANONICAL_STATUS_MAP: Record<CanonicalStatus, StatusMeta> = {
  pending: {
    code: 'pending',
    labelEs: 'Pendiente de registro',
    labelEn: 'Pending',
    baseProgress: 5,
    colorHex: '#64748B', // Slate
    iosIconName: 'clock',
    materialIconName: 'schedule',
  },
  info_received: {
    code: 'info_received',
    labelEs: 'Información recibida / Pre-registrado',
    labelEn: 'Info Received',
    baseProgress: 15,
    colorHex: '#8B5CF6', // Purple
    iosIconName: 'doc.text',
    materialIconName: 'receipt-long',
  },
  in_transit: {
    code: 'in_transit',
    labelEs: 'En tránsito',
    labelEn: 'In Transit',
    baseProgress: 45,
    colorHex: '#0284C7', // Sky / Cyan
    iosIconName: 'airplane',
    materialIconName: 'local-shipping',
  },
  out_for_delivery: {
    code: 'out_for_delivery',
    labelEs: 'En reparto',
    labelEn: 'Out for Delivery',
    baseProgress: 85,
    colorHex: '#D97706', // Amber
    iosIconName: 'bicycle',
    materialIconName: 'delivery-dining',
  },
  delivered: {
    code: 'delivered',
    labelEs: 'Entregado',
    labelEn: 'Delivered',
    baseProgress: 100,
    colorHex: '#059669', // Emerald
    iosIconName: 'checkmark.circle.fill',
    materialIconName: 'check-circle',
  },
  failed_attempt: {
    code: 'failed_attempt',
    labelEs: 'Intento de entrega fallido',
    labelEn: 'Failed Attempt',
    baseProgress: 70,
    colorHex: '#DC2626', // Red
    iosIconName: 'exclamationmark.triangle.fill',
    materialIconName: 'error-outline',
  },
  exception: {
    code: 'exception',
    labelEs: 'Excepción / Retenido',
    labelEn: 'Exception / Alert',
    baseProgress: 50,
    colorHex: '#E11D48', // Rose
    iosIconName: 'exclamationmark.octagon.fill',
    materialIconName: 'warning',
  },
  expired: {
    code: 'expired',
    labelEs: 'Caducado / Sin actividad',
    labelEn: 'Expired',
    baseProgress: 0,
    colorHex: '#475569',
    iosIconName: 'xmark.circle',
    materialIconName: 'cancel',
  },
};

export function getStatusMeta(status: CanonicalStatus): StatusMeta {
  return CANONICAL_STATUS_MAP[status] || CANONICAL_STATUS_MAP.pending;
}
