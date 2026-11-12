import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoldenPalettes, ColorPalette } from './palettes';
import { Theme } from './adaptiveTheme';
import * as Haptics from 'expo-haptics';

export type ThemeKey = 'acidCyber' | 'nordicClean' | 'tokyoCyberpunk' | 'warmParchment';
export const THEME_STORAGE_KEY = '@open_parcels:theme_key';

interface ThemeContextValue {
  themeKey: ThemeKey;
  theme: ColorPalette;
  setTheme: (key: ThemeKey) => Promise<void>;
  themes: Record<string, ColorPalette>;
}

export const syncStaticTheme = (palette: ColorPalette) => {
  Theme.colors.background = palette.canvas;
  Theme.colors.backgroundSubtle = palette.canvasSubtle;
  Theme.colors.surface = palette.surface;
  Theme.colors.surfaceSubtle = palette.surfaceSubtle;
  Theme.colors.surfaceElevated = palette.yellow;
  Theme.colors.surfaceDark = palette.surfaceDark;
  Theme.colors.yellow = palette.yellow;
  Theme.colors.coral = palette.coral;
  Theme.colors.mint = palette.mint;
  Theme.colors.blue = palette.blue;
  Theme.colors.purple = palette.purple;
  Theme.colors.pink = palette.pink;
  Theme.colors.textPrimary = palette.textPrimary;
  Theme.colors.textSecondary = palette.textSecondary;
  Theme.colors.textTertiary = palette.textTertiary;
  Theme.colors.textInverse = palette.textInverse;
  Theme.colors.primary = palette.primary;
  Theme.colors.primaryLight = palette.primaryLight;
  Theme.colors.primaryDark = palette.primaryDark;
  Theme.colors.border = palette.border;
  Theme.colors.borderStrong = palette.border;
  Theme.colors.status = { ...palette.status };
  Theme.colors.statusLight = { ...palette.statusLight };
  Theme.borders.color = palette.border;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeKey: 'acidCyber',
  theme: GoldenPalettes.acidCyber,
  setTheme: async () => {},
  themes: GoldenPalettes,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>('acidCyber');
  const [theme, setThemeState] = useState<ColorPalette>(GoldenPalettes.acidCyber);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored && stored in GoldenPalettes) {
        const key = stored as ThemeKey;
        setThemeKeyState(key);
        const palette = GoldenPalettes[key];
        setThemeState(palette);
        syncStaticTheme(palette);
      }
    });
  }, []);

  const setTheme = useCallback(async (newKey: ThemeKey) => {
    if (!GoldenPalettes[newKey]) return;
    const palette = GoldenPalettes[newKey];
    setThemeKeyState(newKey);
    setThemeState(palette);
    syncStaticTheme(palette);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    await AsyncStorage.setItem(THEME_STORAGE_KEY, newKey);
  }, []);

  const value: ThemeContextValue = {
    themeKey,
    theme,
    setTheme,
    themes: GoldenPalettes,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
