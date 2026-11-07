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
        <Pressable onPress={onBack} style={styles.navButton}>
          <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.navTitleBox}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {parcel.customAlias || parcel.trackingNumber}
          </Text>
          <Text style={styles.navSubtitle}>{parcel.carrier.name.toUpperCase()}</Text>
        </View>

        <View style={styles.navActions}>
          <Pressable
            onPress={handleFetchUpdate}
            disabled={isRefreshing}
            style={[styles.navButton, styles.refreshNavButton]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <RefreshCw size={16} color="#000000" strokeWidth={2.5} />
            )}
          </Pressable>
          <Pressable
            onPress={() => setRenameModalVisible(true)}
            style={styles.navButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Edit2 size={16} color="#000000" />
          </Pressable>
          <Pressable onPress={handleShare} style={styles.navButton}>
            <Share2 size={16} color="#000000" />
          </Pressable>
          <Pressable
            onPress={() => onToggleArchive(parcel.id)}
            style={[styles.navButton, parcel.isArchived && styles.navButtonActive]}
          >
            <Archive size={16} color="#000000" />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Main Status & Progress Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.statusHeaderGroup}>
            <StatusBadge status={parcel.status} size="medium" />
            <View style={styles.transitBadge}>
              <Clock size={12} color="#000000" style={styles.clockIcon} />
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
                  onPress={() => setRenameModalVisible(true)}
                  style={styles.inlineRenameButton}
                >
                  <Edit2 size={11} color="#000000" />
                  <Text style={styles.inlineRenameText}>EDITAR</Text>
                </Pressable>
              </View>
              <Text style={styles.metaAliasText}>
                {parcel.customAlias || 'Sin alias personalizado'}
              </Text>
            </View>
          </View>

          <View style={styles.metaBox}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Nº SEGUIMIENTO / ALBARÁN</Text>
              <Text style={styles.metaValueMono}>{parcel.trackingNumber}</Text>
            </View>
            {parcel.postalCode && (
              <View style={[styles.metaItem, styles.postalItem]}>
                <Text style={styles.metaLabel}>C.P. DESTINO</Text>
                <Text style={styles.metaValue}>{parcel.postalCode}</Text>
              </View>
            )}
          </View>

          <View style={styles.updateRow}>
            <Calendar size={12} color="#64748B" />
            <Text style={styles.updateText}>
              Última actualización: {formatUpdatedAt(parcel.updatedAt)}
            </Text>
          </View>

          {/* Explicit Fetch / Refresh Button in Hero Card */}
          <Pressable
            onPress={handleFetchUpdate}
            disabled={isRefreshing}
            style={[
              styles.refreshHeroButton,
              isRefreshing && styles.refreshHeroButtonDisabled,
            ]}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#000000" style={styles.refreshIcon} />
            ) : (
              <RefreshCw size={15} color="#000000" strokeWidth={2.5} style={styles.refreshIcon} />
            )}
            <Text style={styles.refreshHeroText}>
              {isRefreshing ? 'CONSULTANDO AL TRANSPORTISTA...' : 'ACTUALIZAR ESTADO DEL PEDIDO'}
            </Text>
          </Pressable>
        </View>

        {/* Multi-Carrier Journey Flow Component */}
        <JourneyFlow parcel={parcel} />

        {/* Carrier Official Website Action Button */}
        <Pressable onPress={handleOpenCarrierWeb} style={styles.carrierLinkButton}>
          <Text style={styles.carrierLinkText}>
            SEGUIMIENTO OFICIAL EN {parcel.carrier.name.toUpperCase()}
          </Text>
          <ExternalLink size={16} color="#000000" strokeWidth={2.5} />
        </Pressable>

        {/* Full Event Timeline */}
        <EventTimeline events={parcel.events} />

        {/* Delete Shipment Action */}
        <Pressable onPress={confirmDelete} style={styles.deleteButton}>
          <Trash2 size={16} color="#FFFFFF" style={styles.deleteIcon} />
          <Text style={styles.deleteButtonText}>ELIMINAR PAQUETE</Text>
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
    backgroundColor: Theme.colors.background,
  },
  navButton: {
    padding: 8,
    borderRadius: Theme.radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    marginLeft: 6,
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  navButtonActive: {
    backgroundColor: '#FFE600',
  },
  refreshNavButton: {
    backgroundColor: '#38BDF8', // Electric Sky Blue
  },
  navTitleBox: {
    flex: 1,
    marginHorizontal: 10,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    ...(Theme.isWeb ? ({ boxShadow: '4px 4px 0px #000000' } as any) : {}),
  },
  statusHeaderGroup: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  transitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    alignSelf: 'flex-start',
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
    letterSpacing: -0.3,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  progressPercentBadge: {
    backgroundColor: '#FFE600',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  metaBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: Theme.radius.sm,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 10,
  },
  metaItem: {
    flex: 1,
  },
  postalItem: {
    borderLeftWidth: 1.5,
    borderLeftColor: '#000000',
    paddingLeft: 12,
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
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFE600',
    borderWidth: 1,
    borderColor: '#000000',
  },
  inlineRenameText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 3,
  },
  metaAliasText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  metaValueMono: {
    fontSize: 13,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '900',
    color: '#000000',
    marginTop: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    marginTop: 2,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  updateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  refreshHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE600', // Cyber Yellow
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  refreshHeroButtonDisabled: {
    opacity: 0.7,
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
    backgroundColor: '#FFE600',
    paddingVertical: 14,
    borderRadius: Theme.radius.sm,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '3px 3px 0px #000000' } as any) : {}),
  },
  carrierLinkText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: '#FF5C38',
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '2.5px 2.5px 0px #000000' } as any) : {}),
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
});
