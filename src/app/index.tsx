import React from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardScreen } from '../presentation/screens/DashboardScreen';
import { Theme } from '../presentation/theme/adaptiveTheme';
import { Parcel } from '../domain/models/parcel';

export default function IndexScreen() {
  const handleSelectParcel = (parcel: Parcel) => {
    router.push({
      pathname: '/parcel/[id]',
      params: { id: parcel.id },
    });
  };

  const handleOpenNewParcel = () => {
    router.push('/new-parcel');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
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
    backgroundColor: Theme.colors.background,
  },
});
