import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';

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
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'active', label: 'En camino', count: counts.active },
    { key: 'delivered', label: 'Entregados', count: counts.delivered },
    { key: 'archived', label: 'Archivados', count: counts.archived },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={[
              styles.tab,
              isActive && styles.activeTab,
            ]}
          >
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={[
                  styles.countBadge,
                  isActive && styles.activeCountBadge,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isActive && styles.activeCountText,
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
    backgroundColor: Theme.isIOS ? '#E2E8F0' : '#E2E8F0',
    borderRadius: Theme.radius.lg,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Theme.radius.md,
  },
  activeTab: {
    backgroundColor: Theme.colors.surface,
    ...(Theme.isIOS
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        }
      : {
          elevation: 2,
        }),
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
  },
  activeTabLabel: {
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.border,
  },
  activeCountBadge: {
    backgroundColor: Theme.colors.primaryLight,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  activeCountText: {
    color: Theme.colors.primary,
  },
});
