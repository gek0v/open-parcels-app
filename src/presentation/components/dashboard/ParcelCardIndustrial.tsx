import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { Tag, Edit2 } from 'lucide-react-native';

interface ParcelCardIndustrialProps {
  parcel: Parcel;
  onPress: () => void;
  onRename?: () => void;
}

export const ParcelCardIndustrial: React.FC<ParcelCardIndustrialProps> = ({
  parcel,
  onPress,
  onRename,
}) => {
  const { theme } = useTheme();
  const latestEvent = parcel.events[parcel.events.length - 1];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.labelContainer,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.labelPressed,
      ]}
    >
      {/* Top Hazard / Shipping Stripe */}
      <View style={styles.hazardStripe}>
        <Text style={styles.hazardText}>{'/// AIR & GROUND LOGISTICS MATRIX ///'}</Text>
        <Text style={styles.destinationStamp}>
          DEST: {parcel.destination?.code || 'ES'}
        </Text>
      </View>

      <View style={styles.labelInner}>
        {/* Stamp & Carrier Row */}
        <View style={styles.stampRow}>
          <View style={styles.carrierStampBox}>
            <Tag size={12} color="#000000" />
            <Text style={styles.carrierStampText}>{parcel.carrier.name.toUpperCase()}</Text>
          </View>

          <StatusBadge status={parcel.status} size="small" />
        </View>

        {/* Big Bold Alias */}
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
              style={styles.renameBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Edit2 size={12} color="#000000" strokeWidth={2.5} />
            </Pressable>
          )}
        </View>

        {/* Industrial Waybill Barcode Block */}
        <View style={styles.waybillBox}>
          <View style={styles.waybillCol}>
            <Text style={styles.waybillLabel}>WAYBILL / TRACKING ID</Text>
            <Text style={styles.waybillCode}>{parcel.trackingNumber}</Text>
          </View>
          <View style={styles.daysCircle}>
            <Text style={styles.daysNumber}>{parcel.daysInTransit}</Text>
            <Text style={styles.daysUnit}>DÍAS</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <ProgressBar progress={parcel.progress} status={parcel.status} height={10} />
        </View>

        {/* Footer Milestone */}
        <View style={styles.footerRow}>
          <Text style={styles.statusMilestoneText} numberOfLines={1}>
            LOG: {latestEvent ? latestEvent.description : parcel.statusText}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  labelContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.sm,
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
  labelPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  hazardStripe: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFE600', // Cyber Yellow warning
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  hazardText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  destinationStamp: {
    fontSize: 9,
    fontWeight: '900',
    backgroundColor: '#000000',
    color: '#FFE600',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  labelInner: {
    padding: 14,
  },
  stampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  carrierStampBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#000000',
  },
  carrierStampText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  aliasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  waybillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 8,
    marginBottom: 8,
  },
  waybillCol: {
    flex: 1,
  },
  waybillLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  waybillCode: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '900',
    color: '#000000',
    marginTop: 2,
  },
  daysCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE600',
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysNumber: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 14,
  },
  daysUnit: {
    fontSize: 7,
    fontWeight: '900',
    color: '#000000',
  },
  progressContainer: {
    marginVertical: 4,
  },
  footerRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusMilestoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
});
