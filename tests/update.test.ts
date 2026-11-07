import { describe, expect, it } from 'bun:test';
import { isNewerVersion } from '../src/domain/validators/version';

describe('UpdateService Version Comparator', () => {
  it('detects newer patch version', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true);
    expect(isNewerVersion('v1.0.0', 'v1.0.1')).toBe(true);
    expect(isNewerVersion('1.0.0', 'v1.0.1')).toBe(true);
  });

  it('detects newer minor and major versions', () => {
    expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true);
    expect(isNewerVersion('1.0.9', '1.1.0')).toBe(true);
    expect(isNewerVersion('1.9.9', '2.0.0')).toBe(true);
    expect(isNewerVersion('0.9.0', '1.0.0')).toBe(true);
  });

  it('correctly handles same version or older version', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('v1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(false);
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(false);
  });
});
