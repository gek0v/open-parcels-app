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
  const tabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'active', label: 'En camino', count: counts.active, color: '#FFE600' },
    { key: 'delivered', label: 'Entregados', count: counts.delivered, color: '#34D399' },
    { key: 'archived', label: 'Archivados', count: counts.archived, color: '#F472B6' },
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
              isActive && [styles.activeTab, { backgroundColor: tab.color }],
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
                <Text style={styles.countText}>
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
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  activeTab: {
    shadowOffset: { width: 3, height: 3 },
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  activeTabLabel: {
    fontWeight: '900',
    color: '#000000',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#000000',
  },
  activeCountBadge: {
    backgroundColor: '#000000',
  },
  countText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
