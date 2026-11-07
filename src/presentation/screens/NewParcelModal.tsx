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
  Alert,
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
import { X, Camera, Clipboard, Plus, ShieldAlert, Cpu } from 'lucide-react-native';

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

  // Trigger real-time carrier detection when tracking number changes
  useEffect(() => {
    const clean = trackingNumber.trim();
    if (clean.length >= 4) {
      trackingEngineManager.current.detect(clean).then((results) => {
        setCandidates(results);
        if (results.length > 0 && !selectedCarrierSlug) {
          setSelectedCarrierSlug(results[0].carrier.slug);
        }
      });
    } else {
      setCandidates([]);
      setSelectedCarrierSlug(undefined);
    }
  }, [trackingNumber]);

  // Determine if the selected carrier requires a postal code (e.g. InPost)
  const currentSelectedCandidate = candidates.find(
    (c) => c.carrier.slug === selectedCarrierSlug
  );
  const requiresPostalCode = currentSelectedCandidate?.carrier.requiresPostalCode ?? false;

  const handleTrackAndSave = async () => {
    const cleanNumber = trackingNumber.trim();
    if (!cleanNumber) {
      setErrorMessage('Introduce un número de seguimiento válido.');
      return;
    }

    if (requiresPostalCode && !postalCode.trim()) {
      setErrorMessage('Este transportista (InPost / Mondial Relay) requiere el código postal de destino.');
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
            <View>
              <Text style={styles.headerTitle}>Nuevo Envío</Text>
              <View style={styles.engineBadge}>
                <Cpu size={12} color={Theme.colors.primary} />
                <Text style={styles.engineBadgeText}>
                  {trackingEngineManager.current.engineName}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                resetForm();
                onClose();
              }}
              style={styles.closeButton}
            >
              <X size={20} color={Theme.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Tracking Number Input & Scanner Trigger */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Número de Seguimiento *</Text>
              <View style={styles.inputWithActions}>
                <TextInput
                  style={styles.mainInput}
                  placeholder="Ej: LP00561234567890, 75616714..."
                  placeholderTextColor={Theme.colors.textTertiary}
                  value={trackingNumber}
                  onChangeText={(text) => {
                    setTrackingNumber(text);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => setCameraVisible(true)}
                  style={styles.scannerIconButton}
                >
                  <Camera size={20} color={Theme.colors.primary} />
                </Pressable>
              </View>
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
                  <ShieldAlert size={16} color={Theme.colors.status.out_for_delivery} />
                  <Text style={styles.conditionalTitle}>
                    Código Postal Obligatorio para {currentSelectedCandidate?.carrier.name}
                  </Text>
                </View>
                <TextInput
                  style={styles.standardInput}
                  placeholder="Ej: 47140, 28001..."
                  placeholderTextColor={Theme.colors.textTertiary}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            )}

            {/* Custom Alias Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nombre / Alias personalizado (opcional)</Text>
              <TextInput
                style={styles.standardInput}
                placeholder="Ej: Zapatillas Nike, Teclado AliExpress..."
                placeholderTextColor={Theme.colors.textTertiary}
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
              onPress={handleTrackAndSave}
              disabled={isLoading || !trackingNumber.trim()}
              style={[
                styles.submitButton,
                (!trackingNumber.trim() || isLoading) && styles.submitButtonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Plus size={20} color="#FFF" style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>Rastrear y Guardar</Text>
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
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  engineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginLeft: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.surfaceSubtle,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginBottom: 6,
  },
  inputWithActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
  },
  mainInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    color: Theme.colors.textPrimary,
  },
  scannerIconButton: {
    padding: 8,
    backgroundColor: Theme.colors.primaryLight,
    borderRadius: Theme.radius.sm,
    marginLeft: 8,
  },
  standardInput: {
    backgroundColor: Theme.colors.surface,
    height: 48,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Theme.colors.textPrimary,
  },
  conditionalBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  conditionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 6,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: Theme.radius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: Theme.radius.md,
    marginTop: 8,
    ...Theme.shadows.card,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
