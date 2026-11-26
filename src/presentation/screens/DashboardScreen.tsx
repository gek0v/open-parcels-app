import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Parcel } from '../../domain/models/parcel';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { trackingEngineManager } from '../../infrastructure/engine';
import { validateTrackingNumber, findCarrierBySlug } from '../../domain/validators/detection';
import { cleanTrackingNumber } from '../../domain/validators/checksums';
import { Theme } from '../theme/adaptiveTheme';
import { ParcelCardBento } from '../components/dashboard/ParcelCardBento';
import { ParcelCardIndustrial } from '../components/dashboard/ParcelCardIndustrial';
import { ParcelCardRetroOS } from '../components/dashboard/ParcelCardRetroOS';
import { BentoStatsWidget } from '../components/dashboard/BentoStatsWidget';
import { SegmentedFilter, FilterTab } from '../components/dashboard/SegmentedFilter';
import { RenameParcelModal } from '../components/common/RenameParcelModal';
import { ThemeSelectorModal } from '../components/common/ThemeSelectorModal';
import { BackupModal } from '../components/common/BackupModal';
import { UpdateAvailableModal } from '../components/common/UpdateAvailableModal';
import { ClipboardDetectedBanner } from '../components/dashboard/ClipboardDetectedBanner';
import { useI18n } from '../../infrastructure/i18n';
import { useTheme } from '../theme/ThemeContext';
import { ShareService } from '../../infrastructure/services/ShareService';
import { updateService, UpdateInfo } from '../../infrastructure/services/UpdateService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Search,
  X,
  Package,
  Cpu,
  LayoutGrid,
  Barcode,
  Monitor,
  Languages,
  Palette,
  HardDrive,
  Clock,
  Calendar,
  Truck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';

export type CardStyle = 'bento' | 'industrial' | 'retro';
const CARD_STYLE_KEY = '@open_parcels:card_style';

export type SortOption = 'updated' | 'days' | 'carrier';
export const SORT_OPTION_KEY = '@open_parcels:sort_by';

interface DashboardScreenProps {
  onSelectParcel: (parcel: Parcel) => void;
  onOpenNewParcel: (initialData?: { trackingNumber?: string; carrierSlug?: string }) => void;
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
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [renamingParcel, setRenamingParcel] = useState<Parcel | null>(null);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [updateCheckStatus, setUpdateCheckStatus] = useState<'idle' | 'checking' | 'up_to_date'>('idle');
  const [manualUpdateInfo, setManualUpdateInfo] = useState<UpdateInfo | null>(null);
  const [refreshFeedback, setRefreshFeedback] = useState<string | null>(null);

  const [detectedClipboard, setDetectedClipboard] = useState<{
    trackingNumber: string;
    carrierSlug?: string;
    carrierName?: string;
    confidence?: number;
  } | null>(null);
  const dismissedClipboardRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const upToDateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (upToDateTimerRef.current) {
        clearTimeout(upToDateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(CARD_STYLE_KEY)
      .then((stored) => {
        if (isMounted && (stored === 'bento' || stored === 'industrial' || stored === 'retro')) {
          setCardStyle(stored);
        }
      })
      .catch((err) => {
        console.warn('[DashboardScreen] load card style error:', err);
      });

    AsyncStorage.getItem(SORT_OPTION_KEY)
      .then((stored) => {
        if (isMounted && (stored === 'updated' || stored === 'days' || stored === 'carrier')) {
          setSortBy(stored);
        }
      })
      .catch((err) => {
        console.warn('[DashboardScreen] load sort option error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCardStyleChange = async (style: CardStyle) => {
    setCardStyle(style);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    try {
      await AsyncStorage.setItem(CARD_STYLE_KEY, style);
    } catch (err) {
      console.warn('[DashboardScreen] save card style error:', err);
    }
  };

  const handleSortChange = async (sort: SortOption) => {
    setSortBy(sort);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    try {
      await AsyncStorage.setItem(SORT_OPTION_KEY, sort);
    } catch (err) {
      console.warn('[DashboardScreen] save sort option error:', err);
    }
  };

  const loadParcels = useCallback(async () => {
    const list = await parcelRepository.getAll();
    if (isMountedRef.current) {
      setParcels(list);
    }
  }, []);

  const checkClipboard = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      const hasString = await Clipboard.hasStringAsync().catch(() => false);
      if (!hasString || !isMountedRef.current) return;
      const text = await Clipboard.getStringAsync().catch(() => '');
      if (!text || !isMountedRef.current) return;

      const validation = validateTrackingNumber(text);
      if (!validation.isValid || !isMountedRef.current) return;

      if (dismissedClipboardRef.current.has(validation.cleanNumber)) return;

      // Check if parcel is already saved in repository
      const all = await parcelRepository.getAll().catch(() => []);
      if (!isMountedRef.current) return;
      const alreadySaved = all.some(
        (p) => cleanTrackingNumber(p.trackingNumber) === validation.cleanNumber
      );
      if (alreadySaved || !isMountedRef.current) return;

      setDetectedClipboard({
        trackingNumber: validation.cleanNumber,
        carrierSlug: validation.bestCarrier?.carrier.slug,
        carrierName: validation.bestCarrier?.carrier.name,
        confidence: validation.bestCarrier?.confidence,
      });
    } catch {
      // Gracefully ignore clipboard access errors
    }
  }, []);

  useEffect(() => {
    let active = true;

    const fetchParcels = async () => {
      const list = await parcelRepository.getAll();
      if (active) {
        setParcels(list);
      }
    };

    void fetchParcels();

    const unsubscribe = parcelRepository.subscribe(() => {
      void fetchParcels();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const list = await parcelRepository.getAll();
        if (active) {
          setParcels(list);
        }
      })();

      void checkClipboard();

      return () => {
        active = false;
      };
    }, [checkClipboard])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void loadParcels();
        void checkClipboard();
      }
    });

    const timer = setTimeout(() => {
      void checkClipboard();
    }, 150);

    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [checkClipboard, loadParcels]);

  const handleAddClipboardParcel = () => {
    if (!detectedClipboard) return;
    const num = detectedClipboard.trackingNumber;
    const slug = detectedClipboard.carrierSlug;
    dismissedClipboardRef.current.add(num);
    setDetectedClipboard(null);
    onOpenNewParcel({ trackingNumber: num, carrierSlug: slug });
  };

  const handleDismissClipboard = () => {
    if (detectedClipboard) {
      dismissedClipboardRef.current.add(detectedClipboard.trackingNumber);
    }
    setDetectedClipboard(null);
  };

  const handleManualUpdateCheck = async () => {
    if (updateCheckStatus === 'checking') return;
    setUpdateCheckStatus('checking');
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    try {
      const info = await updateService.checkForUpdate(true);
      if (!isMountedRef.current) return;
      if (info) {
        setUpdateCheckStatus('idle');
        setManualUpdateInfo(info);
      } else {
        setUpdateCheckStatus('up_to_date');
        if (upToDateTimerRef.current) {
          clearTimeout(upToDateTimerRef.current);
        }
        upToDateTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setUpdateCheckStatus('idle');
          }
        }, 3500);
      }
    } catch (err) {
      console.warn('[DashboardScreen] manual update check failed:', err);
      if (isMountedRef.current) {
        setUpdateCheckStatus('idle');
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshFeedback(null);
    try {
      const currentParcels = await parcelRepository.getAll();
      const activeParcels = currentParcels.filter(
        (p) => !p.isArchived && p.status !== 'delivered' && p.status !== 'expired'
      );

      const isNativeGo = trackingEngineManager.isNativeGoActive;
      const liveParcels = activeParcels.filter(
        (p) =>
          isNativeGo ||
          Boolean(
            p.carrier?.hasLiveTracking ||
              (p.carrier?.slug && findCarrierBySlug(p.carrier.slug).hasLiveTracking)
          )
      );

      if (liveParcels.length > 0) {
        const engine = trackingEngineManager.current;
        const updatedParcels: Parcel[] = [];
        let failedCount = 0;

        const results = await Promise.allSettled(
          liveParcels.map(async (parcel) => {
            const refreshed = await engine.track({
              trackingNumber: parcel.trackingNumber,
              carrierHint: parcel.carrier.slug && parcel.carrier.slug !== 'unknown'
                ? parcel.carrier.slug
                : undefined,
              postalCode: parcel.postalCode,
              destinationCountry: parcel.destination?.code,
              allowSimulated: false,
              forceRefresh: true,
              lang,
            });
            return { parcel, refreshed };
          })
        );

        for (const result of results) {
          if (result.status !== 'fulfilled') {
            failedCount += 1;
            console.warn('[DashboardScreen] Refresh failed:', result.reason);
            continue;
          }

          const { parcel, refreshed } = result.value;
          if (!refreshed || refreshed.isLiveData === false || refreshed.error) {
            failedCount += 1;
            continue;
          }

          const refreshedEvents = Array.isArray(refreshed.events) ? refreshed.events : [];
          const parcelEvents = Array.isArray(parcel.events) ? parcel.events : [];

          // Avoid regressing known tracking history on transient empty payloads
          if (refreshed.status === 'pending' && parcel.status !== 'pending') {
            continue;
          }
          if (refreshedEvents.length === 0 && parcelEvents.length > 0 && refreshed.status !== 'delivered') {
            continue;
          }

          const merged: Parcel = {
            ...parcel,
            ...refreshed,
            id: parcel.id,
            trackingNumber: parcel.trackingNumber,
            customAlias: parcel.customAlias,
            notes: parcel.notes,
            isArchived: parcel.isArchived,
            createdAt: parcel.createdAt,
            postalCode: parcel.postalCode || refreshed.postalCode,
            origin: refreshed.origin || parcel.origin,
            destination: refreshed.destination || parcel.destination,
            lastMileCarrier: refreshed.lastMileCarrier || parcel.lastMileCarrier,
            lastMileTrackingNumber: refreshed.lastMileTrackingNumber || parcel.lastMileTrackingNumber,
            additionalCarriers:
              refreshed.additionalCarriers && refreshed.additionalCarriers.length > 0
                ? refreshed.additionalCarriers
                : parcel.additionalCarriers,
            events: refreshedEvents.length > 0 ? refreshedEvents : parcelEvents,
            isLiveData: refreshed.isLiveData ?? !engine.isLocal,
            updatedAt: new Date().toISOString(),
          };
          updatedParcels.push(merged);
        }

        if (updatedParcels.length > 0) {
          await parcelRepository.saveAll(updatedParcels);
        }

        if (failedCount > 0 && isMountedRef.current) {
          setRefreshFeedback(t.dashboard.refreshError.replace('%d', String(failedCount)));
        }
      }

      await loadParcels();
    } catch (err) {
      console.warn('[DashboardScreen] handleRefresh error:', err);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  const handleUpdateAlias = async (id: string, newAlias: string) => {
    try {
      await parcelRepository.updateAlias(id, newAlias);
      await loadParcels();
    } catch (err) {
      console.warn('[DashboardScreen] handleUpdateAlias error:', err);
    }
  };

  const handleShareParcel = async (parcel: Parcel) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await ShareService.shareParcel(parcel, { lang });
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
      const matchLastMileCode = p.lastMileTrackingNumber?.toLowerCase().includes(q);
      const matchLastMileCarrier = p.lastMileCarrier?.name.toLowerCase().includes(q);
      return matchAlias || matchCode || matchCarrier || matchLastMileCode || matchLastMileCarrier;
    }

    return true;
  });

  // Sort parcels according to selected criteria
  const sortedParcels = [...filteredParcels].sort((a, b) => {
    if (sortBy === 'days') {
      return b.daysInTransit - a.daysInTransit;
    }
    if (sortBy === 'carrier') {
      return a.carrier.name.localeCompare(b.carrier.name);
    }
    // Default: 'updated' (most recent first)
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
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
              {t.appName}
            </Text>
            <View style={styles.headerChipsRow}>
              <View
                style={[styles.engineBadge, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
              >
                <Cpu size={12} color={theme.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.engineBadgeText, { color: theme.textPrimary }]}>
                  {t.engine.localBadge}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.engine.langAria}
                onPress={toggleLang}
                style={({ pressed }) => [styles.langToggleBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }, pressed && styles.pressed]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Languages size={12} color={theme.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.langToggleText, { color: theme.textPrimary }]}>{lang.toUpperCase()}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.themes.btnAria}
                onPress={() => setIsThemeModalVisible(true)}
                style={({ pressed }) => [styles.langToggleBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }, pressed && styles.pressed]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Palette size={12} color={theme.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.langToggleText, { color: theme.textPrimary }]}>{t.themes.btnLabel}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.backup.btnAria}
                onPress={() => setIsBackupModalVisible(true)}
                style={({ pressed }) => [styles.langToggleBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }, pressed && styles.pressed]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <HardDrive size={12} color={theme.textPrimary} strokeWidth={2.5} />
                <Text style={[styles.langToggleText, { color: theme.textPrimary }]}>{t.backup.btnLabel}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.engine.updateCheckAria}
                onPress={handleManualUpdateCheck}
                disabled={updateCheckStatus === 'checking'}
                style={({ pressed }) => [
                  styles.updateCheckBtn,
                  {
                    backgroundColor: updateCheckStatus === 'up_to_date' ? theme.mint : theme.yellow,
                    borderColor: theme.border,
                  },
                  pressed && styles.pressed,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                {updateCheckStatus === 'up_to_date' ? (
                  <CheckCircle2 size={12} color="#000000" strokeWidth={2.5} />
                ) : (
                  <RefreshCw size={12} color="#000000" strokeWidth={2.5} />
                )}
                <Text style={[styles.langToggleText, { color: '#000000' }]}>
                  {updateCheckStatus === 'checking'
                    ? t.engine.checking
                    : updateCheckStatus === 'up_to_date'
                    ? t.engine.upToDate
                    : t.engine.updateBtn}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Hero Bento Stats Widget (Compact, Themed, Zero Camera) */}
      <BentoStatsWidget
        activeCount={counts.active}
        outForDeliveryCount={outForDeliveryCount}
        deliveredCount={counts.delivered}
        parcels={parcels}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }, isSearchFocused && styles.searchBoxFocused]}>
          <Search size={18} color={theme.textTertiary} strokeWidth={2.5} style={styles.searchIcon} />
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
              accessibilityLabel={t.search.clearAria}
              onPress={() => setSearchQuery('')}
              style={({ pressed }) => [
                styles.clearSearch,
                pressed && { backgroundColor: theme.surfaceSubtle },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={theme.textPrimary} strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Segmented Filter */}
      <SegmentedFilter activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

      {/* Compact Sorting & Card Style Controls */}
      <View style={styles.controlsBar}>
        {/* Sort Selector */}
        <View style={styles.controlTabs}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.sort.updated} - ${t.dashboard.sortUpdatedAria}`}
            onPress={() => handleSortChange('updated')}
            style={({ pressed }) => [
              styles.controlBtn,
              {
                backgroundColor: sortBy === 'updated' ? theme.yellow : theme.surfaceSubtle,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Clock size={11} color={sortBy === 'updated' ? '#000000' : theme.textSecondary} strokeWidth={2.5} />
            <Text
              style={[
                styles.controlBtnText,
                { color: sortBy === 'updated' ? '#000000' : theme.textSecondary },
                sortBy === 'updated' && styles.controlBtnTextActive,
              ]}
            >
              {t.sort.updated}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.sort.days} - ${t.dashboard.sortDaysAria}`}
            onPress={() => handleSortChange('days')}
            style={({ pressed }) => [
              styles.controlBtn,
              {
                backgroundColor: sortBy === 'days' ? theme.yellow : theme.surfaceSubtle,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Calendar size={11} color={sortBy === 'days' ? '#000000' : theme.textSecondary} strokeWidth={2.5} />
            <Text
              style={[
                styles.controlBtnText,
                { color: sortBy === 'days' ? '#000000' : theme.textSecondary },
                sortBy === 'days' && styles.controlBtnTextActive,
              ]}
            >
              {t.sort.days}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.sort.carrier} - ${t.dashboard.sortCarrierAria}`}
            onPress={() => handleSortChange('carrier')}
            style={({ pressed }) => [
              styles.controlBtn,
              {
                backgroundColor: sortBy === 'carrier' ? theme.yellow : theme.surfaceSubtle,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Truck size={11} color={sortBy === 'carrier' ? '#000000' : theme.textSecondary} strokeWidth={2.5} />
            <Text
              style={[
                styles.controlBtnText,
                { color: sortBy === 'carrier' ? '#000000' : theme.textSecondary },
                sortBy === 'carrier' && styles.controlBtnTextActive,
              ]}
            >
              {t.sort.carrier}
            </Text>
          </Pressable>
        </View>

        {/* Card Style Switcher */}
        <View style={styles.controlTabs}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.dashboard.styleBentoAria}
            onPress={() => handleCardStyleChange('bento')}
            style={({ pressed }) => [
              styles.controlIconBtn,
              {
                backgroundColor: cardStyle === 'bento' ? theme.yellow : theme.surfaceSubtle,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <LayoutGrid size={13} color={cardStyle === 'bento' ? '#000000' : theme.textSecondary} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.dashboard.styleIndustrialAria}
            onPress={() => handleCardStyleChange('industrial')}
            style={({ pressed }) => [
              styles.controlIconBtn,
              {
                backgroundColor: cardStyle === 'industrial' ? theme.yellow : theme.surfaceSubtle,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Barcode size={13} color={cardStyle === 'industrial' ? '#000000' : theme.textSecondary} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.dashboard.styleRetroAria}
            onPress={() => handleCardStyleChange('retro')}
            style={({ pressed }) => [
              styles.controlIconBtn,
              {
                backgroundColor: cardStyle === 'retro' ? theme.yellow : theme.surfaceSubtle,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Monitor size={13} color={cardStyle === 'retro' ? '#000000' : theme.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {refreshFeedback && (
        <View
          style={[
            styles.refreshFeedbackBanner,
            { backgroundColor: theme.statusLight.exception, borderColor: theme.border },
          ]}
        >
          <AlertTriangle size={14} color={theme.textPrimary} strokeWidth={2.5} />
          <Text style={[styles.refreshFeedbackText, { color: theme.textPrimary }]} numberOfLines={2}>
            {refreshFeedback}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.search.clearAria}
            onPress={() => setRefreshFeedback(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color={theme.textPrimary} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}

      {/* Parcels List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: detectedClipboard ? 200 : 104 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.textPrimary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.surface}
          />
        }
      >
        {sortedParcels.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
              <Package size={36} color="#000000" strokeWidth={2.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {searchQuery
                ? t.empty.noResults
                : activeTab === 'active'
                ? t.empty.noActive
                : activeTab === 'delivered'
                ? t.empty.noDelivered
                : t.empty.noArchived}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {searchQuery
                ? t.empty.subNoResults
                : activeTab === 'active'
                ? t.empty.subActive
                : activeTab === 'delivered'
                ? t.empty.subDelivered
                : t.empty.subArchived}
            </Text>
            {!searchQuery && activeTab === 'active' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.empty.trackFirstBtn}
                onPress={() => onOpenNewParcel()}
                style={({ pressed }) => [
                  styles.emptyAddBtn,
                  { backgroundColor: theme.coral, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.emptyAddBtnText}>{t.empty.trackFirstBtn}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          sortedParcels.map((parcel) => {
            const cardProps = {
              parcel,
              onPress: () => onSelectParcel(parcel),
              onRename: () => setRenamingParcel(parcel),
              onShare: () => handleShareParcel(parcel),
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

      {/* Floating Interactive Neo-Brutalist Clipboard Detected Banner */}
      {detectedClipboard && (
        <ClipboardDetectedBanner
          trackingNumber={detectedClipboard.trackingNumber}
          carrierName={detectedClipboard.carrierName}
          carrierSlug={detectedClipboard.carrierSlug}
          confidence={detectedClipboard.confidence}
          onAdd={handleAddClipboardParcel}
          onDismiss={handleDismissClipboard}
        />
      )}

      {/* Floating Action Button (FAB) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.dashboard.newParcelAria}
        onPress={() => onOpenNewParcel()}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.coral,
            borderColor: theme.border,
          },
          pressed && styles.pressed,
        ]}
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
            void handleUpdateAlias(renamingParcel.id, newAlias);
            setRenamingParcel(null);
          }}
        />
      )}


      {/* Modal to explore & select Golden Ratio Themes */}
      <ThemeSelectorModal
        visible={isThemeModalVisible}
        onClose={() => setIsThemeModalVisible(false)}
      />

      {/* Modal for Backup & Restore JSON */}
      <BackupModal
        visible={isBackupModalVisible}
        onClose={() => setIsBackupModalVisible(false)}
        onRestoreSuccess={loadParcels}
      />

      {/* Manual Update Check Modal */}
      {manualUpdateInfo && (
        <UpdateAvailableModal
          visible={!!manualUpdateInfo}
          updateInfo={manualUpdateInfo}
          onClose={() => setManualUpdateInfo(null)}
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
    paddingTop: 8,
    paddingBottom: 10,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
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
  controlsBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  controlTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 1,
    alignItems: 'center',
    gap: 6,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    ...Theme.shadows.sm,
  },
  controlIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    ...Theme.shadows.sm,
  },
  controlBtnText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  controlBtnTextActive: {
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  refreshFeedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  refreshFeedbackText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
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
    borderRadius: Theme.radius.md,
    borderWidth: Theme.borders.width,
    marginTop: 16,
    ...Theme.shadows.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2.5,
    ...Theme.shadows.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: Theme.radius.sm,
    marginTop: 16,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
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
