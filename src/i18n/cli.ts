/**
 * i18next init for Node.js / CLI environment.
 * No browser language detector — defaults to zh-TW.
 * Language can be overridden via LANG_RTK env variable.
 */
import i18next from 'i18next';

import zhTW_ui from './locales/zh-TW/ui.json';
import zhTW_data from './locales/zh-TW/data.json';
import zhTW_battle from './locales/zh-TW/battle.json';
import zhTW_logs from './locales/zh-TW/logs.json';
import zhTW_cli from './locales/zh-TW/cli.json';
import en_ui from './locales/en/ui.json';
import en_data from './locales/en/data.json';
import en_battle from './locales/en/battle.json';
import en_logs from './locales/en/logs.json';
import en_cli from './locales/en/cli.json';

const lang = process.env.LANG_RTK === 'en' ? 'en' : 'zh-TW';

i18next.init({
  lng: lang,
  resources: {
    'zh-TW': {
      ui: zhTW_ui,
      data: zhTW_data,
      battle: zhTW_battle,
      logs: zhTW_logs,
      cli: zhTW_cli,
    },
    en: {
      ui: en_ui,
      data: en_data,
      battle: en_battle,
      logs: en_logs,
      cli: en_cli,
    },
  },
  fallbackLng: 'zh-TW',
  supportedLngs: ['zh-TW', 'en'],
  defaultNS: 'ui',
  ns: ['ui', 'data', 'battle', 'logs', 'cli'],
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
