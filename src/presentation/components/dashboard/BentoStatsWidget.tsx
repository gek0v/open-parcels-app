import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../../infrastructure/i18n';
import { Parcel } from '../../../domain/models/parcel';
import {
  computeBentoStats,
  TopCarrierMetric,
  ActivePaceMetric,
} from '../../../domain/metrics/bentoStats';
import {
  Truck,
  CheckCircle2,
  Activity,
} from 'lucide-react-native';

interface BentoStatsWidgetProps {
  activeCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  avgDeliveryDays?: number;
  topCarrier?: TopCarrierMetric;
  activePace?: ActivePaceMetric;
  parcels?: Parcel[];
}

export const BentoStatsWidget: React.FC<BentoStatsWidgetProps> = ({
  activeCount: propActiveCount,
  outForDeliveryCount: propOutForDeliveryCount,
  deliveredCount: propDeliveredCount,
  avgDeliveryDays: propAvgDeliveryDays,
  activePace: propActivePace,
  parcels,
}) => {
  const { t, lang } = useI18n();
  const { theme } = useTheme();

  // Compute computed stats from parcels if available, else use props
  const computed = parcels ? computeBentoStats(parcels, lang) : null;

  const activeCount = computed ? computed.activeCount : propActiveCount;
  const outForDeliveryCount = computed ? computed.outForDeliveryCount : propOutForDeliveryCount;
  const deliveredCount = computed ? computed.deliveredCount : propDeliveredCount;
  const avgDeliveryDays = computed ? computed.avgDeliveryDays : (propAvgDeliveryDays ?? 0);
  const activePace = computed
    ? computed.activePace
    : (propActivePace ?? { rate: 100, label: t.stats.paceUpToDate, hasAlerts: false, problemCount: 0 });

  return (
    <View style={styles.container}>
      <View style={styles.primaryGrid}>
        {/* Tile 1: Active & In Delivery summary */}
        <View
          accessible={true}
          accessibilityLabel={`${t.stats.active}: ${activeCount} envíos`}
          style={[styles.activeTile, { backgroundColor: theme.yellow, borderColor: theme.border }]}
        >
          <View style={styles.tileHeader}>
            <Text style={styles.tileLabel}>{t.stats.active}</Text>
            <Truck size={15} color="#000000" strokeWidth={2.5} />
          </View>
          <Text style={styles.hugeNumber}>{activeCount}</Text>
          <View style={styles.subPill}>
            <Text style={[styles.subPillText, { color: theme.yellow }]}>
              {outForDeliveryCount > 0
                ? `⚡ ${outForDeliveryCount} ${t.status.out_for_delivery.toUpperCase()}`
                : (activeCount > 0 ? t.stats.activeSub : t.stats.noneActive)}
            </Text>
          </View>
        </View>

        {/* Tile 2: Delivered */}
        <View
          accessible={true}
          accessibilityLabel={`${t.stats.delivered}: ${deliveredCount} completados`}
          style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.tileHeaderSmall}>
            <Text style={[styles.tileLabelSmall, { color: theme.textSecondary }]}>
              {t.stats.delivered}
            </Text>
            <CheckCircle2 size={14} color={theme.status.delivered} strokeWidth={2.5} />
          </View>
          <Text style={[styles.mediumNumber, { color: theme.textPrimary }]}>{deliveredCount}</Text>
          <Text style={[styles.microSubText, { color: theme.textTertiary }]} numberOfLines={1}>
            {avgDeliveryDays > 0 ? `${avgDeliveryDays}d ${t.stats.avgDaysSub}` : t.stats.ofShipments}
          </Text>
        </View>

        {/* Tile 3: Pace & Performance */}
        <View
          accessible={true}
          accessibilityLabel={`${t.stats.pace}: ${activePace.rate}%`}
          style={[styles.statTile, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
        >
          <View style={styles.tileHeaderSmall}>
            <Text style={[styles.tileLabelSmall, { color: theme.textSecondary }]}>
              {t.stats.pace}
            </Text>
            <Activity
              size={14}
              color={activePace.hasAlerts ? theme.status.exception : theme.status.delivered}
              strokeWidth={2.5}
            />
          </View>
          <Text style={[styles.mediumNumber, { color: theme.textPrimary }]}>
            {activeCount > 0 ? `${activePace.rate}%` : '100%'}
          </Text>
          <View
            style={[
              styles.pacePill,
              {
                backgroundColor: activePace.hasAlerts ? theme.coral : theme.yellow,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.pacePillText,
                { color: activePace.hasAlerts ? '#FFFFFF' : '#000000' },
              ]}
              numberOfLines={1}
            >
              {activePace.label}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  primaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  activeTile: {
    flex: 1.25,
    borderRadius: Theme.radius.sm,
    padding: 10,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  hugeNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 32,
  },
  subPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    marginTop: 4,
  },
  subPillText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  statTile: {
    flex: 1,
    borderRadius: Theme.radius.sm,
    padding: 10,
    borderWidth: 2,
    justifyContent: 'space-between',
    ...Theme.shadows.sm,
  },
  tileHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tileLabelSmall: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  mediumNumber: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
    marginVertical: 1,
  },
  microSubText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pacePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    marginTop: 2,
  },
  pacePillText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
