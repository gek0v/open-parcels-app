import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { CANONICAL_STATUS_MAP } from '../../domain/models/status';
import { findCarrierBySlug } from '../../domain/validators/detection';
import { Theme } from '../theme/adaptiveTheme';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { JourneyFlow } from '../components/detail/JourneyFlow';
import { EventTimeline } from '../components/detail/EventTimeline';
import { RenameParcelModal } from '../components/common/RenameParcelModal';
import { DeleteParcelModal } from '../components/common/DeleteParcelModal';
import { CarrierSelectorModal } from '../components/common/CarrierSelectorModal';
import { trackingEngineManager } from '../../infrastructure/engine';
import { isPostalCodeRequiredError } from '../../infrastructure/engine/errors';
import { getLocalizedStatusText } from '../../infrastructure/engine/mapper';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../../infrastructure/i18n';
import { Carrier, DetectedCarrier } from '../../domain/models/carrier';
import { openSafeWebUrl } from '../../infrastructure/utils/url';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  ExternalLink,
  Archive,
  Trash2,
  Share2,
  Clock,
  Calendar,
  Edit2,
  RefreshCw,
  Copy,
  ArrowRightLeft,
  Check,
  X,
  MapPin,
} from 'lucide-react-native';
import { ShareService } from '../../infrastructure/services/ShareService';

interface ParcelDetailScreenProps {
  parcel: Parcel;
  onBack: () => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateAlias: (id: string, newAlias: string) => void;
  onParcelUpdated?: (updated: Parcel) => void;
}

interface PostalPromptState {
  parcel: Parcel;
  carrier: Carrier;
  triggerRefresh: boolean;
}

export const ParcelDetailScreen: React.FC<ParcelDetailScreenProps> = ({
  parcel,
  onBack,
  onToggleArchive,
  onDelete,
  onUpdateAlias,
  onParcelUpdated,
}) => {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const isEn = lang === 'en';
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [carrierModalVisible, setCarrierModalVisible] = useState(false);
  const [carrierCandidates, setCarrierCandidates] = useState<DetectedCarrier[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postalPrompt, setPostalPrompt] = useState<PostalPromptState | null>(null);
  const [postalInput, setPostalInput] = useState('');
  const [postalError, setPostalError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const openPostalModal = (
    targetParcel: Parcel,
    targetCarrier: Carrier,
    triggerRefresh: boolean
  ) => {
    setPostalInput(targetParcel.postalCode || '');
    setPostalError(null);
    setPostalPrompt({
      parcel: targetParcel,
      carrier: targetCarrier,
      triggerRefresh,
    });
  };

  const resolveCarrierTrackingUrl = (targetParcel: Parcel): string | undefined => {
    const catalogCarrier = findCarrierBySlug(targetParcel.carrier.slug);
    const template = targetParcel.carrier.trackingUrl || catalogCarrier.trackingUrl;
    if (template) {
      return template.includes('%s')
        ? template.replace('%s', encodeURIComponent(targetParcel.trackingNumber))
        : template;
    }
    return targetParcel.carrier.website || catalogCarrier.website;
  };

  const handleOpenCarrierWeb = async (targetParcel: Parcel = parcel) => {
    const catalogCarrier = findCarrierBySlug(targetParcel.carrier.slug);
    const primaryUrl = resolveCarrierTrackingUrl(targetParcel);
    const fallbackUrl =
      targetParcel.carrier.website || catalogCarrier.website || 'https://openparcels.com';
    const success = await openSafeWebUrl(primaryUrl, fallbackUrl);
    if (!success && isMountedRef.current) {
      Alert.alert(
        isEn ? 'Unable to open browser' : 'No se pudo abrir el navegador'
      );
    }
  };

  const performTrackAndSave = async (
    baseParcel: Parcel,
    targetCarrier: Carrier,
    options: { isCarrierChange: boolean }
  ) => {
    const catalogCarrier = findCarrierBySlug(targetCarrier.slug);
    const requiresPostal = !!(
      targetCarrier.requiresPostalCode || catalogCarrier.requiresPostalCode
    );
    const supportsLive = !!(
      targetCarrier.hasLiveTracking ||
      catalogCarrier.hasLiveTracking ||
      trackingEngineManager.isNativeGoActive
    );

    if (requiresPostal && !baseParcel.postalCode?.trim()) {
      openPostalModal(baseParcel, targetCarrier, true);
      return;
    }

    if (!supportsLive) {
      if (!options.isCarrierChange && isMountedRef.current) {
        Alert.alert(
          isEn ? 'Live tracking unavailable' : 'Seguimiento en vivo no disponible',
          isEn
            ? `${targetCarrier.name} does not support automatic live updates yet. You can check the official tracking page.`
            : `${targetCarrier.name} aún no dispone de actualización automática en vivo. Puedes consultar el seguimiento en su web oficial.`,
          [
            { text: isEn ? 'Close' : 'Cerrar', style: 'cancel' },
            {
              text: isEn ? 'Open official site' : 'Abrir web oficial',
              onPress: () => {
                void handleOpenCarrierWeb(baseParcel);
              },
            },
          ]
        );
      }
      return;
    }

    setIsRefreshing(true);
    try {
      const refreshed = await trackingEngineManager.current.track({
        trackingNumber: baseParcel.trackingNumber,
        carrierHint: targetCarrier.slug,
        postalCode: baseParcel.postalCode,
        destinationCountry: baseParcel.destination?.code,
        allowSimulated: false,
        forceRefresh: true,
        lang: lang || 'es',
      });

      if (!refreshed || refreshed.isLiveData === false || refreshed.error) {
        throw new Error(
          refreshed?.error ||
            (isEn
              ? 'No live tracking data received from the carrier.'
              : 'No se recibieron datos en vivo del transportista.')
        );
      }

      const mergedCarrier: Carrier = {
        ...catalogCarrier,
        ...targetCarrier,
        ...refreshed.carrier,
        slug: refreshed.carrier?.slug || targetCarrier.slug,
        name: refreshed.carrier?.name || targetCarrier.name,
        website: refreshed.carrier?.website || targetCarrier.website || catalogCarrier.website,
        trackingUrl:
          refreshed.carrier?.trackingUrl ||
          targetCarrier.trackingUrl ||
          catalogCarrier.trackingUrl,
        requiresPostalCode:
          refreshed.carrier?.requiresPostalCode ??
          targetCarrier.requiresPostalCode ??
          catalogCarrier.requiresPostalCode,
        hasLiveTracking:
          refreshed.carrier?.hasLiveTracking ??
          targetCarrier.hasLiveTracking ??
          catalogCarrier.hasLiveTracking,
      };

      const merged: Parcel = {
        ...refreshed,
        id: baseParcel.id,
        trackingNumber: baseParcel.trackingNumber,
        carrier: mergedCarrier,
        customAlias: baseParcel.customAlias,
        notes: baseParcel.notes,
        isArchived: baseParcel.isArchived,
        createdAt: baseParcel.createdAt,
        postalCode: baseParcel.postalCode || refreshed.postalCode,
        origin: refreshed.origin || baseParcel.origin,
        destination: refreshed.destination || baseParcel.destination,
        updatedAt: new Date().toISOString(),
      };

      await parcelRepository.save(merged);
      if (isMountedRef.current) {
        onParcelUpdated?.(merged);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    } catch (err: any) {
      const errMsg = typeof err?.message === 'string' ? err.message : '';
      if (
        isPostalCodeRequiredError(err) ||
        errMsg.toLowerCase().includes('código postal') ||
        errMsg.toLowerCase().includes('postal code')
      ) {
        if (isMountedRef.current) {
          openPostalModal(baseParcel, targetCarrier, true);
        }
        return;
      }

      if (isMountedRef.current) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        Alert.alert(
          options.isCarrierChange
            ? isEn
              ? 'Carrier updated'
              : 'Transportista actualizado'
            : isEn
            ? 'Update error'
            : 'Error al actualizar',
          options.isCarrierChange
            ? isEn
              ? `Changed to ${targetCarrier.name}, but live tracking could not be fetched: ${
                  errMsg || 'Unknown error'
                }`
              : `Se cambió a ${targetCarrier.name}, pero no se pudo consultar el seguimiento en vivo: ${
                  errMsg || 'Error de conexión'
                }`
            : errMsg ||
                (isEn
                  ? 'Could not fetch current tracking status from the carrier.'
                  : 'No se pudo consultar el estado actual del transportista.')
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  const handleOpenCarrierSelector = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    try {
      const candidates = await trackingEngineManager.current.detect(parcel.trackingNumber);
      if (isMountedRef.current) {
        setCarrierCandidates(candidates);
      }
    } catch {
      if (isMountedRef.current) {
        setCarrierCandidates([]);
      }
    }
    if (isMountedRef.current) {
      setCarrierModalVisible(true);
    }
  };

  const handleChangeCarrier = async (newCarrier: Carrier) => {
    setCarrierModalVisible(false);
    const catalogCarrier = findCarrierBySlug(newCarrier.slug);
    const resolvedCarrier: Carrier = { ...catalogCarrier, ...newCarrier };

    if (resolvedCarrier.slug === parcel.carrier.slug) {
      if (resolvedCarrier.requiresPostalCode && !parcel.postalCode?.trim()) {
        openPostalModal(parcel, resolvedCarrier, true);
      }
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const nowIso = new Date().toISOString();
    const updated: Parcel = {
      ...parcel,
      carrier: resolvedCarrier,
      additionalCarriers: undefined,
      lastMileCarrier: undefined,
      lastMileTrackingNumber: undefined,
      flightLegs: undefined,
      status: 'pending',
      statusText: getLocalizedStatusText('pending', lang || 'es'),
      progress: CANONICAL_STATUS_MAP.pending.baseProgress,
      origin: resolvedCarrier.country
        ? {
            code: resolvedCarrier.country,
            name: resolvedCarrier.countryName || resolvedCarrier.country,
          }
        : undefined,
      estimatedDelivery: undefined,
      deliveredAt: null,
      daysInTransit: 0,
      weight: undefined,
      serviceType: undefined,
      fromCache: false,
      isLiveData: false,
      events: [],
      error: undefined,
      updatedAt: nowIso,
    };

    try {
      await parcelRepository.save(updated);
      if (isMountedRef.current) {
        onParcelUpdated?.(updated);
      }
    } catch (saveErr: any) {
      if (isMountedRef.current) {
        Alert.alert(
          isEn ? 'Save error' : 'Error al guardar',
          saveErr?.message ||
            (isEn ? 'Could not save carrier change.' : 'No se pudo guardar el cambio de transportista.')
        );
      }
      return;
    }

    await performTrackAndSave(updated, resolvedCarrier, { isCarrierChange: true });
  };

  const handleSubmitPostalCode = async () => {
    if (!postalPrompt) return;
    const cleanPostal = postalInput.trim();
    if (!cleanPostal) {
      setPostalError(
        t.newParcelModal?.postalCodeHint ||
          (isEn
            ? 'Please enter a valid destination postal code.'
            : 'Introduce un código postal de destino válido.')
      );
      return;
    }

    const { parcel: targetParcel, carrier: targetCarrier, triggerRefresh } = postalPrompt;
    const updated: Parcel = {
      ...targetParcel,
      postalCode: cleanPostal,
      updatedAt: new Date().toISOString(),
    };

    try {
      await parcelRepository.save(updated);
      if (isMountedRef.current) {
        onParcelUpdated?.(updated);
        setPostalPrompt(null);
        setPostalError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setPostalError(
          err?.message ||
            (isEn ? 'Failed to save postal code.' : 'No se pudo guardar el código postal.')
        );
      }
      return;
    }

    if (triggerRefresh) {
      await performTrackAndSave(updated, targetCarrier, { isCarrierChange: false });
    }
  };

  const handleFetchUpdate = async () => {
    await performTrackAndSave(parcel, parcel.carrier, { isCarrierChange: false });
  };

  const handleShare = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const ok = await ShareService.shareParcel(parcel, { lang });
    if (!ok && isMountedRef.current) {
      Alert.alert(
        isEn ? 'Share failed' : 'Error al compartir',
        isEn
          ? 'Could not open the share dialog on this device.'
          : 'No se pudo abrir el menú de compartir en este dispositivo.'
      );
    }
  };

  const handleCopySummary = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const ok = await ShareService.copyParcelSummary(parcel, { lang });
    if (isMountedRef.current) {
      if (ok) {
        Alert.alert(
          isEn ? 'Copied' : 'Copiado',
          t.share?.copiedToast || '¡Resumen estructurado copiado al portapapeles!'
        );
      } else {
        Alert.alert(
          isEn ? 'Copy failed' : 'Error al copiar',
          isEn
            ? 'Could not copy summary to clipboard.'
            : 'No se pudo copiar el resumen al portapapeles.'
        );
      }
    }
  };

  const handleCopyTrackingNumber = async (code: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    try {
      await Clipboard.setStringAsync(code);
      if (isMountedRef.current) {
        Alert.alert(
          isEn ? 'Copied' : 'Copiado',
          t.detail.copiedToast || '¡Número de seguimiento copiado al portapapeles!'
        );
      }
    } catch {
      if (isMountedRef.current) {
        Alert.alert(
          isEn ? 'Copy failed' : 'Error al copiar',
          isEn
            ? 'Could not copy tracking number.'
            : 'No se pudo copiar el número de seguimiento.'
        );
      }
    }
  };

  const confirmDelete = () => {
    setDeleteModalVisible(true);
  };

  const formatUpdatedAt = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const locale = isEn ? 'en-US' : 'es-ES';
      return (
        d.toLocaleDateString(locale, { day: '2-digit', month: 'short' }) +
        ' · ' +
        d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return isoStr;
    }
  };

  const catalogCarrier = findCarrierBySlug(parcel.carrier.slug);
  const showPostalCodeBox = !!(
    parcel.postalCode ||
    parcel.carrier.requiresPostalCode ||
    catalogCarrier.requiresPostalCode
  );
  const isPostalMissing =
    !!(parcel.carrier.requiresPostalCode || catalogCarrier.requiresPostalCode) &&
    !parcel.postalCode?.trim();

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: theme.canvas }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.detail.back}
          onPress={onBack}
          style={({ pressed }) => [
            styles.navButton,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={20} color={theme.textPrimary} strokeWidth={3} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.detail.changeCarrier}
          onPress={handleOpenCarrierSelector}
          style={({ pressed }) => [styles.navTitleBox, pressed && styles.smallPressed]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.navTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {parcel.customAlias || parcel.trackingNumber}
          </Text>
          <View style={styles.navSubtitleRow}>
            <Text style={[styles.navSubtitle, { color: theme.textTertiary }]} numberOfLines={1}>
              {parcel.carrier.name.toUpperCase()}
            </Text>
            <ArrowRightLeft
              size={11}
              color={theme.textTertiary}
              strokeWidth={2.5}
              style={{ marginLeft: 5 }}
            />
          </View>
        </Pressable>

        <View style={styles.navActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.detail.fetchUpdateBtn}
            onPress={handleFetchUpdate}
            disabled={isRefreshing}
            style={({ pressed }) => [
              styles.navButton,
              styles.refreshNavButton,
              { backgroundColor: theme.status.in_transit, borderColor: theme.border },
              pressed && !isRefreshing && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <RefreshCw size={15} color="#000000" strokeWidth={3} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.detail.editAlias}
            onPress={() => setRenameModalVisible(true)}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Edit2 size={15} color={theme.textPrimary} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.share?.shareAria || t.detail.shareSummaryBtn}
            onPress={handleShare}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Share2 size={15} color={theme.textPrimary} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={parcel.isArchived ? t.detail.unarchive : t.detail.archive}
            onPress={() => onToggleArchive(parcel.id)}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              parcel.isArchived && { backgroundColor: theme.yellow },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Archive
              size={15}
              color={parcel.isArchived ? '#000000' : theme.textPrimary}
              strokeWidth={2.5}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleFetchUpdate}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Main Status & Progress Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statusHeaderGroup}>
            <StatusBadge status={parcel.status} size="medium" />
            <View
              style={[
                styles.transitBadge,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <Clock size={12} color={theme.textPrimary} strokeWidth={2.5} style={styles.clockIcon} />
              <Text style={[styles.transitText, { color: theme.textPrimary }]}>
                {parcel.daysInTransit} {t.detail.daysInTransit}
              </Text>
            </View>
          </View>

          <Text style={[styles.statusDescription, { color: theme.textPrimary }]}>
            {parcel.statusText}
          </Text>

          {/* Large Progress Bar with Numerical Percentage */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: theme.textTertiary }]}>
                {isEn ? 'SHIPMENT PROGRESS' : 'PROGRESO DEL ENVÍO'}
              </Text>
              <View
                style={[
                  styles.progressPercentBadge,
                  { backgroundColor: theme.yellow, borderColor: theme.border },
                ]}
              >
                <Text style={styles.progressPercent}>{parcel.progress}%</Text>
              </View>
            </View>
            <ProgressBar progress={parcel.progress} status={parcel.status} height={14} />
          </View>

          {/* Alias Box */}
          <View
            style={[
              styles.metaBox,
              { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
            ]}
          >
            <View style={styles.metaItem}>
              <View style={styles.metaLabelRow}>
                <Text style={[styles.metaLabel, { color: theme.textTertiary }]}>
                  {t.renameModal?.label || (isEn ? 'PACKAGE ALIAS' : 'ALIAS DEL PAQUETE')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.detail.editAlias}
                  onPress={() => setRenameModalVisible(true)}
                  style={({ pressed }) => [
                    styles.inlineRenameButton,
                    { backgroundColor: theme.yellow, borderColor: theme.border },
                    pressed && styles.inlineRenamePressed,
                  ]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Edit2 size={11} color="#000000" strokeWidth={2.5} />
                  <Text style={styles.inlineRenameText}>{t.detail.editAlias}</Text>
                </Pressable>
              </View>
              <Text style={[styles.metaAliasText, { color: theme.textPrimary }]} numberOfLines={1}>
                {parcel.customAlias ||
                  (isEn ? 'No custom alias' : 'Sin alias personalizado')}
              </Text>
            </View>
          </View>

          {/* Monospaced Tracking Number and Postal Code */}
          <View
            style={[
              styles.metaBox,
              { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.detail.copyAria}
              onPress={() => handleCopyTrackingNumber(parcel.trackingNumber)}
              style={({ pressed }) => [styles.metaItem, pressed && styles.smallPressed]}
            >
              <View style={styles.metaLabelRow}>
                <Text style={[styles.metaLabel, { color: theme.textTertiary }]}>
                  {t.newParcelModal?.trackingNumberLabel || 'Nº SEGUIMIENTO'}
                </Text>
                <Copy size={12} color={theme.textTertiary} strokeWidth={2.5} />
              </View>
              <Text
                style={[styles.metaValueMono, { color: theme.textPrimary }]}
                numberOfLines={1}
                selectable
              >
                {parcel.trackingNumber}
              </Text>
            </Pressable>

            {showPostalCodeBox && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isEn ? 'Edit postal code' : 'Editar código postal'}
                onPress={() => openPostalModal(parcel, parcel.carrier, true)}
                style={({ pressed }) => [
                  styles.metaItem,
                  styles.postalItem,
                  { borderLeftColor: theme.border },
                  pressed && styles.smallPressed,
                ]}
              >
                <View style={styles.metaLabelRow}>
                  <Text style={[styles.metaLabel, { color: theme.textTertiary }]}>
                    {isEn ? 'POSTAL CODE' : 'C.P. DESTINO'}
                  </Text>
                  <Edit2 size={11} color={theme.textTertiary} strokeWidth={2.5} />
                </View>
                <Text
                  style={[
                    styles.metaValue,
                    { color: isPostalMissing ? theme.coral : theme.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {parcel.postalCode || (isEn ? 'Add C.P.' : 'Añadir C.P.')}
                </Text>
              </Pressable>
            )}
          </View>

          {(!!parcel.serviceType || !!parcel.weight) && (
            <View
              style={[
                styles.metaBox,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              {!!parcel.serviceType && (
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: theme.textTertiary }]}>
                    {isEn ? 'SERVICE' : 'SERVICIO'}
                  </Text>
                  <Text style={[styles.metaValue, { color: theme.textPrimary }]} numberOfLines={1}>
                    {parcel.serviceType}
                  </Text>
                </View>
              )}
              {!!parcel.weight && (
                <View
                  style={[
                    styles.metaItem,
                    !!parcel.serviceType && styles.postalItem,
                    !!parcel.serviceType && { borderLeftColor: theme.border },
                  ]}
                >
                  <Text style={[styles.metaLabel, { color: theme.textTertiary }]}>
                    {isEn ? 'WEIGHT' : 'PESO'}
                  </Text>
                  <Text style={[styles.metaValue, { color: theme.textPrimary }]} numberOfLines={1}>
                    {parcel.weight}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!!parcel.lastMileTrackingNumber && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.detail.copyAria}
              onPress={() => handleCopyTrackingNumber(parcel.lastMileTrackingNumber!)}
              style={({ pressed }) => [
                styles.metaBox,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                pressed && styles.smallPressed,
              ]}
            >
              <View style={styles.metaItem}>
                <View style={styles.metaLabelRow}>
                  <Text style={[styles.metaLabel, { color: theme.textTertiary }]}>
                    {isEn ? 'LAST-MILE TRACKING' : 'SEGUIMIENTO ÚLTIMA MILLA'}
                  </Text>
                  <Copy size={12} color={theme.textTertiary} strokeWidth={2.5} />
                </View>
                <Text
                  style={[styles.metaValueMono, { color: theme.textPrimary }]}
                  numberOfLines={1}
                  selectable
                >
                  {parcel.lastMileTrackingNumber}
                </Text>
              </View>
            </Pressable>
          )}

          <View style={styles.updateRow}>
            <Calendar size={12} color={theme.textTertiary} strokeWidth={2.5} />
            <Text style={[styles.updateText, { color: theme.textTertiary }]}>
              {isEn ? 'Last updated:' : 'Última actualización:'} {formatUpdatedAt(parcel.updatedAt)}
            </Text>
          </View>

          {/* Explicit Fetch / Refresh Button in Hero Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRefreshing, busy: isRefreshing }}
            onPress={handleFetchUpdate}
            disabled={isRefreshing}
            style={({ pressed }) => [
              styles.refreshHeroButton,
              { backgroundColor: theme.yellow, borderColor: theme.border },
              isRefreshing && styles.refreshHeroButtonDisabled,
              pressed && !isRefreshing && styles.pressed,
            ]}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#000000" style={styles.refreshIcon} />
            ) : (
              <RefreshCw size={15} color="#000000" strokeWidth={3} style={styles.refreshIcon} />
            )}
            <Text style={styles.refreshHeroText}>
              {isRefreshing
                ? t.detail.fetching
                : isEn
                ? 'REFRESH SHIPMENT STATUS'
                : 'ACTUALIZAR ESTADO DEL PEDIDO'}
            </Text>
          </Pressable>
        </View>

        {/* Multi-Carrier Journey Flow Component */}
        <JourneyFlow parcel={parcel} />

        {/* Share and Copy Summary Actions */}
        <View style={styles.shareButtonsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.share?.shareSummary || t.detail.shareSummaryBtn}
            onPress={handleShare}
            style={({ pressed }) => [
              styles.shareActionButton,
              { backgroundColor: theme.yellow, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <Share2 size={15} color="#000000" strokeWidth={2.5} />
            <Text style={styles.shareActionText}>
              {t.share?.shareBtn || t.detail.shareSummaryBtn}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.share?.copySummary || t.detail.copySummaryBtn}
            onPress={handleCopySummary}
            style={({ pressed }) => [
              styles.shareActionButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <Copy size={15} color={theme.textPrimary} strokeWidth={2.5} />
            <Text style={[styles.shareActionText, { color: theme.textPrimary }]}>
              {t.share?.copyBtn || t.detail.copySummaryBtn}
            </Text>
          </Pressable>
        </View>

        {/* Carrier Official Website Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.detail.officialSite} (${parcel.carrier.name})`}
          onPress={() => handleOpenCarrierWeb(parcel)}
          style={({ pressed }) => [
            styles.carrierLinkButton,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.carrierLinkText, { color: theme.textPrimary }]} numberOfLines={1}>
            {t.detail.officialSite} ({parcel.carrier.name.toUpperCase()})
          </Text>
          <ExternalLink size={16} color={theme.textPrimary} strokeWidth={3} />
        </Pressable>

        {/* Change Carrier Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.detail.changeCarrier} (${parcel.carrier.name})`}
          onPress={handleOpenCarrierSelector}
          style={({ pressed }) => [
            styles.changeCarrierButton,
            { backgroundColor: theme.yellow, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <ArrowRightLeft size={16} color="#000000" strokeWidth={2.5} style={{ marginRight: 8 }} />
          <Text style={styles.changeCarrierButtonText} numberOfLines={1}>
            {t.detail.changeCarrier || 'CAMBIAR TRANSPORTISTA'} ({parcel.carrier.name.toUpperCase()})
          </Text>
        </Pressable>

        {/* Full Event Timeline */}
        <EventTimeline events={parcel.events} />

        {/* Delete Shipment Action */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.detail.delete}
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: theme.coral, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <Trash2 size={16} color="#000000" strokeWidth={2.5} style={styles.deleteIcon} />
          <Text style={styles.deleteButtonText}>
            {isEn ? 'DELETE SHIPMENT' : 'ELIMINAR PAQUETE'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Modal to rename shipment */}
      {renameModalVisible && (
        <RenameParcelModal
          visible
          initialAlias={parcel.customAlias}
          trackingNumber={parcel.trackingNumber}
          onClose={() => setRenameModalVisible(false)}
          onSave={(newAlias) => onUpdateAlias(parcel.id, newAlias)}
        />
      )}

      {/* Custom Neo-Brutalist Delete Confirmation Modal */}
      {deleteModalVisible && (
        <DeleteParcelModal
          visible
          parcelTitle={parcel.customAlias || parcel.trackingNumber}
          trackingNumber={parcel.trackingNumber}
          carrierName={parcel.carrier.name}
          onClose={() => setDeleteModalVisible(false)}
          onConfirmDelete={() => {
            setDeleteModalVisible(false);
            onDelete(parcel.id);
          }}
        />
      )}

      {/* Postal Code Input Modal for carriers requiring C.P. */}
      <Modal
        visible={!!postalPrompt}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setPostalPrompt(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.postalBackdrop}
        >
          <Pressable
            style={styles.postalDismissOverlay}
            onPress={() => setPostalPrompt(null)}
          />
          <View
            style={[
              styles.postalDialogCard,
              { backgroundColor: theme.canvas, borderColor: theme.border },
            ]}
            accessibilityViewIsModal
          >
            <View style={[styles.postalHeader, { borderBottomColor: theme.border }]}>
              <View style={styles.postalDotsRow}>
                <View style={[styles.postalDot, { backgroundColor: theme.coral, borderColor: theme.border }]} />
                <View style={[styles.postalDot, { backgroundColor: theme.yellow, borderColor: theme.border }]} />
                <View style={[styles.postalDot, { backgroundColor: theme.mint, borderColor: theme.border }]} />
              </View>
              <View style={styles.postalTitleBox}>
                <Text style={[styles.postalTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  {t.newParcelModal?.postalCodeLabel ||
                    (isEn ? 'POSTAL CODE (REQUIRED)' : 'CÓDIGO POSTAL (OBLIGATORIO)')}
                </Text>
                {postalPrompt && (
                  <Text style={[styles.postalSubtitle, { color: theme.textTertiary }]} numberOfLines={1}>
                    {postalPrompt.carrier.name.toUpperCase()}
                  </Text>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.newParcelModal?.cancelBtn || 'Cancelar'}
                onPress={() => setPostalPrompt(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.postalCloseBtn,
                  { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                  pressed && styles.smallPressed,
                ]}
              >
                <X size={16} color={theme.textPrimary} strokeWidth={3} />
              </Pressable>
            </View>

            <Text style={[styles.postalHint, { color: theme.textSecondary }]}>
              {t.newParcelModal?.postalCodeHint ||
                (isEn
                  ? 'This courier requires the destination postal code to fetch live tracking.'
                  : 'Este transportista exige el código postal de entrega para consultar el seguimiento.')}
            </Text>

            <View
              style={[
                styles.postalInputBox,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <MapPin size={16} color={theme.textTertiary} strokeWidth={2.5} style={{ marginRight: 8 }} />
              <TextInput
                accessibilityLabel={t.newParcelModal?.postalCodeLabel || 'Código Postal'}
                style={[styles.postalInput, { color: theme.textPrimary }]}
                value={postalInput}
                onChangeText={(val) => {
                  setPostalInput(val);
                  if (postalError) setPostalError(null);
                }}
                placeholder={t.newParcelModal?.postalCodePlaceholder || 'ej. 28001'}
                placeholderTextColor={theme.textTertiary}
                autoFocus
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmitPostalCode}
              />
            </View>

            {!!postalError && (
              <Text style={[styles.postalErrorText, { color: theme.coral }]}>{postalError}</Text>
            )}

            <View style={styles.postalButtonRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.newParcelModal?.cancelBtn || 'Cancelar'}
                onPress={() => setPostalPrompt(null)}
                style={({ pressed }) => [
                  styles.postalCancelBtn,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.postalCancelText, { color: theme.textPrimary }]}>
                  {t.newParcelModal?.cancelBtn || 'CANCELAR'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.renameModal?.saveBtn || 'Guardar'}
                onPress={handleSubmitPostalCode}
                style={({ pressed }) => [
                  styles.postalSaveBtn,
                  { backgroundColor: theme.yellow, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Check size={16} color="#000000" strokeWidth={3} style={{ marginRight: 6 }} />
                <Text style={styles.postalSaveText}>
                  {isEn ? 'SAVE & TRACK' : 'GUARDAR Y CONSULTAR'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Carrier Selector Modal (Full Catalog with Recommended Options) */}
      <CarrierSelectorModal
        visible={carrierModalVisible}
        onClose={() => setCarrierModalVisible(false)}
        onSelectCarrier={handleChangeCarrier}
        selectedCarrierSlug={parcel.carrier.slug}
        candidates={carrierCandidates}
        title={t.detail.changeCarrier}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Theme.colors.background,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  refreshNavButton: {
    backgroundColor: Theme.colors.status.in_transit,
  },
  navTitleBox: {
    flex: 1,
    marginHorizontal: 8,
    minWidth: 0,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 11,
    fontWeight: '900',
    color: Theme.colors.textTertiary,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    ...Theme.shadows.md,
  },
  statusHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  transitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    alignSelf: 'flex-start',
    ...Theme.shadows.sm,
  },
  clockIcon: {
    marginRight: 4,
  },
  transitText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },
  statusDescription: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 16,
    letterSpacing: -0.4,
    lineHeight: 25,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: Theme.colors.textTertiary,
    letterSpacing: 0.6,
  },
  progressPercentBadge: {
    backgroundColor: Theme.colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  metaBox: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 10,
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
  },
  postalItem: {
    flex: 0.6,
    borderLeftWidth: 2,
    borderLeftColor: '#000000',
    paddingLeft: 12,
    marginLeft: 12,
  },
  metaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  inlineRenameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Theme.radius.xs,
    backgroundColor: Theme.colors.yellow,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  inlineRenamePressed: {
    ...Theme.pressed,
  },
  inlineRenameText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 3,
    letterSpacing: 0.4,
  },
  metaAliasText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginTop: 5,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.textTertiary,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  metaValueMono: {
    fontSize: 14,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '900',
    color: '#000000',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    marginTop: 3,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  updateText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textTertiary,
    marginLeft: 5,
    flexShrink: 1,
  },
  refreshHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.yellow,
    marginTop: 14,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.md,
  },
  refreshHeroButtonDisabled: {
    opacity: 0.65,
  },
  refreshIcon: {
    marginRight: 8,
  },
  refreshHeroText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  shareActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  shareActionText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: '#000000',
  },
  carrierLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.sm,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    ...Theme.shadows.md,
  },
  carrierLinkText: {
    flexShrink: 1,
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginRight: 8,
  },
  changeCarrierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.sm,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: Theme.borders.width,
    ...Theme.shadows.sm,
  },
  changeCarrierButtonText: {
    flexShrink: 1,
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  navSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: Theme.colors.coral,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  deleteIcon: {
    marginRight: 6,
  },
  deleteButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  postalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  postalDismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  postalDialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Theme.radius.md,
    padding: 20,
    borderWidth: Theme.borders.width,
    ...Theme.shadows.lg,
  },
  postalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 2,
  },
  postalDotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 10,
  },
  postalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  postalTitleBox: {
    flex: 1,
    minWidth: 0,
  },
  postalTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  postalSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  postalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.xs,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  postalHint: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 12,
  },
  postalInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
    ...Theme.shadows.sm,
  },
  postalInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 0,
  },
  postalErrorText: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
  },
  postalButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  postalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  postalCancelText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  postalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    ...Theme.shadows.sm,
  },
  postalSaveText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },
  pressed: {
    ...Theme.pressed,
  },
  smallPressed: {
    ...Theme.pressed,
  },
});
