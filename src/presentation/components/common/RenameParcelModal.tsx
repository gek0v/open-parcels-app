import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { X, Check } from 'lucide-react-native';

interface RenameParcelModalProps {
  visible: boolean;
  initialAlias?: string;
  trackingNumber: string;
  onClose: () => void;
  onSave: (newAlias: string) => void;
}

export const RenameParcelModal: React.FC<RenameParcelModalProps> = ({
  visible,
  initialAlias = '',
  trackingNumber,
  onClose,
  onSave,
}) => {
  const [alias, setAlias] = useState(initialAlias);

  const handleSave = () => {
    onSave(alias);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.dialogCard} accessibilityViewIsModal>
          {/* Retro window header */}
          <View style={styles.header}>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, { backgroundColor: Theme.colors.coral }]} />
              <View style={[styles.dot, { backgroundColor: Theme.colors.yellow }]} />
              <View style={[styles.dot, { backgroundColor: Theme.colors.mint }]} />
            </View>
            <View style={styles.titleBox}>
              <Text style={styles.title}>RENOMBRAR ENVÍO</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {trackingNumber}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.smallPressed]}
            >
              <X size={18} color="#000000" strokeWidth={3} />
            </Pressable>
          </View>

          {/* Input field */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ALIAS / NOMBRE DEL PAQUETE</Text>
            <TextInput
              accessibilityLabel="Alias del paquete"
              style={styles.input}
              value={alias}
              onChangeText={setAlias}
              placeholder="Ej: Zapatillas Nike, Teclado AliExpress..."
              placeholderTextColor="#64748B"
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={onClose}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>CANCELAR</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guardar alias"
              onPress={handleSave}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
            >
              <Check size={16} color="#FFFFFF" strokeWidth={3} style={styles.checkIcon} />
              <Text style={styles.saveText}>GUARDAR</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
    maxWidth: 420,
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
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  titleBox: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: Theme.colors.textTertiary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: Theme.colors.surfaceSubtle,
    ...Theme.shadows.sm,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 7,
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: Theme.colors.surfaceSubtle,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    ...Theme.shadows.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    ...Theme.shadows.sm,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.blue,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  checkIcon: {
    marginRight: 6,
  },
  saveText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pressed: {
    ...Theme.pressed,
  },
  smallPressed: {
    ...Theme.pressed,
  },
});
