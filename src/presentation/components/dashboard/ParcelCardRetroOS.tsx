import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { ArrowUpRight, Clock, Edit2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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
  const { theme } = useTheme();
  const latestEvent = parcel.events[parcel.events.length - 1];

  // Dynamic window title bar color based on status
  const getHeaderColor = () => {
    return theme.status[parcel.status] || theme.primary;
  };

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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ventana Retro ${parcel.customAlias || parcel.trackingNumber}, transportista ${parcel.carrier.name}`}
      onPress={handleCardPress}
      style={({ pressed }) => [
        styles.windowCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.cardPressed,
      ]}
    >
      {/* OS Window Colored Title Bar */}
      <View style={[styles.windowTitleBar, { backgroundColor: getHeaderColor(), borderBottomColor: theme.border }]}>
        <View style={styles.windowControls}>
          <View style={[styles.dot, { backgroundColor: theme.coral, borderColor: theme.border }]} />
          <View style={[styles.dot, { backgroundColor: theme.yellow, borderColor: theme.border }]} />
          <View style={[styles.dot, { backgroundColor: theme.mint, borderColor: theme.border }]} />
        </View>
        <Text style={styles.windowTitleText} numberOfLines={1}>
          {parcel.carrier.name.toUpperCase()}{' // TRACK'}
        </Text>
        <StatusBadge status={parcel.status} size="small" />
      </View>

      {/* Card Body */}
      <View style={[styles.cardBody, { backgroundColor: theme.surface }]}>
        <View style={styles.contentRow}>
          <View style={styles.infoCol}>
            <View style={styles.aliasRow}>
              <Text style={[styles.alias, { color: theme.textPrimary }]} numberOfLines={1}>
                {parcel.customAlias || parcel.trackingNumber}
              </Text>
              {onRename && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Renombrar alias del envío"
                  onPress={handleRenamePress}
                  style={[styles.renameIconBtn, { backgroundColor: theme.yellow, borderColor: theme.border }]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Edit2 size={13} color="#000000" strokeWidth={2.5} />
                </Pressable>
              )}
            </View>

            <View style={[styles.trackingPill, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
              <Text style={[styles.trackingMono, { color: theme.textSecondary }]}>{parcel.trackingNumber}</Text>
            </View>
          </View>

          {/* Action Arrow Icon Button */}
          <View style={[styles.actionArrowBox, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
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
        <View style={[styles.footerRow, { borderTopColor: theme.surfaceSubtle }]}>
          <Text style={[styles.latestLogText, { color: theme.textSecondary }]} numberOfLines={1}>
            ► {latestEvent ? latestEvent.description : parcel.statusText}
          </Text>
          <View style={[styles.transitBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <Clock size={10} color={theme.textPrimary} />
            <Text style={[styles.transitDaysText, { color: theme.textPrimary }]}>{parcel.daysInTransit}D</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  windowCard: {
    borderRadius: Theme.radius.md,
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
  cardPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  windowTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 2,
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
    letterSpacing: -0.3,
  },
  renameIconBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    marginLeft: 8,
  },
  trackingPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    marginTop: 4,
  },
  trackingMono: {
    fontSize: 11,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
  },
  actionArrowBox: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
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
  },
  latestLogText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8,
  },
  transitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
  },
  transitDaysText: {
    fontSize: 10,
    fontWeight: '900',
  },
});
