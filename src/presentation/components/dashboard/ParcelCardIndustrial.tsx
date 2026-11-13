import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { Tag, Edit2, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ParcelCardIndustrialProps {
  parcel: Parcel;
  onPress: () => void;
  onRename?: () => void;
  onShare?: () => void;
}

export const ParcelCardIndustrial: React.FC<ParcelCardIndustrialProps> = ({
  parcel,
  onPress,
  onRename,
  onShare,
}) => {
  const { theme } = useTheme();
  const latestEvent = parcel.events[parcel.events.length - 1];

  const handleCardPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress();
  };

  const handleRenamePress = async (e: any) => {
    e.stopPropagation();
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onRename?.();
  };

  const handleSharePress = async (e: any) => {
    e.stopPropagation();
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onShare?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Albarán ${parcel.customAlias || parcel.trackingNumber}, transportista ${parcel.carrier.name}`}
      onPress={handleCardPress}
      style={({ pressed }) => [
        styles.labelContainer,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.labelPressed,
      ]}
    >
      {/* Top Hazard / Shipping Stripe */}
      <View style={[styles.hazardStripe, { backgroundColor: theme.yellow, borderBottomColor: theme.border }]}>
        <Text style={styles.hazardText}>{'/// AIR & GROUND LOGISTICS MATRIX ///'}</Text>
        <Text style={styles.destinationStamp}>
          DEST: {parcel.destination?.code || 'ES'}
        </Text>
      </View>

      <View style={styles.labelInner}>
        {/* Stamp & Carrier Row */}
        <View style={styles.stampRow}>
          <View style={[styles.carrierStampBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <Tag size={12} color={theme.textPrimary} />
            <Text style={[styles.carrierStampText, { color: theme.textPrimary }]}>{parcel.carrier.name.toUpperCase()}</Text>
          </View>

          <StatusBadge status={parcel.status} size="small" />
        </View>

        {/* Big Bold Alias */}
        <View style={styles.aliasRow}>
          <Text style={[styles.alias, { color: theme.textPrimary }]} numberOfLines={1}>
            {parcel.customAlias || parcel.trackingNumber}
          </Text>
          <View style={styles.actionButtonsRow}>
            {onShare && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Compartir datos del envío"
                onPress={handleSharePress}
                style={[styles.renameBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
                hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
              >
                <Share2 size={13} color={theme.textPrimary} strokeWidth={2.5} />
              </Pressable>
            )}
            {onRename && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Renombrar alias del envío"
                onPress={handleRenamePress}
                style={[styles.renameBtn, { backgroundColor: theme.yellow, borderColor: theme.border }]}
                hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
              >
                <Edit2 size={13} color="#000000" strokeWidth={2.5} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Industrial Waybill Barcode Block */}
        <View style={[styles.waybillBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
          <View style={styles.waybillCol}>
            <Text style={[styles.waybillLabel, { color: theme.textTertiary }]}>WAYBILL / TRACKING ID</Text>
            <Text style={[styles.waybillCode, { color: theme.textPrimary }]}>{parcel.trackingNumber}</Text>
          </View>
          <View style={[styles.daysCircle, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
            <Text style={styles.daysNumber}>{parcel.daysInTransit}</Text>
            <Text style={styles.daysUnit}>DÍAS</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <ProgressBar progress={parcel.progress} status={parcel.status} height={10} />
        </View>

        {/* Footer Milestone */}
        <View style={[styles.footerRow, { borderTopColor: theme.surfaceSubtle }]}>
          <Text style={[styles.statusMilestoneText, { color: theme.textSecondary }]} numberOfLines={1}>
            LOG: {latestEvent ? latestEvent.description : parcel.statusText}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  labelContainer: {
    borderRadius: Theme.radius.sm,
    marginBottom: 16,
    borderWidth: 2.5,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: 2,
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
    paddingHorizontal: 5,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
  },
  carrierStampText: {
    fontSize: 10,
    fontWeight: '900',
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
    letterSpacing: -0.3,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  renameBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    marginLeft: 8,
  },
  waybillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    padding: 8,
    marginBottom: 8,
  },
  waybillCol: {
    flex: 1,
  },
  waybillLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  waybillCode: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '900',
    marginTop: 2,
  },
  daysCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
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
  },
  statusMilestoneText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
