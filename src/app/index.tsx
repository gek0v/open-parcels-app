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
    const params: Record<string, string> = {};
    if (initialData?.trackingNumber) {
      params.trackingNumber = initialData.trackingNumber;
    }
    if (initialData?.carrierSlug) {
      params.carrierSlug = initialData.carrierSlug;
    }
    if (Object.keys(params).length > 0) {
      router.push({
        pathname: '/new-parcel',
        params,
      });
    } else {
      router.push('/new-parcel');
    }
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
