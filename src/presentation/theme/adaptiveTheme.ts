import { Platform } from 'react-native';
import { CanonicalStatus } from '../../domain/models/status';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

export const Theme = {
  isIOS,
  isAndroid,
  isWeb,

  colors: {
    // Neo-Brutalist Canvas & Surfaces (Acid Lime canvas as seen in Ref 4, clean modular cards)
    background: '#D9FF38', // Acid Lime canvas
    backgroundSubtle: '#ECFF82',
    surface: '#FFFFFF',
    surfaceSubtle: '#F4F4EB',
    surfaceElevated: '#FFE600', // Cyber Yellow
    surfaceDark: '#000000',

    // Neo-Brutalism Accent Palettes
    yellow: '#FFE600',
    coral: '#FF5C38',
    mint: '#10B981',
    blue: '#2563EB',
    purple: '#7C3AED',
    pink: '#F472B6',

    // High Contrast Text & Hierarchy
    textPrimary: '#000000',
    textSecondary: '#1E293B',
    textTertiary: '#64748B',
    textInverse: '#FFFFFF',

    // Primary Brand Accent (Punchy Electric Blue)
    primary: '#2563EB',
    primaryLight: '#DBEAFE',
    primaryDark: '#1E40AF',

    // Strict 2.5px Solid Black Borders
    border: '#000000',
    borderStrong: '#000000',

    // Neo-Brutalist Canonical Status Tints (Punchy sticker fills with black text)
    status: {
      pending: '#94A3B8',
      info_received: '#C084FC', // Purple sticker
      in_transit: '#38BDF8', // Cyan sticker
      out_for_delivery: '#FF9900', // Bright Amber sticker
      delivered: '#34D399', // Mint sticker
      failed_attempt: '#FF5C38', // Neon Coral sticker
      exception: '#F43F5E', // Rose sticker
      expired: '#94A3B8',
    } as Record<CanonicalStatus, string>,

    statusLight: {
      pending: '#F1F5F9',
      info_received: '#F3E8FF',
      in_transit: '#E0F2FE',
      out_for_delivery: '#FEF3C7',
      delivered: '#D1FAE5',
      failed_attempt: '#FEE2E2',
      exception: '#FFE4E6',
      expired: '#F1F5F9',
    } as Record<CanonicalStatus, string>,
  },

  borders: {
    width: 2.5,
    thin: 2,
    color: '#000000',
  },

  radius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    full: 9999,
  },

  // Hard Zero-Blur Drop Shadows (4px 4px 0px #000)
  shadows: {
    card: {
      borderWidth: 2.5,
      borderColor: '#000000',
      shadowColor: '#000000',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 5,
      ...(isWeb ? ({ boxShadow: '4px 4px 0px #000000' } as any) : {}),
    },
    cardSm: {
      borderWidth: 2,
      borderColor: '#000000',
      shadowColor: '#000000',
      shadowOffset: { width: 2.5, height: 2.5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
      ...(isWeb ? ({ boxShadow: '2.5px 2.5px 0px #000000' } as any) : {}),
    },
    elevated: {
      borderWidth: 3,
      borderColor: '#000000',
      shadowColor: '#000000',
      shadowOffset: { width: 5, height: 5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 7,
      ...(isWeb ? ({ boxShadow: '5px 5px 0px #000000' } as any) : {}),
    },
  },

  typography: {
    fontFamily: isIOS ? 'System' : 'sans-serif',
    titleLarge: {
      fontSize: 26,
      fontWeight: '900' as const,
      letterSpacing: -0.5,
      lineHeight: 32,
      color: '#000000',
    },
    titleMedium: {
      fontSize: 18,
      fontWeight: '800' as const,
      letterSpacing: -0.2,
      lineHeight: 24,
      color: '#000000',
    },
    bodyLarge: {
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
    },
    caption: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
  },
};
