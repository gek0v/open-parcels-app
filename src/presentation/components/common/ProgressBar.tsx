import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { CanonicalStatus } from '../../../domain/models/status';

interface ProgressBarProps {
  progress: number; // 0 to 100
  status?: CanonicalStatus;
  height?: number;
}

/** Block milestones that reinforce the "logistics progress" metaphor. */
const MILESTONES = [25, 50, 75];

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status = 'in_transit',
  height = 12,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));
  const activeColor = Theme.colors.status[status] || Theme.colors.primary;

  return (
    <View style={[styles.shadowWrap, { height }]}>
      <View style={styles.container}>
        {clamped > 0 && (
          <View
            style={[
              styles.fill,
              {
                width: `${clamped}%`,
                backgroundColor: activeColor,
                borderRightWidth: clamped < 100 ? 2 : 0,
              },
            ]}
          />
        )}

        {MILESTONES.map((milestone) => (
          <View
            key={milestone}
            pointerEvents="none"
            style={[styles.milestone, { left: `${milestone}%` }]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    width: '100%',
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFFFFF',
    ...Theme.shadows.sm,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRightColor: '#000000',
  },
  milestone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#000000',
    opacity: 0.18,
  },
});
