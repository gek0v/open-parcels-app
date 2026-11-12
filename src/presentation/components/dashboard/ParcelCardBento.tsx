import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { ArrowRight, Clock, Edit2, MapPin, Barcode } from 'lucide-react-native';

interface ParcelCardBentoProps {
  parcel: Parcel;
  onPress: () => void;
  onRename?: () => void;
}

export const ParcelCardBento: React.FC<ParcelCardBentoProps> = ({
  parcel,
  onPress,
  onRename,
}) => {
  const { theme } = useTheme();
  const latestEvent = parcel.events[parcel.events.length - 1];
  const isChained = !!(parcel.additionalCarriers && parcel.additionalCarriers.length > 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Card Header: Window Controls & Route Pill */}
      <View style={styles.cardTopHeader}>
        <View style={styles.leftMetaGroup}>
          <View style={styles.dotsRow}>
            <View style={[styles.dot, { backgroundColor: theme.coral }]} />
            <View style={[styles.dot, { backgroundColor: theme.yellow }]} />
            <View style={[styles.dot, { backgroundColor: theme.mint }]} />
          </View>
          <View style={styles.serviceTag}>
            <Barcode size={13} color="#000000" strokeWidth={2.2} />
            <Text style={styles.serviceTagText}>EXPEDICIÓN</Text>
          </View>
        </View>

        <View style={styles.routePill}>
          <MapPin size={10} color="#000000" strokeWidth={2.5} />
          <Text style={styles.routePillText}>
            {parcel.origin?.code || 'ORIG'} ➔ {parcel.destination?.code || 'DEST'}
          </Text>
        </View>
      </View>

      {/* Carrier Info & Status */}
      <View style={styles.headerRow}>
        <View style={[styles.carrierTag, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
          <Text style={[styles.carrierName, { color: theme.textPrimary }]} numberOfLines={1}>
            {parcel.carrier.name}
          </Text>
          {isChained && parcel.lastMileCarrier && (
            <View style={styles.chainedRow}>
              <ArrowRight size={11} color="#000000" strokeWidth={2.5} style={styles.chainArrow} />
              <Text style={[styles.lastMileText, { color: theme.textSecondary }]} numberOfLines={1}>
                {parcel.lastMileCarrier.name}
              </Text>
            </View>
          )}
        </View>

        <StatusBadge status={parcel.status} size="small" />
      </View>

      {/* Main Title & Rename */}
      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          <Text style={[styles.alias, { color: theme.textPrimary }]} numberOfLines={1}>
            {parcel.customAlias || parcel.trackingNumber}
          </Text>
          {onRename && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onRename();
              }}
              style={({ pressed }) => [styles.renameBtn, pressed && styles.btnPressed]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Edit2 size={12} color="#000000" strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
        <Text style={[styles.trackingMono, { color: theme.textTertiary }]}>{parcel.trackingNumber}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={parcel.progress} status={parcel.status} height={10} />
      </View>

      {/* Footer: Latest Event & Transit Badge */}
      <View style={styles.footerRow}>
        <Text style={[styles.latestEventText, { color: theme.textSecondary }]} numberOfLines={1}>
          {latestEvent ? latestEvent.description : parcel.statusText}
        </Text>
        <View style={styles.daysBadge}>
          <Clock size={11} color="#000000" strokeWidth={2.5} style={styles.clockIcon} />
          <Text style={styles.daysText}>{parcel.daysInTransit}d</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    ...(Theme.isWeb ? ({ boxShadow: '4px 4px 0px #000000' } as any) : {}),
  },
  cardPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  cardTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
  },
  leftMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.2,
    borderColor: '#000000',
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  serviceTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE600',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.2,
    borderColor: '#000000',
    gap: 4,
  },
  routePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    marginHorizontal: 2,
  },
  lastMileText: {
    fontSize: 10,
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
  alias: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  renameBtn: {
    padding: 4,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFE600',
    borderWidth: 1.5,
    borderColor: '#000000',
    marginLeft: 8,
  },
  btnPressed: {
    transform: [{ scale: 0.95 }],
  },
  trackingMono: {
    fontSize: 11,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#64748B',
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
  latestEventText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginRight: 8,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
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
    marginRight: 3,
  },
  daysText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
});
