import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Parcel } from './src/domain/models/parcel';
import { parcelRepository } from './src/infrastructure/storage/ParcelRepository';
import { DashboardScreen } from './src/presentation/screens/DashboardScreen';
import { NewParcelModal } from './src/presentation/screens/NewParcelModal';
import { ParcelDetailScreen } from './src/presentation/screens/ParcelDetailScreen';
import { Theme } from './src/presentation/theme/adaptiveTheme';

export default function App() {
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [newParcelModalVisible, setNewParcelModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleParcelCreated = (newParcel: Parcel) => {
    setSelectedParcel(newParcel);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleToggleArchive = async (id: string) => {
    const updated = await parcelRepository.toggleArchive(id);
    if (updated && selectedParcel?.id === id) {
      setSelectedParcel({ ...updated });
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDeleteParcel = async (id: string) => {
    await parcelRepository.delete(id);
    setSelectedParcel(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleUpdateAlias = async (id: string, newAlias: string) => {
    const updated = await parcelRepository.updateAlias(id, newAlias);
    if (updated && selectedParcel?.id === id) {
      setSelectedParcel({ ...updated });
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style={Theme.isIOS ? 'dark' : 'auto'} />

        {selectedParcel ? (
          <ParcelDetailScreen
            parcel={selectedParcel}
            onBack={() => {
              setSelectedParcel(null);
              setRefreshTrigger((prev) => prev + 1);
            }}
            onToggleArchive={handleToggleArchive}
            onDelete={handleDeleteParcel}
            onUpdateAlias={handleUpdateAlias}
          />
        ) : (
          <DashboardScreen
            key={refreshTrigger}
            onSelectParcel={setSelectedParcel}
            onOpenNewParcel={() => setNewParcelModalVisible(true)}
          />
        )}

        {/* Modal for creating / tracking shipments */}
        <NewParcelModal
          visible={newParcelModalVisible}
          onClose={() => setNewParcelModalVisible(false)}
          onParcelCreated={handleParcelCreated}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
});
