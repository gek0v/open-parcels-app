import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Compass, Home } from 'lucide-react-native';
import { Theme } from '../presentation/theme/adaptiveTheme';
import { useTheme } from '../presentation/theme/ThemeContext';
import { useI18n } from '../infrastructure/i18n';

export default function NotFoundScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops! 404', headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.yellow }]}>
        <View style={[styles.container, { backgroundColor: theme.yellow }]}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.yellow, borderColor: theme.border }]}>
              <Compass size={40} color="#000000" strokeWidth={2.5} />
            </View>

            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{t.errors.notFoundCode}</Text>
            </View>

            <Text style={[styles.title, { color: theme.textPrimary }]}>{t.errors.notFoundTitle}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t.errors.notFoundSubtitle}
            </Text>

            <Link href="/" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.errors.backHomeAria}
                style={({ pressed }) => [
                  styles.homeButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Home size={16} color="#000000" strokeWidth={2.5} />
                <Text style={styles.homeButtonText}>{t.errors.backHome}</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </SafeAreaView>
    </>
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
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radius.md,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    padding: 28,
    alignItems: 'center',
    ...Theme.shadows.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE600',
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Theme.shadows.sm,
  },
  codePill: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Theme.radius.xs,
    marginBottom: 12,
  },
  codePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
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
    marginBottom: 24,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00E5FF',
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    borderRadius: Theme.radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...Theme.shadows.sm,
  },
  homeButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  pressed: {
    ...Theme.pressed,
  },
});
