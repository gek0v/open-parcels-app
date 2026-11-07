import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { NewParcelModal } from '../presentation/screens/NewParcelModal';
import { Parcel } from '../domain/models/parcel';
import { Theme } from '../presentation/theme/adaptiveTheme';

export default function NewParcelRoute() {
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
    <View style={styles.container}>
      <NewParcelModal
        visible={true}
        onClose={handleClose}
        onParcelCreated={handleParcelCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
});
