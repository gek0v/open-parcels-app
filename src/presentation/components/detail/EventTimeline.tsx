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
} from 'lucide-react-native';

interface EventTimelineProps {
  events: TrackingEvent[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const sorted = [...events].reverse();

  const getStageIcon = (stage: EventStage, isLatest: boolean) => {
    const size = 15;
    const color = '#000000';

    switch (stage) {
      case 'created':
        return <FileText size={size} color={color} />;
      case 'pickup':
        return <Package size={size} color={color} />;
      case 'customs':
        return <ShieldCheck size={size} color={color} />;
      case 'transit':
        return <Plane size={size} color={color} />;
      case 'delivery':
        return <Truck size={size} color={color} />;
      case 'completed':
        return <CheckCircle size={size} color={color} />;
      case 'exception':
        return <AlertTriangle size={size} color={color} />;
      default:
        return <Package size={size} color={color} />;
    }
  };

  const getStageBg = (stage: EventStage, isLatest: boolean) => {
    if (stage === 'completed') return '#34D399';
    if (stage === 'exception') return '#FF5C38';
    if (isLatest) return '#FFE600';
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
          <View style={[styles.dot, { backgroundColor: '#FF5C38' }]} />
          <View style={[styles.dot, { backgroundColor: '#FFE600' }]} />
          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
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
                  {getStageIcon(ev.stage, isLatest)}
                </View>
                {!isLast && <View style={styles.verticalLine} />}
              </View>

              {/* Right Column: Event Content */}
              <View style={[styles.contentCol, isLast && styles.contentColLast]}>
                <View style={styles.metaRow}>
                  <Text style={[styles.dateText, isLatest && styles.dateTextActive]}>
                    {formatDate(ev.date)}
                  </Text>
                  <View style={styles.carrierTag}>
                    <Text style={styles.carrierTagText}>{ev.carrierName}</Text>
                  </View>
                </View>

                <Text style={[styles.description, isLatest && styles.descriptionActive]}>
                  {ev.description}
                </Text>

                {ev.location && (
                  <View style={styles.locationBox}>
                    <Text style={styles.locationText}>{ev.location}</Text>
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
    marginBottom: 32,
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
    paddingLeft: 4,
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
    shadowColor: '#000000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    ...(Theme.isWeb ? ({ boxShadow: '1.5px 1.5px 0px #000000' } as any) : {}),
  },
  iconBoxActive: {
    shadowOffset: { width: 2.5, height: 2.5 },
    ...(Theme.isWeb ? ({ boxShadow: '2.5px 2.5px 0px #000000' } as any) : {}),
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
    paddingBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  dateTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  carrierTag: {
    backgroundColor: '#FFE600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#000000',
  },
  carrierTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 18,
  },
  descriptionActive: {
    color: '#000000',
    fontWeight: '800',
  },
  locationBox: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
});
