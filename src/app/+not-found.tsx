import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Compass, Home } from 'lucide-react-native';
import { Theme } from '../presentation/theme/adaptiveTheme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops! 404', headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Compass size={40} color="#000000" strokeWidth={2.5} />
            </View>

            <View style={styles.codePill}>
              <Text style={styles.codePillText}>ERROR 404</Text>
            </View>

            <Text style={styles.title}>PÁGINA NO ENCONTRADA</Text>
            <Text style={styles.subtitle}>
              La ruta o pantalla que estás buscando no existe o ha sido movida.
            </Text>

            <Link href="/" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver a la pantalla principal"
                style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
              >
                <Home size={16} color="#000000" strokeWidth={2.5} />
                <Text style={styles.homeButtonText}>VOLVER AL INICIO</Text>
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
