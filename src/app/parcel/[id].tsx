import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Parcel } from '../../domain/models/parcel';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { ParcelDetailScreen } from '../../presentation/screens/ParcelDetailScreen';
import { Theme } from '../../presentation/theme/adaptiveTheme';
import { useI18n } from '../../infrastructure/i18n';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';

export default function ParcelDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    parcelRepository.getById(id).then((found) => {
      if (isMounted) {
        setParcel(found);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleToggleArchive = async (parcelId: string) => {
    const updated = await parcelRepository.toggleArchive(parcelId);
    if (updated) {
      setParcel({ ...updated });
    }
  };

  const handleDeleteParcel = async (parcelId: string) => {
    await parcelRepository.delete(parcelId);
    router.replace('/');
  };

  const handleUpdateAlias = async (parcelId: string, newAlias: string) => {
    const updated = await parcelRepository.updateAlias(parcelId, newAlias);
    if (updated) {
      setParcel({ ...updated });
    }
  };

  const handleParcelUpdated = (updated: Parcel) => {
    setParcel({ ...updated });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.loadingText}>CARGANDO INFORMACIÓN...</Text>
      </SafeAreaView>
    );
  }

  if (!parcel) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.errorBox}>
          <AlertCircle size={32} color="#000000" strokeWidth={2.5} />
          <Text style={styles.errorTitle}>ENVÍO NO ENCONTRADO</Text>
          <Text style={styles.errorSubtitle}>
            No se ha encontrado ningún paquete con identificador #{id}.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <ArrowLeft size={16} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.backBtnText}>{t.detail.back}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ParcelDetailScreen
        parcel={parcel}
        onBack={() => router.back()}
        onToggleArchive={handleToggleArchive}
        onDelete={handleDeleteParcel}
        onUpdateAlias={handleUpdateAlias}
        onParcelUpdated={handleParcelUpdated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  errorBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    padding: 24,
    alignItems: 'center',
    ...Theme.shadows.lg,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  errorSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.coral,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pressed: {
    ...Theme.pressed,
  },
});
