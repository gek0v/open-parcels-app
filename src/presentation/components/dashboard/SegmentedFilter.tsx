import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../../infrastructure/i18n';

export type FilterTab = 'active' | 'delivered' | 'archived';

interface SegmentedFilterProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts: {
    active: number;
    delivered: number;
    archived: number;
  };
}

export const SegmentedFilter: React.FC<SegmentedFilterProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  const { t } = useI18n();
  const { theme } = useTheme();

  const tabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'active', label: t.filter.active, count: counts.active, color: theme.yellow },
    { key: 'delivered', label: t.filter.delivered, count: counts.delivered, color: theme.status.delivered },
    { key: 'archived', label: t.filter.archived, count: counts.archived, color: theme.pink },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceSubtle,
          borderColor: theme.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label}, ${tab.count} envíos`}
            onPress={() => onTabChange(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              isActive
                ? [
                    styles.activeTab,
                    {
                      backgroundColor: tab.color,
                      borderColor: theme.border,
                    },
                  ]
                : styles.inactiveTab,
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                { color: isActive ? '#000000' : theme.textPrimary },
                isActive && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isActive ? '#000000' : theme.surfaceDark,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: isActive ? '#FFFFFF' : theme.textInverse },
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 4,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Theme.radius.xs,
  },
  activeTab: {
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  inactiveTab: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  activeTabLabel: {
    fontWeight: '900',
  },
  countBadge: {
    minWidth: 18,
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Theme.radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '900',
  },
});
