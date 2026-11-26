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
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../../infrastructure/i18n';
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
  const { theme } = useTheme();
  const { t } = useI18n();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [prevInitialAlias, setPrevInitialAlias] = useState(initialAlias);
  const [alias, setAlias] = useState(initialAlias || '');

  if (visible !== prevVisible || initialAlias !== prevInitialAlias) {
    setPrevVisible(visible);
    setPrevInitialAlias(initialAlias);
    setAlias(initialAlias || '');
  }

  const handleSave = () => {
    onSave(alias.trim());
    onClose();
  };

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

        <View
          style={[
            styles.dialogCard,
            { backgroundColor: theme.canvas, borderColor: theme.border },
          ]}
          accessibilityViewIsModal
        >
          {/* Retro window header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, { backgroundColor: theme.coral, borderColor: theme.border }]} />
              <View style={[styles.dot, { backgroundColor: theme.yellow, borderColor: theme.border }]} />
              <View style={[styles.dot, { backgroundColor: theme.mint, borderColor: theme.border }]} />
            </View>
            <View style={styles.titleBox}>
              <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
                {t.renameModal?.title || 'RENOMBRAR ENVÍO'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textTertiary }]} numberOfLines={1}>
                {trackingNumber}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.renameModal?.cancelBtn || 'Cerrar'}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                pressed && styles.smallPressed,
              ]}
            >
              <X size={18} color={theme.textPrimary} strokeWidth={3} />
            </Pressable>
          </View>

          {/* Input field */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
              {t.renameModal?.label || 'ALIAS / NOMBRE DEL PAQUETE'}
            </Text>
            <TextInput
              accessibilityLabel={t.renameModal?.label || 'Alias del paquete'}
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              value={alias}
              onChangeText={setAlias}
              placeholder={t.renameModal?.placeholder || 'Ej: Zapatillas Nike, Teclado AliExpress...'}
              placeholderTextColor={theme.textTertiary}
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
              accessibilityLabel={t.renameModal?.cancelBtn || 'Cancelar'}
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.cancelText, { color: theme.textPrimary }]}>
                {t.renameModal?.cancelBtn || 'CANCELAR'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.renameModal?.saveBtn || 'Guardar alias'}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: theme.blue || theme.primary, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <Check size={16} color={theme.textInverse} strokeWidth={3} style={styles.checkIcon} />
              <Text style={[styles.saveText, { color: theme.textInverse }]}>
                {t.renameModal?.saveBtn || 'GUARDAR'}
              </Text>
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
