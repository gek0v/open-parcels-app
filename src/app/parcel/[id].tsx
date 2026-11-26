import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Parcel } from '../../domain/models/parcel';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { ParcelDetailScreen } from '../../presentation/screens/ParcelDetailScreen';
import { Theme } from '../../presentation/theme/adaptiveTheme';
import { useTheme } from '../../presentation/theme/ThemeContext';
import { useI18n } from '../../infrastructure/i18n';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';

export default function ParcelDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const parcelId = Array.isArray(id) ? id[0] : id;
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const navigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!parcelId) {
      const timer = setTimeout(() => {
        if (isMounted) setIsLoading(false);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    const loadParcel = async (showLoading: boolean) => {
      if (showLoading && isMounted) {
        setIsLoading(true);
      }
      try {
        const found = await parcelRepository.getById(parcelId);
        if (isMounted) {
          setParcel(found);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('[ParcelDetailRoute] Failed to load parcel:', error);
        if (isMounted) {
          if (showLoading) {
            setParcel(null);
          }
          setIsLoading(false);
        }
      }
    };

    void loadParcel(true);

    const unsubscribe = parcelRepository.subscribe(() => {
      void loadParcel(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [parcelId]);

  const handleToggleArchive = async (targetId: string) => {
    try {
      const updated = await parcelRepository.toggleArchive(targetId);
      if (updated) {
        setParcel({ ...updated });
      }
    } catch (err) {
      console.error('[ParcelDetailRoute] toggleArchive error:', err);
      Alert.alert(
        lang === 'en' ? 'Action failed' : 'Error',
        lang === 'en'
          ? 'Could not update archive status.'
          : 'No se pudo actualizar el estado de archivo.'
      );
    }
  };

  const handleDeleteParcel = async (targetId: string) => {
    try {
      await parcelRepository.delete(targetId);
      navigateBack();
    } catch (err) {
      console.error('[ParcelDetailRoute] delete error:', err);
      Alert.alert(
        lang === 'en' ? 'Delete failed' : 'Error al eliminar',
        lang === 'en'
          ? 'Could not delete the parcel.'
          : 'No se pudo eliminar el paquete.'
      );
    }
  };

  const handleUpdateAlias = async (targetId: string, newAlias: string) => {
    try {
      const updated = await parcelRepository.updateAlias(targetId, newAlias);
      if (updated) {
        setParcel({ ...updated });
      }
    } catch (err) {
      console.error('[ParcelDetailRoute] updateAlias error:', err);
      Alert.alert(
        lang === 'en' ? 'Rename failed' : 'Error al renombrar',
        lang === 'en'
          ? 'Could not update the parcel alias.'
          : 'No se pudo actualizar el alias del paquete.'
      );
    }
  };

  const handleParcelUpdated = (updated: Parcel) => {
    setParcel({ ...updated });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.canvas }]}>
        <Text style={[styles.loadingText, { color: theme.textPrimary }]}>
          {lang === 'en' ? 'LOADING DETAILS...' : 'CARGANDO INFORMACIÓN...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (!parcel) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.canvas }]}>
        <View style={[styles.errorBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AlertCircle size={32} color={theme.textPrimary} strokeWidth={2.5} />
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>
            {lang === 'en' ? 'SHIPMENT NOT FOUND' : 'ENVÍO NO ENCONTRADO'}
          </Text>
          <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>
            {lang === 'en'
              ? `No parcel found with ID #${parcelId || '-'}.`
              : `No se ha encontrado ningún paquete con identificador #${parcelId || '-'}.`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={navigateBack}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: theme.coral, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <ArrowLeft size={16} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.backBtnText}>{t.detail.back}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.canvas }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ParcelDetailScreen
        parcel={parcel}
        onBack={navigateBack}
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
    textAlign: 'center',
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
