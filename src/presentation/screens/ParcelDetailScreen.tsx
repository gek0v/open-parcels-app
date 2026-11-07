import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  Share,
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
} from 'lucide-react-native';

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
        lang: 'es',
      });

      // Preserve local metadata
      updated.id = parcel.id;
      updated.customAlias = parcel.customAlias;
      updated.isArchived = parcel.isArchived;
      updated.createdAt = parcel.createdAt;
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
      await Share.share({
        message: `📦 Envío Open Parcels: ${parcel.customAlias || ''} (${parcel.trackingNumber})\nEstado: ${parcel.statusText} (${parcel.progress}%)\nTransportista: ${parcel.carrier.name}`,
      });
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
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al listado"
          onPress={onBack}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
        >
          <ArrowLeft size={20} color="#000000" strokeWidth={3} />
        </Pressable>

        <View style={styles.navTitleBox}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {parcel.customAlias || parcel.trackingNumber}
          </Text>
          <Text style={styles.navSubtitle} numberOfLines={1}>
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
              pressed && !isRefreshing && styles.pressed,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Edit2 size={16} color="#000000" strokeWidth={2.5} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartir envío"
            onPress={handleShare}
            style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          >
            <Share2 size={16} color="#000000" strokeWidth={2.5} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={parcel.isArchived ? 'Desarchivar envío' : 'Archivar envío'}
            onPress={() => onToggleArchive(parcel.id)}
            style={({ pressed }) => [
              styles.navButton,
              parcel.isArchived && styles.navButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Archive size={16} color="#000000" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Status & Progress Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.statusHeaderGroup}>
            <StatusBadge status={parcel.status} size="medium" />
            <View style={styles.transitBadge}>
              <Clock size={12} color="#000000" strokeWidth={2.5} style={styles.clockIcon} />
              <Text style={styles.transitText}>{parcel.daysInTransit} DÍAS EN TRÁNSITO</Text>
            </View>
          </View>

          <Text style={styles.statusDescription}>{parcel.statusText}</Text>

          {/* Large Progress Bar with Numerical Percentage */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>PROGRESO DEL ENVÍO</Text>
              <View style={styles.progressPercentBadge}>
                <Text style={styles.progressPercent}>{parcel.progress}%</Text>
              </View>
            </View>
            <ProgressBar progress={parcel.progress} status={parcel.status} height={14} />
          </View>

          {/* Monospaced Tracking Number and Postal Code */}
          <View style={styles.metaBox}>
            <View style={styles.metaItem}>
              <View style={styles.metaLabelRow}>
                <Text style={styles.metaLabel}>ALIAS DEL PAQUETE</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Editar alias del paquete"
                  onPress={() => setRenameModalVisible(true)}
                  style={({ pressed }) => [
                    styles.inlineRenameButton,
                    pressed && styles.inlineRenamePressed,
                  ]}
                >
                  <Edit2 size={11} color="#000000" strokeWidth={2.5} />
                  <Text style={styles.inlineRenameText}>EDITAR</Text>
                </Pressable>
              </View>
              <Text style={styles.metaAliasText} numberOfLines={1}>
                {parcel.customAlias || 'Sin alias personalizado'}
              </Text>
            </View>
          </View>

          <View style={styles.metaBox}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Nº SEGUIMIENTO / ALBARÁN</Text>
              <Text style={styles.metaValueMono} numberOfLines={1}>
                {parcel.trackingNumber}
              </Text>
            </View>
            {parcel.postalCode && (
              <View style={[styles.metaItem, styles.postalItem]}>
                <Text style={styles.metaLabel}>C.P. DESTINO</Text>
                <Text style={styles.metaValue}>{parcel.postalCode}</Text>
              </View>
            )}
          </View>

          <View style={styles.updateRow}>
            <Calendar size={12} color={Theme.colors.textTertiary} strokeWidth={2.5} />
            <Text style={styles.updateText}>
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
              {isRefreshing ? 'CONSULTANDO AL TRANSPORTISTA...' : 'ACTUALIZAR ESTADO DEL PEDIDO'}
            </Text>
          </Pressable>
        </View>

        {/* Multi-Carrier Journey Flow Component */}
        <JourneyFlow parcel={parcel} />

        {/* Carrier Official Website Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir seguimiento oficial en ${parcel.carrier.name}`}
          onPress={handleOpenCarrierWeb}
          style={({ pressed }) => [styles.carrierLinkButton, pressed && styles.pressed]}
        >
          <Text style={styles.carrierLinkText} numberOfLines={1}>
            SEGUIMIENTO OFICIAL EN {parcel.carrier.name.toUpperCase()}
          </Text>
          <ExternalLink size={16} color="#000000" strokeWidth={3} />
        </Pressable>

        {/* Full Event Timeline */}
        <EventTimeline events={parcel.events} />

        {/* Delete Shipment Action */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Eliminar paquete"
          onPress={confirmDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Trash2 size={16} color="#FFFFFF" strokeWidth={2.5} style={styles.deleteIcon} />
          <Text style={styles.deleteButtonText}>ELIMINAR PAQUETE</Text>
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
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.textTertiary,
    letterSpacing: 0.6,
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
    fontSize: 10,
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
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.textTertiary,
    letterSpacing: 0.6,
  },
  progressPercentBadge: {
    backgroundColor: Theme.colors.yellow,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
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
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Theme.radius.xs,
    backgroundColor: Theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  inlineRenamePressed: {
    ...Theme.pressed,
  },
  inlineRenameText: {
    fontSize: 9,
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
    fontSize: 9,
    fontWeight: '900',
    color: Theme.colors.textTertiary,
    letterSpacing: 0.6,
  },
  metaValueMono: {
    fontSize: 13,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '900',
    color: '#000000',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  metaValue: {
    fontSize: 13,
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
  carrierLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.yellow,
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pressed: {
    ...Theme.pressed,
  },
});
