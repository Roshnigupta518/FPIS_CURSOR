/**
 * i18next bootstrap. Imported once from App.js so the t() / useTranslation
 * hook is available everywhere in the tree.
 */

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {NativeModules, Platform} from 'react-native';

import en from '../locales/en.json';
import hi from '../locales/hi.json';

const getDeviceLanguage = () => {
  try {
    const locale =
      Platform.OS === 'ios'
        ? NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        : NativeModules.I18nManager?.localeIdentifier;
    if (typeof locale === 'string' && locale.toLowerCase().startsWith('hi')) {
      return 'hi';
    }
  } catch (_e) {
    // ignore - default below
  }
  return 'en';
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    en: {translation: en},
    hi: {translation: hi},
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {escapeValue: false},
  react: {useSuspense: false},
});

export const changeLanguage = lng => i18n.changeLanguage(lng);

export default i18n;
