import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { isNewerVersion } from '../../domain/validators/version';

export { isNewerVersion };

export const CURRENT_APP_VERSION = '1.5.0';
export const GITHUB_REPO = 'gek0v/open-parcels-app';

const LAST_CHECK_KEY = '@open_parcels:last_update_check';
const IGNORED_VERSION_KEY = '@open_parcels:ignored_version';
const ANDROID_PACKAGE_ID = 'com.openparcels.app';

// Android Intent constants
export const FLAG_GRANT_READ_URI_PERMISSION = 1;
export const FLAG_ACTIVITY_NEW_TASK = 268435456;
export const ANDROID_APK_MIME_TYPE = 'application/vnd.android.package-archive';
export const ANDROID_VIEW_ACTION = 'android.intent.action.VIEW';

export interface UpdateInfo {
  version: string;
  title: string;
  changelog: string;
  publishedAt: string;
  apkDownloadUrl: string;
  apkSizeMb?: number;
  htmlUrl: string;
  hasApkAsset?: boolean;
}

export interface DownloadProgress {
  progress: number; // 0..1
  percent: number; // 0..100
  bytesWritten: number;
  totalBytesExpectedToWrite: number;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

export interface InstallResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
  needsPermissionSettings?: boolean;
}

export class DownloadCancelledError extends Error {
  constructor() {
    super('DOWNLOAD_CANCELLED');
    this.name = 'DownloadCancelledError';
  }
}

export class UpdateService {
  private repo = GITHUB_REPO;
  private activeDownload: FileSystem.DownloadResumable | null = null;
  private isCancelled = false;

  /**
   * Check GitHub Releases API for a newer version than CURRENT_APP_VERSION
   * @param force - If true, bypasses last check throttling and ignored versions
   */
  async checkForUpdate(force = false): Promise<UpdateInfo | null> {
    try {
      if (!force) {
        // Throttling: Check at most once every 30 minutes in normal launch
        const lastCheckStr = await AsyncStorage.getItem(LAST_CHECK_KEY);
        if (lastCheckStr) {
          const lastCheck = parseInt(lastCheckStr, 10);
          const thirtyMinutes = 30 * 60 * 1000;
          if (Date.now() - lastCheck < thirtyMinutes) {
            return null;
          }
        }
      }

      await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

      const res = await fetch(`https://api.github.com/repos/${this.repo}/releases/latest`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) {
        return null;
      }

      const release = await res.json();
      const latestTag = release.tag_name || '';

      if (!isNewerVersion(CURRENT_APP_VERSION, latestTag)) {
        return null;
      }

      // Check if user chose to ignore this version
      if (!force) {
        const ignored = await AsyncStorage.getItem(IGNORED_VERSION_KEY);
        if (ignored === latestTag) {
          return null;
        }
      }

      // Find APK asset
      const apkAsset = release.assets?.find((a: any) =>
        a.name?.toLowerCase().endsWith('.apk')
      );

      const downloadUrl = apkAsset?.browser_download_url || release.html_url;
      const sizeMb = apkAsset ? Math.round((apkAsset.size / (1024 * 1024)) * 10) / 10 : undefined;

      const updateInfo: UpdateInfo = {
        version: latestTag.replace(/^v/, ''),
        title: release.name || `Open Parcels v${latestTag}`,
        changelog: release.body || 'Correcciones y mejoras generales.',
        publishedAt: release.published_at || new Date().toISOString(),
        apkDownloadUrl: downloadUrl,
        apkSizeMb: sizeMb,
        htmlUrl: release.html_url,
        hasApkAsset: Boolean(apkAsset?.browser_download_url),
      };

      return updateInfo;
    } catch (err) {
      console.warn('Update check failed:', err);
      return null;
    }
  }

  async ignoreVersion(version: string): Promise<void> {
    await AsyncStorage.setItem(IGNORED_VERSION_KEY, version);
  }

  /**
   * Return the canonical local file URI for a given version APK
   */
  getApkFileUri(version: string): string {
    const cleanVersion = version.replace(/^v/, '');
    const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    return `${dir}open-parcels-v${cleanVersion}.apk`;
  }

  /**
   * Check whether the APK for a given version is already completely downloaded on disk
   */
  async isApkDownloaded(version: string, expectedSizeMb?: number): Promise<boolean> {
    try {
      const fileUri = this.getApkFileUri(version);
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists || !info.size || info.size <= 0) {
        return false;
      }

      // If expected size is known, verify file is not severely truncated (at least 70% of expected size)
      if (expectedSizeMb && expectedSizeMb > 0) {
        const actualMb = info.size / (1024 * 1024);
        if (actualMb < expectedSizeMb * 0.7) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download the APK for the specified updateInfo reporting real-time progress.
   * If the APK is already completely downloaded, skips re-downloading.
   */
  async downloadApk(
    updateInfo: UpdateInfo,
    onProgress?: DownloadProgressCallback
  ): Promise<string> {
    const version = updateInfo.version;
    const destinationUri = this.getApkFileUri(version);
    const tmpUri = `${destinationUri}.tmp`;

    // Cancel any existing download before starting a new one
    if (this.activeDownload) {
      await this.cancelDownload();
    }
    this.isCancelled = false;

    // Re-use if already fully downloaded
    const alreadyDownloaded = await this.isApkDownloaded(version, updateInfo.apkSizeMb);
    if (this.isCancelled) {
      throw new DownloadCancelledError();
    }
    if (alreadyDownloaded) {
      if (onProgress) {
        const info = await FileSystem.getInfoAsync(destinationUri);
        const size =
          (info.exists && info.size) ||
          (updateInfo.apkSizeMb ? Math.round(updateInfo.apkSizeMb * 1024 * 1024) : 0);
        onProgress({
          progress: 1,
          percent: 100,
          bytesWritten: size,
          totalBytesExpectedToWrite: size,
        });
      }
      return destinationUri;
    }

    if (
      updateInfo.hasApkAsset === false ||
      (!updateInfo.apkDownloadUrl.toLowerCase().includes('.apk') &&
        updateInfo.apkDownloadUrl === updateInfo.htmlUrl)
    ) {
      throw new Error('NO_APK_ASSET');
    }

    try {
      await FileSystem.deleteAsync(tmpUri, { idempotent: true });
    } catch {
      // Ignore cleanup failures
    }
    if (this.isCancelled) {
      throw new DownloadCancelledError();
    }

    const progressCallback = (data: FileSystem.DownloadProgressData) => {
      if (this.isCancelled) return;
      const bytesWritten = Math.max(0, data.totalBytesWritten);
      let totalBytesExpected = data.totalBytesExpectedToWrite;
      if (totalBytesExpected <= 0 && updateInfo.apkSizeMb) {
        totalBytesExpected = Math.round(updateInfo.apkSizeMb * 1024 * 1024);
      }

      const progress =
        totalBytesExpected > 0
          ? Math.min(1, Math.max(0, bytesWritten / totalBytesExpected))
          : 0;

      if (onProgress) {
        onProgress({
          progress,
          percent: Math.min(100, Math.round(progress * 100)),
          bytesWritten,
          totalBytesExpectedToWrite: totalBytesExpected,
        });
      }
    };

    const downloadResumable = FileSystem.createDownloadResumable(
      updateInfo.apkDownloadUrl,
      tmpUri,
      {},
      progressCallback
    );
    this.activeDownload = downloadResumable;

    try {
      const result = await downloadResumable.downloadAsync();
      this.activeDownload = null;

      if (this.isCancelled || !result) {
        await this.safeDelete(tmpUri);
        throw new DownloadCancelledError();
      }

      if (typeof result.status === 'number' && result.status >= 400) {
        await this.safeDelete(tmpUri);
        throw new Error(`HTTP_${result.status}`);
      }

      const tmpInfo = await FileSystem.getInfoAsync(tmpUri);
      if (!tmpInfo.exists || !tmpInfo.size || tmpInfo.size <= 0) {
        await this.safeDelete(tmpUri);
        throw new Error('EMPTY_DOWNLOAD');
      }

      // Atomic replace: remove previous file if present and move tmp into place
      await this.safeDelete(destinationUri);
      await FileSystem.moveAsync({
        from: tmpUri,
        to: destinationUri,
      });

      if (onProgress) {
        const finalInfo = await FileSystem.getInfoAsync(destinationUri);
        const finalSize = (finalInfo.exists && finalInfo.size) || tmpInfo.size || 0;
        onProgress({
          progress: 1,
          percent: 100,
          bytesWritten: finalSize,
          totalBytesExpectedToWrite: finalSize,
        });
      }

      return destinationUri;
    } catch (err: any) {
      this.activeDownload = null;
      await this.safeDelete(tmpUri);
      if (this.isCancelled || err instanceof DownloadCancelledError || err?.message === 'DOWNLOAD_CANCELLED') {
        throw new DownloadCancelledError();
      }
      throw err;
    }
  }

  /**
   * Cancel an in-progress download task and clean up temporary files
   */
  async cancelDownload(): Promise<void> {
    this.isCancelled = true;
    const current = this.activeDownload;
    this.activeDownload = null;
    if (current) {
      try {
        await current.cancelAsync();
      } catch (err) {
        console.warn('Error cancelling active download:', err);
      }
    }
  }

  /**
   * Launch native Android package installer using content:// URI
   * and IntentLauncher with read permission flags
   */
  async installApk(fileUriOrVersion: string): Promise<InstallResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'In-app APK installation is only supported on Android.',
      };
    }

    try {
      const fileUri =
        fileUriOrVersion.includes('://') || fileUriOrVersion.startsWith('/')
          ? fileUriOrVersion
          : this.getApkFileUri(fileUriOrVersion);

      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        return {
          success: false,
          error: 'APK file not found on device.',
        };
      }

      // Convert local file:// URI to content:// URI via FileSystemFileProvider
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      const flags = FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK;

      const result = await IntentLauncher.startActivityAsync(ANDROID_VIEW_ACTION, {
        data: contentUri,
        flags,
        type: ANDROID_APK_MIME_TYPE,
      });

      return {
        success: true,
        cancelled: result?.resultCode === IntentLauncher.ResultCode.Canceled,
      };
    } catch (err: any) {
      const message = err?.message || String(err);
      const isPermissionError =
        /permission|unknown source|not allowed|activity not found|security|install/i.test(message);

      console.warn('Error launching APK installer:', message);
      return {
        success: false,
        error: message,
        needsPermissionSettings: isPermissionError,
      };
    }
  }

  /**
   * Open the Android system screen to allow installing unknown apps for this package
   */
  async openInstallUnknownAppsSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES,
        {
          data: `package:${ANDROID_PACKAGE_ID}`,
        }
      );
      return true;
    } catch {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
          {
            data: `package:${ANDROID_PACKAGE_ID}`,
          }
        );
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Fallback: open web URL in system browser
   */
  async openInBrowser(url: string): Promise<void> {
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn('Failed to open URL in browser:', err);
    }
  }

  /**
   * Delete downloaded APK file and any temporary files for a version
   */
  async deleteDownloadedApk(version: string): Promise<void> {
    const fileUri = this.getApkFileUri(version);
    await this.safeDelete(fileUri);
    await this.safeDelete(`${fileUri}.tmp`);
  }

  /**
   * Backward compatibility fallback
   */
  async startDownload(url: string): Promise<void> {
    await this.openInBrowser(url);
  }

  private async safeDelete(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

export const updateService = new UpdateService();