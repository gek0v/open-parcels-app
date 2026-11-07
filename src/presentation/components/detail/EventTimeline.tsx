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
  // Sort reverse chronologically (most recent on top)
  const sorted = [...events].reverse();

  const getStageIcon = (stage: EventStage, isLatest: boolean) => {
    const size = 16;
    const color = isLatest ? Theme.colors.primary : Theme.colors.textSecondary;

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
        return <CheckCircle size={size} color={Theme.colors.status.delivered} />;
      case 'exception':
        return <AlertTriangle size={size} color={Theme.colors.status.exception} />;
      default:
        return <Package size={size} color={color} />;
    }
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
      <Text style={styles.cardTitle}>Línea de Tiempo de Eventos</Text>

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
                    styles.iconCircle,
                    isLatest && styles.iconCircleActive,
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
                  <Text style={styles.locationText}>{ev.location}</Text>
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
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.card,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 16,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 32,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  iconCircleActive: {
    backgroundColor: Theme.colors.primaryLight,
    borderColor: Theme.colors.primary,
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: Theme.colors.border,
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
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  dateTextActive: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  carrierTag: {
    backgroundColor: Theme.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  carrierTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  description: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
  },
  descriptionActive: {
    color: Theme.colors.textPrimary,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 11,
    color: Theme.colors.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
