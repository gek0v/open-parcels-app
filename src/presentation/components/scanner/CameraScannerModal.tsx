import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Theme } from '../../theme/adaptiveTheme';
import { X, Flashlight, RefreshCw, Barcode } from 'lucide-react-native';

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
          <Pressable onPress={onClose} style={styles.iconButton}>
            <X size={24} color="#FFF" />
          </Pressable>

          <Text style={styles.scannerTitle}>Escanear Código de Barras / QR</Text>

          <Pressable
            onPress={() => setTorchEnabled(!torchEnabled)}
            style={[styles.iconButton, torchEnabled && styles.iconButtonActive]}
          >
            <Flashlight size={22} color={torchEnabled ? '#FFD700' : '#FFF'} />
          </Pressable>
        </View>

        {/* Camera View or Permission / Web Fallback */}
        <View style={styles.cameraContainer}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Barcode size={48} color={Theme.colors.primary} />
              <Text style={styles.permissionText}>
                Se requiere permiso de cámara para leer etiquetas de envío.
              </Text>
              <Pressable onPress={requestPermission} style={styles.grantButton}>
                <Text style={styles.grantButtonText}>Conceder Permiso</Text>
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
                onPress={() => {
                  onScanResult(s.code);
                  onClose();
                }}
                style={styles.sampleChip}
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
  },
  scannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  iconButton: {
    padding: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
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
    borderRadius: Theme.radius.md,
  },
  grantButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomBar: {
    padding: 20,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  sampleTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  sampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.sm,
  },
  sampleChipText: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '500',
  },
});
