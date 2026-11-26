import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrackingEvent, EventStage } from '../../../domain/models/event';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../../infrastructure/i18n';
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
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  const sorted = [...events].sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    const validA = !isNaN(ta);
    const validB = !isNaN(tb);
    if (validA && validB) {
      return tb - ta;
    }
    if (validA !== validB) {
      return validA ? -1 : 1;
    }
    return 0;
  });

  const getStageIcon = (stage: EventStage, color: string) => {
    const size = 15;

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
    if (stage === 'completed') return theme.status.delivered;
    if (stage === 'exception') return theme.status.failed_attempt;
    if (isLatest) return theme.yellow;
    return theme.surfaceSubtle;
  };

  const getStageIconColor = (stage: EventStage, isLatest: boolean) => {
    if (stage === 'completed' || stage === 'exception' || isLatest) {
      return '#000000';
    }
    return theme.textPrimary;
  };

  const formatDate = (isoStr: string, rawDate?: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) {
        return rawDate || isoStr;
      }
      const locale = lang === 'en' ? 'en-US' : 'es-ES';
      return (
        d.toLocaleDateString(locale, { day: '2-digit', month: 'short' }) +
        ' · ' +
        d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return rawDate || isoStr;
    }
  };

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
          {t.detail.timelineTitle}
        </Text>
      </View>

      {sorted.length === 0 ? (
        <View
          style={[
            styles.emptyContainer,
            { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
          ]}
        >
          <Package size={22} color={theme.textTertiary} strokeWidth={2.5} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t.detail.noEvents}
          </Text>
        </View>
      ) : (
        <View style={styles.timelineContainer}>
          {sorted.map((ev, index) => {
            const isLatest = index === 0;
            const isLast = index === sorted.length - 1;
            const carrierLabel = ev.carrierName || ev.carrierSlug;

            return (
              <View key={ev.id ? `${ev.id}-${index}` : `ev-${index}`} style={styles.timelineRow}>
                {/* Left Column: Icon and connecting vertical line */}
                <View style={styles.indicatorCol}>
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: getStageBg(ev.stage, isLatest),
                        borderColor: theme.border,
                      },
                      isLatest && styles.iconBoxActive,
                    ]}
                  >
                    {getStageIcon(ev.stage, getStageIconColor(ev.stage, isLatest))}
                  </View>
                  {!isLast && (
                    <View style={[styles.verticalLine, { backgroundColor: theme.border }]} />
                  )}
                </View>

                {/* Right Column: Event Content */}
                <View style={[styles.contentCol, isLast && styles.contentColLast]}>
                  <View style={styles.metaRow}>
                    <View style={styles.metaLeft}>
                      <Text
                        style={[
                          styles.dateText,
                          { color: isLatest ? theme.textPrimary : theme.textTertiary },
                          isLatest && styles.dateTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {formatDate(ev.date, ev.rawDate)}
                      </Text>
                      {isLatest && (
                        <View style={styles.latestTag}>
                          <Text style={[styles.latestTagText, { color: theme.yellow }]}>
                            {lang === 'en' ? 'LATEST' : 'ÚLTIMO'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {!!carrierLabel && (
                      <View
                        style={[
                          styles.carrierTag,
                          { backgroundColor: theme.yellow, borderColor: theme.border },
                        ]}
                      >
                        <Text style={styles.carrierTagText} numberOfLines={1}>
                          {carrierLabel}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.description,
                      { color: isLatest ? theme.textPrimary : theme.textSecondary },
                      isLatest && styles.descriptionActive,
                    ]}
                  >
                    {ev.description}
                  </Text>

                  {!!ev.location && (
                    <View
                      style={[
                        styles.locationBox,
                        { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                      ]}
                    >
                      <Text
                        style={[styles.locationText, { color: theme.textSecondary }]}
                        numberOfLines={2}
                      >
                        {ev.location}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
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
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
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
    flexWrap: 'wrap',
    marginBottom: 5,
    gap: 8,
  },
  metaLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
  },
  dateText: {
    fontSize: 11,
    color: Theme.colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
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
    maxWidth: '45%',
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
