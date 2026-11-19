import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import { HABILITAR_INGLES } from './config/site';

export type SupportedLang = 'pt-BR' | 'en';

const STORAGE_KEY = 'gfs_lang';

export function detectInitialLanguage(): SupportedLang {
  if (!HABILITAR_INGLES) return 'pt-BR';

  if (typeof window !== 'undefined') {
    if (window.location.pathname === '/en' || window.location.pathname.startsWith('/en/')) {
      return 'en';
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'pt-BR') {
        return saved;
      }
    } catch {
      // Ignora erro caso localStorage esteja indisponível
    }
    const browserLang = (window.navigator.language || '').toLowerCase();
    if (browserLang.startsWith('en')) {
      return 'en';
    }
  }

  return 'pt-BR';
}

export function persistLanguagePreference(lang: SupportedLang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignora erro caso localStorage esteja indisponível
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'pt-BR',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
