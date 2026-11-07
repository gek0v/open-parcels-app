/**
 * Semantic version comparison utility
 * Returns true if remote version is strictly greater than current version
 */
export function isNewerVersion(current: string, remote: string): boolean {
  const cleanCurrent = current.replace(/^v/, '').trim();
  const cleanRemote = remote.replace(/^v/, '').trim();

  const cParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);
  const rParts = cleanRemote.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(cParts.length, rParts.length);
  for (let i = 0; i < maxLen; i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}
