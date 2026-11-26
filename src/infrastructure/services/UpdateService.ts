import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { isNewerVersion } from '../../domain/validators/version';
import { openSafeWebUrl } from '../utils/url';

export { isNewerVersion };

export const CURRENT_APP_VERSION = '1.5.6';
export const GITHUB_REPO = 'gek0v/open-parcels-app';

const LAST_CHECK_KEY = '@open_parcels:last_update_check';
const IGNORED_VERSION_KEY = '@open_parcels:ignored_version';
const ANDROID_PACKAGE_ID = 'com.openparcels.app';

// Android Intent constants
export const FLAG_GRANT_READ_URI_PERMISSION = 1;
export const FLAG_ACTIVITY_NEW_TASK = 268435456;
export const ANDROID_APK_MIME_TYPE = 'application/vnd.android.package-archive';
export const ANDROID_VIEW_ACTION = 'android.intent.action.VIEW';

export const TRUSTED_DOWNLOAD_HOSTS = [
  'github.com',
  'api.github.com',
  'objects.githubusercontent.com',
  'raw.githubusercontent.com',
  'github-releases.githubusercontent.com',
];

export function isTrustedDownloadUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    return (
      TRUSTED_DOWNLOAD_HOSTS.includes(hostname) ||
      hostname.endsWith('.github.com') ||
      hostname.endsWith('.githubusercontent.com')
    );
  } catch {
    return false;
  }
}

function normalizeVersionTag(version: string): string {
  return String(version ?? '').trim().replace(/^v/i, '');
}

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

  private async fetchGitHubJson(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'open-parcels-app',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check GitHub Releases API for a newer version than CURRENT_APP_VERSION
   * @param force - If true, bypasses last check throttling and ignored versions
   * @param timeoutMs - Optional fetch timeout in milliseconds (defaults to 10000)
   */
  async checkForUpdate(force = false, timeoutMs = 10000): Promise<UpdateInfo | null> {
    try {
      if (!force) {
        // Throttling: Check at most once every 30 minutes after a successful check
        const lastCheckStr = await AsyncStorage.getItem(LAST_CHECK_KEY).catch(() => null);
        if (lastCheckStr) {
          const lastCheck = parseInt(lastCheckStr, 10);
          const thirtyMinutes = 30 * 60 * 1000;
          const elapsed = Date.now() - lastCheck;
          if (!Number.isNaN(lastCheck) && elapsed >= 0 && elapsed < thirtyMinutes) {
            return null;
          }
        }
      }

      let release: any = null;
      const latestRes = await this.fetchGitHubJson(
        `https://api.github.com/repos/${this.repo}/releases/latest`,
        timeoutMs
      );

      if (latestRes.ok) {
        release = await latestRes.json();
      } else if (latestRes.status === 404) {
        // Fallback to recent releases list in case /releases/latest returns 404
        const listRes = await this.fetchGitHubJson(
          `https://api.github.com/repos/${this.repo}/releases?per_page=5`,
          timeoutMs
        );
        if (!listRes.ok) {
          return null;
        }
        const releases = await listRes.json();
        if (Array.isArray(releases)) {
          release = releases.find((r: any) => r && !r.draft && !r.prerelease) || null;
        }
      } else {
        return null;
      }

      // Only record throttle timestamp after a successful GitHub API response
      await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString()).catch(() => {});

      if (!release) {
        return null;
      }

      const latestTag = String(release.tag_name || '').trim();
      if (!isNewerVersion(CURRENT_APP_VERSION, latestTag)) {
        return null;
      }

      const cleanVersion = normalizeVersionTag(latestTag);

      // Check if user chose to ignore this version
      if (!force) {
        const ignored = await AsyncStorage.getItem(IGNORED_VERSION_KEY).catch(() => null);
        if (ignored && normalizeVersionTag(ignored) === cleanVersion) {
          return null;
        }
      }

      // Find .apk asset in release
      const apkAsset = Array.isArray(release.assets)
        ? release.assets.find(
            (asset: any) =>
              typeof asset?.name === 'string' &&
              asset.name.toLowerCase().endsWith('.apk') &&
              typeof asset?.browser_download_url === 'string' &&
              asset.browser_download_url.length > 0
          )
        : null;

      const apkDownloadUrl = apkAsset?.browser_download_url || release.html_url || '';
      const apkSizeMb = apkAsset?.size
        ? Math.round((apkAsset.size / (1024 * 1024)) * 10) / 10
        : undefined;

      return {
        version: cleanVersion || latestTag,
        title: release.name || latestTag,
        changelog: release.body || '',
        publishedAt: release.published_at || '',
        apkDownloadUrl,
        apkSizeMb,
        htmlUrl: release.html_url || '',
        hasApkAsset: !!apkAsset,
      };
    } catch (err) {
      console.warn('Failed to check for updates:', err);
      return null;
    }
  }

  async ignoreVersion(version: string): Promise<void> {
    try {
      const clean = normalizeVersionTag(version);
      if (!clean) return;
      await AsyncStorage.setItem(IGNORED_VERSION_KEY, clean);
    } catch (err) {
      console.warn('Failed to save ignored version:', err);
    }
  }

  async resetIgnoredVersion(): Promise<void> {
    try {
      await AsyncStorage.removeItem(IGNORED_VERSION_KEY);
    } catch (err) {
      console.warn('Failed to reset ignored version:', err);
    }
  }

  async cancelDownload(): Promise<void> {
    this.isCancelled = true;
    if (this.activeDownload) {
      const download = this.activeDownload;
      this.activeDownload = null;
      try {
        await download.cancelAsync();
      } catch {
        // Ignore error on cancel
      }
    }
  }

  getApkFileUri(version: string): string {
    const clean = normalizeVersionTag(version);
    const normalized = `v${clean}`;
    const cleanVersion = normalized.replace(/[^a-zA-Z0-9._-]/g, '_');
    const baseDir =
      FileSystem.documentDirectory || 'file:///data/user/0/com.openparcels.app/files/';
    const dir = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
    return `${dir}open-parcels-${cleanVersion}.apk`;
  }

  async isApkDownloaded(version: string, expectedSizeMb?: number): Promise<boolean> {
    try {
      const fileUri = this.getApkFileUri(version);
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists || !info.size || info.size <= 0) {
        return false;
      }
      if (expectedSizeMb && expectedSizeMb > 0) {
        const minBytes = expectedSizeMb * 1024 * 1024 * 0.9;
        return info.size >= minBytes;
      }
      return true;
    } catch {
      return false;
    }
  }

  async downloadApk(
    updateInfo: UpdateInfo,
    onProgress?: DownloadProgressCallback
  ): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('ONLY_ANDROID_SUPPORTED');
    }

    if (!isTrustedDownloadUrl(updateInfo.apkDownloadUrl)) {
      throw new Error('UNTRUSTED_DOWNLOAD_URL');
    }

    if (
      updateInfo.hasApkAsset === false ||
      (!updateInfo.apkDownloadUrl.toLowerCase().includes('.apk') &&
        updateInfo.apkDownloadUrl === updateInfo.htmlUrl)
    ) {
      throw new Error('NO_APK_ASSET');
    }

    // Cancel any leftover active download before starting a fresh one
    if (this.activeDownload) {
      await this.cancelDownload();
    }

    this.isCancelled = false;
    const destinationUri = this.getApkFileUri(updateInfo.version);
    const tmpUri = `${destinationUri}.tmp`;

    // Reuse cached APK only if it passes size validation; otherwise delete corrupted file
    const alreadyValid = await this.isApkDownloaded(updateInfo.version, updateInfo.apkSizeMb);
    if (alreadyValid) {
      const existing = await FileSystem.getInfoAsync(destinationUri);
      if (onProgress) {
        const size = (existing.exists && existing.size) || 0;
        onProgress({
          progress: 1,
          percent: 100,
          bytesWritten: size,
          totalBytesExpectedToWrite: size,
        });
      }
      return destinationUri;
    }

    await this.safeDelete(destinationUri);
    await this.safeDelete(tmpUri);

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

      const headers = (result as any).headers as Record<string, string> | undefined;
      const contentType =
        headers?.['content-type'] || headers?.['Content-Type'] || '';
      if (contentType.toLowerCase().includes('text/html')) {
        await this.safeDelete(tmpUri);
        throw new Error('INVALID_APK_CONTENT');
      }

      const tmpInfo = await FileSystem.getInfoAsync(tmpUri);
      if (!tmpInfo.exists || !tmpInfo.size || tmpInfo.size <= 0) {
        await this.safeDelete(tmpUri);
        throw new Error('EMPTY_DOWNLOAD');
      }

      if (updateInfo.apkSizeMb && updateInfo.apkSizeMb >= 1) {
        const minBytes = Math.max(0, (updateInfo.apkSizeMb - 0.1) * 1024 * 1024 * 0.9);
        if (tmpInfo.size < minBytes) {
          await this.safeDelete(tmpUri);
          throw new Error('INCOMPLETE_DOWNLOAD');
        }
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

  async installApk(fileUriOrVersion: string): Promise<InstallResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'In-app APK installation is only supported on Android.',
      };
    }

    if (!fileUriOrVersion || !String(fileUriOrVersion).trim()) {
      return {
        success: false,
        error: 'APK file path or version is missing.',
      };
    }

    try {
      const trimmed = String(fileUriOrVersion).trim();
      const fileUri =
        trimmed.includes('://') || trimmed.startsWith('/')
          ? trimmed
          : this.getApkFileUri(trimmed);

      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        return {
          success: false,
          error: 'APK file not found on device.',
        };
      }

      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      const flags = FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK;

      const result = await IntentLauncher.startActivityAsync(ANDROID_VIEW_ACTION, {
        data: contentUri,
        type: ANDROID_APK_MIME_TYPE,
        flags,
      });

      return {
        success: true,
        cancelled:
          (result as any)?.resultCode === (IntentLauncher as any).ResultCode?.Canceled ||
          (result as any)?.resultCode === 0,
      };
    } catch (err: any) {
      console.warn('Install APK error:', err);
      const errMsg = err?.message || String(err);
      const isPermissionError =
        /permission|unknown source|not allowed|activity not found|security|install/i.test(errMsg);

      return {
        success: false,
        error: errMsg,
        needsPermissionSettings: isPermissionError,
      };
    }
  }

  async openInstallUnknownAppsSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      const action =
        (IntentLauncher as any).ActivityAction?.MANAGE_UNKNOWN_APP_SOURCES ||
        'android.settings.MANAGE_UNKNOWN_APP_SOURCES';
      await IntentLauncher.startActivityAsync(action, {
        data: `package:${ANDROID_PACKAGE_ID}`,
      });
      return true;
    } catch (err) {
      console.warn('Failed to open unknown app sources settings:', err);
      try {
        const fallbackAction =
          (IntentLauncher as any).ActivityAction?.APPLICATION_DETAILS_SETTINGS ||
          'android.settings.APPLICATION_DETAILS_SETTINGS';
        await IntentLauncher.startActivityAsync(fallbackAction, {
          data: `package:${ANDROID_PACKAGE_ID}`,
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  async openInstallPermissionSettings(): Promise<boolean> {
    return this.openInstallUnknownAppsSettings();
  }

  async openInBrowser(url: string): Promise<void> {
    const success = await openSafeWebUrl(url);
    if (!success) {
      console.warn('Failed to open URL in browser (unsafe or unsupported):', url);
    }
  }

  async deleteDownloadedApk(version: string): Promise<void> {
    const fileUri = this.getApkFileUri(version);
    await this.safeDelete(fileUri);
    await this.safeDelete(`${fileUri}.tmp`);
  }

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
