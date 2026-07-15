/**
 * Thin JS wrapper around the native ParichaiAuthModule.
 *
 * IMPORTANT: never log the params or the result. Both may contain the
 * Aadhaar reference id and the encrypted authentication payload — this
 * is exactly the "production debug logging" finding flagged in the
 * NHM SAST report and must not be reintroduced.
 */

import {NativeModules} from 'react-native';

const {ParichaiAuthModule} = NativeModules;

export const startParichaiAuth = async params => {
  if (!ParichaiAuthModule) {
    throw new Error('ParichaiAuthModule is not linked on this platform.');
  }
  return ParichaiAuthModule.startParichaiAuth(params);
};
