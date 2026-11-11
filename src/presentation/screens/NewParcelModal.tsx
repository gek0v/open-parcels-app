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
import { CameraScannerModal } from '../components/scanner/CameraScannerModal';
import { CarrierDetectorBar } from '../components/scanner/CarrierDetectorBar';
import { trackingEngineManager } from '../../infrastructure/engine';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { DetectedCarrier } from '../../domain/models/carrier';
import { Parcel } from '../../domain/models/parcel';
import { X, Camera, Plus, ShieldAlert, Cpu } from 'lucide-react-native';

interface NewParcelModalProps {
  visible: boolean;
  onClose: () => void;
  onParcelCreated: (parcel: Parcel) => void;
}

export const NewParcelModal: React.FC<NewParcelModalProps> = ({
  visible,
  onClose,
  onParcelCreated,
}) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [selectedCarrierSlug, setSelectedCarrierSlug] = useState<string | undefined>();
  const [candidates, setCandidates] = useState<DetectedCarrier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const clean = trackingNumber.trim();

    // Debounce detection so we do not re-scan on every keystroke.
    const timer = setTimeout(async () => {
      if (clean.length < 4) {
        if (!active) return;
        setCandidates([]);
        setSelectedCarrierSlug(undefined);
        return;
      }

      const results = await trackingEngineManager.current.detect(clean);
      if (!active) return;

      setCandidates(results);
      setSelectedCarrierSlug((previous) => {
        if (results.length === 0) return undefined;
        const stillAvailable = results.some((r) => r.carrier.slug === previous);
        if (stillAvailable) return previous;
        const liveCandidate = results.find((r) => r.carrier.hasLiveTracking);
        return (liveCandidate || results[0]).carrier.slug;
      });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trackingNumber]);

  const currentSelectedCandidate = candidates.find(
    (c) => c.carrier.slug === selectedCarrierSlug
  );
  const requiresPostalCode = currentSelectedCandidate?.carrier.requiresPostalCode ?? false;
  const canSubmit = !!trackingNumber.trim() && !isLoading;

  const handleTrackAndSave = async () => {
    const cleanNumber = trackingNumber.trim();
    if (!cleanNumber) {
      setErrorMessage('Introduce un número de seguimiento válido.');
      return;
    }

    if (requiresPostalCode && !postalCode.trim()) {
      const carrierName = currentSelectedCandidate?.carrier.name || 'este transportista';
      setErrorMessage('Este transportista (' + carrierName + ') requiere el código postal de destino.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

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
      onParcelCreated(parcel);
      resetForm();
      onClose();
    } catch (err: any) {
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
    setCandidates([]);
    setErrorMessage(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={styles.windowDots}>
                <View style={[styles.dot, { backgroundColor: Theme.colors.coral }]} />
                <View style={[styles.dot, { backgroundColor: Theme.colors.yellow }]} />
                <View style={[styles.dot, { backgroundColor: Theme.colors.mint }]} />
                <Text style={styles.headerTitle}>NUEVO ENVÍO</Text>
              </View>
              <View style={styles.engineBadge}>
                <Cpu size={12} color="#000000" strokeWidth={2.5} />
                <Text style={styles.engineBadgeText} numberOfLines={1}>
                  {trackingEngineManager.current.engineName.toUpperCase()}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar formulario de nuevo envío"
              onPress={() => {
                resetForm();
                onClose();
              }}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <X size={18} color="#000000" strokeWidth={3} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Tracking Number Input & Scanner Trigger */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NÚMERO DE SEGUIMIENTO *</Text>
              <View style={styles.inputWithActions}>
                <TextInput
                  accessibilityLabel="Número de seguimiento"
                  style={styles.mainInput}
                  placeholder="Ej: LP00561234567890, 75616714..."
                  placeholderTextColor="#64748B"
                  value={trackingNumber}
                  onChangeText={(text) => {
                    setTrackingNumber(text);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Escanear código de barras"
                  onPress={() => setCameraVisible(true)}
                  style={({ pressed }) => [styles.scannerIconButton, pressed && styles.smallPressed]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Camera size={20} color="#000000" strokeWidth={2.5} />
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                Detectamos el transportista automáticamente al escribir el código.
              </Text>
            </View>

            {/* Carrier Real-Time Auto-Detection Chips */}
            <CarrierDetectorBar
              candidates={candidates}
              selectedCarrierSlug={selectedCarrierSlug}
              onSelectCarrier={(slug) => setSelectedCarrierSlug(slug)}
            />

            {/* Conditional Postal Code Input (for InPost / CTT) */}
            {requiresPostalCode && (
              <View style={[styles.fieldGroup, styles.conditionalBox]}>
                <View style={styles.conditionalHeader}>
                  <ShieldAlert size={16} color="#000000" strokeWidth={3} />
                  <Text style={styles.conditionalTitle} numberOfLines={2}>
                    CÓDIGO POSTAL OBLIGATORIO ({currentSelectedCandidate?.carrier.name.toUpperCase()})
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel="Código postal de destino"
                  style={styles.standardInput}
                  placeholder="Ej: 47140, 28001..."
                  placeholderTextColor="#64748B"
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            )}

            {/* Custom Alias Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>ALIAS PERSONALIZADO (OPCIONAL)</Text>
              <TextInput
                accessibilityLabel="Alias personalizado"
                style={styles.standardInput}
                placeholder="Ej: Zapatillas Nike, Teclado AliExpress..."
                placeholderTextColor="#64748B"
                value={customAlias}
                onChangeText={setCustomAlias}
              />
            </View>

            {/* Error Message if any */}
            {errorMessage && (
              <View style={styles.errorContainer}>
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
                !canSubmit && styles.submitButtonDisabled,
                pressed && canSubmit && styles.pressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Plus size={20} color="#FFFFFF" strokeWidth={3} style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>RASTREAR Y GUARDAR</Text>
                </>
              )}
            </Pressable>
          </ScrollView>

          {/* Camera Scanner Modal */}
          <CameraScannerModal
            visible={cameraVisible}
            onClose={() => setCameraVisible(false)}
            onScanResult={(scanned) => setTrackingNumber(scanned)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: Theme.isWeb ? Theme.colors.surfaceSubtle : Theme.colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    backgroundColor: Theme.colors.background,
    ...(Theme.isWeb
      ? {
          borderLeftWidth: 2.5,
          borderRightWidth: 2.5,
          borderColor: '#000000',
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
    borderBottomColor: '#000000',
    backgroundColor: '#FFFFFF',
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
    borderColor: '#000000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 6,
    letterSpacing: -0.3,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: Theme.colors.yellow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
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
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
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
    color: '#000000',
    marginBottom: 7,
    letterSpacing: 0.6,
  },
  inputWithActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingHorizontal: 12,
    ...Theme.shadows.md,
  },
  mainInput: {
    flex: 1,
    height: 50,
    fontSize: 14,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#000000',
    paddingVertical: 0,
  },
  helperText: {
    marginTop: 7,
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textTertiary,
  },
  scannerIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.yellow,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    marginLeft: 8,
    ...Theme.shadows.sm,
  },
  standardInput: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    ...Theme.shadows.sm,
  },
  conditionalBox: {
    backgroundColor: Theme.colors.yellow,
    padding: 14,
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    borderColor: '#000000',
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
    backgroundColor: Theme.colors.coral,
    padding: 12,
    borderRadius: Theme.radius.sm,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  submitButton: {
    backgroundColor: Theme.colors.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: Theme.radius.sm,
    marginTop: 8,
    borderWidth: 2.5,
    borderColor: '#000000',
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
});
