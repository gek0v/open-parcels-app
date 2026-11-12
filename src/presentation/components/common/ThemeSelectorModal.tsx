import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme, ThemeKey } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { X, Sparkles, Check, CheckCircle2, Package, ShieldCheck, Palette, CheckCheck } from 'lucide-react-native';

interface ThemeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme: currentTheme, themeKey: activeThemeKey, setTheme, themes } = useTheme();
  const themeKeys = Object.keys(themes) as ThemeKey[];
  const [userSelectedKey, setUserSelectedKey] = useState<ThemeKey | null>(null);

  const inspectKey: ThemeKey = userSelectedKey ?? activeThemeKey;
  const inspectPalette: ColorPalette = themes[inspectKey] || currentTheme;
  const isActive = inspectKey === activeThemeKey;

  const handleApplyTheme = async (key: ThemeKey) => {
    await setTheme(key);
    setUserSelectedKey(key);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.dotRow}>
                <View style={[styles.dot, { backgroundColor: currentTheme.coral }]} />
                <View style={[styles.dot, { backgroundColor: currentTheme.yellow }]} />
                <View style={[styles.dot, { backgroundColor: currentTheme.mint }]} />
              </View>
              <View style={styles.titleRow}>
                <Palette size={16} color="#000000" strokeWidth={2.5} style={{ marginRight: 6 }} />
                <Text style={styles.headerTitle}>TEMAS Y APARIENCIA</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal"
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color="#000000" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Golden Ratio & WCAG Subtitle Banner */}
          <View style={[styles.formulaBanner, { backgroundColor: currentTheme.yellow }]}>
            <Text style={styles.formulaText}>
              📐 <Text style={{ fontWeight: '900' }}>Golden Ratio (φ ≈ 1.618)</Text> • Cambia el aspecto completo de la app en tiempo real
            </Text>
          </View>

          {/* Theme Selector Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContent}
          >
            {themeKeys.map((key) => {
              const pal = themes[key];
              const isInspected = inspectKey === key;
              const isKeyActive = activeThemeKey === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setUserSelectedKey(key)}
                  style={({ pressed }) => [
                    styles.tabButton,
                    isInspected && styles.tabButtonInspected,
                    isKeyActive && styles.tabButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.tabColorIndicator, { backgroundColor: pal.canvas, borderColor: pal.border }]} />
                  <Text style={[styles.tabButtonText, (isInspected || isKeyActive) && styles.tabButtonTextActive]}>
                    {pal.name.split(' (')[0].toUpperCase()}
                  </Text>
                  {isKeyActive && (
                    <View style={styles.activeDotBadge}>
                      <Check size={10} color="#000000" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Main Content Area */}
          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Theme Meta & Apply Bar */}
            <View style={styles.paletteMetaCard}>
              <View style={styles.paletteMetaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paletteName}>{inspectPalette.name}</Text>
                  <Text style={styles.paletteDesc}>{inspectPalette.description}</Text>
                </View>

                <View style={styles.angleBadge}>
                  <Text style={styles.angleBadgeText}>H₀ = {inspectPalette.goldenAngleOriginDeg}°</Text>
                </View>
              </View>

              {/* Action Button: Apply or Active Status */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isActive ? 'Tema activo actualmente' : `Aplicar tema ${inspectPalette.name}`}
                onPress={() => handleApplyTheme(inspectKey)}
                disabled={isActive}
                style={({ pressed }) => [
                  styles.applyThemeBtn,
                  isActive
                    ? [styles.applyThemeBtnActive, { backgroundColor: inspectPalette.yellow }]
                    : [styles.applyThemeBtnInactive, { backgroundColor: inspectPalette.primary }],
                  pressed && !isActive && styles.pressed,
                ]}
              >
                {isActive ? (
                  <>
                    <CheckCheck size={16} color="#000000" strokeWidth={3} style={{ marginRight: 6 }} />
                    <Text style={styles.applyThemeBtnActiveText}>TEMA APLICADO ACTUALMENTE</Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                    <Text style={styles.applyThemeBtnInactiveText}>APLICAR ESTE TEMA A LA APP</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* LIVE PREVIEW SIMULATOR */}
            <Text style={styles.sectionHeader}>VISTA PREVIA EN VIVO (SIMULADOR DE UI)</Text>
            <View
              style={[
                styles.liveCanvas,
                { backgroundColor: inspectPalette.canvas, borderColor: inspectPalette.border },
              ]}
            >
              {/* Simulated Parcel Card */}
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: inspectPalette.surface,
                    borderColor: inspectPalette.border,
                  },
                ]}
              >
                <View style={styles.previewTopRow}>
                  <View style={styles.previewCarrierRow}>
                    <View style={[styles.previewCarrierBadge, { backgroundColor: inspectPalette.border }]}>
                      <Text style={[styles.previewCarrierText, { color: inspectPalette.textInverse }]}>
                        CORREOS
                      </Text>
                    </View>
                    <Text style={[styles.previewTracking, { color: inspectPalette.textTertiary }]}>
                      ES2026118942
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.previewStatusBadge,
                      {
                        backgroundColor: inspectPalette.status.delivered,
                        borderColor: inspectPalette.border,
                      },
                    ]}
                  >
                    <CheckCircle2 size={12} color="#000000" strokeWidth={2.5} style={{ marginRight: 4 }} />
                    <Text style={styles.previewStatusText}>ENTREGADO</Text>
                  </View>
                </View>

                <Text style={[styles.previewTitle, { color: inspectPalette.textPrimary }]}>
                  Teclado Mecánico Custom
                </Text>
                <Text style={[styles.previewCheckpoint, { color: inspectPalette.textSecondary }]}>
                  Entregado en buzón principal • Madrid
                </Text>

                <View style={styles.previewActionRow}>
                  <View
                    style={[
                      styles.previewActionButton,
                      {
                        backgroundColor: inspectPalette.primary,
                        borderColor: inspectPalette.border,
                      },
                    ]}
                  >
                    <Package size={14} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                    <Text style={styles.previewActionText}>DETALLES</Text>
                  </View>

                  <View
                    style={[
                      styles.previewSecondaryBadge,
                      {
                        backgroundColor: inspectPalette.coral,
                        borderColor: inspectPalette.border,
                      },
                    ]}
                  >
                    <Text style={styles.previewSecondaryBadgeText}>URGENTE</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* COLOR SWATCHES & HSV METRICS */}
            <Text style={styles.sectionHeader}>MUESTRAS CROMÁTICAS Y COORDENADAS HSV</Text>
            <View style={styles.swatchesList}>
              {[
                { label: 'Lienzo / Canvas', hex: inspectPalette.canvas, hsv: `H: ${inspectPalette.goldenAngleOriginDeg}°`, role: 'Fondo 61.8%', wcag: 'AAA' },
                { label: 'Superficie / Card', hex: inspectPalette.surface, hsv: 'Luminancia alta', role: 'Estructura 38.2%', wcag: 'AAA' },
                { label: 'Acción Principal', hex: inspectPalette.primary, hsv: '+137.5° Áureo', role: 'Interacción 14.6%', wcag: 'AA' },
                { label: 'Entregado (Mint)', hex: inspectPalette.status.delivered, hsv: 'Estado éxito', role: 'Sticker', wcag: 'AAA' },
                { label: 'En Tránsito (Cyan)', hex: inspectPalette.status.in_transit, hsv: 'Estado activo', role: 'Sticker', wcag: 'AAA' },
                { label: 'En Reparto (Amber)', hex: inspectPalette.status.out_for_delivery, hsv: 'Alerta media', role: 'Sticker', wcag: 'AAA' },
                { label: 'Atención (Coral)', hex: inspectPalette.coral, hsv: 'Alerta alta', role: 'Sticker / Botón', wcag: 'AA' },
              ].map((swatch, idx) => (
                <View key={idx} style={styles.swatchRow}>
                  <View
                    style={[
                      styles.swatchBox,
                      { backgroundColor: swatch.hex, borderColor: inspectPalette.border },
                    ]}
                  />
                  <View style={styles.swatchInfo}>
                    <Text style={styles.swatchLabel}>{swatch.label}</Text>
                    <Text style={styles.swatchValues}>
                      <Text style={{ fontWeight: '900', color: '#000000' }}>{swatch.hex}</Text> • {swatch.hsv}
                    </Text>
                  </View>
                  <View style={styles.swatchRoleBadge}>
                    <ShieldCheck size={11} color="#000000" strokeWidth={2.5} style={{ marginRight: 3 }} />
                    <Text style={styles.swatchRoleText}>{swatch.wcag}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal de temas"
              onPress={onClose}
              style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
            >
              <Check size={16} color="#000000" strokeWidth={3} style={{ marginRight: 6 }} />
              <Text style={styles.doneBtnText}>LISTO</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dismissOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    borderWidth: 2.5,
    borderColor: '#000000',
    ...Theme.shadows.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flex: 1,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: Theme.radius.full,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: Theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
  },
  formulaBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  formulaText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '700',
  },
  tabsScroll: {
    maxHeight: 54,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    backgroundColor: '#F8FAFC',
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    ...Theme.shadows.sm,
  },
  tabButtonInspected: {
    borderColor: '#000000',
    borderWidth: 2.5,
  },
  tabButtonActive: {
    backgroundColor: '#FFE600',
  },
  activeDotBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  bodyScroll: {
    padding: 16,
  },
  paletteMetaCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: Theme.radius.sm,
    padding: 14,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 16,
    ...Theme.shadows.sm,
  },
  paletteMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  paletteName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 2,
  },
  paletteDesc: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 16,
  },
  angleBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  angleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  applyThemeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  applyThemeBtnActive: {
    borderWidth: 2.5,
  },
  applyThemeBtnActiveText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  applyThemeBtnInactive: {},
  applyThemeBtnInactiveText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 8,
    marginTop: 4,
  },
  liveCanvas: {
    padding: 14,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    marginBottom: 18,
    ...Theme.shadows.sm,
  },
  previewCard: {
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    padding: 12,
    ...Theme.shadows.md,
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewCarrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewCarrierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewCarrierText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  previewTracking: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  previewStatusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  previewCheckpoint: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  previewActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  previewActionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  previewSecondaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  previewSecondaryBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  swatchesList: {
    gap: 8,
    marginBottom: 16,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  swatchBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 10,
  },
  swatchInfo: {
    flex: 1,
  },
  swatchLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  swatchValues: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  swatchRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  swatchRoleText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#065F46',
  },
  footer: {
    padding: 12,
    borderTopWidth: 2,
    borderTopColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.yellow,
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  pressed: {
    ...Theme.pressed,
  },
});
