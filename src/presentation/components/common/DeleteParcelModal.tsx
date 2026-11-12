import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { Trash2, AlertTriangle, X } from 'lucide-react-native';

interface DeleteParcelModalProps {
  visible: boolean;
  parcelTitle: string;
  trackingNumber: string;
  carrierName: string;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export const DeleteParcelModal: React.FC<DeleteParcelModalProps> = ({
  visible,
  parcelTitle,
  trackingNumber,
  carrierName,
  onClose,
  onConfirmDelete,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.dialogCard} accessibilityViewIsModal>
          {/* Retro Window Header */}
          <View style={styles.header}>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, { backgroundColor: Theme.colors.coral }]} />
              <View style={[styles.dot, { backgroundColor: Theme.colors.yellow }]} />
              <View style={[styles.dot, { backgroundColor: Theme.colors.mint }]} />
            </View>
            <Text style={styles.headerTitle}>ELIMINAR ENVÍO</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.smallPressed]}
            >
              <X size={16} color="#000000" strokeWidth={3} />
            </Pressable>
          </View>

          {/* Warning Icon & Danger Banner */}
          <View style={styles.alertBanner}>
            <View style={styles.alertIconBox}>
              <AlertTriangle size={24} color="#000000" strokeWidth={2.5} />
            </View>
            <View style={styles.alertTextBox}>
              <Text style={styles.alertTitle}>¿CONFIRMAR ELIMINACIÓN?</Text>
              <Text style={styles.alertSubtitle}>
                Esta acción borrará el paquete de tu historial local de forma permanente.
              </Text>
            </View>
          </View>

          {/* Parcel Details Preview Box */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <Text style={styles.carrierBadgeText}>{carrierName.toUpperCase()}</Text>
            </View>
            <Text style={styles.parcelName} numberOfLines={1}>
              {parcelTitle}
            </Text>
            <View style={styles.trackingBox}>
              <Text style={styles.trackingCode} numberOfLines={1}>
                {trackingNumber}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar eliminación"
              onPress={onClose}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>CANCELAR</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirmar eliminación"
              onPress={onConfirmDelete}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
            >
              <Trash2 size={16} color="#000000" strokeWidth={2.5} style={styles.deleteIcon} />
              <Text style={styles.deleteText}>SÍ, ELIMINAR</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dismissOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    padding: 20,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    ...Theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  dotsRow: {
    flexDirection: 'row',
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
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: Theme.colors.surfaceSubtle,
    ...Theme.shadows.sm,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.yellow,
    padding: 12,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 14,
    ...Theme.shadows.sm,
  },
  alertIconBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: 10,
  },
  alertTextBox: {
    flex: 1,
    minWidth: 0,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  alertSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  previewCard: {
    backgroundColor: Theme.colors.surfaceSubtle,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 18,
  },
  previewHeaderRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    marginBottom: 6,
  },
  carrierBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  parcelName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.2,
  },
  trackingBox: {
    marginTop: 5,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  trackingCode: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.coral,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  deleteIcon: {
    marginRight: 6,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  pressed: {
    ...Theme.pressed,
  },
  smallPressed: {
    ...Theme.pressed,
  },
});
