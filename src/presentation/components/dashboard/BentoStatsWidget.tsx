import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
  Camera,
  Clock,
  Activity,
  Award,
} from 'lucide-react-native';

interface BentoStatsWidgetProps {
  activeCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  avgDeliveryDays?: number;
  topCarrier?: TopCarrierMetric;
  activePace?: ActivePaceMetric;
  parcels?: Parcel[];
  onScanPress: () => void;
}

export const BentoStatsWidget: React.FC<BentoStatsWidgetProps> = ({
  activeCount: propActiveCount,
  outForDeliveryCount: propOutForDeliveryCount,
  deliveredCount: propDeliveredCount,
  avgDeliveryDays: propAvgDeliveryDays,
  topCarrier: propTopCarrier,
  activePace: propActivePace,
  parcels,
  onScanPress,
}) => {
  const { t } = useI18n();
  const { theme } = useTheme();

  // Compute computed stats from parcels if available, else use props
  const computed = parcels ? computeBentoStats(parcels) : null;

  const activeCount = computed ? computed.activeCount : propActiveCount;
  const outForDeliveryCount = computed ? computed.outForDeliveryCount : propOutForDeliveryCount;
  const deliveredCount = computed ? computed.deliveredCount : propDeliveredCount;
  const avgDeliveryDays = computed ? computed.avgDeliveryDays : (propAvgDeliveryDays ?? 0);
  const topCarrier = computed ? computed.topCarrier : propTopCarrier;
  const activePace = computed
    ? computed.activePace
    : (propActivePace ?? { rate: 100, label: t.stats.paceUpToDate, hasAlerts: false, problemCount: 0 });

  return (
    <View style={styles.container}>
      {/* Row 1: Primary Metrics (Active & Delivery summary + Quick Scan) */}
      <View style={styles.primaryGrid}>
        {/* Tile 1: Active & In Delivery summary */}
        <View
          accessible={true}
          accessibilityLabel={`${t.stats.active}: ${activeCount} envíos`}
          style={[styles.activeTile, { backgroundColor: theme.yellow, borderColor: theme.border }]}
        >
          <View style={styles.tileHeader}>
            <Text style={styles.tileLabel}>{t.stats.active}</Text>
            <Truck size={16} color="#000000" strokeWidth={2.5} />
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

        {/* Right Column: Delivered & Scan Quick Action */}
        <View style={styles.rightCol}>
          {/* Tile 2: Delivered */}
          <View
            accessible={true}
            accessibilityLabel={`${t.stats.delivered}: ${deliveredCount} completados`}
            style={[styles.deliveredTile, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.tileHeaderSmall}>
              <Text style={[styles.tileLabelSmall, { color: theme.textSecondary }]}>
                {t.stats.delivered}
              </Text>
              <CheckCircle2 size={13} color={theme.status.delivered} strokeWidth={2.5} />
            </View>
            <Text style={[styles.mediumNumber, { color: theme.textPrimary }]}>{deliveredCount}</Text>
          </View>

          {/* Tile 3: Quick Scan Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.stats.scanBtn}
            onPress={onScanPress}
            style={({ pressed }) => [
              styles.scanTile,
              { backgroundColor: theme.coral, borderColor: theme.border },
              pressed && styles.scanPressed,
            ]}
          >
            <Camera size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.scanTileText}>{t.stats.scanBtn}</Text>
          </Pressable>
        </View>
      </View>

      {/* Row 2: Expanded Bento Metrics (Avg Days, Top Carrier & Pace) */}
      <View style={styles.secondaryGrid}>
        {/* Tile A: Average delivery days */}
        <View
          accessible={true}
          accessibilityLabel={`${t.stats.avgDays}: ${avgDeliveryDays > 0 ? `${avgDeliveryDays} días` : t.stats.noData}`}
          style={[styles.miniTile, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.miniTileHeader}>
            <Clock size={12} color={theme.textTertiary} strokeWidth={2.5} />
            <Text style={[styles.miniTileLabel, { color: theme.textTertiary }]} numberOfLines={1}>
              {t.stats.avgDays}
            </Text>
          </View>
          <Text style={[styles.miniTileNumber, { color: theme.textPrimary }]} numberOfLines={1}>
            {avgDeliveryDays > 0 ? `${avgDeliveryDays}d` : '—'}
          </Text>
          <Text style={[styles.miniTileSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {t.stats.avgDaysSub}
          </Text>
        </View>

        {/* Tile B: Most used carrier / distribution */}
        <View
          accessible={true}
          accessibilityLabel={`${t.stats.topCarrier}: ${topCarrier ? topCarrier.name : t.stats.noData}`}
          style={[styles.miniTile, styles.miniTileCenter, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
        >
          <View style={styles.miniTileHeader}>
            <Award size={12} color={theme.textTertiary} strokeWidth={2.5} />
            <Text style={[styles.miniTileLabel, { color: theme.textTertiary }]} numberOfLines={1}>
              {t.stats.topCarrier}
            </Text>
          </View>
          <Text style={[styles.miniTileTextBold, { color: theme.textPrimary }]} numberOfLines={1}>
            {topCarrier ? topCarrier.name.toUpperCase() : '—'}
          </Text>
          <Text style={[styles.miniTileSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {topCarrier ? `${topCarrier.percentage}% ${t.stats.ofShipments}` : t.stats.noData}
          </Text>
        </View>

        {/* Tile C: Active pace / On-time rate */}
        <View
          accessible={true}
          accessibilityLabel={`${t.stats.pace}: ${activePace.rate}% ${activePace.label}`}
          style={[styles.miniTile, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.miniTileHeader}>
            <Activity
              size={12}
              color={activePace.hasAlerts ? theme.status.exception : theme.status.delivered}
              strokeWidth={2.5}
            />
            <Text style={[styles.miniTileLabel, { color: theme.textTertiary }]} numberOfLines={1}>
              {t.stats.pace}
            </Text>
          </View>
          <Text style={[styles.miniTileNumber, { color: theme.textPrimary }]} numberOfLines={1}>
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
    marginBottom: 14,
    gap: 8,
  },
  primaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  activeTile: {
    flex: 1.3,
    backgroundColor: '#FFE600',
    borderRadius: Theme.radius.sm,
    padding: 12,
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3.5, height: 3.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    ...(Theme.isWeb ? ({ boxShadow: '3.5px 3.5px 0px #000000' } as any) : {}),
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  hugeNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 36,
  },
  subPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    marginTop: 4,
  },
  subPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 0.4,
  },
  rightCol: {
    flex: 1,
    gap: 8,
  },
  deliveredTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '2.5px 2.5px 0px #000000' } as any) : {}),
  },
  tileHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileLabelSmall: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  mediumNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 22,
    marginTop: 2,
  },
  scanTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF5C38',
    borderRadius: Theme.radius.sm,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '2.5px 2.5px 0px #000000' } as any) : {}),
  },
  scanPressed: {
    transform: [{ translateX: 1.5 }, { translateY: 1.5 }],
    shadowOffset: { width: 1, height: 1 },
    ...(Theme.isWeb ? ({ boxShadow: '1px 1px 0px #000000' } as any) : {}),
  },
  scanTileText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  miniTile: {
    flex: 1,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 7,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  miniTileCenter: {
    flex: 1.15,
  },
  miniTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  miniTileLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  miniTileNumber: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
    marginVertical: 1,
  },
  miniTileTextBold: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 18,
    marginVertical: 1,
    letterSpacing: 0.3,
  },
  miniTileSub: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pacePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    marginTop: 2,
  },
  pacePillText: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
