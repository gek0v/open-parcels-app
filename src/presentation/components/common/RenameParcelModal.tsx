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
          {/* Retro window header */}
          <View style={styles.header}>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, { backgroundColor: '#FF5C38' }]} />
              <View style={[styles.dot, { backgroundColor: '#FFE600' }]} />
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            </View>
            <View style={styles.titleBox}>
              <Text style={styles.title}>RENOMBRAR ENVÍO</Text>
              <Text style={styles.subtitle}>{trackingNumber}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000000" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Input field */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ALIAS / NOMBRE DEL PAQUETE</Text>
            <TextInput
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
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>CANCELAR</Text>
            </Pressable>

            <Pressable onPress={handleSave} style={styles.saveButton}>
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
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#F1F5F9',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
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
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '2.5px 2.5px 0px #000000' } as any) : {}),
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
});
