import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import {
  UpdateInfo,
  CURRENT_APP_VERSION,
  GITHUB_REPO,
  updateService,
  DownloadProgress,
  DownloadCancelledError,
} from '../../../infrastructure/services/UpdateService';
import {
  Download,
  Sparkles,
  X,
  ArrowRight,
  Package,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Settings,
  ExternalLink,
} from 'lucide-react-native';
import { ProgressBar } from './ProgressBar';
import { useI18n } from '../../../infrastructure/i18n';

interface UpdateAvailableModalProps {
  visible: boolean;
  updateInfo: UpdateInfo;
  onClose: () => void;
}

type UpdateModalStatus =
  | 'idle'
  | 'downloading'
  | 'preparing'
  | 'ready_to_install'
  | 'error';

export const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  visible,
  updateInfo,
  onClose,
}) => {
  const { t, lang } = useI18n();
  const { theme } = useTheme();
  const cleanCurrentVersion = CURRENT_APP_VERSION.replace(/^v/i, '');
  const cleanRemoteVersion = updateInfo.version.replace(/^v/i, '');

  const isMountedRef = useRef(true);

  const [trackedKey, setTrackedKey] = useState(`${visible}:${cleanRemoteVersion}`);
  const [status, setStatus] = useState<UpdateModalStatus>('idle');
  const [progress, setProgress] = useState<DownloadProgress>({
    progress: 0,
    percent: 0,
    bytesWritten: 0,
    totalBytesExpectedToWrite: updateInfo.apkSizeMb
      ? Math.round(updateInfo.apkSizeMb * 1024 * 1024)
      : 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsPermissionSettings, setNeedsPermissionSettings] = useState(false);

  const currentKey = `${visible}:${cleanRemoteVersion}`;
  if (trackedKey !== currentKey) {
    const prevVersionSuffix = `:${cleanRemoteVersion}`;
    const versionChanged = !trackedKey.endsWith(prevVersionSuffix);
    setTrackedKey(currentKey);
    setErrorMessage(null);
    setNeedsPermissionSettings(false);
    setProgress({
      progress: 0,
      percent: 0,
      bytesWritten: 0,
      totalBytesExpectedToWrite: updateInfo.apkSizeMb
        ? Math.round(updateInfo.apkSizeMb * 1024 * 1024)
        : 0,
    });
    if (!visible || versionChanged) {
      setStatus((prev) => {
        if (!versionChanged && (prev === 'downloading' || prev === 'preparing')) {
          return prev;
        }
        return 'idle';
      });
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check if APK is already downloaded locally
  useEffect(() => {
    let active = true;
    if (visible && Platform.OS === 'android') {
      updateService
        .isApkDownloaded(cleanRemoteVersion, updateInfo.apkSizeMb)
        .then((alreadyDownloaded) => {
          if (active && isMountedRef.current) {
            setStatus((prev) => {
              if (prev === 'downloading' || prev === 'preparing') {
                return prev;
              }
              return alreadyDownloaded ? 'ready_to_install' : 'idle';
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [visible, cleanRemoteVersion, updateInfo.apkSizeMb]);

  const formatMb = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0.0';
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  const handleInstallNow = async (fileUriOverride?: string) => {
    if (!isMountedRef.current) return;
    setStatus('preparing');
    setErrorMessage(null);
    setNeedsPermissionSettings(false);

    const installResult = await updateService.installApk(
      fileUriOverride || cleanRemoteVersion
    );
    if (!isMountedRef.current) return;

    if (installResult.success) {
      setNeedsPermissionSettings(Boolean(installResult.cancelled));
      setStatus('ready_to_install');
    } else {
      setStatus('error');
      setNeedsPermissionSettings(Boolean(installResult.needsPermissionSettings));
      setErrorMessage(
        installResult.needsPermissionSettings
          ? t.updateModal.permissionError
          : installResult.error || t.updateModal.installError
      );
    }
  };

  const handleStartUpdate = async () => {
    // On iOS or Web, fall back directly to opening URL in browser
    if (Platform.OS !== 'android') {
      await updateService.openInBrowser(updateInfo.htmlUrl || updateInfo.apkDownloadUrl);
      onClose();
      return;
    }

    // Check if already downloaded on Android
    const alreadyDownloaded = await updateService.isApkDownloaded(
      cleanRemoteVersion,
      updateInfo.apkSizeMb
    );
    if (alreadyDownloaded) {
      await handleInstallNow();
      return;
    }

    setStatus('downloading');
    setErrorMessage(null);
    setNeedsPermissionSettings(false);
    setProgress({
      progress: 0,
      percent: 0,
      bytesWritten: 0,
      totalBytesExpectedToWrite: updateInfo.apkSizeMb
        ? Math.round(updateInfo.apkSizeMb * 1024 * 1024)
        : 0,
    });

    try {
      const destinationUri = await updateService.downloadApk(updateInfo, (p) => {
        if (isMountedRef.current) {
          setProgress(p);
        }
      });

      if (!isMountedRef.current) return;
      await handleInstallNow(destinationUri);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err instanceof DownloadCancelledError || err?.message === 'DOWNLOAD_CANCELLED') {
        setStatus('idle');
      } else if (err?.message === 'NO_APK_ASSET') {
        setStatus('error');
        setNeedsPermissionSettings(false);
        setErrorMessage(t.updateModal.noApkError);
      } else {
        setStatus('error');
        setNeedsPermissionSettings(false);
        setErrorMessage(t.updateModal.downloadError);
      }
    }
  };

  const handleCancelDownload = async () => {
    await updateService.cancelDownload();
    if (isMountedRef.current) {
      setStatus('idle');
    }
  };

  const handleOpenSettings = async () => {
    await updateService.openInstallUnknownAppsSettings();
  };

  const handleBrowserFallback = async () => {
    await updateService.openInBrowser(updateInfo.htmlUrl || updateInfo.apkDownloadUrl);
  };

  const handleClose = async () => {
    if (status === 'downloading') {
      await updateService.cancelDownload();
      if (isMountedRef.current) {
        setStatus('idle');
      }
    }
    onClose();
  };

  const changelogContent =
    updateInfo.changelog?.trim() ||
    updateInfo.title?.trim() ||
    (lang === 'en'
      ? 'Stability improvements and bug fixes.'
      : 'Mejoras generales de estabilidad y corrección de errores.');

  const apkPillLabel =
    status === 'ready_to_install'
      ? t.updateModal.readyToInstall
      : updateInfo.hasApkAsset === false || Platform.OS !== 'android'
      ? 'GITHUB RELEASE'
      : updateInfo.apkSizeMb
      ? `${t.updateModal.apkOfficial} (${updateInfo.apkSizeMb} MB)`
      : t.updateModal.apkInstallable;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={status === 'preparing' ? undefined : handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable
          style={styles.dismissOverlay}
          onPress={status === 'downloading' || status === 'preparing' ? undefined : handleClose}
        />

        <View
          style={[
            styles.dialogCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          accessibilityViewIsModal
        >
          {/* Retro Window Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, { backgroundColor: theme.coral, borderColor: theme.border }]} />
              <View style={[styles.dot, { backgroundColor: theme.yellow, borderColor: theme.border }]} />
              <View style={[styles.dot, { backgroundColor: theme.mint, borderColor: theme.border }]} />
            </View>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {t.updateModal.title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.updateModal.closeAria}
              disabled={status === 'preparing'}
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                status === 'preparing' && styles.disabledBtn,
                pressed && styles.pressed,
              ]}
            >
              <X size={16} color={theme.textPrimary} strokeWidth={3} />
            </Pressable>
          </View>

          {/* Version Comparison Hero Banner */}
          <View
            style={[
              styles.versionBanner,
              { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
            ]}
          >
            <View style={styles.versionBox}>
              <Text style={[styles.versionLabel, { color: theme.textTertiary }]}>
                {t.updateModal.current}
              </Text>
              <Text style={[styles.versionValue, { color: theme.textSecondary }]}>
                v{cleanCurrentVersion}
              </Text>
            </View>

            <ArrowRight size={20} color={theme.textPrimary} strokeWidth={3} style={styles.arrowIcon} />

            <View style={[styles.versionBox, styles.newVersionBox, { backgroundColor: theme.yellow }]}>
              <View style={styles.newBadge}>
                <Sparkles size={10} color="#000000" strokeWidth={3} />
                <Text style={styles.newBadgeText}>{t.updateModal.newBadge}</Text>
              </View>
              <Text style={styles.newVersionValue}>v{cleanRemoteVersion}</Text>
            </View>
          </View>

          {/* APK Asset Meta Chip */}
          <View style={styles.metaRow}>
            <View
              style={[
                styles.apkPill,
                { backgroundColor: theme.yellow },
                status === 'ready_to_install' && { backgroundColor: theme.mint },
              ]}
            >
              <Package size={13} color="#000000" strokeWidth={2.5} />
              <Text style={styles.apkPillText}>{apkPillLabel}</Text>
            </View>
            <Text style={[styles.repoText, { color: theme.textTertiary }]} numberOfLines={1}>
              github.com/{GITHUB_REPO.split('/')[0]}
            </Text>
          </View>

          {/* Dynamic Body State */}

          {/* 1. IDLE STATE: Show Changelog */}
          {status === 'idle' && (
            <>
              <View
                style={[
                  styles.changelogContainer,
                  { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.changelogLabel, { color: theme.textPrimary }]}>
                  {t.updateModal.changelogTitle}
                </Text>
                <ScrollView style={styles.changelogScroll} showsVerticalScrollIndicator>
                  <Text style={[styles.changelogText, { color: theme.textSecondary }]}>
                    {changelogContent}
                  </Text>
                </ScrollView>
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.updateModal.laterBtn}
                  onPress={handleClose}
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.cancelText, { color: theme.textPrimary }]}>
                    {t.updateModal.laterBtn}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.updateModal.updateBtn}
                  onPress={handleStartUpdate}
                  style={({ pressed }) => [
                    styles.downloadBtn,
                    { backgroundColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <Download size={16} color="#FFFFFF" strokeWidth={3} style={styles.downloadIcon} />
                  <Text style={styles.downloadText}>{t.updateModal.updateBtn}</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* 2. DOWNLOADING STATE: In-App Progress Bar */}
          {status === 'downloading' && (
            <View
              style={[
                styles.progressContainer,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <View style={styles.progressHeaderRow}>
                <View style={[styles.statusBadge, { backgroundColor: theme.primary }]}>
                  <Download size={13} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.statusBadgeText}>{t.updateModal.downloading}</Text>
                </View>

                <View style={[styles.percentPill, { backgroundColor: theme.yellow }]}>
                  <Text style={styles.percentText}>{progress.percent}%</Text>
                </View>
              </View>

              {/* Neo-Brutalist Logistics ProgressBar */}
              <View style={styles.progressBarWrapper}>
                <ProgressBar progress={progress.percent} status="in_transit" height={16} />
              </View>

              {/* MB / Total Readout */}
              <View style={styles.progressBytesRow}>
                <Text style={[styles.bytesText, { color: theme.textSecondary }]}>
                  {formatMb(progress.bytesWritten)}
                  {progress.totalBytesExpectedToWrite > 0 &&
                    ` / ${formatMb(progress.totalBytesExpectedToWrite)}`}{' '}
                  MB
                </Text>
              </View>

              {/* Cancel Button */}
              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.updateModal.cancelDownloadBtn}
                  onPress={handleCancelDownload}
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <X size={15} color={theme.textPrimary} strokeWidth={3} style={styles.cancelIcon} />
                  <Text style={[styles.cancelText, { color: theme.textPrimary }]}>
                    {t.updateModal.cancelDownloadBtn}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* 3. PREPARING STATE: Installer Handoff */}
          {status === 'preparing' && (
            <View
              style={[
                styles.progressContainer,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <View style={styles.progressHeaderRow}>
                <View style={[styles.statusBadge, { backgroundColor: theme.purple }]}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.statusBadgeText}>{t.updateModal.preparing}</Text>
                </View>

                <View style={[styles.percentPill, { backgroundColor: theme.yellow }]}>
                  <Text style={styles.percentText}>100%</Text>
                </View>
              </View>

              <View style={styles.progressBarWrapper}>
                <ProgressBar progress={100} status="delivered" height={16} />
              </View>

              <Text style={[styles.preparingHelpText, { color: theme.textSecondary }]}>
                {t.updateModal.preparingHelp}
              </Text>
            </View>
          )}

          {/* 4. READY TO INSTALL STATE: Local APK Already Downloaded */}
          {status === 'ready_to_install' && (
            <>
              <View style={styles.readyCard}>
                <View style={styles.readyHeader}>
                  <CheckCircle2 size={20} color="#059669" strokeWidth={2.5} />
                  <Text style={styles.readyTitle}>{t.updateModal.readyToInstall}</Text>
                </View>
                <Text style={styles.readySubtitle}>{t.updateModal.readySubtitle}</Text>
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.updateModal.laterBtn}
                  onPress={handleClose}
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.cancelText, { color: theme.textPrimary }]}>
                    {t.updateModal.laterBtn}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.updateModal.installNowBtn}
                  onPress={() => handleInstallNow()}
                  style={({ pressed }) => [
                    styles.installBtn,
                    { backgroundColor: theme.mint },
                    pressed && styles.pressed,
                  ]}
                >
                  <CheckCircle2 size={16} color="#000000" strokeWidth={3} style={styles.downloadIcon} />
                  <Text style={styles.installBtnText}>{t.updateModal.installNowBtn}</Text>
                </Pressable>
              </View>

              {needsPermissionSettings && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.updateModal.openSettingsBtn}
                  onPress={handleOpenSettings}
                  style={({ pressed }) => [
                    styles.settingsBtn,
                    styles.readySettingsBtn,
                    { backgroundColor: theme.yellow },
                    pressed && styles.pressed,
                  ]}
                >
                  <Settings size={15} color="#000000" strokeWidth={2.5} style={styles.cancelIcon} />
                  <Text style={styles.settingsBtnText}>{t.updateModal.openSettingsBtn}</Text>
                </Pressable>
              )}
            </>
          )}

          {/* 5. ERROR STATE: Clear error + Retry / Permission / Web fallback */}
          {status === 'error' && (
            <View style={styles.errorContainer}>
              <View style={styles.errorCard}>
                <View style={styles.errorHeader}>
                  <AlertTriangle size={18} color="#FF5C38" strokeWidth={3} />
                  <Text style={styles.errorTitle}>{t.updateModal.errorTitle}</Text>
                </View>
                <Text style={styles.errorBody}>{errorMessage || t.updateModal.downloadError}</Text>
              </View>

              <View style={styles.buttonRow}>
                {needsPermissionSettings && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.updateModal.openSettingsBtn}
                    onPress={handleOpenSettings}
                    style={({ pressed }) => [
                      styles.settingsBtn,
                      { backgroundColor: theme.yellow },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Settings size={15} color="#000000" strokeWidth={2.5} style={styles.cancelIcon} />
                    <Text style={styles.settingsBtnText}>{t.updateModal.openSettingsBtn}</Text>
                  </Pressable>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.updateModal.retryBtn}
                  onPress={handleStartUpdate}
                  style={({ pressed }) => [
                    styles.retryBtn,
                    { backgroundColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <RefreshCw size={15} color="#FFFFFF" strokeWidth={3} style={styles.downloadIcon} />
                  <Text style={styles.retryBtnText}>{t.updateModal.retryBtn}</Text>
                </Pressable>
              </View>

              {/* Secondary fallback link to browser */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.updateModal.browserFallback}
                onPress={handleBrowserFallback}
                style={({ pressed }) => [styles.fallbackRow, pressed && styles.pressed]}
              >
                <ExternalLink size={12} color={theme.textTertiary} strokeWidth={2.5} />
                <Text style={[styles.fallbackText, { color: theme.textTertiary }]}>
                  {t.updateModal.browserFallback}
                </Text>
              </Pressable>
            </View>
          )}
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
    maxHeight: '90%',
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
    gap: 8,
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
    flex: 1,
    textAlign: 'center',
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
  disabledBtn: {
    opacity: 0.4,
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
    gap: 8,
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
  progressContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 14,
    marginBottom: 16,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  percentPill: {
    backgroundColor: Theme.colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  percentText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
  },
  progressBarWrapper: {
    marginVertical: 6,
  },
  progressBytesRow: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
  },
  bytesText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
  },
  preparingHelpText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
  readyCard: {
    backgroundColor: '#D1FAE5', // Light Mint
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 14,
    marginBottom: 16,
    ...Theme.shadows.sm,
  },
  readyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  readyTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },
  readySubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    lineHeight: 16,
  },
  errorContainer: {
    marginBottom: 12,
  },
  errorCard: {
    backgroundColor: '#FFE4E6', // Rose light
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 12,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9F1239',
    letterSpacing: 0.5,
  },
  errorBody: {
    fontSize: 11,
    fontWeight: '700',
    color: '#881337',
    lineHeight: 16,
  },
  fallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
  },
  fallbackText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  cancelIcon: {
    marginRight: 6,
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
  installBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.mint, // Mint Fresh
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.md,
  },
  installBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  settingsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.yellow,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  readySettingsBtn: {
    flex: 0,
    marginTop: 10,
  },
  settingsBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.md,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pressed: {
    ...Theme.pressed,
  },
});
