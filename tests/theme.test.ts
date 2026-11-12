import { describe, expect, it } from 'bun:test';
import { GoldenPalettes } from '../src/presentation/theme/palettes';
import { CanonicalStatus } from '../src/domain/models/status';

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

describe('Theme & Golden Ratio Palettes Accessibility (WCAG 2.1)', () => {
  const activePalette = GoldenPalettes.acidCyber;

  it('ensures active background and text meet WCAG AAA (>= 7.0:1)', () => {
    const contrast = getContrastRatio(activePalette.canvas, activePalette.textPrimary);
    expect(contrast).toBeGreaterThanOrEqual(7.0);
  });

  it('ensures active surface and textPrimary meet WCAG AAA (>= 7.0:1)', () => {
    const contrast = getContrastRatio(activePalette.surface, activePalette.textPrimary);
    expect(contrast).toBeGreaterThanOrEqual(7.0);
  });

  it('ensures every status badge in active theme meets WCAG AA (>= 4.5:1) against black text', () => {
    const statuses: CanonicalStatus[] = [
      'pending',
      'info_received',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed_attempt',
      'exception',
      'expired',
    ];

    for (const s of statuses) {
      const badgeBg = activePalette.status[s];
      const contrast = getContrastRatio(badgeBg, '#000000');
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('verifies that all Golden Ratio palettes have valid structure and contrast', () => {
    for (const [key, palette] of Object.entries(GoldenPalettes)) {
      expect(palette.name).toBeDefined();
      expect(palette.goldenAngleOriginDeg).toBeGreaterThanOrEqual(0);

      // Contrast between Canvas and primary text must meet AAA (>= 7:1)
      const canvasContrast = getContrastRatio(palette.canvas, palette.textPrimary);
      expect(canvasContrast).toBeGreaterThanOrEqual(7.0);

      // Contrast between Surface and primary text must meet AAA (>= 7:1)
      const surfaceContrast = getContrastRatio(palette.surface, palette.textPrimary);
      expect(surfaceContrast).toBeGreaterThanOrEqual(7.0);

      // Status badges must meet at least WCAG AA (>= 4.5:1)
      for (const [statusKey, color] of Object.entries(palette.status)) {
        const textToUse = key === 'tokyoCyberpunk' ? '#000000' : '#000000';
        const contrast = getContrastRatio(color, textToUse);
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
