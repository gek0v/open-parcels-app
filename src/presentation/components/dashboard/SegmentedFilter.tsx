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
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
              isActive && [styles.activeTab, { backgroundColor: tab.color }],
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.tabLabel, isActive && styles.activeTabLabel]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{tab.count}</Text>
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
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  activeTab: {
    borderWidth: 2.5,
  },
  pressed: {
    ...Theme.pressed,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
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
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
