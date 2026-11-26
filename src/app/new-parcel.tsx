import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NewParcelModal } from '../presentation/screens/NewParcelModal';
import { Parcel } from '../domain/models/parcel';
import { useTheme } from '../presentation/theme/ThemeContext';

export default function NewParcelRoute() {
  const params = useLocalSearchParams<{ trackingNumber?: string; carrierSlug?: string }>();
  const { theme } = useTheme();

  const initialTrackingNumber =
    typeof params.trackingNumber === 'string' ? params.trackingNumber : undefined;
  const initialCarrierSlug =
    typeof params.carrierSlug === 'string' ? params.carrierSlug : undefined;

  const handleParcelCreated = (newParcel: Parcel) => {
    router.replace({
      pathname: '/parcel/[id]',
      params: { id: newParcel.id },
    });
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      <NewParcelModal
        visible={true}
        asScreen={true}
        initialTrackingNumber={initialTrackingNumber}
        initialCarrierSlug={initialCarrierSlug}
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
