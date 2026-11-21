import { Linking } from 'react-native';

/**
 * Checks whether the given URL string is a safe web URL (http:// or https:// only).
 * Rejects dangerous protocols such as javascript:, file:, intent:, data:, etc.
 */
export function isSafeWebUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  // Explicitly check for http:// and https:// prefix (case-insensitive)
  const isHttpOrHttps = /^https?:\/\//i.test(trimmed);
  if (!isHttpOrHttps) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Safely opens a web URL using Linking.openURL.
 * If the provided URL is unsafe or invalid, attempts fallbackUrl if provided and safe.
 *
 * NOTE: On Android 11+ (API 30+), package visibility filtering causes `Linking.canOpenURL`
 * to return false for web URLs unless explicit <queries> are configured in AndroidManifest.xml.
 * Because `isSafeWebUrl` already strictly verifies that the protocol is http: or https:,
 * we directly invoke `Linking.openURL(targetUrl)` inside a try-catch block.
 *
 * Returns true if successfully opened, false otherwise.
 */
export async function openSafeWebUrl(
  url?: string | null,
  fallbackUrl?: string
): Promise<boolean> {
  const targetUrl = isSafeWebUrl(url)
    ? url!.trim()
    : isSafeWebUrl(fallbackUrl)
    ? fallbackUrl!.trim()
    : null;

  if (!targetUrl) {
    return false;
  }

  try {
    await Linking.openURL(targetUrl);
    return true;
  } catch (err) {
    console.warn('Failed to open safe web URL:', targetUrl, err);
    return false;
  }
}
