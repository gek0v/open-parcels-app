import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { Theme } from '../../theme/adaptiveTheme';
import { Plane, Truck, MapPin, ArrowRight } from 'lucide-react-native';

interface JourneyFlowProps {
  parcel: Parcel;
}

export const JourneyFlow: React.FC<JourneyFlowProps> = ({ parcel }) => {
  const isChained = !!(parcel.additionalCarriers && parcel.additionalCarriers.length > 0);

  return (
    <View style={styles.card}>
      {/* Retro window header */}
      <View style={styles.cardHeader}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: '#FF5C38' }]} />
          <View style={[styles.dot, { backgroundColor: '#FFE600' }]} />
          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
        </View>
        <Text style={styles.cardTitle}>TRAYECTO MULTITRANSPORTISTA</Text>
      </View>

      {/* Origin -> Destination Banner */}
      <View style={styles.routeHeader}>
        <View style={styles.locationNode}>
          <MapPin size={16} color="#000000" />
          <Text style={styles.countryText}>
            {parcel.origin ? `${parcel.origin.name} (${parcel.origin.code})` : 'ORIGEN'}
          </Text>
        </View>

        <ArrowRight size={18} color="#000000" strokeWidth={2.5} style={styles.routeArrow} />

        <View style={styles.locationNode}>
          <MapPin size={16} color="#000000" />
          <Text style={styles.countryText}>
            {parcel.destination
              ? `${parcel.destination.name} (${parcel.destination.code})`
              : 'DESTINO'}
          </Text>
        </View>
      </View>

      {/* Carrier Chaining Nodes */}
      <View style={styles.carrierChainContainer}>
        {/* First Leg Carrier */}
        <View style={styles.carrierLeg}>
          <View style={[styles.carrierIconBox, { backgroundColor: '#38BDF8' }]}>
            <Plane size={18} color="#000000" />
          </View>
          <View style={styles.carrierDetails}>
            <Text style={styles.legRole}>TRAMO INTERNACIONAL</Text>
            <Text style={styles.carrierLegName}>{parcel.carrier.name}</Text>
          </View>
        </View>

        {/* Transfer / Last Mile Leg if chained */}
        {isChained && parcel.lastMileCarrier && (
          <>
            <View style={styles.chainConnector}>
              <View style={styles.chainDottedLine} />
              <View style={styles.transferBadge}>
                <Text style={styles.transferText}>FUSIÓN & RELEVO</Text>
              </View>
            </View>

            <View style={styles.carrierLeg}>
              <View style={[styles.carrierIconBox, { backgroundColor: '#34D399' }]}>
                <Truck size={18} color="#000000" />
              </View>
              <View style={styles.carrierDetails}>
                <Text style={styles.legRole}>ÚLTIMA MILLA LOCAL</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    padding: 16,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFE600',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
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
    fontWeight: '900',
    color: '#000000',
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
    width: 38,
    height: 38,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#000000',
  },
  carrierDetails: {
    flex: 1,
  },
  legRole: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  carrierLegName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
  },
  chainConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    marginVertical: 4,
  },
  chainDottedLine: {
    width: 2.5,
    height: 22,
    backgroundColor: '#000000',
  },
  transferBadge: {
    marginLeft: 14,
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
  },
  transferText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
