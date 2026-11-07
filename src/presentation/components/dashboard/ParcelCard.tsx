import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { AdaptiveCard } from '../common/AdaptiveCard';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { Theme } from '../../theme/adaptiveTheme';
import { ArrowRight, Clock, Edit2 } from 'lucide-react-native';

interface ParcelCardProps {
  parcel: Parcel;
  onPress: () => void;
  onRename?: () => void;
}

export const ParcelCard: React.FC<ParcelCardProps> = ({ parcel, onPress, onRename }) => {
  const latestEvent = parcel.events[parcel.events.length - 1];
  const isChained = !!(parcel.additionalCarriers && parcel.additionalCarriers.length > 0);

  return (
    <AdaptiveCard onPress={onPress} hasWindowHeader>
      {/* Top Header: Carrier info & Status */}
      <View style={styles.headerRow}>
        <View style={styles.carrierTag}>
          <Text style={styles.carrierName} numberOfLines={1}>
            {parcel.carrier.name}
          </Text>

          {isChained && parcel.lastMileCarrier && (
            <View style={styles.chainedRow}>
              <ArrowRight size={13} color="#000" style={styles.chainArrow} />
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
        <View style={styles.titleRow}>
          <Text style={styles.alias} numberOfLines={1}>
            {parcel.customAlias || parcel.trackingNumber}
          </Text>
          {onRename && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onRename();
              }}
              style={styles.cardRenameButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Edit2 size={13} color="#000000" />
            </Pressable>
          )}
        </View>

        <View style={styles.trackingBox}>
          <Text style={styles.trackingNumber}>{parcel.trackingNumber}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={parcel.progress} status={parcel.status} height={10} />
      </View>

      {/* Footer: Latest Event and Days in Transit */}
      <View style={styles.footerRow}>
        <View style={styles.latestEventContainer}>
          <Text style={styles.latestEventText} numberOfLines={1}>
            {latestEvent ? latestEvent.description : parcel.statusText}
          </Text>
        </View>

        <View style={styles.daysBadge}>
          <Clock size={12} color="#000000" style={styles.clockIcon} />
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
    marginBottom: 10,
  },
  carrierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    flexShrink: 1,
    marginRight: 8,
  },
  carrierName: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
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
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
  },
  titleSection: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardRenameButton: {
    padding: 5,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFE600',
    borderWidth: 1.5,
    borderColor: '#000000',
    marginLeft: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '1.5px 1.5px 0px #000000' } as any) : {}),
  },
  alias: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  trackingBox: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#000000',
    marginTop: 4,
  },
  trackingNumber: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  progressContainer: {
    marginVertical: 10,
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
    fontWeight: '600',
    color: '#334155',
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
    ...(Theme.isWeb ? ({ boxShadow: '1.5px 1.5px 0px #000000' } as any) : {}),
  },
  clockIcon: {
    marginRight: 4,
  },
  daysText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
});
