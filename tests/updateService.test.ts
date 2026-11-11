import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { isNewerVersion } from '../src/domain/validators/version';
import type { UpdateInfo } from '../src/infrastructure/services/UpdateService';

// Ensure __DEV__ exists if anything inspects it
(globalThis as any).__DEV__ = false;

// In-memory mock filesystem & storage
let mockFiles: Record<string, { exists: boolean; size: number }> = {};
let mockStorage: Record<string, string> = {};
let createDownloadResumableCalls: any[] = [];
let deleteAsyncCalls: string[] = [];
let moveAsyncCalls: Array<{ from: string; to: string }> = [];
let getContentUriAsyncCalls: string[] = [];
let startActivityAsyncCalls: any[] = [];
let openURLCalls: string[] = [];
let mockPlatformOS = 'android';
let mockStartActivityResult: any = { resultCode: -1 };
let mockDownloadResult: any = { uri: 'file:///mock/open-parcels-v1.3.0.apk.tmp', status: 200 };
let simulateDownloadError: Error | null = null;
let deferredDownloadResolve: ((val: any) => void) | null = null;
let deferredDownloadReject: ((err: any) => void) | null = null;
let useDeferredDownload = false;
let onDownloadStarted: (() => void) | null = null;
let simulateInstallError: Error | null = null;
let activeDownloadProgressCallback: any = null;

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => mockStorage[key] ?? null,
    setItem: async (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: async (key: string) => {
      delete mockStorage[key];
    },
  },
}));

mock.module('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///data/user/0/com.openparcels.app/files/',
  cacheDirectory: 'file:///data/user/0/com.openparcels.app/cache/',
  getInfoAsync: async (uri: string) => {
    const file = mockFiles[uri];
    if (!file || !file.exists) {
      return { exists: false, isDirectory: false };
    }
    return { exists: true, isDirectory: false, size: file.size, uri };
  },
  deleteAsync: async (uri: string) => {
    deleteAsyncCalls.push(uri);
    delete mockFiles[uri];
  },
  moveAsync: async (options: { from: string; to: string }) => {
    moveAsyncCalls.push(options);
    const existing = mockFiles[options.from];
    if (existing) {
      mockFiles[options.to] = { ...existing };
      delete mockFiles[options.from];
    }
  },
  getContentUriAsync: async (uri: string) => {
    getContentUriAsyncCalls.push(uri);
    return uri.replace('file://', 'content://');
  },
  createDownloadResumable: (
    url: string,
    fileUri: string,
    options: any,
    callback: any
  ) => {
    activeDownloadProgressCallback = callback;
    const task = {
      url,
      fileUri,
      options,
      downloadAsync: async () => {
        createDownloadResumableCalls.push({ url, fileUri, options });
        if (useDeferredDownload) {
          return new Promise((resolve, reject) => {
            deferredDownloadResolve = resolve;
            deferredDownloadReject = reject;
            if (onDownloadStarted) {
              onDownloadStarted();
            }
          });
        }
        if (simulateDownloadError) {
          throw simulateDownloadError;
        }
        if (callback) {
          callback({
            totalBytesWritten: 68 * 1024 * 1024,
            totalBytesExpectedToWrite: 68 * 1024 * 1024,
          });
        }
        mockFiles[fileUri] = { exists: true, size: 68 * 1024 * 1024 };
        return mockDownloadResult;
      },
      cancelAsync: async () => {
        simulateDownloadError = new Error('DOWNLOAD_CANCELLED');
        if (deferredDownloadReject) {
          deferredDownloadReject(new Error('DOWNLOAD_CANCELLED'));
        }
      },
    };
    return task;
  },
}));

mock.module('expo-intent-launcher', () => ({
  ActivityAction: {
    MANAGE_UNKNOWN_APP_SOURCES: 'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
    APPLICATION_DETAILS_SETTINGS: 'android.settings.APPLICATION_DETAILS_SETTINGS',
  },
  ResultCode: {
    Success: -1,
    Canceled: 0,
    FirstUser: 1,
  },
  startActivityAsync: async (action: string, params: any) => {
    startActivityAsyncCalls.push({ action, params });
    if (simulateInstallError) {
      throw simulateInstallError;
    }
    return mockStartActivityResult;
  },
}));

mock.module('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    },
    select: (obj: any) => obj[mockPlatformOS] || obj.default,
  },
  Linking: {
    openURL: async (url: string) => {
      openURLCalls.push(url);
    },
  },
  TurboModuleRegistry: {
    get: () => null,
  },
}));

const {
  UpdateService,
  FLAG_GRANT_READ_URI_PERMISSION,
  FLAG_ACTIVITY_NEW_TASK,
  ANDROID_APK_MIME_TYPE,
  ANDROID_VIEW_ACTION,
} = await import('../src/infrastructure/services/UpdateService');

describe('UpdateService Version Comparator', () => {
  it('detects newer patch version', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true);
    expect(isNewerVersion('v1.0.0', 'v1.0.1')).toBe(true);
    expect(isNewerVersion('1.0.0', 'v1.0.1')).toBe(true);
  });

  it('detects newer minor and major versions', () => {
    expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true);
    expect(isNewerVersion('1.0.9', '1.1.0')).toBe(true);
    expect(isNewerVersion('1.9.9', '2.0.0')).toBe(true);
    expect(isNewerVersion('0.9.0', '1.0.0')).toBe(true);
  });

  it('correctly handles same version or older version', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('v1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(false);
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(false);
  });
});

describe('UpdateService In-App APK Download & Storage', () => {
  let service: InstanceType<typeof UpdateService>;

  beforeEach(() => {
    service = new UpdateService();
    mockFiles = {};
    mockStorage = {};
    createDownloadResumableCalls = [];
    deleteAsyncCalls = [];
    moveAsyncCalls = [];
    getContentUriAsyncCalls = [];
    startActivityAsyncCalls = [];
    openURLCalls = [];
    mockPlatformOS = 'android';
    mockStartActivityResult = { resultCode: -1 };
    mockDownloadResult = { uri: 'file:///mock/open-parcels-v1.3.0.apk.tmp', status: 200 };
    simulateDownloadError = null;
    simulateInstallError = null;
    activeDownloadProgressCallback = null;
    useDeferredDownload = false;
    deferredDownloadResolve = null;
    deferredDownloadReject = null;
    onDownloadStarted = null;
  });

  it('computes clean versioned file URI', () => {
    const uri1 = service.getApkFileUri('1.3.0');
    expect(uri1).toBe('file:///data/user/0/com.openparcels.app/files/open-parcels-v1.3.0.apk');

    const uri2 = service.getApkFileUri('v1.3.0');
    expect(uri2).toBe('file:///data/user/0/com.openparcels.app/files/open-parcels-v1.3.0.apk');
  });

  it('isApkDownloaded returns false when file does not exist or has 0 bytes', async () => {
    expect(await service.isApkDownloaded('1.3.0')).toBe(false);

    const uri = service.getApkFileUri('1.3.0');
    mockFiles[uri] = { exists: true, size: 0 };
    expect(await service.isApkDownloaded('1.3.0')).toBe(false);
  });

  it('isApkDownloaded validates expected size threshold', async () => {
    const uri = service.getApkFileUri('1.3.0');
    mockFiles[uri] = { exists: true, size: 20 * 1024 * 1024 };
    expect(await service.isApkDownloaded('1.3.0', 70)).toBe(false);

    mockFiles[uri] = { exists: true, size: 68 * 1024 * 1024 };
    expect(await service.isApkDownloaded('1.3.0', 70)).toBe(true);
  });

  it('downloadApk reuses existing APK without downloading again', async () => {
    const uri = service.getApkFileUri('1.3.0');
    mockFiles[uri] = { exists: true, size: 68 * 1024 * 1024 };

    const updateInfo: UpdateInfo = {
      version: '1.3.0',
      title: 'v1.3.0',
      changelog: 'Test',
      publishedAt: '2026-11-11',
      apkDownloadUrl: 'https://github.com/gek0v/open-parcels-app/releases/download/v1.3.0/open-parcels-v1.3.0.apk',
      apkSizeMb: 68,
      htmlUrl: 'https://github.com/gek0v/open-parcels-app/releases/tag/v1.3.0',
      hasApkAsset: true,
    };

    let reportedProgress: any = null;
    const dest = await service.downloadApk(updateInfo, (p) => {
      reportedProgress = p;
    });

    expect(dest).toBe(uri);
    expect(createDownloadResumableCalls.length).toBe(0);
    expect(reportedProgress?.progress).toBe(1);
    expect(reportedProgress?.percent).toBe(100);
  });

  it('downloadApk performs in-app download with real-time progress and moves file to final URI', async () => {
    const updateInfo: UpdateInfo = {
      version: '1.3.0',
      title: 'v1.3.0',
      changelog: 'Test',
      publishedAt: '2026-11-11',
      apkDownloadUrl: 'https://github.com/gek0v/open-parcels-app/releases/download/v1.3.0/open-parcels-v1.3.0.apk',
      apkSizeMb: 68,
      htmlUrl: 'https://github.com/gek0v/open-parcels-app/releases/tag/v1.3.0',
      hasApkAsset: true,
    };

    const progressReports: any[] = [];
    const dest = await service.downloadApk(updateInfo, (p) => {
      progressReports.push(p);
    });

    const expectedUri = service.getApkFileUri('1.3.0');
    expect(dest).toBe(expectedUri);
    expect(createDownloadResumableCalls.length).toBe(1);
    expect(createDownloadResumableCalls[0].url).toBe(updateInfo.apkDownloadUrl);
    expect(createDownloadResumableCalls[0].fileUri).toBe(expectedUri + '.tmp');

    expect(moveAsyncCalls.length).toBe(1);
    expect(moveAsyncCalls[0].from).toBe(expectedUri + '.tmp');
    expect(moveAsyncCalls[0].to).toBe(expectedUri);

    expect(progressReports.length).toBeGreaterThan(0);
    const lastProgress = progressReports[progressReports.length - 1];
    expect(lastProgress.progress).toBe(1);
    expect(lastProgress.percent).toBe(100);
    expect(lastProgress.bytesWritten).toBe(68 * 1024 * 1024);
  });

  it('downloadApk calculates progress against apkSizeMb when server contentLength is 0 or negative', async () => {
    const updateInfo: UpdateInfo = {
      version: '1.3.0',
      title: 'v1.3.0',
      changelog: 'Test',
      publishedAt: '2026-11-11',
      apkDownloadUrl: 'https://github.com/gek0v/open-parcels-app/releases/download/v1.3.0/open-parcels-v1.3.0.apk',
      apkSizeMb: 50,
      htmlUrl: 'https://github.com/gek0v/open-parcels-app/releases/tag/v1.3.0',
      hasApkAsset: true,
    };

    let reportedProgress: any = null;
    await service.downloadApk(updateInfo, (p) => {
      reportedProgress = p;
    });

    expect(activeDownloadProgressCallback).toBeDefined();
    activeDownloadProgressCallback({
      totalBytesWritten: 25 * 1024 * 1024,
      totalBytesExpectedToWrite: -1,
    });

    expect(reportedProgress.progress).toBe(0.5);
    expect(reportedProgress.percent).toBe(50);
    expect(reportedProgress.totalBytesExpectedToWrite).toBe(50 * 1024 * 1024);
  });

  it('downloadApk throws DownloadCancelledError when cancelled and cleans up tmp file', async () => {
    const updateInfo: UpdateInfo = {
      version: '1.3.0',
      title: 'v1.3.0',
      changelog: 'Test',
      publishedAt: '2026-11-11',
      apkDownloadUrl: 'https://github.com/gek0v/open-parcels-app/releases/download/v1.3.0/open-parcels-v1.3.0.apk',
      apkSizeMb: 68,
      htmlUrl: 'https://github.com/gek0v/open-parcels-app/releases/tag/v1.3.0',
      hasApkAsset: true,
    };

    simulateDownloadError = new Error('DOWNLOAD_CANCELLED');

    await expect(service.downloadApk(updateInfo)).rejects.toThrow('DOWNLOAD_CANCELLED');
  });

  it('cancelDownload cancels active download task', async () => {
    const updateInfo: UpdateInfo = {
      version: '1.3.0',
      title: 'v1.3.0',
      changelog: 'Test',
      publishedAt: '2026-11-11',
      apkDownloadUrl: 'https://github.com/gek0v/open-parcels-app/releases/download/v1.3.0/open-parcels-v1.3.0.apk',
      apkSizeMb: 68,
      htmlUrl: 'https://github.com/gek0v/open-parcels-app/releases/tag/v1.3.0',
      hasApkAsset: true,
    };

    // Start slow in-flight download
    useDeferredDownload = true;
    const started = new Promise<void>((resolve) => {
      onDownloadStarted = resolve;
    });
    const promise = service.downloadApk(updateInfo);
    await started;
    await service.cancelDownload();
    await expect(promise).rejects.toThrow('DOWNLOAD_CANCELLED');
  });

  it('downloadApk rejects HTTP errors from server', async () => {
    const updateInfo: UpdateInfo = {
      version: '1.3.0',
      title: 'v1.3.0',
      changelog: 'Test',
      publishedAt: '2026-11-11',
      apkDownloadUrl: 'https://github.com/gek0v/open-parcels-app/releases/download/v1.3.0/open-parcels-v1.3.0.apk',
      apkSizeMb: 68,
      htmlUrl: 'https://github.com/gek0v/open-parcels-app/releases/tag/v1.3.0',
      hasApkAsset: true,
    };

    mockDownloadResult = { uri: 'file:///mock/tmp', status: 404 };

    await expect(service.downloadApk(updateInfo)).rejects.toThrow('HTTP_404');
  });

  it('downloadApk rejects when no APK asset exists on release', async () => {
    const updateInfo: UpdateInfo = {
      version: '1.3.0',
      title: 'v1.3.0',
      changelog: 'Test',
      publishedAt: '2026-11-11',
      apkDownloadUrl: 'https://github.com/gek0v/open-parcels-app/releases/tag/v1.3.0',
      htmlUrl: 'https://github.com/gek0v/open-parcels-app/releases/tag/v1.3.0',
      hasApkAsset: false,
    };

    await expect(service.downloadApk(updateInfo)).rejects.toThrow('NO_APK_ASSET');
  });

  it('deleteDownloadedApk deletes both final and tmp files', async () => {
    const uri = service.getApkFileUri('1.3.0');
    mockFiles[uri] = { exists: true, size: 100 };
    mockFiles[uri + '.tmp'] = { exists: true, size: 50 };

    await service.deleteDownloadedApk('1.3.0');

    expect(deleteAsyncCalls).toContain(uri);
    expect(deleteAsyncCalls).toContain(uri + '.tmp');
  });
});

describe('UpdateService Native Android Installer & Intent Launching', () => {
  let service: InstanceType<typeof UpdateService>;

  beforeEach(() => {
    service = new UpdateService();
    mockFiles = {};
    mockStorage = {};
    createDownloadResumableCalls = [];
    deleteAsyncCalls = [];
    moveAsyncCalls = [];
    getContentUriAsyncCalls = [];
    startActivityAsyncCalls = [];
    openURLCalls = [];
    mockPlatformOS = 'android';
    mockStartActivityResult = { resultCode: -1 };
    simulateDownloadError = null;
    simulateInstallError = null;
  });

  it('installApk resolves content:// URI and launches Android VIEW intent with APK mime and flags', async () => {
    const fileUri = service.getApkFileUri('1.3.0');
    mockFiles[fileUri] = { exists: true, size: 68 * 1024 * 1024 };

    const result = await service.installApk('1.3.0');

    expect(result.success).toBe(true);
    expect(result.cancelled).toBe(false);
    expect(getContentUriAsyncCalls).toContain(fileUri);

    expect(startActivityAsyncCalls.length).toBe(1);
    const call = startActivityAsyncCalls[0];
    expect(call.action).toBe(ANDROID_VIEW_ACTION);
    expect(call.params.data).toBe('content:///data/user/0/com.openparcels.app/files/open-parcels-v1.3.0.apk');
    expect(call.params.type).toBe(ANDROID_APK_MIME_TYPE);
    expect(call.params.flags).toBe(FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK);
    expect(call.params.flags).toBe(268435457);
  });

  it('installApk reports cancelled when user cancels package installer activity', async () => {
    const fileUri = service.getApkFileUri('1.3.0');
    mockFiles[fileUri] = { exists: true, size: 68 * 1024 * 1024 };
    mockStartActivityResult = { resultCode: 0 };

    const result = await service.installApk(fileUri);

    expect(result.success).toBe(true);
    expect(result.cancelled).toBe(true);
  });

  it('installApk returns error when local file does not exist', async () => {
    const result = await service.installApk('1.3.0');
    expect(result.success).toBe(false);
    expect(result.error).toContain('APK file not found');
  });

  it('installApk detects permission error and sets needsPermissionSettings', async () => {
    const fileUri = service.getApkFileUri('1.3.0');
    mockFiles[fileUri] = { exists: true, size: 68 * 1024 * 1024 };
    simulateInstallError = new Error('Permission denied: not allowed to install from unknown source');

    const result = await service.installApk('1.3.0');

    expect(result.success).toBe(false);
    expect(result.needsPermissionSettings).toBe(true);
    expect(result.error).toContain('unknown source');
  });

  it('installApk returns error on non-Android platforms', async () => {
    mockPlatformOS = 'ios';
    const result = await service.installApk('1.3.0');

    expect(result.success).toBe(false);
    expect(result.error).toContain('only supported on Android');
  });

  it('openInstallUnknownAppsSettings launches MANAGE_UNKNOWN_APP_SOURCES with package URI', async () => {
    const success = await service.openInstallUnknownAppsSettings();

    expect(success).toBe(true);
    expect(startActivityAsyncCalls.length).toBe(1);
    expect(startActivityAsyncCalls[0].action).toBe('android.settings.MANAGE_UNKNOWN_APP_SOURCES');
    expect(startActivityAsyncCalls[0].params.data).toBe('package:com.openparcels.app');
  });

  it('openInBrowser delegates to Linking.openURL', async () => {
    await service.openInBrowser('https://github.com/gek0v/open-parcels-app');
    expect(openURLCalls).toContain('https://github.com/gek0v/open-parcels-app');
  });
});
