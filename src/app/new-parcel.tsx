import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NewParcelModal } from '../presentation/screens/NewParcelModal';
import { Parcel } from '../domain/models/parcel';
import { useTheme } from '../presentation/theme/ThemeContext';

export default function NewParcelRoute() {
  const params = useLocalSearchParams<{ trackingNumber?: string; carrierSlug?: string }>();
  const { theme } = useTheme();

  const handleParcelCreated = (newParcel: Parcel) => {
    router.replace({
      pathname: '/parcel/[id]',
      params: { id: newParcel.id },
    });
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      <NewParcelModal
        visible={true}
        initialTrackingNumber={params.trackingNumber}
        initialCarrierSlug={params.carrierSlug}
        onClose={handleClose}
        onParcelCreated={handleParcelCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
