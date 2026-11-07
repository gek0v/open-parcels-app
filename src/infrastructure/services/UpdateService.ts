import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isNewerVersion } from '../../domain/validators/version';

export { isNewerVersion };

export const CURRENT_APP_VERSION = '1.0.0';
export const GITHUB_REPO = 'gek0v/open-parcels-app';

const LAST_CHECK_KEY = '@open_parcels:last_update_check';
const IGNORED_VERSION_KEY = '@open_parcels:ignored_version';

export interface UpdateInfo {
  version: string;
  title: string;
  changelog: string;
  publishedAt: string;
  apkDownloadUrl: string;
  apkSizeMb?: number;
  htmlUrl: string;
}

export class UpdateService {
  private repo = GITHUB_REPO;

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

  async startDownload(url: string): Promise<void> {
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn('Failed to open download URL:', err);
    }
  }
}

export const updateService = new UpdateService();
