import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Platform } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';

interface AdaptiveCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  elevated?: boolean;
}

export const AdaptiveCard: React.FC<AdaptiveCardProps> = ({
  children,
  onPress,
  style,
  elevated = false,
}) => {
  const cardStyle = [
    styles.card,
    elevated ? Theme.shadows.elevated : Theme.shadows.card,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && Platform.OS === 'ios' && styles.iosPressed,
        ]}
        android_ripple={{ color: '#E2E8F0', borderless: false }}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: 16,
    borderWidth: Theme.isIOS ? 1 : 0.5,
    borderColor: Theme.colors.border,
    marginBottom: 12,
  },
  iosPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
