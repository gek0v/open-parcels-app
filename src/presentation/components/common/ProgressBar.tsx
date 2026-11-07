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
  height = 6,
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
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Theme.radius.full,
  },
});
