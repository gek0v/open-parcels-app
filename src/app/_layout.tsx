import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../infrastructure/i18n';
import { ThemeProvider, useTheme } from '../presentation/theme/ThemeContext';
import { AppLoadingSplash } from '../presentation/components/common/AppLoadingSplash';
import { UpdateAvailableModal } from '../presentation/components/common/UpdateAvailableModal';
import { UpdateToast } from '../presentation/components/common/UpdateToast';
import { updateService, UpdateInfo } from '../infrastructure/services/UpdateService';
import { notificationService } from '../infrastructure/services/NotificationService';
import { registerBackgroundSync } from '../infrastructure/services/BackgroundSyncService';
import { trackingEngineManager } from '../infrastructure/engine';
import { Theme } from '../presentation/theme/adaptiveTheme';
import { ErrorBoundary as AppErrorBoundary } from '../presentation/components/common/ErrorBoundary';

export { default as ErrorBoundary } from '../presentation/components/common/RouteErrorFallback';

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <I18nProvider>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </I18nProvider>
    </AppErrorBoundary>
  );
}

function RootLayoutContent() {
  const { theme, themeKey } = useTheme();
  const [isLoadingSplash, setIsLoadingSplash] = useState(true);
  const [updateToastInfo, setUpdateToastInfo] = useState<UpdateInfo | null>(null);
  const [updateModalInfo, setUpdateModalInfo] = useState<UpdateInfo | null>(null);
  const isMountedRef = useRef(true);
  const splashFinishedRef = useRef(false);
  const hasVisibleUpdateUIRef = useRef(false);

  useEffect(() => {
    hasVisibleUpdateUIRef.current = !!(updateToastInfo || updateModalInfo);
  }, [updateToastInfo, updateModalInfo]);

  const runSilentUpdateCheck = useCallback(() => {
    updateService
      .checkForUpdate()
      .then((info) => {
        if (info && isMountedRef.current && !hasVisibleUpdateUIRef.current) {
          setUpdateToastInfo(info);
        }
      })
      .catch((err) => {
        console.warn('[RootLayout] updateService checkForUpdate error:', err);
      });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void trackingEngineManager.hydrate().catch((err) => {
      console.warn('[RootLayout] trackingEngine hydrate error:', err);
    });

    // Register background sync unconditionally so parcel updates work even if notifications are denied
    void registerBackgroundSync().catch((err) => {
      console.warn('[RootLayout] registerBackgroundSync error:', err);
    });

    void notificationService.requestPermissions().catch((err) => {
      console.warn('[RootLayout] notificationService requestPermissions error:', err);
    });

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && splashFinishedRef.current) {
        runSilentUpdateCheck();
      }
    });

    return () => {
      isMountedRef.current = false;
      sub.remove();
    };
  }, [runSilentUpdateCheck]);

  const handleSplashFinish = useCallback(() => {
    splashFinishedRef.current = true;
    setIsLoadingSplash(false);
    // Check if an update is available on GitHub Releases
    runSilentUpdateCheck();
  }, [runSilentUpdateCheck]);

  const isDarkMode = themeKey === 'tokyoCyberpunk';

  return (
    <SafeAreaProvider style={[styles.provider, { backgroundColor: Theme.isWeb ? theme.surfaceSubtle : theme.canvas }]}>
      <View style={[styles.container, { backgroundColor: theme.canvas }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />

        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.canvas },
            animation: Theme.isIOS ? 'default' : 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen
            name="parcel/[id]"
            options={{
              animation: Theme.isIOS ? 'slide_from_right' : 'fade_from_bottom',
            }}
          />
          <Stack.Screen
            name="new-parcel"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>

        {/* Loading splash screen on startup */}
        {isLoadingSplash && (
          <AppLoadingSplash onFinish={handleSplashFinish} minDurationMs={1100} />
        )}

        {/* Floating Neo-Brutalist Update Toast */}
        {updateToastInfo && (
          <UpdateToast
            updateInfo={updateToastInfo}
            onPress={() => {
              setUpdateModalInfo(updateToastInfo);
              setUpdateToastInfo(null);
            }}
            onDismiss={() => setUpdateToastInfo(null)}
          />
        )}

        {/* Custom Neo-Brutalist update modal */}
        {updateModalInfo && (
          <UpdateAvailableModal
            visible={!!updateModalInfo}
            updateInfo={updateModalInfo}
            onClose={() => setUpdateModalInfo(null)}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    backgroundColor: Theme.isWeb ? Theme.colors.surfaceSubtle : Theme.colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Theme.isWeb ? 820 : undefined,
    alignSelf: 'center',
    backgroundColor: Theme.colors.background,
  },
});
