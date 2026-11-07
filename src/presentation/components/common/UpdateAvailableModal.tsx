import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { UpdateInfo, CURRENT_APP_VERSION, updateService } from '../../../infrastructure/services/UpdateService';
import { Download, Sparkles, X, ArrowRight, Package } from 'lucide-react-native';

interface UpdateAvailableModalProps {
  visible: boolean;
  updateInfo: UpdateInfo;
  onClose: () => void;
}

export const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  visible,
  updateInfo,
  onClose,
}) => {
  const handleDownload = async () => {
    await updateService.startDownload(updateInfo.apkDownloadUrl);
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

        <View style={styles.dialogCard} accessibilityViewIsModal>
          {/* Retro Window Header */}
          <View style={styles.header}>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, { backgroundColor: Theme.colors.coral }]} />
              <View style={[styles.dot, { backgroundColor: Theme.colors.yellow }]} />
              <View style={[styles.dot, { backgroundColor: Theme.colors.mint }]} />
            </View>
            <Text style={styles.headerTitle}>NUEVA VERSIÓN DISPONIBLE</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar aviso de actualización"
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <X size={16} color="#000000" strokeWidth={3} />
            </Pressable>
          </View>

          {/* Version Comparison Hero Banner */}
          <View style={styles.versionBanner}>
            <View style={styles.versionBox}>
              <Text style={styles.versionLabel}>ACTUAL</Text>
              <Text style={styles.versionValue}>v{CURRENT_APP_VERSION}</Text>
            </View>

            <ArrowRight size={20} color="#000000" strokeWidth={3} style={styles.arrowIcon} />

            <View style={[styles.versionBox, styles.newVersionBox]}>
              <View style={styles.newBadge}>
                <Sparkles size={10} color="#000000" strokeWidth={3} />
                <Text style={styles.newBadgeText}>NUEVA</Text>
              </View>
              <Text style={styles.newVersionValue}>v{updateInfo.version}</Text>
            </View>
          </View>

          {/* APK Asset Meta Chip */}
          <View style={styles.metaRow}>
            <View style={styles.apkPill}>
              <Package size={13} color="#000000" strokeWidth={2.5} />
              <Text style={styles.apkPillText}>
                {updateInfo.apkSizeMb ? `APK OFICIAL (${updateInfo.apkSizeMb} MB)` : 'APK INSTALABLE'}
              </Text>
            </View>
            <Text style={styles.repoText}>github.com/gek0v</Text>
          </View>

          {/* Changelog Section */}
          <View style={styles.changelogContainer}>
            <Text style={styles.changelogLabel}>NOVEDADES DE ESTA ACTUALIZACIÓN:</Text>
            <ScrollView style={styles.changelogScroll} showsVerticalScrollIndicator>
              <Text style={styles.changelogText}>{updateInfo.changelog.trim()}</Text>
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Recordar más tarde"
              onPress={onClose}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>MÁS TARDE</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Descargar e instalar actualización"
              onPress={handleDownload}
              style={({ pressed }) => [styles.downloadBtn, pressed && styles.pressed]}
            >
              <Download size={16} color="#FFFFFF" strokeWidth={3} style={styles.downloadIcon} />
              <Text style={styles.downloadText}>ACTUALIZAR</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
    padding: 18,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    ...Theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 14,
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
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: Theme.colors.surfaceSubtle,
  },
  versionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Theme.colors.surfaceSubtle,
    borderRadius: Theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 12,
    ...Theme.shadows.sm,
  },
  versionBox: {
    alignItems: 'center',
  },
  newVersionBox: {
    backgroundColor: Theme.colors.yellow,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  versionLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: Theme.colors.textTertiary,
    letterSpacing: 0.5,
  },
  versionValue: {
    fontSize: 15,
    fontWeight: '900',
    color: Theme.colors.textSecondary,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  newVersionValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  apkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFE600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  apkPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },
  repoText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textTertiary,
  },
  changelogContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 16,
  },
  changelogLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  changelogScroll: {
    maxHeight: 140,
  },
  changelogText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 17,
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
  downloadBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#2563EB', // Electric Blue
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.md,
  },
  downloadIcon: {
    marginRight: 6,
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pressed: {
    ...Theme.pressed,
  },
});
