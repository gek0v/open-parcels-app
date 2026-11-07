import React, { useState, useEffect } from 'react';
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
import { Edit2, X, Check } from 'lucide-react-native';

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

  useEffect(() => {
    if (visible) {
      setAlias(initialAlias);
    }
  }, [visible, initialAlias]);

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

        <View style={styles.dialogCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Edit2 size={18} color={Theme.colors.primary} />
            </View>
            <View style={styles.titleBox}>
              <Text style={styles.title}>Renombrar Envío</Text>
              <Text style={styles.subtitle}>{trackingNumber}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={Theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Input field */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Alias / Nombre del paquete</Text>
            <TextInput
              style={styles.input}
              value={alias}
              onChangeText={setAlias}
              placeholder="Ej: Zapatillas Nike, Teclado AliExpress..."
              placeholderTextColor={Theme.colors.textTertiary}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>

            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Check size={16} color="#FFF" style={styles.checkIcon} />
              <Text style={styles.saveText}>Guardar</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.elevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleBox: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: Theme.colors.surfaceSubtle,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: Theme.colors.textPrimary,
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
    borderRadius: Theme.radius.md,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Theme.radius.md,
    ...Theme.shadows.card,
  },
  checkIcon: {
    marginRight: 6,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
