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
import { ParcelCardBento } from '../components/dashboard/ParcelCardBento';
import { ParcelCardRetroOS } from '../components/dashboard/ParcelCardRetroOS';
import { ParcelCardIndustrial } from '../components/dashboard/ParcelCardIndustrial';
import { BentoStatsWidget } from '../components/dashboard/BentoStatsWidget';
import { SegmentedFilter, FilterTab } from '../components/dashboard/SegmentedFilter';
import { RenameParcelModal } from '../components/common/RenameParcelModal';
import { Plus, Search, X, Package, Cpu, Layers } from 'lucide-react-native';

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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(trackingEngineManager.isLocalFirst());
  const [renamingParcel, setRenamingParcel] = useState<Parcel | null>(null);
  const [mockupVariant, setMockupVariant] = useState<'A' | 'B' | 'C'>('A');

  const loadParcels = useCallback(async () => {
    const list = await parcelRepository.getAll();
    setParcels(list);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const list = await parcelRepository.getAll();
      if (active) {
        setParcels(list);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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

  const outForDeliveryCount = parcels.filter(
    (p) => !p.isArchived && p.status === 'out_for_delivery'
  ).length;

  return (
    <View style={styles.container}>
      {/* Mockup Switcher Bar */}
      <View style={styles.mockupSwitcher}>
        <View style={styles.mockupHeaderRow}>
          <Layers size={13} color="#000000" strokeWidth={2.5} />
          <Text style={styles.mockupSwitcherLabel}>MOCKUPS PARA ELEGIR:</Text>
        </View>
        <View style={styles.mockupTabs}>
          <Pressable
            onPress={() => setMockupVariant('A')}
            style={[styles.mockupTab, mockupVariant === 'A' && styles.mockupTabActive]}
          >
            <Text style={[styles.mockupTabText, mockupVariant === 'A' && styles.mockupTabTextActive]}>
              1. BENTO HERO
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMockupVariant('B')}
            style={[styles.mockupTab, mockupVariant === 'B' && styles.mockupTabActive]}
          >
            <Text style={[styles.mockupTabText, mockupVariant === 'B' && styles.mockupTabTextActive]}>
              2. RETRO OS
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMockupVariant('C')}
            style={[styles.mockupTab, mockupVariant === 'C' && styles.mockupTabActive]}
          >
            <Text style={[styles.mockupTabText, mockupVariant === 'C' && styles.mockupTabTextActive]}>
              3. INDUSTRIAL
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Top Banner Variant B: Retro OS Matrix Header */}
      {mockupVariant === 'B' && (
        <View style={styles.retroOsBanner}>
          <Text style={styles.retroOsBannerText}>
            ⚡ OPEN PARCELS OS // v1.0.2 // RED 1.500+ CARRIERS
          </Text>
        </View>
      )}

      {/* Top Banner Variant C: Industrial Hazard Ticker */}
      {mockupVariant === 'C' && (
        <View style={styles.hazardBanner}>
          <Text style={styles.hazardBannerText}>
            /// MANIFIESTO LOGÍSTICO Y TRACKING UNIVERSAL EN TIEMPO REAL ///
          </Text>
        </View>
      )}

      {/* Top Bar with Brand and Mode Toggle */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Package size={22} color="#000000" strokeWidth={2.5} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.appTitle} numberOfLines={1}>
              OPEN PARCELS
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar motor de seguimiento"
              onPress={toggleEngineMode}
              style={({ pressed }) => [styles.engineToggle, pressed && styles.pressed]}
            >
              <Cpu size={12} color="#000000" strokeWidth={2.5} />
              <Text style={styles.engineToggleText} numberOfLines={1}>
                {isLocalMode ? 'CORE: GO EMBEBIDO' : 'CORE: REST :8080'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Add Button in Header */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir nuevo envío"
          onPress={onOpenNewParcel}
          style={({ pressed }) => [styles.headerAddButton, pressed && styles.pressed]}
        >
          <Plus size={22} color="#FFFFFF" strokeWidth={3} />
        </Pressable>
      </View>

      {/* Variant A Special: Hero Bento Stats Widget */}
      {mockupVariant === 'A' && (
        <BentoStatsWidget
          activeCount={counts.active}
          outForDeliveryCount={outForDeliveryCount}
          deliveredCount={counts.delivered}
          onScanPress={onOpenNewParcel}
        />
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, isSearchFocused && styles.searchBoxFocused]}>
          <Search size={18} color="#000000" strokeWidth={2.5} style={styles.searchIcon} />
          <TextInput
            accessibilityLabel="Buscar envíos"
            style={styles.searchInput}
            placeholder="Buscar por alias, código o transportista..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              onPress={() => setSearchQuery('')}
              style={({ pressed }) => [styles.clearSearch, pressed && styles.clearSearchPressed]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#000000" strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Segmented Filter */}
      <SegmentedFilter activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

      {/* Parcels List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#000000"
            colors={['#000000']}
            progressBackgroundColor="#FFE600"
          />
        }
      >
        {filteredParcels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Package size={36} color="#000000" strokeWidth={2.5} />
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
          filteredParcels.map((parcel) => {
            if (mockupVariant === 'B') {
              return (
                <ParcelCardRetroOS
                  key={parcel.id}
                  parcel={parcel}
                  onPress={() => onSelectParcel(parcel)}
                  onRename={() => setRenamingParcel(parcel)}
                />
              );
            }
            if (mockupVariant === 'C') {
              return (
                <ParcelCardIndustrial
                  key={parcel.id}
                  parcel={parcel}
                  onPress={() => onSelectParcel(parcel)}
                  onRename={() => setRenamingParcel(parcel)}
                />
              );
            }
            // Mockup A (Bento Manifest)
            return (
              <ParcelCardBento
                key={parcel.id}
                parcel={parcel}
                onPress={() => onSelectParcel(parcel)}
                onRename={() => setRenamingParcel(parcel)}
              />
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nuevo envío"
        onPress={onOpenNewParcel}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
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
  mockupSwitcher: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: '#000000',
  },
  mockupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  mockupSwitcherLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 0.5,
  },
  mockupTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  mockupTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupTabActive: {
    backgroundColor: '#FFE600',
    borderColor: '#000000',
  },
  mockupTabText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  mockupTabTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  retroOsBanner: {
    backgroundColor: '#7C3AED',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  retroOsBannerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  hazardBanner: {
    backgroundColor: '#FFE600',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  hazardBannerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
    textAlign: 'center',
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
    flex: 1,
    minWidth: 0,
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2.5,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.6,
  },
  engineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    ...Theme.shadows.sm,
  },
  engineToggleText: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#000000',
    marginLeft: 12,
    ...Theme.shadows.md,
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
    ...Theme.shadows.md,
  },
  searchBoxFocused: {
    borderWidth: 3,
    ...Theme.shadows.lg,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    paddingVertical: 0,
  },
  clearSearch: {
    padding: 4,
    borderRadius: Theme.radius.xs,
  },
  clearSearchPressed: {
    backgroundColor: Theme.colors.surfaceSubtle,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 96,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    marginTop: 16,
    ...Theme.shadows.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2.5,
    borderColor: '#000000',
    ...Theme.shadows.sm,
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
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 62,
    height: 62,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000000',
    ...Theme.shadows.lg,
  },
  pressed: {
    ...Theme.pressed,
  },
});
