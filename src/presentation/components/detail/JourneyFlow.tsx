import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Parcel } from '../../../domain/models/parcel';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../../infrastructure/i18n';
import { Plane, Truck, MapPin, ArrowRight } from 'lucide-react-native';

interface JourneyFlowProps {
  parcel: Parcel;
}

const DOMESTIC_ES_SLUGS = new Set([
  'correos-spain',
  'correos',
  'correosexpress',
  'correos-express',
  'seur',
  'asm-gls-spain',
  'gls-spain',
  'mrw-spain',
  'mrw',
  'inpost-es',
  'inpost',
  'nacex-spain',
  'nacex',
  'ctt-express',
  'dhl-parcel-es',
  'paack',
  'tipsa',
  'zeleris',
  'ontime',
  'packlink',
]);

function formatCountryLabel(
  country: Parcel['origin'] | undefined,
  fallback: string
): string {
  if (!country) return fallback;
  const name = (country.name || '').trim();
  const code = (country.code || '').trim();
  if (name && code && name.toUpperCase() !== code.toUpperCase()) {
    return `${name} (${code})`;
  }
  return name || code || fallback;
}

export const JourneyFlow: React.FC<JourneyFlowProps> = ({ parcel }) => {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const isEn = lang === 'en';

  const lastMileSlug = parcel.lastMileCarrier?.slug;
  const extraCarriers = (parcel.additionalCarriers || []).filter(
    (c) => c.slug !== parcel.carrier.slug && c.slug !== lastMileSlug
  );
  const hasLastMile = !!(
    parcel.lastMileCarrier && parcel.lastMileCarrier.slug !== parcel.carrier.slug
  );
  const isChained = extraCarriers.length > 0 || hasLastMile;

  const isDomestic =
    !isChained &&
    ((parcel.origin?.code &&
      parcel.destination?.code &&
      parcel.origin.code.toUpperCase() === parcel.destination.code.toUpperCase()) ||
      (!parcel.origin?.code &&
        !parcel.destination?.code &&
        DOMESTIC_ES_SLUGS.has(parcel.carrier.slug)) ||
      (parcel.carrier.country === 'ES' &&
        (!parcel.destination?.code || parcel.destination.code === 'ES') &&
        (!parcel.origin?.code || parcel.origin.code === 'ES')));

  const headerTitle = isChained
    ? t.detail.journeyTitle
    : isDomestic
    ? isEn
      ? 'DOMESTIC JOURNEY'
      : 'TRAYECTO NACIONAL'
    : isEn
    ? 'INTERNATIONAL JOURNEY'
    : 'TRAYECTO INTERNACIONAL';

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Retro window header */}
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: theme.coral, borderColor: theme.border }]} />
          <View style={[styles.dot, { backgroundColor: theme.yellow, borderColor: theme.border }]} />
          <View style={[styles.dot, { backgroundColor: theme.mint, borderColor: theme.border }]} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {headerTitle}
        </Text>
      </View>

      {/* Origin -> Destination Banner */}
      <View style={[styles.routeHeader, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
        <View style={styles.locationNode}>
          <MapPin size={16} color="#000000" strokeWidth={2.5} />
          <Text style={styles.countryText} numberOfLines={2}>
            {formatCountryLabel(parcel.origin, isEn ? 'ORIGIN' : 'ORIGEN')}
          </Text>
        </View>

        <ArrowRight size={18} color="#000000" strokeWidth={3} style={styles.routeArrow} />

        <View style={styles.locationNode}>
          <MapPin size={16} color="#000000" strokeWidth={2.5} />
          <Text style={styles.countryText} numberOfLines={2}>
            {formatCountryLabel(parcel.destination, isEn ? 'DESTINATION' : 'DESTINO')}
          </Text>
        </View>
      </View>

      {/* Carrier Chaining Nodes */}
      <View style={styles.carrierChainContainer}>
        {/* First Leg Carrier */}
        <View style={styles.carrierLeg}>
          <View
            style={[
              styles.carrierIconBox,
              { backgroundColor: theme.status.in_transit, borderColor: theme.border },
            ]}
          >
            {isDomestic ? (
              <Truck size={18} color="#000000" strokeWidth={2.5} />
            ) : (
              <Plane size={18} color="#000000" strokeWidth={2.5} />
            )}
          </View>
          <View style={styles.carrierDetails}>
            <Text style={[styles.legRole, { color: theme.textTertiary }]}>
              {isDomestic
                ? isEn
                  ? 'DOMESTIC LEG'
                  : 'TRAYECTO NACIONAL'
                : isEn
                ? 'INTERNATIONAL LEG'
                : 'TRAMO INTERNACIONAL'}
            </Text>
            <Text style={[styles.carrierLegName, { color: theme.textPrimary }]} numberOfLines={1}>
              {parcel.carrier.name}
            </Text>
          </View>
        </View>

        {/* Intermediate Chained Carriers (if any) */}
        {extraCarriers.map((extra, idx) => (
          <React.Fragment key={`extra-${extra.slug}-${idx}`}>
            <View style={styles.chainConnector}>
              <View style={[styles.chainDottedLine, { backgroundColor: theme.border }]} />
              <View style={styles.transferBadge}>
                <Text style={styles.transferText}>
                  {isEn ? 'TRANSIT HANDOVER' : 'RELEVO EN RUTA'}
                </Text>
              </View>
            </View>

            <View style={styles.carrierLeg}>
              <View
                style={[
                  styles.carrierIconBox,
                  { backgroundColor: theme.status.info_received, borderColor: theme.border },
                ]}
              >
                <Truck size={18} color="#000000" strokeWidth={2.5} />
              </View>
              <View style={styles.carrierDetails}>
                <Text style={[styles.legRole, { color: theme.textTertiary }]}>
                  {isEn ? 'CONNECTING CARRIER' : 'TRANSPORTISTA INTERMEDIO'}
                </Text>
                <Text style={[styles.carrierLegName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {extra.name}
                </Text>
              </View>
            </View>
          </React.Fragment>
        ))}

        {/* Transfer / Last Mile Leg if chained */}
        {hasLastMile && parcel.lastMileCarrier && (
          <>
            <View style={styles.chainConnector}>
              <View style={[styles.chainDottedLine, { backgroundColor: theme.border }]} />
              <View style={styles.transferBadge}>
                <Text style={styles.transferText}>
                  {isEn ? 'MERGE & HANDOVER' : 'FUSIÓN & RELEVO'}
                </Text>
              </View>
            </View>

            <View style={styles.carrierLeg}>
              <View
                style={[
                  styles.carrierIconBox,
                  { backgroundColor: theme.status.delivered, borderColor: theme.border },
                ]}
              >
                <Truck size={18} color="#000000" strokeWidth={2.5} />
              </View>
              <View style={styles.carrierDetails}>
                <Text style={[styles.legRole, { color: theme.textTertiary }]}>
                  {isEn ? 'LOCAL LAST MILE' : 'ÚLTIMA MILLA LOCAL'}
                </Text>
                <Text style={[styles.carrierLegName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {parcel.lastMileCarrier.name}
                </Text>
                {!!parcel.lastMileTrackingNumber && (
                  <Text style={[styles.lastMileCode, { color: theme.textSecondary }]} numberOfLines={1}>
                    {parcel.lastMileTrackingNumber}
                  </Text>
                )}
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
    flex: 1,
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
    minWidth: 0,
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
  lastMileCode: {
    fontSize: 11,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    marginTop: 2,
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
