import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Platform } from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';

interface AppLoadingSplashProps {
  onFinish: () => void;
  minDurationMs?: number;
}

export const AppLoadingSplash: React.FC<AppLoadingSplashProps> = ({
  onFinish,
  minDurationMs = 1200,
}) => {
  const [progressStep, setProgressStep] = useState(1);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Animate segmented loading blocks (1 -> 2 -> 3 -> 4 -> 5)
    const interval = setInterval(() => {
      setProgressStep((prev) => {
        if (prev < 5) return prev + 1;
        return prev;
      });
    }, minDurationMs / 5);

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        onFinish();
      });
    }, minDurationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [minDurationMs, onFinish, fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.centerBox}>
        {/* Splash Icon Image */}
        <Image
          source={require('../../../../assets/splash-icon.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />

        {/* Loading status text */}
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>
            INICIALIZANDO MOTOR... {Array.from({ length: 5 }, (_, i) => (i < progressStep ? '■' : '□')).join('')}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>OPEN PARCELS ENGINE v1.0.2 · LOCAL-FIRST</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#D8FF38', // Neo-Brutalist Acid Lime
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  splashImage: {
    width: 320,
    height: 320,
  },
  statusPill: {
    backgroundColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Theme.radius.xs,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    ...(Theme.isWeb ? ({ boxShadow: '2px 2px 0px #000000' } as any) : {}),
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
});
