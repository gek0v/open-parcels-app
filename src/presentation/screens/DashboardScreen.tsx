import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { trackingEngineManager } from '../../infrastructure/engine';
import { Theme } from '../theme/adaptiveTheme';
import { ParcelCard } from '../components/dashboard/ParcelCard';
import { SegmentedFilter, FilterTab } from '../components/dashboard/SegmentedFilter';
import {
  Plus,
  Search,
  X,
  Package,
  Layers,
  Sparkles,
  Cpu,
  RefreshCw,
} from 'lucide-react-native';

interface DashboardScreenProps {
  onSelectParcel: (parcel: Parcel) => void;
  onOpenNewParcel: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onSelectParcel,
  onOpenNewParcel,
}) => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(trackingEngineManager.isLocalFirst());

  const loadParcels = useCallback(async () => {
    const list = await parcelRepository.getAll();
    setParcels(list);
  }, []);

  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadParcels();
    setIsRefreshing(false);
  };

  const toggleEngineMode = () => {
    const next = !isLocalMode;
    trackingEngineManager.setLocalFirst(next);
    setIsLocalMode(next);
  };

  // Filter parcels according to active tab and search query
  const filteredParcels = parcels.filter((p) => {
    // 1. Tab filtering
    if (activeTab === 'archived') {
      if (!p.isArchived) return false;
    } else if (activeTab === 'delivered') {
      if (p.isArchived || p.status !== 'delivered') return false;
    } else {
      // 'active'
      if (p.isArchived || p.status === 'delivered') return false;
    }

    // 2. Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchAlias = p.customAlias?.toLowerCase().includes(q);
      const matchCode = p.trackingNumber.toLowerCase().includes(q);
      const matchCarrier = p.carrier.name.toLowerCase().includes(q);
      return matchAlias || matchCode || matchCarrier;
    }

    return true;
  });

  const counts = {
    active: parcels.filter((p) => !p.isArchived && p.status !== 'delivered').length,
    delivered: parcels.filter((p) => !p.isArchived && p.status === 'delivered').length,
    archived: parcels.filter((p) => p.isArchived).length,
  };

  return (
    <View style={styles.container}>
      {/* Top Bar with Brand and Mode Toggle */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Package size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.appTitle}>Open Parcels</Text>
            <Pressable onPress={toggleEngineMode} style={styles.engineToggle}>
              <Cpu size={11} color={Theme.colors.primary} />
              <Text style={styles.engineToggleText}>
                {isLocalMode ? 'Core: Go Embebido' : 'Core: REST :8080'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Add Button in Header (iOS standard) */}
        {Theme.isIOS && (
          <Pressable onPress={onOpenNewParcel} style={styles.headerAddButton}>
            <Plus size={20} color="#FFF" />
          </Pressable>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={Theme.colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por alias, código o transportista..."
            placeholderTextColor={Theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearch}>
              <X size={16} color={Theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Segmented Filter: En camino / Entregados / Archivados */}
      <SegmentedFilter
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Parcels List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Theme.colors.primary}
          />
        }
      >
        {filteredParcels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Package size={36} color={Theme.colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? 'Sin resultados de búsqueda'
                : activeTab === 'active'
                ? 'No tienes paquetes en camino'
                : activeTab === 'delivered'
                ? 'No hay paquetes entregados aún'
                : 'No tienes envíos archivados'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Prueba con otro término de búsqueda o número de seguimiento.'
                : 'Pulsa el botón "+" para registrar un nuevo paquete escaneando su código de barras o introduciendo el número.'}
            </Text>
          </View>
        ) : (
          filteredParcels.map((parcel) => (
            <ParcelCard
              key={parcel.id}
              parcel={parcel}
              onPress={() => onSelectParcel(parcel)}
            />
          ))
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) — Specially styled for Material You / Android */}
      <Pressable
        onPress={onOpenNewParcel}
        style={styles.fab}
        android_ripple={{ color: '#1D4ED8', borderless: true }}
      >
        <Plus size={24} color="#FFF" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Theme.isIOS ? 54 : 20,
    paddingBottom: 14,
    backgroundColor: Theme.colors.background,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    ...Theme.shadows.card,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  engineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  engineToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginLeft: 4,
  },
  headerAddButton: {
    width: 38,
    height: 38,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.card,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.textPrimary,
  },
  clearSearch: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.elevated,
  },
});
