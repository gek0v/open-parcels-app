import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { useI18n } from '../../../infrastructure/i18n';
import { Truck, CheckCircle2, Camera } from 'lucide-react-native';

interface BentoStatsWidgetProps {
  activeCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  onScanPress: () => void;
}

export const BentoStatsWidget: React.FC<BentoStatsWidgetProps> = ({
  activeCount,
  outForDeliveryCount,
  deliveredCount,
  onScanPress,
}) => {
  const { t } = useI18n();

  return (
    <View style={styles.bentoGrid}>
      {/* Tile 1: Active & In Delivery summary */}
      <View style={styles.activeTile}>
        <View style={styles.tileHeader}>
          <Text style={styles.tileLabel}>{t.stats.active}</Text>
          <Truck size={16} color="#000000" strokeWidth={2.5} />
        </View>
        <Text style={styles.hugeNumber}>{activeCount}</Text>
        <View style={styles.subPill}>
          <Text style={styles.subPillText}>
            {outForDeliveryCount > 0 ? `⚡ ${outForDeliveryCount} ${t.status.out_for_delivery.toUpperCase()}` : (activeCount > 0 ? t.stats.activeSub : t.stats.noneActive)}
          </Text>
        </View>
      </View>

      {/* Right Column: Delivered & Scan Quick Action */}
      <View style={styles.rightCol}>
        {/* Tile 2: Delivered */}
        <View style={styles.deliveredTile}>
          <View style={styles.tileHeaderSmall}>
            <Text style={styles.tileLabelSmall}>{t.stats.delivered}</Text>
            <CheckCircle2 size={13} color="#059669" strokeWidth={2.5} />
          </View>
          <Text style={styles.mediumNumber}>{deliveredCount}</Text>
        </View>

        {/* Tile 3: Quick Scan Button */}
        <Pressable
          onPress={onScanPress}
          style={({ pressed }) => [styles.scanTile, pressed && styles.scanPressed]}
        >
          <Camera size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.scanTileText}>{t.stats.scanBtn}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bentoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  activeTile: {
    flex: 1.3,
    backgroundColor: '#FFE600', // Cyber Yellow
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
    backgroundColor: '#FF5C38', // Neon Tangerine
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
});
