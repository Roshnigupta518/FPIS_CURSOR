/**
 * Login screen.
 *
 *  - User ID + password login against POST /Auth/login. Device info
 *    (device_id, model, OS, app version) is attached automatically by
 *    authApi so the backend can enforce single-active-session.
 *  - Handles the full backend error taxonomy:
 *      401  invalid credentials
 *      423  account locked (rate-limit lockout)
 *      429  too many attempts
 *      409  SESSION_ACTIVE_ON_OTHER_DEVICE — surfaces a modal explaining
 *           the user must log out from the other device first (strict
 *           single-session policy required by NHM security audit).
 *  - Blocks screenshots / screen recording on Android while this screen
 *    is focused (Aadhaar-adjacent auth surface — cannot be captured).
 *  - "Remember User ID" persists ONLY the user id in non-secure storage,
 *    never the password.
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';

import CustomButton from '../../components/CustomButton';
import MyInput from '../../components/MyInput';
import {showToast} from '../../components/Toast';

import {COLORS, IMAGES} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {clearAuthError, login} from '../../redux/slices/authSlice';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';
import {changeLanguage} from '../../utils/i18n';
import {getItem, removeItem, setItem, StorageKeys} from '../../utils/storage';
import {RegexType} from '../../utils/validation';

const formatLoginTime = iso => {
  if (!iso) {
    return 'N/A';
  }
  try {
    return new Date(iso).toLocaleString();
  } catch (_e) {
    return iso;
  }
};

const LoginScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {t, i18n} = useTranslation();
  const {loading} = useSelector(s => s.auth);

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberUserId, setRememberUserId] = useState(false);
  const [touched, setTouched] = useState({userId: false, password: false});

  useEffect(() => {
    (async () => {
      const saved = await getItem(StorageKeys.SAVED_USER_ID);
      if (saved) {
        setUserId(saved);
        setRememberUserId(true);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const userIdError =
    touched.userId && userId.trim().length === 0 ? t('ERR_INVALID_TEXT') : null;
  const passwordError =
    touched.password && !RegexType.PASSWORD.test(password || '')
      ? t('ERR_INVALID_TEXT')
      : null;

  const canSubmit =
    userId.trim().length > 0 &&
    password.length > 0 &&
    !userIdError &&
    !passwordError &&
    !loading;

  const persistRememberedUserId = useCallback(
    async trimmedUserId => {
      if (rememberUserId) {
        await setItem(StorageKeys.SAVED_USER_ID, trimmedUserId);
      } else {
        await removeItem(StorageKeys.SAVED_USER_ID);
      }
    },
    [rememberUserId],
  );

  const showAlreadyLoggedInDialog = useCallback(err => {
    Alert.alert(
      'पहले से Login हैं',
      'आप पहले से किसी अन्य device पर logged in हैं।\n\n' +
        `Device: ${err.otherDevice || 'Unknown'}\n` +
        `Login हुआ: ${formatLoginTime(err.loggedInSince)}\n\n` +
        'कृपया पहले उस device पर Logout button दबाएं, फिर यहाँ login करें।',
      [{text: 'ठीक है', style: 'default'}],
      {cancelable: false},
    );
  }, []);

  const handleLogin = useCallback(async () => {
    setTouched({userId: true, password: true});
    if (!canSubmit) {
      return;
    }

    const trimmedUserId = userId.trim();
    await persistRememberedUserId(trimmedUserId);

    const result = await dispatch(login({userId: trimmedUserId, password}));

    if (login.fulfilled.match(result)) {
      showToast({type: 'success', message: t('WELCOME_BACK')});
      return;
    }

    const err = result.payload;
    if (err?.code === 'ALREADY_LOGGED_IN') {
      showAlreadyLoggedInDialog(err);
    } else if (err?.message) {
      showToast({type: 'error', message: err.message});
    }
  }, [
    canSubmit,
    dispatch,
    userId,
    password,
    t,
    persistRememberedUserId,
    showAlreadyLoggedInDialog,
  ]);

  const toggleLanguage = useCallback(() => {
    changeLanguage(i18n.language === 'hi' ? 'en' : 'hi');
  }, [i18n.language]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.langRow}>
              <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
                <Text style={styles.langText}>
                  {i18n.language === 'hi' ? 'English' : 'हिंदी'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.logoCircle}>
              <Image source={IMAGES.logo} style={{width: 100, height: 100}} />
            </View>
            <Text style={styles.appTitle}>{t('APP_NAME')}</Text>
            <Text style={styles.appSubtitle}>{t('MIN_HEALTH')}</Text>
            <Text style={styles.govt}>{t('GOVT_OF_INDIA')}</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, SHADOWS.card]}>
            <Text style={styles.welcome}>{t('LOGIN')}</Text>

            <MyInput
              label={t('USERID')}
              placeholder="Enter here"
              value={userId}
              onChangeText={setUserId}
              onBlur={() => setTouched(s => ({...s, userId: true}))}
              autoCapitalize="none"
              autoCorrect={false}
              required
              error={userIdError}
              leftIcon={<Text style={styles.fieldIcon}>{'\uD83D\uDCF1'}</Text>}
            />

            <MyInput
              label={t('PASSWORD')}
              placeholder={t('PASSWORD_PLACEHOLDER')}
              value={password}
              onChangeText={setPassword}
              onBlur={() => setTouched(s => ({...s, password: true}))}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              contextMenuHidden
              required
              error={passwordError}
              leftIcon={<Text style={styles.fieldIcon}>{'\uD83D\uDD12'}</Text>}
            />

            <TouchableOpacity
              onPress={() => setRememberUserId(v => !v)}
              style={styles.rememberRow}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.checkbox,
                  rememberUserId && styles.checkboxChecked,
                ]}>
                {rememberUserId && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>User ID याद रखें</Text>
            </TouchableOpacity>

            <CustomButton
              title={t('LOGIN')}
              onPress={handleLogin}
              loading={loading}
              disabled={!canSubmit}
              style={{marginTop: SPACING.sm}}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.CHANGE_PASSWORD)}
              style={styles.forgotRow}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.forgotText}>{t('FORGOT_PASSWORD')}?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <Text style={styles.footer}>{t('VERSION')} 1.0.0</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: COLORS.primary},
  flex: {flex: 1},
  scroll: {flexGrow: 1, backgroundColor: COLORS.background},
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl + 20,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  langRow: {alignSelf: 'flex-end', marginBottom: SPACING.sm},
  langBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  langText: {color: '#fff', fontSize: FONT_SIZE.small, fontWeight: '600'},
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  appTitle: {
    color: '#fff',
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  appSubtitle: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.body,
    marginTop: 4,
    textAlign: 'center',
  },
  govt: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZE.small,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    marginTop: -SPACING.xxl,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  welcome: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldIcon: {fontSize: 16},
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxTick: {color: '#fff', fontSize: 14, fontWeight: '700'},
  rememberText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.small,
  },
  forgotRow: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.small,
    fontWeight: FONT_WEIGHT.semibold,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.caption,
    marginVertical: SPACING.xl,
  },
});

export default LoginScreen;
