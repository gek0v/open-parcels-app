import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CanonicalStatus, CANONICAL_STATUS_MAP } from '../../../domain/models/status';
import { Theme } from '../../theme/adaptiveTheme';

interface StatusBadgeProps {
  status: CanonicalStatus;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'medium' }) => {
  const meta = CANONICAL_STATUS_MAP[status] || CANONICAL_STATUS_MAP.pending;
  const color = Theme.colors.status[status] || Theme.colors.status.pending;
  const bgColor = Theme.colors.statusLight[status] || Theme.colors.statusLight.pending;

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          borderColor: color + '40',
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 10,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.text,
          {
            color: color,
            fontSize: isSmall ? 11 : 12,
            fontWeight: '600',
          },
        ]}
      >
        {meta.labelEs}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    letterSpacing: 0.2,
  },
});
