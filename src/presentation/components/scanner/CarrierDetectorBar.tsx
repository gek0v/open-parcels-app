import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { DetectedCarrier } from '../../../domain/models/carrier';
import { Theme } from '../../theme/adaptiveTheme';
import { Sparkles, Check } from 'lucide-react-native';

interface CarrierDetectorBarProps {
  candidates: DetectedCarrier[];
  selectedCarrierSlug?: string;
  onSelectCarrier: (slug: string) => void;
}

export const CarrierDetectorBar: React.FC<CarrierDetectorBarProps> = ({
  candidates,
  selectedCarrierSlug,
  onSelectCarrier,
}) => {
  if (candidates.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Sparkles size={14} color={Theme.colors.primary} style={styles.sparkleIcon} />
        <Text style={styles.headerLabel}>Transportistas detectados automáticamente:</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {candidates.map((item) => {
          const isSelected = selectedCarrierSlug === item.carrier.slug;
          const confidencePercent = Math.round(item.confidence * 100);

          return (
            <Pressable
              key={item.carrier.slug}
              onPress={() => onSelectCarrier(item.carrier.slug)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
            >
              <View
                style={[
                  styles.carrierDot,
                  { backgroundColor: item.carrier.color || Theme.colors.primary },
                ]}
              />
              <Text
                style={[
                  styles.carrierName,
                  isSelected && styles.carrierNameSelected,
                ]}
              >
                {item.carrier.name}
              </Text>
              <View
                style={[
                  styles.confidenceBadge,
                  isSelected && styles.confidenceBadgeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.confidenceText,
                    isSelected && styles.confidenceTextSelected,
                  ]}
                >
                  {confidencePercent}%
                </Text>
              </View>
              {isSelected && (
                <Check size={14} color={Theme.colors.primary} style={styles.checkIcon} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sparkleIcon: {
    marginRight: 6,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollList: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Theme.colors.primaryLight,
    borderColor: Theme.colors.primary,
  },
  carrierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  carrierName: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.textPrimary,
  },
  carrierNameSelected: {
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  confidenceBadge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.surfaceSubtle,
  },
  confidenceBadgeSelected: {
    backgroundColor: '#DBEAFE',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  confidenceTextSelected: {
    color: Theme.colors.primary,
  },
  checkIcon: {
    marginLeft: 4,
  },
});
