import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Theme } from '../../theme/adaptiveTheme';
import { X, Flashlight, Barcode } from 'lucide-react-native';

interface CameraScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanResult: (scannedCode: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  visible,
  onClose,
  onScanResult,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanResult(data);
    onClose();
  };

  const sampleCodes = [
    { label: 'Cainiao (LP00561234567890)', code: 'LP00561234567890' },
    { label: 'InPost (75616714)', code: '75616714' },
    { label: 'UPS 1Z (1Z9999999999999999)', code: '1Z9999999999999999' },
    { label: 'Correos ES (RR123456785ES)', code: 'RR123456785ES' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Controls Header */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar escáner"
            onPress={onClose}
            style={({ pressed }) => [styles.iconButton, pressed && styles.controlPressed]}
          >
            <X size={24} color="#FFF" strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.scannerTitle} numberOfLines={1}>
            Escanear Código de Barras / QR
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alternar linterna"
            onPress={() => setTorchEnabled(!torchEnabled)}
            style={({ pressed }) => [
              styles.iconButton,
              torchEnabled && styles.iconButtonActive,
              pressed && styles.controlPressed,
            ]}
          >
            <Flashlight size={22} color={torchEnabled ? '#FFD700' : '#FFF'} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Camera View or Permission / Web Fallback */}
        <View style={styles.cameraContainer}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Barcode size={48} color={Theme.colors.primary} strokeWidth={2} />
              <Text style={styles.permissionText}>
                Se requiere permiso de cámara para leer etiquetas de envío.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Conceder permiso de cámara"
                onPress={requestPermission}
                style={({ pressed }) => [styles.grantButton, pressed && styles.controlPressed]}
              >
                <Text style={styles.grantButtonText}>CONCEDER PERMISO</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'code128',
                  'code39',
                  'qr',
                  'datamatrix',
                  'ean13',
                  'ean8',
                  'itf14',
                  'upc_a',
                  'upc_e',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            >
              {/* Reticle / Viewfinder Overlay */}
              <View style={styles.overlay}>
                <View style={styles.reticle}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                  <View style={styles.laserLine} />
                </View>
              </View>
            </CameraView>
          )}
        </View>

        {/* Quick Test Barcode Samples (For quick simulator/dev testing) */}
        <View style={styles.bottomBar}>
          <Text style={styles.sampleTitle}>O prueba con códigos de ejemplo Open Parcels:</Text>
          <View style={styles.sampleChips}>
            {sampleCodes.map((s) => (
              <Pressable
                key={s.code}
                accessibilityRole="button"
                accessibilityLabel={`Probar código ${s.label}`}
                onPress={() => {
                  onScanResult(s.code);
                  onClose();
                }}
                style={({ pressed }) => [styles.sampleChip, pressed && styles.sampleChipPressed]}
              >
                <Text style={styles.sampleChipText}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderBottomWidth: 2.5,
    borderBottomColor: '#334155',
  },
  scannerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  iconButton: {
    padding: 8,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderColor: '#FFD700',
  },
  controlPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    opacity: 0.8,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  reticle: {
    width: 280,
    height: 180,
    borderRadius: 16,
    backgroundColor: 'transparent',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38BDF8',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  laserLine: {
    width: 250,
    height: 2,
    backgroundColor: '#38BDF8',
    opacity: 0.8,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionText: {
    color: '#E2E8F0',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  grantButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    borderColor: '#000000',
  },
  grantButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  bottomBar: {
    padding: 20,
    backgroundColor: '#1E293B',
    borderTopWidth: 2.5,
    borderTopColor: '#334155',
  },
  sampleTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  sampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
  },
  sampleChipPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    opacity: 0.85,
  },
  sampleChipText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
});
