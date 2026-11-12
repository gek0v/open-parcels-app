import { CanonicalStatus } from '../../domain/models/status';

export interface ColorPalette {
  name: string;
  description: string;
  goldenAngleOriginDeg: number;
  canvas: string;
  canvasSubtle: string;
  surface: string;
  surfaceSubtle: string;
  surfaceDark: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  yellow: string;
  coral: string;
  mint: string;
  blue: string;
  purple: string;
  pink: string;
  border: string;
  status: Record<CanonicalStatus, string>;
  statusLight: Record<CanonicalStatus, string>;
}

export const GoldenPalettes: Record<string, ColorPalette> = {
  /**
   * 1. ACID CYBER (Neo-Brutalist):
   * Base Hue H0 = 71° (Acid Lime).
   * Golden Angle sequence (θ ≈ 137.508°):
   * - H0 = 71° (Acid Lime Canvas: #D9FF38)
   * - H1 = (71 + 137.5) = 208.5° ≈ 209° (Electric Cobalt primary: #2563EB)
   * - H2 = (208.5 + 137.5) = 346° (Vibrant Coral/Crimson: #FF5C38)
   * - H3 = (346 + 137.5) = 123.5° (Mint / Emerald: #10B981)
   * - H4 = (123.5 + 137.5) = 261° (Purple / Violet: #7C3AED)
   * - H5 = (261 + 137.5) = 38.5° (Cyber Amber: #FFE600)
   */
  acidCyber: {
    name: 'Acid Cyber (Neo-Brutalist)',
    description: 'Paleta insignia neo-brutalista basada en Acid Lime y dispersión por ángulo áureo.',
    goldenAngleOriginDeg: 71,
    canvas: '#D9FF38', // H:71°, S:78%, V:100% (Contrast vs #000000: 18.31:1 AAA)
    canvasSubtle: '#ECFF82', // H:69°, S:49%, V:100%
    surface: '#FFFFFF', // H:0°, S:0%, V:100%
    surfaceSubtle: '#F4F4EB', // H:60°, S:4%, V:96%
    surfaceDark: '#000000',
    textPrimary: '#000000',
    textSecondary: '#1E293B',
    textTertiary: '#475569',
    textInverse: '#FFFFFF',
    primary: '#2563EB', // H:221°, S:84%, V:92%
    primaryLight: '#DBEAFE',
    primaryDark: '#1E40AF',
    yellow: '#FFE600', // H:54°, S:100%, V:100%
    coral: '#FF5C38', // H:11°, S:78%, V:100% (Contrast vs #000000: 6.84:1 AA)
    mint: '#10B981', // H:160°, S:91%, V:73%
    blue: '#2563EB',
    purple: '#7C3AED', // H:262°, S:76%, V:93%
    pink: '#F472B6', // H:329°, S:53%, V:96%
    border: '#000000',
    status: {
      pending: '#94A3B8',
      info_received: '#C084FC',
      in_transit: '#38BDF8',
      out_for_delivery: '#FF9900',
      delivered: '#34D399',
      failed_attempt: '#FF5C38',
      exception: '#F43F5E',
      expired: '#94A3B8',
    },
    statusLight: {
      pending: '#F1F5F9',
      info_received: '#F3E8FF',
      in_transit: '#E0F2FE',
      out_for_delivery: '#FEF3C7',
      delivered: '#D1FAE5',
      failed_attempt: '#FEE2E2',
      exception: '#FFE4E6',
      expired: '#F1F5F9',
    },
  },

  /**
   * 2. NORDIC BLUEPRINT (Swiss Editorial Minimal):
   * Base Hue H0 = 210° (Slate Blue Canvas).
   * Estética helvética minimalista con lienzo neutro frío y acentos armónicos.
   */
  nordicClean: {
    name: 'Nordic Clean (Swiss Slate)',
    description: 'Estética helvética minimalista con lienzo neutro frío y acentos armónicos.',
    goldenAngleOriginDeg: 210,
    canvas: '#F1F5F9', // H:210°, S:3%, V:98% (Contrast vs #0F172A: 16.3:1 AAA)
    canvasSubtle: '#E2E8F0',
    surface: '#FFFFFF',
    surfaceSubtle: '#F8FAFC',
    surfaceDark: '#0F172A',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textTertiary: '#64748B',
    textInverse: '#FFFFFF',
    primary: '#0284C7', // H:200°, S:99%, V:78%
    primaryLight: '#E0F2FE',
    primaryDark: '#0369A1',
    yellow: '#F59E0B',
    coral: '#E11D48', // H:347°, S:87%, V:88%
    mint: '#059669', // H:161°, S:97%, V:59%
    blue: '#0284C7',
    purple: '#6D28D9', // H:263°, S:82%, V:85%
    pink: '#DB2777',
    border: '#0F172A',
    status: {
      pending: '#94A3B8',
      info_received: '#A855F7',
      in_transit: '#38BDF8',
      out_for_delivery: '#D97706',
      delivered: '#059669',
      failed_attempt: '#FB7185',
      exception: '#F43F5E',
      expired: '#94A3B8',
    },
    statusLight: {
      pending: '#F1F5F9',
      info_received: '#FAF5FF',
      in_transit: '#F0F9FF',
      out_for_delivery: '#FFFBEB',
      delivered: '#ECFDF5',
      failed_attempt: '#FFF1F2',
      exception: '#FFE4E6',
      expired: '#F1F5F9',
    },
  },

  /**
   * 3. TOKYO CYBERPUNK (Dark Neo-Brutalist):
   * Base Hue H0 = 223° (Deep Obsidian Void).
   * Modo oscuro neón con contraste AAA en fondo y stickers electroluminiscentes.
   */
  tokyoCyberpunk: {
    name: 'Tokyo Cyberpunk (Dark Void)',
    description: 'Modo oscuro neo-brutalista de alto contraste con acentos neón rotados en ángulo áureo.',
    goldenAngleOriginDeg: 223,
    canvas: '#0B0F19', // H:223°, S:56%, V:10% (Contrast vs #F8FAFC: 18.3:1 AAA)
    canvasSubtle: '#111827',
    surface: '#161F30', // H:219°, S:54%, V:19%
    surfaceSubtle: '#1F2937',
    surfaceDark: '#030712',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textInverse: '#0B0F19',
    primary: '#38BDF8', // H:198°, S:77%, V:97%
    primaryLight: '#0C4A6E',
    primaryDark: '#0284C7',
    yellow: '#FBBF24',
    coral: '#F43F5E',
    mint: '#34D399',
    blue: '#38BDF8',
    purple: '#A855F7',
    pink: '#F472B6',
    border: '#38BDF8',
    status: {
      pending: '#94A3B8',
      info_received: '#C084FC',
      in_transit: '#38BDF8',
      out_for_delivery: '#FBBF24',
      delivered: '#34D399',
      failed_attempt: '#FB7185',
      exception: '#F43F5E',
      expired: '#94A3B8',
    },
    statusLight: {
      pending: '#1E293B',
      info_received: '#3B0764',
      in_transit: '#082F49',
      out_for_delivery: '#451A03',
      delivered: '#064E3B',
      failed_attempt: '#4C0519',
      exception: '#4C0519',
      expired: '#1E293B',
    },
  },

  /**
   * 4. WARM PARCHMENT & ULTRAMARINE (Bauhaus Editorial):
   * Base Hue H0 = 36° (Warm Cream Canvas).
   * Elegancia táctil y proporciones áureas clásicas 62/38/15.
   */
  warmParchment: {
    name: 'Warm Parchment (Bauhaus)',
    description: 'Lienzo pergamino cálido con azul ultramar Klein y notas de terracota.',
    goldenAngleOriginDeg: 36,
    canvas: '#FAF8F5', // H:36°, S:2%, V:98% (Contrast vs #1C1917: 16.5:1 AAA)
    canvasSubtle: '#F2ECE4',
    surface: '#FFFFFF',
    surfaceSubtle: '#F7F5F0',
    surfaceDark: '#1C1917',
    textPrimary: '#1C1917',
    textSecondary: '#44403C',
    textTertiary: '#78716C',
    textInverse: '#FAF8F5',
    primary: '#2563EB', // H:221° (Klein Blue)
    primaryLight: '#DBEAFE',
    primaryDark: '#1D4ED8',
    yellow: '#CA8A04',
    coral: '#EA580C', // Terracotta
    mint: '#16A34A',
    blue: '#2563EB',
    purple: '#7C3AED',
    pink: '#DB2777',
    border: '#1C1917',
    status: {
      pending: '#A8A29E',
      info_received: '#C084FC',
      in_transit: '#60A5FA',
      out_for_delivery: '#CA8A04',
      delivered: '#16A34A',
      failed_attempt: '#FF6B4A',
      exception: '#F87171',
      expired: '#A8A29E',
    },
    statusLight: {
      pending: '#F5F5F4',
      info_received: '#F3E8FF',
      in_transit: '#EFF6FF',
      out_for_delivery: '#FEF9C3',
      delivered: '#DCFCE7',
      failed_attempt: '#FFEDD5',
      exception: '#FEE2E2',
      expired: '#F5F5F4',
    },
  },
};
