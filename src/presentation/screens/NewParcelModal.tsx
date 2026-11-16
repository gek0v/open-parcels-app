import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Theme } from '../theme/adaptiveTheme';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../../infrastructure/i18n';
import { CarrierDetectorBar } from '../components/scanner/CarrierDetectorBar';
import { CarrierSelectorModal } from '../components/common/CarrierSelectorModal';
import { trackingEngineManager } from '../../infrastructure/engine';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { Parcel } from '../../domain/models/parcel';
import { findCarrierBySlug } from '../../domain/validators/detection';
import { X, Plus, ShieldAlert, Cpu, ArrowRightLeft, Sparkles, Truck, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface NewParcelModalProps {
  visible: boolean;
  initialTrackingNumber?: string;
  initialCarrierSlug?: string;
  onClose: () => void;
  onParcelCreated: (parcel: Parcel) => void;
}

export const NewParcelModal: React.FC<NewParcelModalProps> = ({
  visible,
  initialTrackingNumber,
  initialCarrierSlug,
  onClose,
  onParcelCreated,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber || '');
  const [customAlias, setCustomAlias] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [selectedCarrierSlug, setSelectedCarrierSlug] = useState<string | undefined>(initialCarrierSlug);
  const [candidates, setCandidates] = useState<DetectedCarrier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCatalogModalVisible, setIsCatalogModalVisible] = useState(false);
  const [isManuallySelected, setIsManuallySelected] = useState(false);

  const [prevInitialNumber, setPrevInitialNumber] = useState(initialTrackingNumber);
  const [prevInitialSlug, setPrevInitialSlug] = useState(initialCarrierSlug);

  if (initialTrackingNumber !== prevInitialNumber) {
    setPrevInitialNumber(initialTrackingNumber);
    setTrackingNumber(initialTrackingNumber || '');
  }

  if (initialCarrierSlug !== prevInitialSlug) {
    setPrevInitialSlug(initialCarrierSlug);
    setSelectedCarrierSlug(initialCarrierSlug);
  }

  useEffect(() => {
    let active = true;
    const clean = trackingNumber.trim();

    if (clean.length === 0) {
      setCandidates([]);
      if (!isManuallySelected) {
        setSelectedCarrierSlug(undefined);
      }
      return;
    }

    // Debounce detection so we do not re-scan on every keystroke.
    const timer = setTimeout(async () => {
      if (clean.length < 4) {
        if (!active) return;
        setCandidates([]);
        if (!isManuallySelected) {
          setSelectedCarrierSlug(undefined);
        }
        return;
      }

      const results = await trackingEngineManager.current.detect(clean);
      if (!active) return;

      setCandidates(results);
      if (!isManuallySelected) {
        setSelectedCarrierSlug((previous) => {
          if (results.length === 0) return undefined;
          // Keep initial or previously selected carrier if still in candidate list
          const stillAvailable = results.some((r) => r.carrier.slug === previous);
          if (stillAvailable) return previous;
          const liveCandidate = results.find((r) => r.carrier.hasLiveTracking);
          return (liveCandidate || results[0]).carrier.slug;
        });
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trackingNumber, isManuallySelected]);

  const currentSelectedCarrier: Carrier | undefined = selectedCarrierSlug
    ? findCarrierBySlug(selectedCarrierSlug)
    : undefined;

  const currentSelectedCandidate = candidates.find(
    (c) => c.carrier.slug === selectedCarrierSlug
  );
  const requiresPostalCode = currentSelectedCarrier?.requiresPostalCode ?? false;
  const canSubmit = !!trackingNumber.trim() && !isLoading;

  const handleSelectCarrier = (slug: string) => {
    setSelectedCarrierSlug(slug);
    setIsManuallySelected(true);
    setErrorMessage(null);
  };

  const handleSelectCarrierFromCatalog = (carrier: Carrier) => {
    setSelectedCarrierSlug(carrier.slug);
    setIsManuallySelected(true);
    setErrorMessage(null);
  };

  const handleTrackAndSave = async () => {
    const cleanNumber = trackingNumber.trim();
    if (!cleanNumber) {
      setErrorMessage(t.newParcelModal.trackingPlaceholder || 'Introduce un número de seguimiento válido.');
      return;
    }

    if (requiresPostalCode && !postalCode.trim()) {
      const carrierName = currentSelectedCarrier?.name || 'este transportista';
      setErrorMessage(`${t.newParcelModal.postalCodeHint || 'Este transportista exige código postal.'} (${carrierName})`);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      const parcel = await trackingEngineManager.current.track({
        trackingNumber: cleanNumber,
        carrierHint: selectedCarrierSlug,
        postalCode: postalCode.trim() || undefined,
        lang: 'es',
      });

      if (customAlias.trim()) {
        parcel.customAlias = customAlias.trim();
      }

      await parcelRepository.save(parcel);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      onParcelCreated(parcel);
      resetForm();
      onClose();
    } catch (err: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setErrorMessage(err.message || 'Error al rastrear el envío.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTrackingNumber('');
    setCustomAlias('');
    setPostalCode('');
    setSelectedCarrierSlug(undefined);
    setIsManuallySelected(false);
    setCandidates([]);
    setErrorMessage(null);
    setIsCatalogModalVisible(false);
  };

  const handleClose = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.keyboardContainer, { backgroundColor: Theme.isWeb ? theme.surfaceSubtle : theme.canvas }]}
      >
        <View style={[styles.container, { backgroundColor: theme.canvas, borderColor: theme.border }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.surface,
                borderBottomColor: theme.border,
                paddingTop: Math.max(insets.top, 16),
              },
            ]}
          >
            <View style={styles.headerCopy}>
              <View style={styles.windowDots}>
                <View style={[styles.dot, { backgroundColor: theme.coral, borderColor: theme.border }]} />
                <View style={[styles.dot, { backgroundColor: theme.yellow, borderColor: theme.border }]} />
                <View style={[styles.dot, { backgroundColor: theme.mint, borderColor: theme.border }]} />
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                  {t.newParcelModal.title}
                </Text>
              </View>
              <View style={[styles.engineBadge, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
                <Cpu size={12} color="#000000" strokeWidth={2.5} />
                <Text style={styles.engineBadgeText} numberOfLines={1}>
                  {trackingEngineManager.current.engineName.toUpperCase()}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.newParcelModal.cancelBtn || 'Cerrar formulario de nuevo envío'}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <X size={20} color={theme.textPrimary} strokeWidth={3} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 32) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Tracking Number Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>
                {t.newParcelModal.trackingNumberLabel} *
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TextInput
                  accessibilityLabel={t.newParcelModal.trackingNumberLabel}
                  style={[styles.mainInput, { color: theme.textPrimary }]}
                  placeholder={t.newParcelModal.trackingPlaceholder || 'Ej: LP00561234567890, 75616714...'}
                  placeholderTextColor={theme.textTertiary}
                  value={trackingNumber}
                  onChangeText={(text) => {
                    setTrackingNumber(text);
                    if (!text.trim()) {
                      setIsManuallySelected(false);
                    }
                    setErrorMessage(null);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                {t.newParcelModal.subtitle || 'Detectamos el transportista automáticamente al escribir el código.'}
              </Text>
            </View>

            {/* Selected Carrier Card & Full Catalog Switcher */}
            <View
              style={[
                styles.selectedCarrierCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.selectedCarrierContent}>
                <View style={styles.selectedCarrierHeader}>
                  <Text style={[styles.selectedCarrierLabel, { color: theme.textSecondary }]}>
                    {t.newParcelModal.selectedCarrierLabel}:
                  </Text>
                  {currentSelectedCandidate && (
                    <View style={[styles.recommendedBadge, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
                      <Sparkles size={10} color="#000000" strokeWidth={3} />
                      <Text style={styles.recommendedBadgeText}>
                        {Math.round(currentSelectedCandidate.confidence * 100)}% RECOMENDADO
                      </Text>
                    </View>
                  )}
                  {currentSelectedCarrier?.hasLiveTracking && (
                    <View style={[styles.liveBadgeSmall, { backgroundColor: theme.mint, borderColor: theme.border }]}>
                      <Zap size={9} color="#000000" strokeWidth={3} />
                      <Text style={styles.liveBadgeSmallText}>LIVE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.carrierMainRow}>
                  <View
                    style={[
                      styles.carrierColorDot,
                      { backgroundColor: currentSelectedCarrier?.color || theme.blue },
                    ]}
                  />
                  <Text
                    style={[styles.selectedCarrierName, { color: theme.textPrimary }]}
                    numberOfLines={1}
                  >
                    {currentSelectedCarrier ? currentSelectedCarrier.name.toUpperCase() : 'NO SELECCIONADO (AUTO)'}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cambiar transportista entre todos los del catálogo"
                onPress={async () => {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setIsCatalogModalVisible(true);
                }}
                style={({ pressed }) => [
                  styles.changeCarrierBtn,
                  { backgroundColor: theme.yellow, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <ArrowRightLeft size={14} color="#000000" strokeWidth={2.5} style={{ marginRight: 5 }} />
                <Text style={styles.changeCarrierBtnText}>
                  {t.newParcelModal.changeCarrierBtn}
                </Text>
              </Pressable>
            </View>

            {/* Carrier Real-Time Auto-Detection Chips */}
            <CarrierDetectorBar
              candidates={candidates}
              selectedCarrierSlug={selectedCarrierSlug}
              onSelectCarrier={handleSelectCarrier}
              onOpenCatalog={() => setIsCatalogModalVisible(true)}
            />

            {/* Carrier Selector Modal (Full Catalog with Recommended Options) */}
            <CarrierSelectorModal
              visible={isCatalogModalVisible}
              onClose={() => setIsCatalogModalVisible(false)}
              onSelectCarrier={handleSelectCarrierFromCatalog}
              selectedCarrierSlug={selectedCarrierSlug}
              candidates={candidates}
            />

            {/* Conditional Postal Code Input (for InPost / CTT / SEUR / GLS) */}
            {requiresPostalCode && (
              <View style={[styles.fieldGroup, styles.conditionalBox, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
                <View style={styles.conditionalHeader}>
                  <ShieldAlert size={16} color="#000000" strokeWidth={3} />
                  <Text style={styles.conditionalTitle} numberOfLines={2}>
                    {t.newParcelModal.postalCodeLabel} ({currentSelectedCarrier?.name.toUpperCase() || ''})
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel={t.newParcelModal.postalCodeLabel}
                  style={[styles.standardInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder={t.newParcelModal.postalCodePlaceholder || 'Ej: 47140, 28001...'}
                  placeholderTextColor={theme.textTertiary}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            )}

            {/* Custom Alias Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>
                {t.newParcelModal.aliasLabel}
              </Text>
              <TextInput
                accessibilityLabel={t.newParcelModal.aliasLabel}
                style={[styles.standardInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder={t.newParcelModal.aliasPlaceholder || 'Ej: Zapatillas Nike, Teclado AliExpress...'}
                placeholderTextColor={theme.textTertiary}
                value={customAlias}
                onChangeText={setCustomAlias}
              />
            </View>

            {/* Error Message if any */}
            {errorMessage && (
              <View style={[styles.errorContainer, { backgroundColor: theme.coral, borderColor: theme.border }]}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Submit Action Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy: isLoading }}
              onPress={handleTrackAndSave}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: theme.blue, borderColor: theme.border },
                !canSubmit && styles.submitButtonDisabled,
                pressed && canSubmit && styles.pressed,
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Plus size={20} color="#FFFFFF" strokeWidth={3} style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>
                    {t.newParcelModal.startTrackingBtn || 'RASTREAR Y GUARDAR'}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    ...(Theme.isWeb
      ? {
          borderLeftWidth: 2.5,
          borderRightWidth: 2.5,
        }
      : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 3,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  windowDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: -0.3,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    ...Theme.shadows.sm,
  },
  engineBadgeText: {
    maxWidth: 210,
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  closeButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    marginLeft: 12,
    ...Theme.shadows.sm,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 7,
    letterSpacing: 0.6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    paddingHorizontal: 14,
    height: 54,
    ...Theme.shadows.md,
  },
  mainInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    paddingVertical: 0,
  },
  helperText: {
    marginTop: 7,
    fontSize: 10,
    fontWeight: '700',
  },
  standardInput: {
    height: 52,
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    ...Theme.shadows.sm,
  },
  conditionalBox: {
    padding: 14,
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    ...Theme.shadows.md,
  },
  conditionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    gap: 6,
  },
  conditionalTitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },
  errorContainer: {
    padding: 12,
    borderRadius: Theme.radius.sm,
    marginBottom: 16,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  errorText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: Theme.radius.sm,
    marginTop: 8,
    borderWidth: 2.5,
    ...Theme.shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pressed: {
    ...Theme.pressed,
  },
  smallPressed: {
    ...Theme.pressed,
  },
  selectedCarrierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    marginBottom: 12,
    ...Theme.shadows.sm,
  },
  selectedCarrierContent: {
    flex: 1,
    marginRight: 10,
  },
  selectedCarrierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  selectedCarrierLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
  },
  recommendedBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000000',
  },
  liveBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
  },
  liveBadgeSmallText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000000',
  },
  carrierMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  carrierColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  selectedCarrierName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  changeCarrierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    ...Theme.shadows.sm,
  },
  changeCarrierBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },
});
