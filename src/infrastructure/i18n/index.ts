import { es } from './locales/es';
import { en } from './locales/en';
import type { TranslationKey } from './locales/es';

export type Language = 'es' | 'en';
export { LANGUAGE_KEY } from './constants';

export const translations: Record<Language, TranslationKey> = {
  es,
  en,
};

export function detectDefaultLanguage(): Language {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale && locale.toLowerCase().startsWith('es')) {
      return 'es';
    }
  } catch {
    // fallback
  }
  return 'es';
}

export { es, en };
export type { TranslationKey };
export { I18nProvider, useI18n } from './context';
