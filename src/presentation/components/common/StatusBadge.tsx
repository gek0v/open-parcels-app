import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { CanonicalStatus, CANONICAL_STATUS_MAP } from '../../../domain/models/status';
import { Theme } from '../../theme/adaptiveTheme';
import { useI18n } from '../../../infrastructure/i18n';

interface StatusBadgeProps {
  status: CanonicalStatus;
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
}

/**
 * Compact delivery-sticker wording. Full canonical labels are too long for a
 * sticky badge and wrap/squeeze the carrier row on small phones.
 */
const SHORT_LABELS: Record<CanonicalStatus, string> = {
  pending: 'PENDIENTE',
  info_received: 'PRE-REGISTRO',
  in_transit: 'EN TRÁNSITO',
  out_for_delivery: 'EN REPARTO',
  delivered: 'ENTREGADO',
  failed_attempt: 'FALLIDO',
  exception: 'EXCEPCIÓN',
  expired: 'CADUCADO',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'medium',
  style,
}) => {
  const { t } = useI18n();
  const meta = CANONICAL_STATUS_MAP[status] || CANONICAL_STATUS_MAP.pending;
  const color = Theme.colors.status[status] || Theme.colors.status.pending;
  const isSmall = size === 'small';
  const label = t?.status?.[status] ? t.status[status].toUpperCase() : (SHORT_LABELS[status] ?? meta.labelEs);

  return (
    <View
      accessibilityLabel={`Estado: ${meta.labelEs}`}
      style={[
        styles.badge,
        {
          backgroundColor: color,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 12,
        },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          {
            fontSize: isSmall ? 10 : 11,
            letterSpacing: isSmall ? 0.6 : 0.5,
          },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    alignSelf: 'flex-start',
    ...Theme.shadows.sm,
  },
  text: {
    color: '#000000',
    fontWeight: '900',
    flexShrink: 1,
  },
});
