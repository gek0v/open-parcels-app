import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../../infrastructure/i18n';
import { CARRIERS_CATALOG, findCarrierBySlug } from '../../../domain/validators/detection';
import { Carrier, DetectedCarrier } from '../../../domain/models/carrier';
import {
  X,
  Search,
  Sparkles,
  Check,
  Truck,
  ShieldAlert,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export type CarrierFilterCategory = 'all' | 'es' | 'global' | 'live';

export interface CarrierSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCarrier: (carrier: Carrier) => void;
  selectedCarrierSlug?: string;
  candidates?: DetectedCarrier[];
  title?: string;
  /** Set false when rendered inside another native Modal to avoid nested-Modal issues on iOS/Android. */
  useNativeModal?: boolean;
}

export const CarrierSelectorModal: React.FC<CarrierSelectorModalProps> = ({
  visible,
  onClose,
  onSelectCarrier,
  selectedCarrierSlug,
  candidates = [],
  title,
  useNativeModal = true,
}) => {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CarrierFilterCategory>('all');
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }

  const normalizedSelectedSlug = useMemo(() => {
    if (!selectedCarrierSlug) return undefined;
    return findCarrierBySlug(selectedCarrierSlug).slug;
  }, [selectedCarrierSlug]);

  const candidatesMap = useMemo(() => {
    const map = new Map<string, DetectedCarrier>();
    for (const c of candidates) {
      map.set(c.carrier.slug, c);
    }
    return map;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return candidates.filter((item) => {
      if (selectedCategory === 'es') {
        const isEs = item.carrier.country === 'ES' || item.carrier.region === 'es';
        if (!isEs) return false;
      } else if (selectedCategory === 'global') {
        const isEs = item.carrier.country === 'ES' || item.carrier.region === 'es';
        if (isEs) return false;
      } else if (selectedCategory === 'live') {
        if (!item.carrier.hasLiveTracking) return false;
      }

      if (!q) return true;
      const matchName = item.carrier.name.toLowerCase().includes(q);
      const matchSlug = item.carrier.slug.toLowerCase().includes(q);
      const matchCountry = (item.carrier.countryName || item.carrier.country || '').toLowerCase().includes(q);
      return matchName || matchSlug || matchCountry;
    });
  }, [candidates, searchQuery, selectedCategory]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return CARRIERS_CATALOG.filter((carrier) => {
      // Category filter
      if (selectedCategory === 'es') {
        const isEs = carrier.country === 'ES' || carrier.region === 'es';
        if (!isEs) return false;
      } else if (selectedCategory === 'global') {
        const isEs = carrier.country === 'ES' || carrier.region === 'es';
        if (isEs) return false;
      } else if (selectedCategory === 'live') {
        if (!carrier.hasLiveTracking) return false;
      }

      // Search query filter
      if (!q) return true;

      const matchName = carrier.name.toLowerCase().includes(q);
      const matchSlug = carrier.slug.toLowerCase().includes(q);
      const matchCountry = (carrier.countryName || carrier.country || '').toLowerCase().includes(q);
      const matchType = (carrier.type || '').toLowerCase().includes(q);

      return matchName || matchSlug || matchCountry || matchType;
    });
  }, [searchQuery, selectedCategory]);

  const handleSelect = (carrier: Carrier) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectCarrier(carrier);
    onClose();
  };

  const handleDismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
  };

  const modalContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.backdrop}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.newParcelModal.cancelBtn}
        style={styles.dismissOverlay}
        onPress={handleDismiss}
      />

      <View
        style={[
          styles.modalCard,
          { backgroundColor: theme.canvas, borderColor: theme.border },
        ]}
        accessibilityViewIsModal
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.dotRow}>
              <View style={[styles.dot, { backgroundColor: theme.coral }]} />
              <View style={[styles.dot, { backgroundColor: theme.yellow }]} />
              <View style={[styles.dot, { backgroundColor: theme.mint }]} />
            </View>
            <View style={styles.titleRow}>
              <Truck size={16} color={theme.textPrimary} strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                {title || t.newParcelModal.catalogModalTitle}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.newParcelModal.cancelBtn}
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color={theme.textPrimary} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Search Box */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: theme.canvas, borderColor: theme.border },
            ]}
          >
            <Search size={16} color={theme.textSecondary} strokeWidth={2.5} style={styles.searchIcon} />
            <TextInput
              accessibilityLabel={t.newParcelModal.searchCarriersPlaceholder}
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder={t.newParcelModal.searchCarriersPlaceholder}
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.search.clearAria}
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <X size={14} color={theme.textSecondary} strokeWidth={2.5} />
              </Pressable>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === 'all' }}
              onPress={() => setSelectedCategory('all')}
              style={({ pressed }) => [
                styles.categoryPill,
                {
                  backgroundColor: selectedCategory === 'all' ? theme.yellow : theme.canvas,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  { color: selectedCategory === 'all' ? '#000000' : theme.textPrimary },
                ]}
              >
                {t.newParcelModal.filterAll} ({CARRIERS_CATALOG.length})
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === 'es' }}
              onPress={() => setSelectedCategory('es')}
              style={({ pressed }) => [
                styles.categoryPill,
                {
                  backgroundColor: selectedCategory === 'es' ? theme.yellow : theme.canvas,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  { color: selectedCategory === 'es' ? '#000000' : theme.textPrimary },
                ]}
              >
                🇪🇸 {t.newParcelModal.filterSpain}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === 'global' }}
              onPress={() => setSelectedCategory('global')}
              style={({ pressed }) => [
                styles.categoryPill,
                {
                  backgroundColor: selectedCategory === 'global' ? theme.yellow : theme.canvas,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  { color: selectedCategory === 'global' ? '#000000' : theme.textPrimary },
                ]}
              >
                🌍 {t.newParcelModal.filterGlobal}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === 'live' }}
              onPress={() => setSelectedCategory('live')}
              style={({ pressed }) => [
                styles.categoryPill,
                {
                  backgroundColor: selectedCategory === 'live' ? theme.mint : theme.canvas,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Zap
                size={12}
                color={selectedCategory === 'live' ? '#000000' : theme.textPrimary}
                strokeWidth={2.5}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  { color: selectedCategory === 'live' ? '#000000' : theme.textPrimary },
                ]}
              >
                {t.newParcelModal.filterLive}
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Carriers List */}
        <ScrollView
          style={styles.carrierList}
          contentContainerStyle={styles.carrierListContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Recommended Candidates from Detector (if any) */}
          {filteredCandidates.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Sparkles size={14} color={theme.yellow} strokeWidth={3} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  {t.newParcelModal.recommendedSection} ({filteredCandidates.length})
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                {t.newParcelModal.recommendedSubtitle}
              </Text>

              <View style={styles.recommendedGrid}>
                {filteredCandidates.map((cand) => {
                  const isSelected = normalizedSelectedSlug === cand.carrier.slug;
                  const confidencePercent = Math.round(cand.confidence * 100);

                  return (
                    <Pressable
                      key={`rec-${cand.carrier.slug}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={
                        lang === 'en'
                          ? `${cand.carrier.name}, ${confidencePercent}% match`
                          : `${cand.carrier.name}, ${confidencePercent}% coincidencia`
                      }
                      onPress={() => handleSelect(cand.carrier)}
                      style={({ pressed }) => [
                        styles.recommendedCard,
                        {
                          backgroundColor: isSelected ? theme.yellow : theme.surface,
                          borderColor: theme.border,
                        },
                        isSelected && styles.cardSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.recommendedCardHeader}>
                        <Text
                          style={[
                            styles.recommendedCarrierName,
                            { color: isSelected ? '#000000' : theme.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {cand.carrier.name.toUpperCase()}
                        </Text>
                        <View
                          style={[
                            styles.confidencePill,
                            { backgroundColor: '#000000' },
                          ]}
                        >
                          <Text style={styles.confidencePillText}>
                            {confidencePercent}%
                          </Text>
                        </View>
                      </View>

                      <View style={styles.recommendedBadgesRow}>
                        <View
                          style={[
                            styles.countryBadge,
                            {
                              borderColor: theme.border,
                              backgroundColor: isSelected ? 'rgba(0,0,0,0.08)' : theme.surfaceSubtle,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.countryBadgeText,
                              { color: isSelected ? '#000000' : theme.textPrimary },
                            ]}
                          >
                            {cand.carrier.country || cand.carrier.region?.toUpperCase() || 'GLOBAL'}
                          </Text>
                        </View>

                        {cand.carrier.hasLiveTracking && (
                          <View style={[styles.liveBadge, { backgroundColor: theme.mint, borderColor: theme.border }]}>
                            <Zap size={10} color="#000000" strokeWidth={3} />
                            <Text style={styles.liveBadgeText}>
                              {t.newParcelModal.liveTrackingBadge}
                            </Text>
                          </View>
                        )}

                        {cand.carrier.requiresPostalCode && (
                          <View style={[styles.postalBadge, { backgroundColor: theme.coral, borderColor: theme.border }]}>
                            <ShieldAlert size={10} color="#FFFFFF" strokeWidth={3} />
                            <Text style={styles.postalBadgeText}>
                              {t.newParcelModal.requiresPostalBadge}
                            </Text>
                          </View>
                        )}

                        {isSelected && (
                          <View style={styles.selectedCheck}>
                            <Check size={14} color="#000000" strokeWidth={3} />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section 2: Complete Catalog */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Truck size={14} color={theme.textPrimary} strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {t.newParcelModal.allCarriersSection} ({filteredCatalog.length})
              </Text>
            </View>

            {filteredCatalog.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Search size={24} color={theme.textSecondary} strokeWidth={2} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {t.newParcelModal.noCarriersFound}
                </Text>
              </View>
            ) : (
              filteredCatalog.map((carrier) => {
                const isSelected = normalizedSelectedSlug === carrier.slug;
                const cand = candidatesMap.get(carrier.slug);
                const confidence = cand ? Math.round(cand.confidence * 100) : null;

                return (
                  <Pressable
                    key={`cat-${carrier.slug}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={carrier.name}
                    onPress={() => handleSelect(carrier)}
                    style={({ pressed }) => [
                      styles.catalogItem,
                      {
                        backgroundColor: isSelected ? theme.yellow : theme.surface,
                        borderColor: theme.border,
                      },
                      isSelected && styles.cardSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    {/* Carrier Color Accent Bar */}
                    <View
                      style={[
                        styles.colorAccent,
                        { backgroundColor: carrier.color || theme.blue },
                      ]}
                    />

                    <View style={styles.catalogItemContent}>
                      <View style={styles.catalogItemMainRow}>
                        <Text
                          style={[
                            styles.catalogCarrierName,
                            { color: isSelected ? '#000000' : theme.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {carrier.name}
                        </Text>

                        {isSelected && (
                          <View style={styles.selectedTag}>
                            <Check size={14} color="#000000" strokeWidth={3} />
                          </View>
                        )}
                      </View>

                      <View style={styles.catalogItemDetailsRow}>
                        <Text
                          style={[
                            styles.catalogCarrierSub,
                            { color: isSelected ? '#333333' : theme.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {carrier.countryName || carrier.country || 'Global'}
                          {carrier.type ? ` • ${carrier.type.toUpperCase()}` : ''}
                        </Text>

                        <View style={styles.catalogBadges}>
                          {confidence !== null && (
                            <View style={[styles.candidateTag, { backgroundColor: '#000000' }]}>
                              <Sparkles size={10} color={theme.yellow} strokeWidth={3} style={{ marginRight: 3 }} />
                              <Text style={[styles.candidateTagText, { color: theme.yellow }]}>
                                {confidence}%
                              </Text>
                            </View>
                          )}

                          {carrier.hasLiveTracking && (
                            <View style={[styles.liveBadgeSmall, { backgroundColor: theme.mint, borderColor: theme.border }]}>
                              <Text style={styles.liveBadgeSmallText}>LIVE</Text>
                            </View>
                          )}

                          {carrier.requiresPostalCode && (
                            <View style={[styles.postalBadgeSmall, { backgroundColor: theme.coral, borderColor: theme.border }]}>
                              <Text style={styles.postalBadgeSmallText}>C.P.</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );

  if (!useNativeModal) {
    if (!visible) return null;
    return <View style={styles.inlineOverlayRoot}>{modalContent}</View>;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={handleDismiss}
    >
      {modalContent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  inlineOverlayRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 20,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    height: '85%',
    maxHeight: '88%',
    borderRadius: Theme.radius.md,
    borderWidth: Theme.borders.width,
    overflow: 'hidden',
    ...Theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: Theme.borders.width,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000000',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
  },
  pressed: {
    ...Theme.pressed,
  },
  searchContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.sm,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  carrierList: {
    flex: 1,
    minHeight: 0,
  },
  carrierListContent: {
    padding: 14,
    paddingBottom: 24,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 10,
  },
  recommendedGrid: {
    gap: 8,
    marginBottom: 8,
  },
  recommendedCard: {
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    padding: 12,
    ...Theme.shadows.sm,
  },
  cardSelected: {
    borderWidth: 2.5,
  },
  recommendedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendedCarrierName: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
    flex: 1,
    marginRight: 8,
  },
  confidencePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
  },
  confidencePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  recommendedBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  countryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  countryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
  },
  postalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
  },
  postalBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  selectedCheck: {
    marginLeft: 'auto',
  },
  catalogItem: {
    flexDirection: 'row',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    marginBottom: 8,
    overflow: 'hidden',
    ...Theme.shadows.sm,
  },
  colorAccent: {
    width: 6,
  },
  catalogItemContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  catalogItemMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catalogCarrierName: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
    flex: 1,
  },
  selectedTag: {
    marginLeft: 8,
  },
  catalogItemDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogCarrierSub: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  catalogBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  candidateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: Theme.radius.xs,
  },
  candidateTagText: {
    fontSize: 9,
    fontWeight: '900',
  },
  liveBadgeSmall: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
  },
  liveBadgeSmallText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000000',
  },
  postalBadgeSmall: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
  },
  postalBadgeSmallText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emptyBox: {
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
