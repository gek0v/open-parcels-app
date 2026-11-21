import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { es, TranslationKey } from './locales/es';
import { Language, detectDefaultLanguage, LANGUAGE_KEY, translations } from './index';

interface I18nContextValue {
  lang: Language;
  t: TranslationKey;
  setLang: (lang: Language) => Promise<void>;
  toggleLang: () => Promise<void>;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'es',
  t: es,
  setLang: async () => {},
  toggleLang: async () => {},
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(detectDefaultLanguage());

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((stored) => {
        if (isMounted && (stored === 'es' || stored === 'en')) {
          setLangState(stored as Language);
        }
      })
      .catch((err) => {
        console.warn('[i18n] Error reading language from storage:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setLang = async (newLang: Language) => {
    setLangState(newLang);
    await AsyncStorage.setItem(LANGUAGE_KEY, newLang);
  };

  const toggleLang = async () => {
    const nextLang: Language = lang === 'es' ? 'en' : 'es';
    await setLang(nextLang);
  };

  const value: I18nContextValue = {
    lang,
    t: translations[lang],
    setLang,
    toggleLang,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
