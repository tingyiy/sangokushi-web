import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhTW_ui from './locales/zh-TW/ui.json';
import zhTW_data from './locales/zh-TW/data.json';
import zhTW_battle from './locales/zh-TW/battle.json';
import en_ui from './locales/en/ui.json';
import en_data from './locales/en/data.json';
import en_battle from './locales/en/battle.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': {
        ui: zhTW_ui,
        data: zhTW_data,
        battle: zhTW_battle,
      },
      en: {
        ui: en_ui,
        data: en_data,
        battle: en_battle,
      },
    },
    lng: 'zh-TW',
    fallbackLng: 'zh-TW',
    defaultNS: 'ui',
    ns: ['ui', 'data', 'battle'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
