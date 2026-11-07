import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';

interface AdaptiveCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
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
  const cardStyle = [
    styles.card,
    elevated ? Theme.shadows.elevated : Theme.shadows.card,
    { backgroundColor },
    style,
  ];

  const content = (
    <>
      {hasWindowHeader && (
        <View style={styles.windowHeader}>
          <View style={styles.dotsRow}>
            <View style={[styles.dot, { backgroundColor: '#FF5C38' }]} />
            <View style={[styles.dot, { backgroundColor: '#FFE600' }]} />
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
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
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
        ]}
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
    borderWidth: 2.5,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  windowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 10,
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
    width: 32,
    height: 4,
    backgroundColor: '#000000',
    borderRadius: 2,
  },
});
