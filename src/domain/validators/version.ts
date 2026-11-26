/**
 * Semantic version comparison utility
 * Returns true if remote version is strictly greater than current version
 */
export function isNewerVersion(current: string, remote: string): boolean {
  if (!current || !remote) return false;

  const cleanCurrent = String(current).trim().replace(/^v/i, '').split('+')[0];
  const cleanRemote = String(remote).trim().replace(/^v/i, '').split('+')[0];

  if (!cleanCurrent || !cleanRemote || !/^\d/.test(cleanRemote)) {
    return false;
  }

  const cDash = cleanCurrent.indexOf('-');
  const rDash = cleanRemote.indexOf('-');
  const cCore = cDash === -1 ? cleanCurrent : cleanCurrent.slice(0, cDash);
  const rCore = rDash === -1 ? cleanRemote : cleanRemote.slice(0, rDash);
  const cPre = cDash === -1 ? '' : cleanCurrent.slice(cDash + 1);
  const rPre = rDash === -1 ? '' : cleanRemote.slice(rDash + 1);

  const cParts = cCore.split('.').map((p) => parseInt(p, 10) || 0);
  const rParts = rCore.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(cParts.length, rParts.length);
  for (let i = 0; i < maxLen; i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }

  // Core versions are equal: compare SemVer prerelease identifiers
  if (!cPre && !rPre) return false;
  if (cPre && !rPre) return true;
  if (!cPre && rPre) return false;

  const cPreParts = cPre.split('.');
  const rPreParts = rPre.split('.');
  const maxPreLen = Math.max(cPreParts.length, rPreParts.length);

  for (let i = 0; i < maxPreLen; i++) {
    const cId = cPreParts[i];
    const rId = rPreParts[i];
    if (cId === undefined) return true;
    if (rId === undefined) return false;

    const cNum = /^\d+$/.test(cId) ? parseInt(cId, 10) : null;
    const rNum = /^\d+$/.test(rId) ? parseInt(rId, 10) : null;

    if (cNum !== null && rNum !== null) {
      if (rNum > cNum) return true;
      if (rNum < cNum) return false;
    } else if (cNum !== null && rNum === null) {
      return true;
    } else if (cNum === null && rNum !== null) {
      return false;
    } else {
      if (rId > cId) return true;
      if (rId < cId) return false;
    }
  }

  return false;
}
