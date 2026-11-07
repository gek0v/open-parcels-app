import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { CanonicalStatus } from '../../../domain/models/status';

interface ProgressBarProps {
  progress: number; // 0 to 100
  status?: CanonicalStatus;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status = 'in_transit',
  height = 12,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));
  const activeColor = Theme.colors.status[status] || Theme.colors.primary;

  return (
    <View style={[styles.container, { height }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: activeColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '1.5px 1.5px 0px #000000' } as any) : {}),
  },
  fill: {
    height: '100%',
    borderRightWidth: 2,
    borderRightColor: '#000000',
  },
});
