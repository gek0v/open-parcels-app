import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../../infrastructure/i18n';
import { Clipboard, Plus, X, Tag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export interface ClipboardDetectedBannerProps {
  trackingNumber: string;
  carrierName?: string;
  carrierSlug?: string;
  confidence?: number;
  onAdd: () => void;
  onDismiss: () => void;
}

export const ClipboardDetectedBanner: React.FC<ClipboardDetectedBannerProps> = ({
  trackingNumber,
  carrierName,
  confidence,
  onAdd,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [slideAnim] = useState(() => new Animated.Value(80));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        bounciness: 6,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const handleDismiss = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 80,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleAdd = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onAdd();
  };

  const confidencePct = confidence ? Math.round(confidence * 100) : null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.bannerWrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        {/* Top Header Tag */}
        <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.clipboardBadge, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
              <Clipboard size={13} color="#000000" strokeWidth={2.5} />
            </View>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {t.clipboardBanner.title}
            </Text>
          </View>

          {carrierName && (
            <View style={[styles.carrierPill, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
              <Tag size={10} color={theme.textPrimary} strokeWidth={2.5} />
              <Text style={[styles.carrierPillText, { color: theme.textPrimary }]} numberOfLines={1}>
                {carrierName.toUpperCase()}{confidencePct ? ` • ${confidencePct}%` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Content & Actions */}
        <View style={styles.bodyRow}>
          <View style={styles.codeColumn}>
            <Text style={[styles.codeMono, { color: theme.textPrimary }]} numberOfLines={1}>
              {trackingNumber}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            {/* Dismiss Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.clipboardBanner.dismissAria}
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.dismissBtn,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color={theme.textPrimary} strokeWidth={2.5} />
              <Text style={[styles.dismissBtnText, { color: theme.textPrimary }]}>
                {t.clipboardBanner.dismissBtn}
              </Text>
            </Pressable>

            {/* Add Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.clipboardBanner.addAria}
              onPress={handleAdd}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: theme.coral, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Plus size={16} color="#000000" strokeWidth={3} />
              <Text style={styles.addBtnText}>{t.clipboardBanner.addBtn}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 96 : 90,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 580,
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 3.5, height: 3.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    ...(Theme.isWeb ? ({ boxShadow: '3.5px 3.5px 0px #000000' } as any) : {}),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  clipboardBadge: {
    width: 22,
    height: 22,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  carrierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.2,
    maxWidth: 190,
  },
  carrierPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  codeColumn: {
    flex: 1,
    minWidth: 0,
  },
  codeMono: {
    fontSize: 14,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
  },
  dismissBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  pressed: {
    ...Theme.pressed,
  },
});
