import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { Theme } from '../../theme/adaptiveTheme';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { ArrowUpRight, Clock, Edit2 } from 'lucide-react-native';

interface ParcelCardRetroOSProps {
  parcel: Parcel;
  onPress: () => void;
  onRename?: () => void;
}

export const ParcelCardRetroOS: React.FC<ParcelCardRetroOSProps> = ({
  parcel,
  onPress,
  onRename,
}) => {
  const latestEvent = parcel.events[parcel.events.length - 1];

  // Dynamic window title bar color based on status
  const getHeaderColor = () => {
    switch (parcel.status) {
      case 'out_for_delivery':
        return '#FF9900'; // Amber
      case 'delivered':
        return '#34D399'; // Mint
      case 'info_received':
        return '#C084FC'; // Purple
      default:
        return '#38BDF8'; // Sky Blue
    }
  };

  return (
    <View style={styles.windowCard}>
      {/* OS Window Colored Title Bar */}
      <View style={[styles.windowTitleBar, { backgroundColor: getHeaderColor() }]}>
        <View style={styles.windowControls}>
          <View style={[styles.dot, { backgroundColor: '#FF5C38' }]} />
          <View style={[styles.dot, { backgroundColor: '#FFE600' }]} />
          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
        </View>
        <Text style={styles.windowTitleText} numberOfLines={1}>
          {parcel.carrier.name.toUpperCase()} // TRACK
        </Text>
        <StatusBadge status={parcel.status} size="small" />
      </View>

      {/* Card Body */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardBody, pressed && styles.bodyPressed]}
      >
        <View style={styles.contentRow}>
          <View style={styles.infoCol}>
            <View style={styles.aliasRow}>
              <Text style={styles.alias} numberOfLines={1}>
                {parcel.customAlias || parcel.trackingNumber}
              </Text>
              {onRename && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onRename();
                  }}
                  style={styles.renameIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Edit2 size={12} color="#000000" strokeWidth={2.5} />
                </Pressable>
              )}
            </View>

            <View style={styles.trackingPill}>
              <Text style={styles.trackingMono}>{parcel.trackingNumber}</Text>
            </View>
          </View>

          {/* Action Arrow Icon Button */}
          <View style={styles.actionArrowBox}>
            <ArrowUpRight size={20} color="#000000" strokeWidth={3} />
          </View>
        </View>

        {/* Progress with percentage badge */}
        <View style={styles.progressRow}>
          <View style={styles.progressWrapper}>
            <ProgressBar progress={parcel.progress} status={parcel.status} height={12} />
          </View>
          <View style={styles.percentBox}>
            <Text style={styles.percentText}>{parcel.progress}%</Text>
          </View>
        </View>

        {/* Latest Log Info */}
        <View style={styles.footerRow}>
          <Text style={styles.latestLogText} numberOfLines={1}>
            ► {latestEvent ? latestEvent.description : parcel.statusText}
          </Text>
          <View style={styles.transitBox}>
            <Clock size={10} color="#000000" />
            <Text style={styles.transitDaysText}>{parcel.daysInTransit}D</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  windowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    marginBottom: 16,
    borderWidth: 2.5,
    borderColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 4.5, height: 4.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    ...(Theme.isWeb ? ({ boxShadow: '4.5px 4.5px 0px #000000' } as any) : {}),
  },
  windowTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  windowControls: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.2,
    borderColor: '#000000',
  },
  windowTitleText: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  bodyPressed: {
    backgroundColor: '#F8FAFC',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoCol: {
    flex: 1,
    marginRight: 10,
  },
  aliasRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alias: {
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  renameIconBtn: {
    padding: 4,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFE600',
    borderWidth: 1.5,
    borderColor: '#000000',
    marginLeft: 8,
  },
  trackingPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 4,
  },
  trackingMono: {
    fontSize: 11,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#1E293B',
  },
  actionArrowBox: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFE600', // Cyber Yellow
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  progressWrapper: {
    flex: 1,
  },
  percentBox: {
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.radius.xs,
  },
  percentText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  latestLogText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  transitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#000000',
  },
  transitDaysText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
});
