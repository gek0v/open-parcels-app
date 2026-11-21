import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { DetectedCarrier } from '../../../domain/models/carrier';
import { CARRIERS_CATALOG } from '../../../domain/validators/detection';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { Sparkles, Check, Layers, ChevronRight, Truck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CarrierDetectorBarProps {
  candidates: DetectedCarrier[];
  selectedCarrierSlug?: string;
  onSelectCarrier: (slug: string) => void;
  onOpenCatalog?: () => void;
}

export const CarrierDetectorBar: React.FC<CarrierDetectorBarProps> = ({
  candidates,
  selectedCarrierSlug,
  onSelectCarrier,
  onOpenCatalog,
}) => {
  const { theme } = useTheme();

  if (candidates.length === 0) {
    if (!onOpenCatalog) return null;

    return (
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir catálogo completo de transportistas"
          onPress={async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            onOpenCatalog();
          }}
          style={({ pressed }) => [
            styles.emptyCatalogPrompt,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.promptLeft}>
            <Truck size={16} color={theme.textPrimary} strokeWidth={2.5} style={{ marginRight: 8 }} />
            <Text style={[styles.promptText, { color: theme.textPrimary }]}>
              ELEGIR TRANSPORTISTA DEL CATÁLOGO
            </Text>
          </View>
          <View style={styles.promptRight}>
            <Text style={[styles.promptCount, { color: theme.textSecondary }]}>{CARRIERS_CATALOG.length} disp.</Text>
            <ChevronRight size={16} color={theme.textPrimary} strokeWidth={2.5} />
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <Sparkles size={14} color={theme.yellow} strokeWidth={3} style={styles.sparkleIcon} />
          <Text style={[styles.headerLabel, { color: theme.textPrimary }]}>
            OPCIONES RECOMENDADAS:
          </Text>
        </View>

        {onOpenCatalog && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver catálogo completo de transportistas"
            onPress={async () => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              onOpenCatalog();
            }}
            style={({ pressed }) => [
              styles.openCatalogHeaderBtn,
              { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Layers size={12} color={theme.textPrimary} strokeWidth={2.5} style={{ marginRight: 4 }} />
            <Text style={[styles.openCatalogHeaderText, { color: theme.textPrimary }]}>
              CATÁLOGO
            </Text>
          </Pressable>
        )}
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

        {onOpenCatalog && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver más transportistas del catálogo"
            onPress={async () => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              onOpenCatalog();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={({ pressed }) => [
              styles.catalogChip,
              { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <Layers size={14} color={theme.textPrimary} strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={[styles.catalogChipText, { color: theme.textPrimary }]}>
              + CATÁLOGO ({CARRIERS_CATALOG.length})
            </Text>
          </Pressable>
        )}
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
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleIcon: {
    marginRight: 6,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  openCatalogHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
  },
  openCatalogHeaderText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
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
    minHeight: 44,
    minWidth: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
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
  catalogChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    marginRight: 4,
    ...Theme.shadows.sm,
  },
  catalogChipText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  emptyCatalogPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  promptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  promptRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  promptCount: {
    fontSize: 10,
    fontWeight: '700',
  },
});
