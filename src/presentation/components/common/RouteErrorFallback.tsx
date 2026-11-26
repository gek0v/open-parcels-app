import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { router } from 'expo-router';
import { Theme } from '../../theme/adaptiveTheme';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../../infrastructure/i18n';

export default function RouteErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.yellow }]}>
      <View style={[styles.container, { backgroundColor: theme.yellow }]}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.coral, borderColor: theme.border }]}>
            <AlertTriangle size={36} color="#000000" strokeWidth={2.5} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>{t.errors.routeTitle}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t.errors.routeSubtitle}
          </Text>

          <View style={[styles.errorBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <Text style={styles.errorMessage} numberOfLines={showDetails ? undefined : 3} selectable>
              {error?.message || t.errors.unknownError}
            </Text>

            {error?.stack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.errors.toggleDetailsAria}
                onPress={() => setShowDetails(!showDetails)}
                style={styles.detailsToggle}
              >
                <Text style={[styles.detailsToggleText, { color: theme.textPrimary }]}>
                  {showDetails ? t.errors.hideDetails : t.errors.showDetails}
                </Text>
              </Pressable>
            )}

            {showDetails && error?.stack && (
              <ScrollView style={styles.stackScroll} nestedScrollEnabled>
                <Text style={styles.stackText} selectable>{error.stack}</Text>
              </ScrollView>
            )}
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.errors.retry}
              onPress={retry}
              style={({ pressed }) => [
                styles.retryButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <RefreshCw size={16} color="#000000" strokeWidth={3} />
              <Text style={styles.retryButtonText}>{t.errors.retry}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.errors.backHomeAria}
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.homeButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <Home size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.homeButtonText}>{t.errors.home}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFE600',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFE600',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    padding: 24,
    alignItems: 'center',
    ...Theme.shadows.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF5C5C',
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Theme.shadows.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: Theme.radius.sm,
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 12,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#DC2626',
    lineHeight: 16,
  },
  detailsToggle: {
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    alignItems: 'center',
  },
  detailsToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.4,
  },
  stackScroll: {
    maxHeight: 140,
    marginTop: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    padding: 8,
  },
  stackText: {
    fontSize: 10,
    fontFamily: Theme.isIOS ? 'Courier' : 'monospace',
    color: '#38BDF8',
    lineHeight: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00E5FF',
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    borderRadius: Theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...Theme.shadows.sm,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.6,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#000000',
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    borderRadius: Theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...Theme.shadows.sm,
  },
  homeButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  pressed: {
    ...Theme.pressed,
  },
});
