import React from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardScreen } from '../presentation/screens/DashboardScreen';
import { useTheme } from '../presentation/theme/ThemeContext';
import { Parcel } from '../domain/models/parcel';

export default function IndexScreen() {
  const { theme } = useTheme();

  const handleSelectParcel = (parcel: Parcel) => {
    router.push({
      pathname: '/parcel/[id]',
      params: { id: parcel.id },
    });
  };

  const handleOpenNewParcel = (initialData?: { trackingNumber?: string; carrierSlug?: string }) => {
    router.push({
      pathname: '/new-parcel',
      params: initialData,
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.canvas }]} edges={['top', 'bottom', 'left', 'right']}>
      <DashboardScreen
        onSelectParcel={handleSelectParcel}
        onOpenNewParcel={handleOpenNewParcel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
