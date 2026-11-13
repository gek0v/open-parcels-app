import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { DetectedCarrier } from '../../../domain/models/carrier';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { Sparkles, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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
  const { theme } = useTheme();
  if (candidates.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Sparkles size={14} color={theme.textPrimary} strokeWidth={2.5} style={styles.sparkleIcon} />
        <Text style={[styles.headerLabel, { color: theme.textPrimary }]}>
          TRANSPORTISTAS DETECTADOS:
        </Text>
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
              onPress={async () => {
                try {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                onSelectCarrier(item.carrier.slug);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.yellow : theme.surface,
                  borderColor: theme.border,
                },
                isSelected && styles.chipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.carrierName,
                  { color: isSelected ? '#000000' : theme.textPrimary },
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
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: 10,
    ...Theme.shadows.sm,
  },
  chipSelected: {
    borderWidth: 2.5,
  },
  pressed: {
    ...Theme.pressed,
  },
  carrierName: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.2,
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
    marginLeft: 5,
  },
});
