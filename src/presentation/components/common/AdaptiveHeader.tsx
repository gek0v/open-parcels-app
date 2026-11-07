import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { LucideIcon } from 'lucide-react-native';

interface AdaptiveHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    icon: LucideIcon;
    label?: string;
    onPress: () => void;
  };
  backAction?: {
    icon?: LucideIcon;
    onPress: () => void;
  };
}

export const AdaptiveHeader: React.FC<AdaptiveHeaderProps> = ({
  title,
  subtitle,
  rightAction,
  backAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {backAction && (
          <Pressable
            onPress={backAction.onPress}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {backAction.icon ? (
              <backAction.icon size={22} color={Theme.colors.textPrimary} />
            ) : (
              <Text style={styles.backText}>{Theme.isIOS ? '‹ Volver' : 'Atrás'}</Text>
            )}
          </Pressable>
        )}

        <View style={styles.titleContainer}>
          <Text style={[styles.title, Theme.typography.titleLarge]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, Theme.typography.bodySmall]}>{subtitle}</Text>
          )}
        </View>

        {rightAction && (
          <Pressable
            onPress={rightAction.onPress}
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <rightAction.icon size={22} color={Theme.colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Theme.colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backText: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: Theme.colors.textPrimary,
  },
  subtitle: {
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  actionButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.primaryLight,
  },
});
