import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
} from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { trackingEngineManager } from '../../infrastructure/engine';
import { Theme } from '../theme/adaptiveTheme';
import { ParcelCard } from '../components/dashboard/ParcelCard';
import { SegmentedFilter, FilterTab } from '../components/dashboard/SegmentedFilter';
import { RenameParcelModal } from '../components/common/RenameParcelModal';
import {
  Plus,
  Search,
  X,
  Package,
  Cpu,
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
  const [renamingParcel, setRenamingParcel] = useState<Parcel | null>(null);

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

  const handleUpdateAlias = async (id: string, newAlias: string) => {
    await parcelRepository.updateAlias(id, newAlias);
    await loadParcels();
  };

  // Filter parcels according to active tab and search query
  const filteredParcels = parcels.filter((p) => {
    if (activeTab === 'archived') {
      if (!p.isArchived) return false;
    } else if (activeTab === 'delivered') {
      if (p.isArchived || p.status !== 'delivered') return false;
    } else {
      if (p.isArchived || p.status === 'delivered') return false;
    }

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
            <Package size={22} color="#000000" />
          </View>
          <View>
            <Text style={styles.appTitle}>OPEN PARCELS</Text>
            <Pressable onPress={toggleEngineMode} style={styles.engineToggle}>
              <Cpu size={12} color="#000000" />
              <Text style={styles.engineToggleText}>
                {isLocalMode ? 'CORE: GO EMBEBIDO' : 'CORE: REST :8080'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Add Button in Header */}
        <Pressable onPress={onOpenNewParcel} style={styles.headerAddButton}>
          <Plus size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color="#000000" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por alias, código o transportista..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearch}>
              <X size={16} color="#000000" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Segmented Filter */}
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
            tintColor="#000000"
          />
        }
      >
        {filteredParcels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Package size={36} color="#000000" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? 'SIN RESULTADOS'
                : activeTab === 'active'
                ? 'NO HAY PAQUETES EN CAMINO'
                : activeTab === 'delivered'
                ? 'NO HAY PAQUETES ENTREGADOS'
                : 'NO HAY ENVÍOS ARCHIVADOS'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Prueba con otro término de búsqueda o número de albarán.'
                : 'Pulsa el botón "+" para registrar un nuevo paquete escaneando su código de barras o introduciendo el número.'}
            </Text>
          </View>
        ) : (
          filteredParcels.map((parcel) => (
            <ParcelCard
              key={parcel.id}
              parcel={parcel}
              onPress={() => onSelectParcel(parcel)}
              onRename={() => setRenamingParcel(parcel)}
            />
          ))
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable onPress={onOpenNewParcel} style={styles.fab}>
        <Plus size={28} color="#FFFFFF" strokeWidth={3} />
      </Pressable>

      {/* Modal to rename shipment */}
      {renamingParcel && (
        <RenameParcelModal
          visible={!!renamingParcel}
          initialAlias={renamingParcel.customAlias}
          trackingNumber={renamingParcel.trackingNumber}
          onClose={() => setRenamingParcel(null)}
          onSave={(newAlias) => {
            handleUpdateAlias(renamingParcel.id, newAlias);
            setRenamingParcel(null);
          }}
        />
      )}
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
    width: 44,
    height: 44,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFE600',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  engineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    alignSelf: 'flex-start',
  },
  engineToggleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FF5C38', // Neon Tangerine
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.sm,
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
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
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    borderWidth: 2.5,
    borderColor: '#000000',
    marginTop: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    ...(Theme.isWeb ? ({ boxShadow: '4px 4px 0px #000000' } as any) : {}),
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFE600',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#000000',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 62,
    height: 62,
    borderRadius: Theme.radius.md,
    backgroundColor: '#FF5C38', // Neon Tangerine
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 7,
    ...(Theme.isWeb ? ({ boxShadow: '5px 5px 0px #000000' } as any) : {}),
  },
});
