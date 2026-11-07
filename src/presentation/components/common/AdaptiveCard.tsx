import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, StyleProp } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';

interface AdaptiveCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  backgroundColor?: string;
  hasWindowHeader?: boolean;
}

export const AdaptiveCard: React.FC<AdaptiveCardProps> = ({
  children,
  onPress,
  style,
  elevated = false,
  backgroundColor = Theme.colors.surface,
  hasWindowHeader = false,
}) => {
  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    elevated ? Theme.shadows.lg : Theme.shadows.md,
    { backgroundColor },
    style,
  ];

  const content = (
    <>
      {hasWindowHeader && (
        <View style={styles.windowHeader}>
          <View style={styles.dotsRow}>
            <View style={[styles.dot, { backgroundColor: Theme.colors.coral }]} />
            <View style={[styles.dot, { backgroundColor: Theme.colors.yellow }]} />
            <View style={[styles.dot, { backgroundColor: Theme.colors.mint }]} />
          </View>
          <View style={styles.windowGrip} />
        </View>
      )}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.radius.md,
    padding: 16,
    marginBottom: 14,
    borderWidth: Theme.borders.width,
    borderColor: Theme.borders.color,
    backgroundColor: Theme.colors.surface,
  },
  pressed: {
    ...Theme.pressed,
  },
  windowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  windowGrip: {
    width: 34,
    height: 4,
    backgroundColor: '#000000',
    borderRadius: 2,
  },
});
