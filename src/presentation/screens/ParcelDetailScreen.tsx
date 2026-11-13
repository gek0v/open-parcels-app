import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { Theme } from '../theme/adaptiveTheme';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { JourneyFlow } from '../components/detail/JourneyFlow';
import { EventTimeline } from '../components/detail/EventTimeline';
import { RenameParcelModal } from '../components/common/RenameParcelModal';
import { DeleteParcelModal } from '../components/common/DeleteParcelModal';
import { trackingEngineManager } from '../../infrastructure/engine';
import { parcelRepository } from '../../infrastructure/storage/ParcelRepository';
import { useTheme } from '../theme/ThemeContext';
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

export const ParcelDetailScreen: React.FC<ParcelDetailScreenProps> = ({
  parcel,
  onBack,
  onToggleArchive,
  onDelete,
  onUpdateAlias,
  onParcelUpdated,
}) => {
  const { theme } = useTheme();
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFetchUpdate = async () => {
    setIsRefreshing(true);
    try {
      const updated = await trackingEngineManager.current.track({
        trackingNumber: parcel.trackingNumber,
        carrierHint: parcel.carrier.slug,
        postalCode: parcel.postalCode,
        destinationCountry: parcel.destination?.code,
        allowSimulated: parcel.isLiveData ? false : undefined,
        lang: 'es',
      });

      if (parcel.isLiveData && updated.isLiveData === false) {
        throw new Error('No se recibieron datos en vivo del transportista.');
      }

      // Preserve local metadata
      updated.id = parcel.id;
      updated.customAlias = parcel.customAlias;
      updated.notes = parcel.notes;
      updated.isArchived = parcel.isArchived;
      updated.createdAt = parcel.createdAt;
      updated.postalCode = parcel.postalCode || updated.postalCode;
      updated.origin = updated.origin || parcel.origin;
      updated.destination = updated.destination || parcel.destination;
      updated.updatedAt = new Date().toISOString();

      await parcelRepository.save(updated);
      if (onParcelUpdated) {
        onParcelUpdated(updated);
      }
    } catch (err: any) {
      Alert.alert(
        'Error al actualizar',
        err.message || 'No se pudo consultar el estado actual del transportista.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenCarrierWeb = () => {
    const url = parcel.carrier.website || 'https://openparcels.com';
    Linking.openURL(url).catch(() => {
      Alert.alert('No se pudo abrir el navegador');
    });
  };

  const handleShare = async () => {
    try {
      await ShareService.shareParcel(parcel);
    } catch {}
  };

  const handleCopySummary = async () => {
    try {
      const ok = await ShareService.copyParcelSummary(parcel);
      if (ok) {
        Alert.alert('Copiado', '¡Resumen estructurado copiado al portapapeles!');
      }
    } catch {}
  };

  const confirmDelete = () => {
    setDeleteModalVisible(true);
  };

  const formatUpdatedAt = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
        ' · ' +
        d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return isoStr;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: theme.canvas }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al listado"
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

        <View style={styles.navTitleBox}>
          <Text style={[styles.navTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {parcel.customAlias || parcel.trackingNumber}
          </Text>
          <Text style={[styles.navSubtitle, { color: theme.textTertiary }]} numberOfLines={1}>
            {parcel.carrier.name.toUpperCase()}
          </Text>
        </View>

        <View style={styles.navActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar estado"
            onPress={handleFetchUpdate}
            disabled={isRefreshing}
            style={({ pressed }) => [
              styles.navButton,
              styles.refreshNavButton,
              { backgroundColor: theme.status.in_transit, borderColor: theme.border },
              pressed && !isRefreshing && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <RefreshCw size={16} color="#000000" strokeWidth={3} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar alias"
            onPress={() => setRenameModalVisible(true)}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Edit2 size={16} color={theme.textPrimary} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartir envío"
            onPress={handleShare}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Share2 size={16} color={theme.textPrimary} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={parcel.isArchived ? 'Desarchivar envío' : 'Archivar envío'}
            onPress={() => onToggleArchive(parcel.id)}
            style={({ pressed }) => [
              styles.navButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              parcel.isArchived && { backgroundColor: theme.yellow },
              pressed && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Archive size={16} color={theme.textPrimary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Status & Progress Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statusHeaderGroup}>
            <StatusBadge status={parcel.status} size="medium" />
            <View style={[styles.transitBadge, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
              <Clock size={12} color={theme.textPrimary} strokeWidth={2.5} style={styles.clockIcon} />
              <Text style={[styles.transitText, { color: theme.textPrimary }]}>{parcel.daysInTransit} DÍAS EN TRÁNSITO</Text>
            </View>
          </View>

          <Text style={[styles.statusDescription, { color: theme.textPrimary }]}>{parcel.statusText}</Text>

          {/* Large Progress Bar with Numerical Percentage */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: theme.textTertiary }]}>PROGRESO DEL ENVÍO</Text>
              <View style={[styles.progressPercentBadge, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
                <Text style={[styles.progressPercent, { color: theme.textPrimary }]}>{parcel.progress}%</Text>
              </View>
            </View>
            <ProgressBar progress={parcel.progress} status={parcel.status} height={14} />
          </View>

          {/* Monospaced Tracking Number and Postal Code */}
          <View style={[styles.metaBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <View style={styles.metaItem}>
              <View style={styles.metaLabelRow}>
                <Text style={[styles.metaLabel, { color: theme.textTertiary }]}>ALIAS DEL PAQUETE</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Editar alias del paquete"
                  onPress={() => setRenameModalVisible(true)}
                  style={({ pressed }) => [
                    styles.inlineRenameButton,
                    { backgroundColor: theme.yellow, borderColor: theme.border },
                    pressed && styles.inlineRenamePressed,
                  ]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Edit2 size={11} color={theme.textPrimary} strokeWidth={2.5} />
                  <Text style={[styles.inlineRenameText, { color: theme.textPrimary }]}>EDITAR</Text>
                </Pressable>
              </View>
              <Text style={[styles.metaAliasText, { color: theme.textPrimary }]} numberOfLines={1}>
                {parcel.customAlias || 'Sin alias personalizado'}
              </Text>
            </View>
          </View>

          <View style={[styles.metaBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: theme.textTertiary }]}>Nº SEGUIMIENTO / ALBARÁN</Text>
              <Text style={[styles.metaValueMono, { color: theme.textPrimary }]} numberOfLines={1}>
                {parcel.trackingNumber}
              </Text>
            </View>
            {parcel.postalCode && (
              <View style={[styles.metaItem, styles.postalItem, { borderLeftColor: theme.border }]}>
                <Text style={[styles.metaLabel, { color: theme.textTertiary }]}>C.P. DESTINO</Text>
                <Text style={[styles.metaValue, { color: theme.textPrimary }]}>{parcel.postalCode}</Text>
              </View>
            )}
          </View>

          {(!!parcel.serviceType || !!parcel.weight || !!parcel.lastMileTrackingNumber) && (
            <View style={styles.metaBox}>
              {!!parcel.serviceType && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>SERVICIO</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>{parcel.serviceType}</Text>
                </View>
              )}
              {!!parcel.weight && (
                <View style={[styles.metaItem, styles.postalItem]}>
                  <Text style={styles.metaLabel}>PESO</Text>
                  <Text style={styles.metaValue}>{parcel.weight}</Text>
                </View>
              )}
              {!!parcel.lastMileTrackingNumber && !parcel.weight && (
                <View style={[styles.metaItem, styles.postalItem]}>
                  <Text style={styles.metaLabel}>ÚLTIMA MILLA</Text>
                  <Text style={styles.metaValueMono} numberOfLines={1}>{parcel.lastMileTrackingNumber}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.updateRow}>
            <Calendar size={12} color={theme.textTertiary} strokeWidth={2.5} />
            <Text style={[styles.updateText, { color: theme.textTertiary }]}>
              Última actualización: {formatUpdatedAt(parcel.updatedAt)}
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
            <Text style={[styles.refreshHeroText, { color: theme.textPrimary }]}>
              {isRefreshing ? 'CONSULTANDO AL TRANSPORTISTA...' : 'ACTUALIZAR ESTADO DEL PEDIDO'}
            </Text>
          </Pressable>
        </View>

        {/* Multi-Carrier Journey Flow Component */}
        <JourneyFlow parcel={parcel} />

        {/* Share and Copy Summary Actions */}
        <View style={styles.shareButtonsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartir resumen del envío"
            onPress={handleShare}
            style={({ pressed }) => [
              styles.shareActionButton,
              { backgroundColor: theme.yellow, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <Share2 size={15} color="#000000" strokeWidth={2.5} />
            <Text style={styles.shareActionText}>COMPARTIR</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copiar resumen del envío al portapapeles"
            onPress={handleCopySummary}
            style={({ pressed }) => [
              styles.shareActionButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <Copy size={15} color={theme.textPrimary} strokeWidth={2.5} />
            <Text style={[styles.shareActionText, { color: theme.textPrimary }]}>COPIAR RESUMEN</Text>
          </Pressable>
        </View>

        {/* Carrier Official Website Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir seguimiento oficial en ${parcel.carrier.name}`}
          onPress={handleOpenCarrierWeb}
          style={({ pressed }) => [
            styles.carrierLinkButton,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.carrierLinkText, { color: theme.textPrimary }]} numberOfLines={1}>
            SEGUIMIENTO OFICIAL EN {parcel.carrier.name.toUpperCase()}
          </Text>
          <ExternalLink size={16} color={theme.textPrimary} strokeWidth={3} />
        </Pressable>

        {/* Full Event Timeline */}
        <EventTimeline events={parcel.events} />

        {/* Delete Shipment Action */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Eliminar paquete"
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: theme.coral, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <Trash2 size={16} color={theme.textPrimary} strokeWidth={2.5} style={styles.deleteIcon} />
          <Text style={[styles.deleteButtonText, { color: theme.textPrimary }]}>ELIMINAR PAQUETE</Text>
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
            onBack();
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Theme.isIOS ? 54 : 20,
    paddingBottom: 14,
    backgroundColor: Theme.colors.background,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  navButtonActive: {
    backgroundColor: Theme.colors.yellow,
  },
  refreshNavButton: {
    backgroundColor: Theme.colors.status.in_transit,
  },
  navTitleBox: {
    flex: 1,
    marginHorizontal: 10,
    minWidth: 0,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 11,
    fontWeight: '900',
    color: Theme.colors.textTertiary,
    letterSpacing: 0.6,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
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
    flex: 0.55,
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
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '2.5px 2.5px 0px #000000' } as any) : {}),
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
    backgroundColor: Theme.colors.yellow,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.sm,
    marginHorizontal: 20,
    marginBottom: 16,
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
  pressed: {
    ...Theme.pressed,
  },
});
