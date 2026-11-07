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
              <View style={styles.windowDots}>
                <View style={[styles.dot, { backgroundColor: '#FF5C38' }]} />
                <View style={[styles.dot, { backgroundColor: '#FFE600' }]} />
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.headerTitle}>NUEVO ENVÍO</Text>
              </View>
              <View style={styles.engineBadge}>
                <Cpu size={12} color="#000000" />
                <Text style={styles.engineBadgeText}>
                  {trackingEngineManager.current.engineName.toUpperCase()}
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
              <X size={18} color="#000000" strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Tracking Number Input & Scanner Trigger */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NÚMERO DE SEGUIMIENTO *</Text>
              <View style={styles.inputWithActions}>
                <TextInput
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
                />
                <Pressable
                  onPress={() => setCameraVisible(true)}
                  style={styles.scannerIconButton}
                >
                  <Camera size={20} color="#000000" strokeWidth={2.5} />
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
                  <ShieldAlert size={16} color="#000000" strokeWidth={2.5} />
                  <Text style={styles.conditionalTitle}>
                    CÓDIGO POSTAL OBLIGATORIO ({currentSelectedCandidate?.carrier.name.toUpperCase()})
                  </Text>
                </View>
                <TextInput
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
              onPress={handleTrackAndSave}
              disabled={isLoading || !trackingNumber.trim()}
              style={[
                styles.submitButton,
                (!trackingNumber.trim() || isLoading) && styles.submitButtonDisabled,
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
    borderBottomWidth: 2.5,
    borderBottomColor: '#000000',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFE600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#000000',
    alignSelf: 'flex-start',
  },
  engineBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 4,
  },
  closeButton: {
    padding: 8,
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
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWithActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  mainInput: {
    flex: 1,
    height: 50,
    fontSize: 14,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#000000',
  },
  scannerIconButton: {
    padding: 8,
    backgroundColor: '#FFE600',
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginLeft: 8,
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
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  conditionalBox: {
    backgroundColor: '#FFE600',
    padding: 14,
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  conditionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionalTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: '#FF5C38',
    padding: 12,
    borderRadius: Theme.radius.sm,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: Theme.radius.sm,
    marginTop: 8,
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    ...(Theme.isWeb ? ({ boxShadow: '4px 4px 0px #000000' } as any) : {}),
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
});
