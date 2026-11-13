import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { Theme } from '../theme/adaptiveTheme';
import { ParcelCardBento } from '../components/dashboard/ParcelCardBento';
import { ParcelCardIndustrial } from '../components/dashboard/ParcelCardIndustrial';
import { ParcelCardRetroOS } from '../components/dashboard/ParcelCardRetroOS';
import { BentoStatsWidget } from '../components/dashboard/BentoStatsWidget';
import { SegmentedFilter, FilterTab } from '../components/dashboard/SegmentedFilter';
import { RenameParcelModal } from '../components/common/RenameParcelModal';
import { ThemeSelectorModal } from '../components/common/ThemeSelectorModal';
import { useI18n } from '../../infrastructure/i18n';
import { useTheme } from '../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Plus, Search, X, Package, Cpu, LayoutGrid, Barcode, Monitor, Languages, Palette } from 'lucide-react-native';

export type CardStyle = 'bento' | 'industrial' | 'retro';
const CARD_STYLE_KEY = '@open_parcels:card_style';

interface DashboardScreenProps {
  onSelectParcel: (parcel: Parcel) => void;
  onOpenNewParcel: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onSelectParcel,
  onOpenNewParcel,
}) => {
  const { t, lang, toggleLang } = useI18n();
  const { theme } = useTheme();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cardStyle, setCardStyle] = useState<CardStyle>('bento');
  const [renamingParcel, setRenamingParcel] = useState<Parcel | null>(null);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CARD_STYLE_KEY).then((stored) => {
      if (stored === 'bento' || stored === 'industrial' || stored === 'retro') {
        setCardStyle(stored);
      }
    });
  }, []);

  const handleCardStyleChange = async (style: CardStyle) => {
    setCardStyle(style);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await AsyncStorage.setItem(CARD_STYLE_KEY, style);
  };

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
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      {/* Top Bar with Brand and Mode Toggle */}
      <View style={[styles.topBar, { backgroundColor: theme.canvas }]}>
        <View style={styles.brandRow}>
          <View style={[styles.brandBadge, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
            <Package size={22} color="#000000" strokeWidth={2.5} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={[styles.appTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              OPEN PARCELS
            </Text>
            <View style={styles.headerChipsRow}>
              <View
                style={[styles.engineBadge, { backgroundColor: theme.yellow, borderColor: theme.border }]}
              >
                <Cpu size={12} color="#000000" strokeWidth={2.5} />
                <Text style={styles.engineBadgeText}>LOCAL-FIRST</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cambiar idioma"
                onPress={toggleLang}
                style={({ pressed }) => [styles.langToggleBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }, pressed && styles.pressed]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Languages size={12} color="#000000" strokeWidth={2.5} />
                <Text style={styles.langToggleText}>{lang.toUpperCase()}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Temas y apariencia de la app"
                onPress={() => setIsThemeModalVisible(true)}
                style={({ pressed }) => [styles.langToggleBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }, pressed && styles.pressed]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Palette size={12} color="#000000" strokeWidth={2.5} />
                <Text style={styles.langToggleText}>TEMAS</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Hero Bento Stats Widget */}
      <BentoStatsWidget
        activeCount={counts.active}
        outForDeliveryCount={outForDeliveryCount}
        deliveredCount={counts.delivered}
        onScanPress={onOpenNewParcel}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }, isSearchFocused && styles.searchBoxFocused]}>
          <Search size={18} color="#000000" strokeWidth={2.5} style={styles.searchIcon} />
          <TextInput
            accessibilityLabel={t.search.searchAria}
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder={t.search.placeholder}
            placeholderTextColor={theme.textTertiary}
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

      {/* Card Style Switcher */}
      <View style={styles.cardStyleRow}>
        <Text style={[styles.cardStyleLabel, { color: theme.textSecondary }]}>{t.filter.design}</Text>
        <View style={styles.cardStyleTabs}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Estilo Bento"
            onPress={() => handleCardStyleChange('bento')}
            style={({ pressed }) => [
              styles.cardStyleBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
              cardStyle === 'bento' && [styles.cardStyleBtnActive, { backgroundColor: theme.yellow }],
              pressed && styles.pressed,
            ]}
          >
            <LayoutGrid size={11} color={cardStyle === 'bento' ? '#000000' : theme.textTertiary} strokeWidth={2.5} />
            <Text style={[styles.cardStyleText, { color: theme.textTertiary }, cardStyle === 'bento' && [styles.cardStyleTextActive, { color: '#000000' }]]}>
              BENTO
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Estilo Industrial"
            onPress={() => handleCardStyleChange('industrial')}
            style={({ pressed }) => [
              styles.cardStyleBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
              cardStyle === 'industrial' && [styles.cardStyleBtnActive, { backgroundColor: theme.yellow }],
              pressed && styles.pressed,
            ]}
          >
            <Barcode size={11} color={cardStyle === 'industrial' ? '#000000' : theme.textTertiary} strokeWidth={2.5} />
            <Text
              style={[
                styles.cardStyleText,
                { color: theme.textTertiary },
                cardStyle === 'industrial' && [styles.cardStyleTextActive, { color: '#000000' }],
              ]}
            >
              INDUSTRIAL
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Estilo Retro OS"
            onPress={() => handleCardStyleChange('retro')}
            style={({ pressed }) => [
              styles.cardStyleBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
              cardStyle === 'retro' && [styles.cardStyleBtnActive, { backgroundColor: theme.yellow }],
              pressed && styles.pressed,
            ]}
          >
            <Monitor size={11} color={cardStyle === 'retro' ? '#000000' : theme.textTertiary} strokeWidth={2.5} />
            <Text style={[styles.cardStyleText, { color: theme.textTertiary }, cardStyle === 'retro' && [styles.cardStyleTextActive, { color: '#000000' }]]}>
              RETRO OS
            </Text>
          </Pressable>
        </View>
      </View>

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
                ? t.empty.noResults
                : activeTab === 'active'
                ? t.empty.noActive
                : activeTab === 'delivered'
                ? t.empty.noDelivered
                : t.empty.noArchived}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? t.empty.subNoResults
                : t.empty.subActive}
            </Text>
            {!searchQuery && activeTab === 'active' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.empty.trackFirstBtn}
                onPress={onOpenNewParcel}
                style={({ pressed }) => [
                  styles.emptyAddBtn,
                  { backgroundColor: theme.coral, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Plus size={16} color="#000000" strokeWidth={3} />
                <Text style={styles.emptyAddBtnText}>{t.empty.trackFirstBtn}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredParcels.map((parcel) => {
            const cardProps = {
              parcel,
              onPress: () => onSelectParcel(parcel),
              onRename: () => setRenamingParcel(parcel),
            };

            if (cardStyle === 'industrial') {
              return <ParcelCardIndustrial key={parcel.id} {...cardProps} />;
            }
            if (cardStyle === 'retro') {
              return <ParcelCardRetroOS key={parcel.id} {...cardProps} />;
            }
            return <ParcelCardBento key={parcel.id} {...cardProps} />;
          })
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nuevo envío"
        onPress={onOpenNewParcel}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.coral, borderColor: theme.border },
          pressed && styles.pressed,
        ]}
      >
        <Plus size={28} color="#000000" strokeWidth={3} />
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


      {/* Modal to explore & select Golden Ratio Themes */}
      <ThemeSelectorModal
        visible={isThemeModalVisible}
        onClose={() => setIsThemeModalVisible(false)}
      />
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
  headerChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    alignSelf: 'flex-start',
    minHeight: 28,
    ...Theme.shadows.sm,
  },
  updateCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    alignSelf: 'flex-start',
    minHeight: 28,
    ...Theme.shadows.sm,
  },
  langToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    alignSelf: 'flex-start',
    minHeight: 28,
    ...Theme.shadows.sm,
  },
  langToggleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  engineBadgeText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  headerAddButton: {
    width: 48,
    height: 48,
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
  cardStyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  cardStyleLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.6,
  },
  cardStyleTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  cardStyleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  cardStyleBtnActive: {
    backgroundColor: '#FFE600',
  },
  cardStyleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
  },
  cardStyleTextActive: {
    color: '#000000',
    fontWeight: '900',
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
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.coral,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: Theme.radius.sm,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
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
