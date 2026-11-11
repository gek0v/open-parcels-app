import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrackingEvent, EventStage } from '../../../domain/models/event';
import { Theme } from '../../theme/adaptiveTheme';
import {
  FileText,
  Package,
  ShieldCheck,
  Plane,
  Truck,
  CheckCircle,
  AlertTriangle,
  ArrowRightLeft,
} from 'lucide-react-native';

interface EventTimelineProps {
  events: TrackingEvent[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const sorted = [...events].sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    if (!isNaN(ta) && !isNaN(tb) && ta !== tb) {
      return tb - ta;
    }
    return 0;
  });

  const getStageIcon = (stage: EventStage) => {
    const size = 15;
    const color = '#000000';

    switch (stage) {
      case 'created':
        return <FileText size={size} color={color} strokeWidth={2.5} />;
      case 'picked_up':
      case 'pickup':
        return <Package size={size} color={color} strokeWidth={2.5} />;
      case 'customs':
        return <ShieldCheck size={size} color={color} strokeWidth={2.5} />;
      case 'transit':
        return <Plane size={size} color={color} strokeWidth={2.5} />;
      case 'handover':
        return <ArrowRightLeft size={size} color={color} strokeWidth={2.5} />;
      case 'last_mile':
      case 'delivery':
        return <Truck size={size} color={color} strokeWidth={2.5} />;
      case 'completed':
        return <CheckCircle size={size} color={color} strokeWidth={2.5} />;
      case 'exception':
        return <AlertTriangle size={size} color={color} strokeWidth={2.5} />;
      default:
        return <Package size={size} color={color} strokeWidth={2.5} />;
    }
  };

  const getStageBg = (stage: EventStage, isLatest: boolean) => {
    if (stage === 'completed') return Theme.colors.status.delivered;
    if (stage === 'exception') return Theme.colors.status.failed_attempt;
    if (isLatest) return Theme.colors.yellow;
    return '#FFFFFF';
  };

  const formatDate = (isoStr: string) => {
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
    <View style={styles.card}>
      {/* Retro window header */}
      <View style={styles.cardHeader}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: Theme.colors.coral }]} />
          <View style={[styles.dot, { backgroundColor: Theme.colors.yellow }]} />
          <View style={[styles.dot, { backgroundColor: Theme.colors.mint }]} />
        </View>
        <Text style={styles.cardTitle}>HISTORIAL DE EVENTOS</Text>
      </View>

      <View style={styles.timelineContainer}>
        {sorted.map((ev, index) => {
          const isLatest = index === 0;
          const isLast = index === sorted.length - 1;

          return (
            <View key={ev.id || index} style={styles.timelineRow}>
              {/* Left Column: Icon and connecting vertical line */}
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: getStageBg(ev.stage, isLatest) },
                    isLatest && styles.iconBoxActive,
                  ]}
                >
                  {getStageIcon(ev.stage)}
                </View>
                {!isLast && <View style={styles.verticalLine} />}
              </View>

              {/* Right Column: Event Content */}
              <View style={[styles.contentCol, isLast && styles.contentColLast]}>
                <View style={styles.metaRow}>
                  <View style={styles.metaLeft}>
                    <Text
                      style={[styles.dateText, isLatest && styles.dateTextActive]}
                      numberOfLines={1}
                    >
                      {formatDate(ev.date)}
                    </Text>
                    {isLatest && (
                      <View style={styles.latestTag}>
                        <Text style={styles.latestTagText}>ÚLTIMO</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.carrierTag}>
                    <Text style={styles.carrierTagText} numberOfLines={1}>
                      {ev.carrierName}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.description, isLatest && styles.descriptionActive]}>
                  {ev.description}
                </Text>

                {ev.location && (
                  <View style={styles.locationBox}>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {ev.location}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
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
    marginBottom: 24,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    ...Theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 16,
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
  timelineContainer: {
    paddingLeft: 2,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 34,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  iconBoxActive: {
    borderWidth: 2.5,
  },
  verticalLine: {
    flex: 1,
    width: 2.5,
    backgroundColor: '#000000',
    marginVertical: 4,
  },
  contentCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 22,
  },
  contentColLast: {
    paddingBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    gap: 8,
  },
  metaLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  dateText: {
    fontSize: 11,
    color: Theme.colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dateTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  latestTag: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: '#000000',
    borderRadius: Theme.radius.xs,
  },
  latestTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: Theme.colors.yellow,
    letterSpacing: 0.7,
  },
  carrierTag: {
    maxWidth: '42%',
    backgroundColor: Theme.colors.yellow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    ...Theme.shadows.sm,
  },
  carrierTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    fontWeight: '700',
    lineHeight: 18,
  },
  descriptionActive: {
    color: '#000000',
    fontWeight: '800',
  },
  locationBox: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: Theme.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginTop: 5,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
  },
});
