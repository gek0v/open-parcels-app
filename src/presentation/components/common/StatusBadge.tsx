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
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 12,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: isSmall ? 10 : 11,
          },
        ]}
      >
        {meta.labelEs.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    alignSelf: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  text: {
    color: '#000000',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
