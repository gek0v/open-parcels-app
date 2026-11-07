import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../infrastructure/i18n';
import { AppLoadingSplash } from '../presentation/components/common/AppLoadingSplash';
import { UpdateAvailableModal } from '../presentation/components/common/UpdateAvailableModal';
import { updateService, UpdateInfo } from '../infrastructure/services/UpdateService';
import { Theme } from '../presentation/theme/adaptiveTheme';

export default function RootLayout() {
  const [isLoadingSplash, setIsLoadingSplash] = useState(true);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);

  const handleSplashFinish = () => {
    setIsLoadingSplash(false);
    updateService.checkForUpdate().then((info) => {
      if (info) {
        setAvailableUpdate(info);
      }
    });
  };

  return (
    <I18nProvider>
      <SafeAreaProvider style={styles.provider}>
        <View style={styles.container}>
          <StatusBar style={Theme.isIOS ? 'dark' : 'auto'} />

          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Theme.colors.background },
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

          {/* Custom Neo-Brutalist update modal */}
          {availableUpdate && (
            <UpdateAvailableModal
              visible={!!availableUpdate}
              updateInfo={availableUpdate}
              onClose={() => setAvailableUpdate(null)}
            />
          )}
        </View>
      </SafeAreaProvider>
    </I18nProvider>
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
