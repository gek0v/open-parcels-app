import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { Theme } from '../../theme/adaptiveTheme';
import { Plane, Truck, MapPin, CheckCircle2, ArrowRight } from 'lucide-react-native';

interface JourneyFlowProps {
  parcel: Parcel;
}

export const JourneyFlow: React.FC<JourneyFlowProps> = ({ parcel }) => {
  const isChained = !!(parcel.additionalCarriers && parcel.additionalCarriers.length > 0);
  const isDelivered = parcel.status === 'delivered';

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Trayecto Multitransportista (Journey)</Text>

      {/* Origin -> Destination Banner */}
      <View style={styles.routeHeader}>
        <View style={styles.locationNode}>
          <MapPin size={16} color={Theme.colors.primary} />
          <Text style={styles.countryText}>
            {parcel.origin ? `${parcel.origin.name} (${parcel.origin.code})` : 'Origen'}
          </Text>
        </View>

        <ArrowRight size={16} color={Theme.colors.textTertiary} style={styles.routeArrow} />

        <View style={styles.locationNode}>
          <MapPin size={16} color={Theme.colors.status.delivered} />
          <Text style={styles.countryText}>
            {parcel.destination
              ? `${parcel.destination.name} (${parcel.destination.code})`
              : 'Destino'}
          </Text>
        </View>
      </View>

      {/* Carrier Chaining Nodes */}
      <View style={styles.carrierChainContainer}>
        {/* First Leg Carrier */}
        <View style={styles.carrierLeg}>
          <View style={[styles.carrierIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Plane size={18} color="#2563EB" />
          </View>
          <View style={styles.carrierDetails}>
            <Text style={styles.legRole}>Tramo Internacional</Text>
            <Text style={styles.carrierLegName}>{parcel.carrier.name}</Text>
          </View>
        </View>

        {/* Transfer / Last Mile Leg if chained */}
        {isChained && parcel.lastMileCarrier && (
          <>
            <View style={styles.chainConnector}>
              <View style={styles.chainDottedLine} />
              <View style={styles.transferBadge}>
                <Text style={styles.transferText}>Fusión & Traspaso</Text>
              </View>
            </View>

            <View style={styles.carrierLeg}>
              <View style={[styles.carrierIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Truck size={18} color="#059669" />
              </View>
              <View style={styles.carrierDetails}>
                <Text style={styles.legRole}>Última Milla Local</Text>
                <Text style={styles.carrierLegName}>{parcel.lastMileCarrier.name}</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.card,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radius.sm,
    marginBottom: 14,
  },
  locationNode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeArrow: {
    marginHorizontal: 8,
  },
  countryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginLeft: 6,
  },
  carrierChainContainer: {
    marginTop: 4,
  },
  carrierLeg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  carrierIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  carrierDetails: {
    flex: 1,
  },
  legRole: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  carrierLegName: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  chainConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    marginVertical: 4,
  },
  chainDottedLine: {
    width: 2,
    height: 20,
    backgroundColor: Theme.colors.borderStrong,
  },
  transferBadge: {
    marginLeft: 14,
    backgroundColor: Theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radius.full,
  },
  transferText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
});
