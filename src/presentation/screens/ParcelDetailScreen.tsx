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
} from 'react-native';
import { Parcel } from '../../domain/models/parcel';
import { Theme } from '../theme/adaptiveTheme';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { JourneyFlow } from '../components/detail/JourneyFlow';
import { EventTimeline } from '../components/detail/EventTimeline';
import { RenameParcelModal } from '../components/common/RenameParcelModal';
import {
  ArrowLeft,
  ExternalLink,
  Archive,
  Trash2,
  Share2,
  Clock,
  Calendar,
  Edit2,
} from 'lucide-react-native';

interface ParcelDetailScreenProps {
  parcel: Parcel;
  onBack: () => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateAlias: (id: string, newAlias: string) => void;
}

export const ParcelDetailScreen: React.FC<ParcelDetailScreenProps> = ({
  parcel,
  onBack,
  onToggleArchive,
  onDelete,
  onUpdateAlias,
}) => {
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const handleOpenCarrierWeb = () => {
    const url = parcel.carrier.website || 'https://openparcels.com';
    Linking.openURL(url).catch(() => {
      Alert.alert('No se pudo abrir el navegador');
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Seguimiento de envío Open Parcels:\n${parcel.customAlias || ''} (${parcel.trackingNumber})\nEstado: ${parcel.statusText} (${parcel.progress}%)\nTransportista: ${parcel.carrier.name}`,
      });
    } catch {}
  };

  const confirmDelete = () => {
    Alert.alert(
      'Eliminar Envío',
      '¿Estás seguro de que deseas eliminar este envío de tu historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onDelete(parcel.id);
            onBack();
          },
        },
      ]
    );
  };

  const formatUpdatedAt = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
        ' a las ' +
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
        <Pressable onPress={onBack} style={styles.navButton}>
          <ArrowLeft size={22} color={Theme.colors.textPrimary} />
        </Pressable>

        <View style={styles.navTitleBox}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {parcel.customAlias || parcel.trackingNumber}
          </Text>
          <Text style={styles.navSubtitle}>{parcel.carrier.name}</Text>
        </View>

        <View style={styles.navActions}>
          <Pressable
            onPress={() => setRenameModalVisible(true)}
            style={styles.navButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Edit2 size={18} color={Theme.colors.primary} />
          </Pressable>
          <Pressable onPress={handleShare} style={styles.navButton}>
            <Share2 size={20} color={Theme.colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => onToggleArchive(parcel.id)}
            style={[styles.navButton, parcel.isArchived && styles.navButtonActive]}
          >
            <Archive
              size={20}
              color={parcel.isArchived ? Theme.colors.primary : Theme.colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Main Status & Progress Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <StatusBadge status={parcel.status} size="medium" />
            <View style={styles.transitBadge}>
              <Clock size={13} color={Theme.colors.textSecondary} style={styles.clockIcon} />
              <Text style={styles.transitText}>{parcel.daysInTransit} días en tránsito</Text>
            </View>
          </View>

          <Text style={styles.statusDescription}>{parcel.statusText}</Text>

          {/* Large Progress Bar with Numerical Percentage */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progreso del Envío</Text>
              <Text style={styles.progressPercent}>{parcel.progress}%</Text>
            </View>
            <ProgressBar progress={parcel.progress} status={parcel.status} height={8} />
          </View>

          {/* Monospaced Tracking Number and Postal Code */}
          <View style={styles.metaBox}>
            <View style={styles.metaItem}>
              <View style={styles.metaLabelRow}>
                <Text style={styles.metaLabel}>Alias</Text>
                <Pressable
                  onPress={() => setRenameModalVisible(true)}
                  style={styles.inlineRenameButton}
                >
                  <Edit2 size={12} color={Theme.colors.primary} />
                  <Text style={styles.inlineRenameText}>Renombrar</Text>
                </Pressable>
              </View>
              <Text style={styles.metaAliasText}>
                {parcel.customAlias || 'Sin alias (toca para renombrar)'}
              </Text>
            </View>
          </View>

          <View style={styles.metaBox}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Nº Seguimiento</Text>
              <Text style={styles.metaValueMono}>{parcel.trackingNumber}</Text>
            </View>
            {parcel.postalCode && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>C.P. Destino</Text>
                <Text style={styles.metaValue}>{parcel.postalCode}</Text>
              </View>
            )}
          </View>

          <View style={styles.updateRow}>
            <Calendar size={12} color={Theme.colors.textTertiary} />
            <Text style={styles.updateText}>
              Última actualización: {formatUpdatedAt(parcel.updatedAt)}
            </Text>
          </View>
        </View>

        {/* Multi-Carrier Journey Flow Component */}
        <JourneyFlow parcel={parcel} />

        {/* Carrier Official Website Action Button */}
        <Pressable onPress={handleOpenCarrierWeb} style={styles.carrierLinkButton}>
          <Text style={styles.carrierLinkText}>
            Ver seguimiento oficial en {parcel.carrier.name}
          </Text>
          <ExternalLink size={16} color={Theme.colors.primary} />
        </Pressable>

        {/* Full Event Timeline */}
        <EventTimeline events={parcel.events} />

        {/* Delete Shipment Action */}
        <Pressable onPress={confirmDelete} style={styles.deleteButton}>
          <Trash2 size={18} color="#DC2626" style={styles.deleteIcon} />
          <Text style={styles.deleteButtonText}>Eliminar paquete del dispositivo</Text>
        </Pressable>
      </ScrollView>

      {/* Modal to rename shipment */}
      <RenameParcelModal
        visible={renameModalVisible}
        initialAlias={parcel.customAlias}
        trackingNumber={parcel.trackingNumber}
        onClose={() => setRenameModalVisible(false)}
        onSave={(newAlias) => onUpdateAlias(parcel.id, newAlias)}
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
    paddingTop: Theme.isIOS ? 54 : 20,
    paddingBottom: 14,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  navButton: {
    padding: 8,
    borderRadius: Theme.radius.full,
  },
  navButtonActive: {
    backgroundColor: Theme.colors.primaryLight,
  },
  navTitleBox: {
    flex: 1,
    marginHorizontal: 12,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  heroCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  transitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
  },
  clockIcon: {
    marginRight: 4,
  },
  transitText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  statusDescription: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  metaBox: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: Theme.radius.sm,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineRenameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.primaryLight,
  },
  inlineRenameText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginLeft: 4,
  },
  metaAliasText: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textTertiary,
    textTransform: 'uppercase',
  },
  metaValueMono: {
    fontSize: 13,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginTop: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginTop: 2,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateText: {
    fontSize: 11,
    color: Theme.colors.textTertiary,
    marginLeft: 4,
  },
  carrierLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primaryLight,
    paddingVertical: 14,
    borderRadius: Theme.radius.md,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  carrierLinkText: {
    color: Theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 32,
  },
  deleteIcon: {
    marginRight: 6,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
});
