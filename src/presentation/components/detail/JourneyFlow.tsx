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
          <View style={[styles.dot, { backgroundColor: Theme.colors.coral }]} />
          <View style={[styles.dot, { backgroundColor: Theme.colors.yellow }]} />
          <View style={[styles.dot, { backgroundColor: Theme.colors.mint }]} />
        </View>
        <Text style={styles.cardTitle}>TRAYECTO MULTITRANSPORTISTA</Text>
      </View>

      {/* Origin -> Destination Banner */}
      <View style={styles.routeHeader}>
        <View style={styles.locationNode}>
          <MapPin size={16} color="#000000" strokeWidth={2.5} />
          <Text style={styles.countryText} numberOfLines={1}>
            {parcel.origin ? `${parcel.origin.name} (${parcel.origin.code})` : 'ORIGEN'}
          </Text>
        </View>

        <ArrowRight size={18} color="#000000" strokeWidth={3} style={styles.routeArrow} />

        <View style={styles.locationNode}>
          <MapPin size={16} color="#000000" strokeWidth={2.5} />
          <Text style={styles.countryText} numberOfLines={1}>
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
          <View style={[styles.carrierIconBox, { backgroundColor: Theme.colors.status.in_transit }]}>
            <Plane size={18} color="#000000" strokeWidth={2.5} />
          </View>
          <View style={styles.carrierDetails}>
            <Text style={styles.legRole}>TRAMO INTERNACIONAL</Text>
            <Text style={styles.carrierLegName} numberOfLines={1}>
              {parcel.carrier.name}
            </Text>
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
              <View style={[styles.carrierIconBox, { backgroundColor: Theme.colors.status.delivered }]}>
                <Truck size={18} color="#000000" strokeWidth={2.5} />
              </View>
              <View style={styles.carrierDetails}>
                <Text style={styles.legRole}>ÚLTIMA MILLA LOCAL</Text>
                <Text style={styles.carrierLegName} numberOfLines={1}>
                  {parcel.lastMileCarrier.name}
                </Text>
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
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    ...Theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 14,
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
    backgroundColor: Theme.colors.yellow,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 16,
    ...Theme.shadows.sm,
  },
  locationNode: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  routeArrow: {
    marginHorizontal: 6,
  },
  countryText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 5,
  },
  carrierChainContainer: {
    marginTop: 2,
  },
  carrierLeg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  carrierIconBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  carrierDetails: {
    flex: 1,
  },
  legRole: {
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.textTertiary,
    letterSpacing: 0.6,
  },
  carrierLegName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.2,
  },
  chainConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 19,
    marginVertical: 5,
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
    paddingVertical: 3,
    borderRadius: Theme.radius.xs,
  },
  transferText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
});
