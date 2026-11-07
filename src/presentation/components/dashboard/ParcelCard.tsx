import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { AdaptiveCard } from '../common/AdaptiveCard';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { Theme } from '../../theme/adaptiveTheme';
import { ArrowRight, Clock, Box } from 'lucide-react-native';

interface ParcelCardProps {
  parcel: Parcel;
  onPress: () => void;
}

export const ParcelCard: React.FC<ParcelCardProps> = ({ parcel, onPress }) => {
  const latestEvent = parcel.events[parcel.events.length - 1];
  const isChained = !!(parcel.additionalCarriers && parcel.additionalCarriers.length > 0);

  return (
    <AdaptiveCard onPress={onPress}>
      {/* Top Header: Carrier info & Status */}
      <View style={styles.headerRow}>
        <View style={styles.carrierBadge}>
          <View
            style={[
              styles.carrierDot,
              { backgroundColor: parcel.carrier.color || Theme.colors.primary },
            ]}
          />
          <Text style={styles.carrierName} numberOfLines={1}>
            {parcel.carrier.name}
          </Text>

          {isChained && parcel.lastMileCarrier && (
            <View style={styles.chainedRow}>
              <ArrowRight size={12} color={Theme.colors.textTertiary} style={styles.chainArrow} />
              <Text style={styles.lastMileText} numberOfLines={1}>
                {parcel.lastMileCarrier.name}
              </Text>
            </View>
          )}
        </View>

        <StatusBadge status={parcel.status} size="small" />
      </View>

      {/* Main Info: Custom Alias & Tracking Number */}
      <View style={styles.titleSection}>
        <Text style={styles.alias} numberOfLines={1}>
          {parcel.customAlias || parcel.trackingNumber}
        </Text>
        {parcel.customAlias && (
          <Text style={styles.trackingNumber}>{parcel.trackingNumber}</Text>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={parcel.progress} status={parcel.status} height={5} />
      </View>

      {/* Footer: Latest Event and Days in Transit */}
      <View style={styles.footerRow}>
        <View style={styles.latestEventContainer}>
          <Text style={styles.latestEventText} numberOfLines={1}>
            {latestEvent ? latestEvent.description : parcel.statusText}
          </Text>
        </View>

        <View style={styles.daysBadge}>
          <Clock size={12} color={Theme.colors.textSecondary} style={styles.clockIcon} />
          <Text style={styles.daysText}>{parcel.daysInTransit}d</Text>
        </View>
      </View>
    </AdaptiveCard>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  carrierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  carrierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  carrierName: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  chainedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  chainArrow: {
    marginHorizontal: 3,
  },
  lastMileText: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
  },
  titleSection: {
    marginBottom: 10,
  },
  alias: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    letterSpacing: 0.1,
  },
  trackingNumber: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    marginVertical: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  latestEventContainer: {
    flex: 1,
    marginRight: 10,
  },
  latestEventText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.surfaceSubtle,
  },
  clockIcon: {
    marginRight: 4,
  },
  daysText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
});
