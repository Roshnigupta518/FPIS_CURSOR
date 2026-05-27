/**
 * String table keys used across the app. The actual translations live in
 * src/locales/{en,hi}.json. Centralizing keys here prevents typos when
 * calling t('KEY').
 */

export const STRINGS = {
  APP_NAME: 'APP_NAME',
  WELCOME: 'WELCOME',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  USERNAME: 'USERNAME',
  PASSWORD: 'PASSWORD',
  CONTINUE: 'CONTINUE',
  SUBMIT: 'SUBMIT',
  CANCEL: 'CANCEL',
  SEARCH: 'SEARCH',
  ADD: 'ADD',
  EDIT: 'EDIT',
  AUTHENTICATE: 'AUTHENTICATE',
  SAVE: 'SAVE',
  NO_DATA: 'NO_DATA',
  LOADING: 'LOADING',
};

export const LOGIN_TYPE_OPTIONS = [
  {key: 'block', label: 'Block Login', labelHi: 'ब्लॉक लॉगिन'},
  {key: 'district', label: 'District Login', labelHi: 'जिला लॉगिन'},
  {key: 'medical', label: 'Medical College Login', labelHi: 'मेडिकल कॉलेज लॉगिन'},
];
