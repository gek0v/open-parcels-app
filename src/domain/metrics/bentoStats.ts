import { Parcel } from '../models/parcel';

export interface TopCarrierMetric {
  slug: string;
  name: string;
  count: number;
  percentage: number; // 0 to 100
}

export interface ActivePaceMetric {
  rate: number; // 0 to 100 (% of active shipments with no exception or failed attempt)
  label: string; // 'ÓPTIMO' | 'NORMAL' | 'ATENCIÓN' | 'AL DÍA'
  hasAlerts: boolean;
  problemCount: number;
}

export interface BentoStatsData {
  activeCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  avgDeliveryDays: number;
  topCarrier?: TopCarrierMetric;
  activePace: ActivePaceMetric;
}

/**
 * Computes extended Bento statistics for Open Parcels dashboard.
 * All computations are purely local and zero-latency.
 */
export function computeBentoStats(parcels: Parcel[]): BentoStatsData {
  const nonArchived = parcels.filter((p) => !p.isArchived);
  const activeParcels = nonArchived.filter((p) => p.status !== 'delivered');
  const deliveredParcels = nonArchived.filter((p) => p.status === 'delivered');

  const activeCount = activeParcels.length;
  const outForDeliveryCount = activeParcels.filter(
    (p) => p.status === 'out_for_delivery'
  ).length;
  const deliveredCount = deliveredParcels.length;

  // Average transit days for delivered packages
  let avgDeliveryDays = 0;
  if (deliveredCount > 0) {
    const totalDays = deliveredParcels.reduce((sum, p) => sum + Math.max(0, p.daysInTransit || 0), 0);
    avgDeliveryDays = Math.round((totalDays / deliveredCount) * 10) / 10;
  }

  // Carrier distribution and most used carrier
  let topCarrier: TopCarrierMetric | undefined = undefined;
  if (nonArchived.length > 0) {
    const carrierMap = new Map<string, { name: string; count: number }>();
    for (const p of nonArchived) {
      const slug = p.carrier?.slug || 'unknown';
      const name = p.carrier?.name || slug.toUpperCase();
      const entry = carrierMap.get(slug) || { name, count: 0 };
      entry.count += 1;
      carrierMap.set(slug, entry);
    }

    let bestSlug = '';
    let bestData = { name: '', count: 0 };
    for (const [slug, data] of carrierMap.entries()) {
      if (data.count > bestData.count) {
        bestSlug = slug;
        bestData = data;
      }
    }

    if (bestData.count > 0) {
      topCarrier = {
        slug: bestSlug,
        name: bestData.name,
        count: bestData.count,
        percentage: Math.round((bestData.count / nonArchived.length) * 100),
      };
    }
  }

  // Active delivery pace & punctuality indicator
  let activePace: ActivePaceMetric;
  if (activeCount === 0) {
    activePace = {
      rate: 100,
      label: 'AL DÍA',
      hasAlerts: false,
      problemCount: 0,
    };
  } else {
    const problemCount = activeParcels.filter(
      (p) => p.status === 'exception' || p.status === 'failed_attempt'
    ).length;
    const rate = Math.round(((activeCount - problemCount) / activeCount) * 100);
    const label = rate >= 90 ? 'ÓPTIMO' : rate >= 70 ? 'NORMAL' : 'ATENCIÓN';
    activePace = {
      rate,
      label,
      hasAlerts: problemCount > 0,
      problemCount,
    };
  }

  return {
    activeCount,
    outForDeliveryCount,
    deliveredCount,
    avgDeliveryDays,
    topCarrier,
    activePace,
  };
}
