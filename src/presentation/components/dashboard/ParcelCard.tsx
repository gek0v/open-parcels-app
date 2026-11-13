import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { AdaptiveCard } from '../common/AdaptiveCard';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { Theme } from '../../theme/adaptiveTheme';
import { ArrowRight, Clock, Edit2, Share2 } from 'lucide-react-native';

interface ParcelCardProps {
  parcel: Parcel;
  onPress: () => void;
  onRename?: () => void;
  onShare?: () => void;
}

export const ParcelCard: React.FC<ParcelCardProps> = ({ parcel, onPress, onRename, onShare }) => {
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
              <ArrowRight size={12} color="#000000" strokeWidth={3} style={styles.chainArrow} />
              <Text style={styles.lastMileText} numberOfLines={1}>
                {parcel.lastMileCarrier.name}
              </Text>
            </View>
          )}
        </View>

        <StatusBadge status={parcel.status} size="small" style={styles.statusBadge} />
      </View>

      {/* Main Info: Custom Alias & Tracking Number */}
      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          <Text style={styles.alias} numberOfLines={1}>
            {parcel.customAlias || parcel.trackingNumber}
          </Text>
          <View style={styles.actionButtonsRow}>
            {onShare && (
              <Pressable
                accessibilityLabel="Compartir paquete"
                accessibilityRole="button"
                onPress={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                style={({ pressed }) => [
                  styles.cardRenameButton,
                  pressed && styles.iconButtonPressed,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Share2 size={13} color="#000000" strokeWidth={2.5} />
              </Pressable>
            )}
            {onRename && (
              <Pressable
                accessibilityLabel="Renombrar paquete"
                accessibilityRole="button"
                onPress={(e) => {
                  e.stopPropagation();
                  onRename();
                }}
                style={({ pressed }) => [
                  styles.cardRenameButton,
                  pressed && styles.iconButtonPressed,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Edit2 size={13} color="#000000" strokeWidth={2.5} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.trackingBox}>
          <Text style={styles.trackingNumber} numberOfLines={1}>
            {parcel.trackingNumber}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={parcel.progress} status={parcel.status} height={10} />
      </View>

      {/* Footer: Latest Event and Days in Transit */}
      <View style={styles.footerRow}>
        <View style={styles.latestEventContainer}>
          <View style={styles.eventTick} />
          <Text style={styles.latestEventText} numberOfLines={1}>
            {latestEvent ? latestEvent.description : parcel.statusText}
          </Text>
        </View>

        <View
          style={styles.daysBadge}
          accessibilityLabel={`${parcel.daysInTransit} días en tránsito`}
        >
          <Clock size={12} color="#000000" strokeWidth={2.5} style={styles.clockIcon} />
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
    marginBottom: 12,
  },
  carrierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    flexShrink: 1,
    marginRight: 8,
    ...Theme.shadows.sm,
  },
  carrierName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chainedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    flexShrink: 1,
  },
  chainArrow: {
    marginHorizontal: 3,
  },
  lastMileText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  statusBadge: {
    flexShrink: 0,
  },
  titleSection: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardRenameButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.xs,
    backgroundColor: Theme.colors.yellow,
    borderWidth: 2,
    borderColor: '#000000',
    marginLeft: 8,
    ...Theme.shadows.sm,
  },
  iconButtonPressed: {
    ...Theme.pressed,
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
    maxWidth: '100%',
    backgroundColor: Theme.colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginTop: 6,
  },
  trackingNumber: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.6,
  },
  progressContainer: {
    marginVertical: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  latestEventContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    minHeight: 24,
  },
  eventTick: {
    width: 3,
    height: 16,
    backgroundColor: '#000000',
    marginRight: 7,
    borderRadius: 1,
  },
  latestEventText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
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
