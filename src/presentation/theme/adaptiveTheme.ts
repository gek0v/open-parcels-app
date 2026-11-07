import { Platform } from 'react-native';
import { CanonicalStatus } from '../../domain/models/status';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const Theme = {
  isIOS,
  isAndroid,

  colors: {
    // Backgrounds & Surfaces
    background: isIOS ? '#F2F2F7' : '#F6F8FA', // iOS SystemGroupedBackground vs Android MD3 surface
    backgroundDark: '#0D1117',
    surface: '#FFFFFF',
    surfaceSubtle: isIOS ? '#E5E5EA' : '#EDF2F7',
    surfaceElevated: isIOS ? '#FFFFFF' : '#F1F5F9',

    // Text & Hierarchy
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',

    // Primary Brand Accent (Open Parcels Indigo / Tech Blue)
    primary: isIOS ? '#007AFF' : '#2563EB',
    primaryLight: isIOS ? '#EBF5FF' : '#EFF6FF',
    primaryDark: '#1D4ED8',

    // Borders & Dividers
    border: isIOS ? '#E2E8F0' : '#E2E8F0',
    borderStrong: '#CBD5E1',

    // Status Colors (Matching Open Parcels 8 Canonical states)
    status: {
      pending: '#64748B',
      info_received: '#8B5CF6',
      in_transit: '#0284C7',
      out_for_delivery: '#D97706',
      delivered: '#059669',
      failed_attempt: '#DC2626',
      exception: '#E11D48',
      expired: '#475569',
    } as Record<CanonicalStatus, string>,

    statusLight: {
      pending: '#F1F5F9',
      info_received: '#F5F3FF',
      in_transit: '#F0F9FF',
      out_for_delivery: '#FFFBEB',
      delivered: '#ECFDF5',
      failed_attempt: '#FEF2F2',
      exception: '#FFF1F2',
      expired: '#F8FAFC',
    } as Record<CanonicalStatus, string>,
  },

  radius: {
    xs: 6,
    sm: isIOS ? 10 : 8,
    md: isIOS ? 14 : 16,
    lg: isIOS ? 18 : 24, // Material 3 uses larger pill/container corners
    full: 9999,
  },

  shadows: {
    card: isIOS
      ? {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        }
      : {
          elevation: 2,
        },
    elevated: isIOS
      ? {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
        }
      : {
          elevation: 4,
        },
  },

  typography: {
    fontFamily: isIOS ? 'System' : 'Roboto',
    titleLarge: {
      fontSize: isIOS ? 28 : 24,
      fontWeight: '700' as const,
      letterSpacing: isIOS ? 0.35 : 0,
      lineHeight: isIOS ? 34 : 32,
    },
    titleMedium: {
      fontSize: 18,
      fontWeight: '600' as const,
      letterSpacing: 0.15,
      lineHeight: 24,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    caption: {
      fontSize: 11,
      fontWeight: '500' as const,
      letterSpacing: 0.4,
    },
  },
};
