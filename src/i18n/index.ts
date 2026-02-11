import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhTW_ui from './locales/zh-TW/ui.json';
import zhTW_data from './locales/zh-TW/data.json';
import zhTW_battle from './locales/zh-TW/battle.json';
import zhTW_logs from './locales/zh-TW/logs.json';
import en_ui from './locales/en/ui.json';
import en_data from './locales/en/data.json';
import en_battle from './locales/en/battle.json';
import en_logs from './locales/en/logs.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': {
        ui: zhTW_ui,
        data: zhTW_data,
        battle: zhTW_battle,
        logs: zhTW_logs,
      },
      en: {
        ui: en_ui,
        data: en_data,
        battle: en_battle,
        logs: en_logs,
      },
    },
    fallbackLng: 'zh-TW',
    supportedLngs: ['zh-TW', 'en'],
    defaultNS: 'ui',
    ns: ['ui', 'data', 'battle', 'logs'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // Check localStorage first (user override), then browser language
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
