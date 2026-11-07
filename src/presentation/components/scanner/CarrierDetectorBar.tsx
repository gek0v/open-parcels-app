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
        <Sparkles size={14} color="#000000" style={styles.sparkleIcon} />
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
              onPress={() => onSelectCarrier(item.carrier.slug)}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
              ]}
            >
              <Text
                style={[
                  styles.carrierName,
                  isSelected && styles.carrierNameSelected,
                ]}
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
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  scrollList: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  chipUnselected: {
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#FFE600', // Cyber Yellow
    shadowOffset: { width: 3, height: 3 },
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  carrierName: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
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
    color: '#FFE600',
  },
  checkIcon: {
    marginLeft: 4,
  },
});
