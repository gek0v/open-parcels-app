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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.dialogCard}>
          {/* Retro Window Header */}
          <View style={styles.header}>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, { backgroundColor: '#FF5C38' }]} />
              <View style={[styles.dot, { backgroundColor: '#FFE600' }]} />
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            </View>
            <Text style={styles.headerTitle}>ELIMINAR ENVÍO</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={16} color="#000000" strokeWidth={2.5} />
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
              <Text style={styles.trackingCode}>{trackingNumber}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>CANCELAR</Text>
            </Pressable>

            <Pressable onPress={onConfirmDelete} style={styles.deleteBtn}>
              <Trash2 size={16} color="#FFFFFF" strokeWidth={2.5} style={styles.deleteIcon} />
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
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 7,
    ...(Theme.isWeb ? ({ boxShadow: '5px 5px 0px #000000' } as any) : {}),
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
    padding: 4,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#F1F5F9',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE600', // Cyber Yellow
    padding: 12,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '2.5px 2.5px 0px #000000' } as any) : {}),
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
    color: '#1E293B',
    marginTop: 2,
    lineHeight: 15,
  },
  previewCard: {
    backgroundColor: '#F8FAFC',
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
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  trackingCode: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#334155',
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
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
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
    backgroundColor: '#FF5C38', // Neon Coral / Danger
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  deleteIcon: {
    marginRight: 6,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
