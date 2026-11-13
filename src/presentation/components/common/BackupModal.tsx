import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Download, Upload, X, Database, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../../infrastructure/i18n';
import { BackupService } from '../../../infrastructure/services/BackupService';

interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  visible,
  onClose,
  onRestoreSuccess,
}) => {
  const { t } = useI18n();
  const { theme } = useTheme();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleExport = async () => {
    setFeedbackMessage(null);
    setIsExporting(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await BackupService.exportBackup();
      if (res.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const msg = t.backup.exportSuccess.replace('%d', String(res.parcelCount));
        setFeedbackMessage({ type: 'success', text: msg });
      }
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || t.backup.exportError,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setFeedbackMessage(null);
    setIsImporting(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await BackupService.importBackupFromDocumentPicker();

      if (res.cancelled) {
        setIsImporting(false);
        return;
      }

      if (res.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const msg = t.backup.importSuccessDesc
          .replace('%d', String(res.importedCount))
          .replace('%d', String(res.updatedCount));
        setFeedbackMessage({ type: 'success', text: msg });
        onRestoreSuccess();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setFeedbackMessage({
          type: 'error',
          text: res.error || t.backup.importInvalid,
        });
      }
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || t.backup.importInvalid,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFeedbackMessage(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.surfaceSubtle }]}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.headerIconBadge,
                  { backgroundColor: theme.yellow, borderColor: theme.border },
                ]}
              >
                <Database size={18} color="#000000" strokeWidth={2.5} />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {t.backup.title}
                </Text>
                <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
                  {t.backup.subtitle}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal"
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={theme.textPrimary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Feedback Banner if present */}
          {feedbackMessage && (
            <View
              style={[
                styles.feedbackBanner,
                {
                  backgroundColor:
                    feedbackMessage.type === 'success' ? theme.mint : theme.coral,
                  borderColor: theme.border,
                },
              ]}
            >
              {feedbackMessage.type === 'success' ? (
                <CheckCircle size={16} color="#000000" strokeWidth={2.5} />
              ) : (
                <AlertTriangle size={16} color="#000000" strokeWidth={2.5} />
              )}
              <Text style={styles.feedbackText}>{feedbackMessage.text}</Text>
            </View>
          )}

          {/* Content: Export Card */}
          <View
            style={[
              styles.actionCard,
              { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
            ]}
          >
            <View style={styles.actionCardHeader}>
              <Download size={16} color={theme.textPrimary} strokeWidth={2.5} />
              <Text style={[styles.actionCardTitle, { color: theme.textPrimary }]}>
                {t.backup.exportCardTitle}
              </Text>
            </View>
            <Text style={[styles.actionCardDesc, { color: theme.textSecondary }]}>
              {t.backup.exportCardDesc}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.backup.exportBtn}
              onPress={handleExport}
              disabled={isExporting}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.yellow, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Download size={16} color="#000000" strokeWidth={2.5} />
                  <Text style={styles.actionBtnText}>{t.backup.exportBtn}</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Content: Import Card */}
          <View
            style={[
              styles.actionCard,
              { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
            ]}
          >
            <View style={styles.actionCardHeader}>
              <Upload size={16} color={theme.textPrimary} strokeWidth={2.5} />
              <Text style={[styles.actionCardTitle, { color: theme.textPrimary }]}>
                {t.backup.importCardTitle}
              </Text>
            </View>
            <Text style={[styles.actionCardDesc, { color: theme.textSecondary }]}>
              {t.backup.importCardDesc}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.backup.importBtn}
              onPress={handleImport}
              disabled={isImporting}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.coral, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Upload size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                    {t.backup.importBtn}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Footer Close Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.backup.close}
            onPress={handleClose}
            style={({ pressed }) => [
              styles.bottomCloseBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.bottomCloseBtnText, { color: theme.textPrimary }]}>
              {t.backup.close}
            </Text>
          </Pressable>
        </View>
      </View>
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
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Theme.radius.md,
    borderWidth: 2.5,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    ...(Theme.isWeb ? ({ boxShadow: '4px 4px 0px #000000' } as any) : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    flex: 1,
  },
  actionCard: {
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    padding: 12,
    marginBottom: 12,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  actionCardDesc: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  bottomCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    marginTop: 4,
  },
  bottomCloseBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pressed: {
    transform: [{ translateX: 1.5 }, { translateY: 1.5 }],
    shadowOffset: { width: 0.5, height: 0.5 },
    ...(Theme.isWeb ? ({ boxShadow: '0.5px 0.5px 0px #000000' } as any) : {}),
  },
});
