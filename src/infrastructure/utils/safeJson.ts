/**
 * Utility for robust JSON parsing.
 * Prevents application crashes from malformed, corrupt, or unexpected JSON data.
 */

/**
 * Safely parses a JSON string into type T.
 * Returns `fallback` if `jsonString` is null, undefined, empty, whitespace-only,
 * or contains invalid JSON syntax, without throwing an unhandled exception.
 *
 * @param jsonString - Raw JSON string or null/undefined
 * @param fallback - Default value to return if parsing fails or input is empty
 * @returns Parsed value typed as T, or fallback
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  fallback: T
): T {
  if (jsonString === null || jsonString === undefined) {
    return fallback;
  }

  if (typeof jsonString !== 'string') {
    return fallback;
  }

  const trimmed = jsonString.trim();
  if (trimmed === '') {
    return fallback;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}
