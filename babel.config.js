/**
 * NHM SAST hardening (finding #3 — Production Debug Logging, CWE-532):
 *
 * In production JS bundles we strip every `console.*` call at build time so
 * no residual `console.log(...)` from us or a third-party library can leak
 * request bodies, tokens, Aadhaar payloads, or user data through Metro /
 * logcat / Sentry breadcrumbs.
 *
 * `console.warn` and `console.error` are kept because React Native's redbox
 * and any crash-reporting SDK we plug in later depend on them; those code
 * paths never carry raw request bodies in this codebase (see
 * `src/utils/logger.js` for the runtime-safe logger we use everywhere).
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
  env: {
    production: {
      plugins: [
        ['transform-remove-console', {exclude: ['error', 'warn']}],
      ],
    },
  },
};
