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
        <Sparkles size={14} color="#000000" strokeWidth={2.5} style={styles.sparkleIcon} />
        <Text style={styles.headerLabel}>TRANSPORTISTAS DETECTADOS:</Text>
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
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.carrier.name}, ${confidencePercent}% de coincidencia`}
              onPress={() => onSelectCarrier(item.carrier.slug)}
              style={({ pressed }) => [
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.carrierName,
                  isSelected && styles.carrierNameSelected,
                ]}
                numberOfLines={1}
              >
                {item.carrier.name.toUpperCase()}
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
                <Check size={14} color="#000000" strokeWidth={3} style={styles.checkIcon} />
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
    marginTop: 2,
    marginBottom: 14,
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
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.6,
  },
  scrollList: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: 9,
    ...Theme.shadows.sm,
  },
  chipUnselected: {
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: Theme.colors.yellow,
    borderWidth: 2.5,
  },
  pressed: {
    ...Theme.pressed,
  },
  carrierName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.2,
  },
  carrierNameSelected: {
    color: '#000000',
  },
  confidenceBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#000000',
  },
  confidenceBadgeSelected: {
    backgroundColor: '#000000',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  confidenceTextSelected: {
    color: Theme.colors.yellow,
  },
  checkIcon: {
    marginLeft: 4,
  },
});
