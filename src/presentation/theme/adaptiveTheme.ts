import { Platform } from 'react-native';
import { CanonicalStatus } from '../../domain/models/status';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

/**
 * Neo-brutalist hard drop shadow, 45º, zero blur.
 *
 * - Web:      CSS `boxShadow: 'Npx Npx 0px #000000'`.
 * - Android:  `boxShadow` (React Native 0.76+ New Architecture). Legacy
 *             `shadow*` props are ignored on Android and `elevation` always
 *             produces a diffuse halo, so it is intentionally never used.
 * - iOS:      legacy `shadowColor/shadowOffset/shadowOpacity/shadowRadius:0`
 *             which paints a perfectly crisp, non-blurred silhouette.
 */
const hardShadow = (offset: number) => {
  const webShadow = { boxShadow: `${offset}px ${offset}px 0px #000000` };

  if (isIOS) {
    return {
      shadowColor: '#000000',
      shadowOffset: { width: offset, height: offset },
      shadowOpacity: 1,
      shadowRadius: 0,
    };
  }

  return webShadow;
};

/** Zeroed shadow used while a control is physically "pressed into" the canvas. */
const noShadow = () =>
  isIOS
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      }
    : { boxShadow: '0px 0px 0px #000000' };

/**
 * Mechanical press micro-interaction:
 * the element travels +2px/+2px and its shadow collapses to 0.
 */
const pressedState = {
  transform: [{ translateX: 2 }, { translateY: 2 }],
  ...noShadow(),
};

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
    textTertiary: '#475569',
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

  /**
   * Canonical hard-shadow scale. Never add blur: blur is the enemy of the
   * neo-brutalist look.
   *
   * sm  → 2.5px (badges, chips, small icon buttons)
   * md  → 4px   (cards, inputs, full-width actions)
   * lg  → 5px   (FABs, dialogs, floating modals)
   */
  shadows: {
    none: noShadow(),
    sm: hardShadow(2.5),
    md: hardShadow(4),
    lg: hardShadow(5),
    // Backwards-compatible aliases
    card: hardShadow(4),
    cardSm: hardShadow(2.5),
    elevated: hardShadow(5),
  },

  /** Apply when `Pressable` reports `pressed`. */
  pressed: pressedState,

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 32,
  },

  typography: {
    fontFamily: isIOS ? 'System' : 'sans-serif',
    titleLarge: {
      fontSize: 27,
      fontWeight: '900' as const,
      letterSpacing: -0.6,
      lineHeight: 32,
      color: '#000000',
    },
    titleMedium: {
      fontSize: 19,
      fontWeight: '900' as const,
      letterSpacing: -0.3,
      lineHeight: 24,
      color: '#000000',
    },
    bodyLarge: {
      fontSize: 15,
      fontWeight: '700' as const,
      lineHeight: 22,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '700' as const,
      lineHeight: 16,
    },
    caption: {
      fontSize: 11,
      fontWeight: '800' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
  },
};
