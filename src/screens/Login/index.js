/**
 * Login screen.
 *
 *  - Mobile + password (matches the backend's POST /auth/login contract)
 *  - Role pills at the top are a UX hint that auto-fills the demo
 *    mobile number for that role (so testers can switch quickly).
 *    The real role is decided server-side from the user record.
 *  - On success the bootstrap → navigator swap takes the user straight
 *    to the Dashboard.
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View, Image
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';

import CustomButton from '../../components/CustomButton';
import MyInput from '../../components/MyInput';
import {showToast} from '../../components/Toast';

import {COLORS} from '../../constants/colors';
import {LOGIN_TYPES} from '../../constants/facilities';
import {ROUTES} from '../../constants/routes';
import {LOGIN_TYPE_OPTIONS} from '../../constants/strings';
import {
  clearAuthError,
  login,
  setLoginType,
} from '../../redux/slices/authSlice';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';
import {changeLanguage} from '../../utils/i18n';
import {RegexType} from '../../utils/validation';
import { IMAGES } from '../../constants/colors';

// Demo mobile numbers — match the backend's `npm run db:seed` output.
const DEMO_MOBILE = {
  [LOGIN_TYPES.BLOCK]: '9000000001',
  [LOGIN_TYPES.DISTRICT]: '9000000002',
  [LOGIN_TYPES.MEDICAL]: '9000000003',
};

const LoginScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {t, i18n} = useTranslation();
  const {loading, error, loginType} = useSelector(s => s.auth);

  const [userId, setUserId] = useState('DH_Bhopal');
  const [password, setPassword] = useState('Welcome@1');
  const [touched, setTouched] = useState({mobile: false, password: false});

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      showToast({type: 'error', message: error});
    }
  }, [error]);

  const userIdError = '';
  const passwordError =
    touched.password && !RegexType.PASSWORD.test(password || '')
      ? t('ERR_INVALID_TEXT')
      : null;

      const canSubmit =
      userId.length > 0 &&
      password.length > 0 &&
      !userIdError &&
      !passwordError;

  const handleSelectType = useCallback(
    key => {
      // dispatch(setLoginType(key));
      setMobile(key || '');
    },
    [dispatch],
  );

  const handleLogin = useCallback(async () => {
    setTouched({mobile: true, password: true});
    if (!canSubmit) return;
    const result = await dispatch(login({userId, password}));
    if (login.fulfilled.match(result)) {
      showToast({type: 'success', message: t('WELCOME_BACK')});
    }
  }, [canSubmit, dispatch, loginType, userId, password, t]);

  const toggleLanguage = useCallback(() => {
    changeLanguage(i18n.language === 'hi' ? 'en' : 'hi');
  }, [i18n.language]);

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom']}>
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
              {/* <Text style={styles.logoText}>{'\u2695'}</Text> */}
              <Image source={IMAGES.logo} style={{width:100, height:100}} />
            </View>
            <Text style={styles.appTitle}>{t('APP_NAME')}</Text>
            <Text style={styles.appSubtitle}>{t('MIN_HEALTH')}</Text>
            <Text style={styles.govt}>{t('GOVT_OF_INDIA')}</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, SHADOWS.card]}>
            <Text style={styles.welcome}>{t('LOGIN')}</Text>
            {/* <Text style={styles.cardSubtitle}>{t('SELECT_LOGIN_TYPE')}</Text> */}

            {/* <View style={styles.typeRow}>
              {LOGIN_TYPE_OPTIONS.map(opt => {
                const isActive = loginType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => handleSelectType(opt.key)}
                    activeOpacity={0.85}
                    style={[styles.typePill, isActive && styles.typePillActive]}>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.typePillText,
                        isActive && styles.typePillTextActive,
                      ]}>
                      {i18n.language === 'hi' ? opt.labelHi : opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View> */}

            <MyInput
              label={t('USERID')}
              placeholder="Enter here"
              value={userId}
              onChangeText={v => setUserId(v)}
              onBlur={() => setTouched(s => ({...s, mobile: true}))}
              autoCapitalize="none"
              // keyboardType="phone-pad"
              // maxLength={10}
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
              required
              error={passwordError}
              leftIcon={<Text style={styles.fieldIcon}>{'\uD83D\uDD12'}</Text>}
            />

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

            {/* <Text style={styles.hint}>
              Demo password: <Text style={styles.hintStrong}>password123</Text>
            </Text> */}
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
  logoText: {fontSize: 40, color: COLORS.primary},
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
    marginBottom:20,
    textAlign:'center'
  },
  cardSubtitle: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
    marginHorizontal: -4,
  },
  typePill: {
    flexGrow: 1,
    flexBasis: '30%',
    margin: 4,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  typePillText: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },
  typePillTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  fieldIcon: {fontSize: 16},
  forgotRow: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.small,
    fontWeight: FONT_WEIGHT.semibold,
  },
  hint: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.caption,
    marginTop: SPACING.md,
  },
  hintStrong: {color: COLORS.textSecondary, fontWeight: '700'},
  footer: {
    textAlign: 'center',
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.caption,
    marginVertical: SPACING.xl,
  },
});

export default LoginScreen;
