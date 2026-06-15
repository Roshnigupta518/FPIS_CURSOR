/**
 * Change Password (forgot-password) screen.
 *
 *   Step 1 — Enter User ID
 *     Calls requestPasswordOtpApi → if the user exists, the backend
 *     fires a 6-digit OTP to their registered mobile and returns a
 *     masked version we can show ("OTP sent to 98****3210").
 *
 *   Step 2 — Verify OTP
 *     Calls verifyPasswordOtpApi → on success the backend issues a
 *     short-lived reset token; we keep it in local state and pass it
 *     into step 3. A 60-second cooldown gates the "Resend OTP" button.
 *
 *   Step 3 — Set New Password
 *     Calls resetPasswordApi with the reset token + new password.
 *     On success we show a toast and bounce the user back to Login.
 *
 *  All API calls are mockable from src/api/passwordApi.js (MOCK_MODE
 *  flag) so the flow is testable end-to-end without a backend. In
 *  mock mode, OTP `123456` succeeds; anything else fails. User ID
 *  `0` simulates "user not found" so the error state is exercisable.
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
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

import CustomButton from '../../components/CustomButton';
import CustomHeader from '../../components/CustomHeader';
import MyInput from '../../components/MyInput';
import {showToast} from '../../components/Toast';

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';
import {RegexType} from '../../utils/validation';

import {
  requestPasswordOtpApi,
  resetPasswordApi,
  verifyPasswordOtpApi,
} from '../../api/passwordApi';

/* -------------------------------------------------------------------------- */
/*  Static helpers                                                             */
/* -------------------------------------------------------------------------- */

const STEP = {USER_ID: 1, OTP: 2, NEW_PASSWORD: 3};
const RESEND_COOLDOWN_SEC = 60;

const formatSec = total => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

const ChangePasswordScreen = ({navigation}) => {
  const {t} = useTranslation();

  const [step, setStep] = useState(STEP.USER_ID);
  const [loading, setLoading] = useState(false);

  // Inputs
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Server state captured between steps
  const [maskedMobile, setMaskedMobile] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Resend cooldown — driven by an interval ref so it survives re-renders
  // without hammering setState.
  const [resendIn, setResendIn] = useState(0);
  const intervalRef = useRef(null);

  /* ------------------------------ effects --------------------------------- */

  const startResendCountdown = useCallback(() => {
    setResendIn(RESEND_COOLDOWN_SEC);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setResendIn(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Always release the interval when the screen unmounts.
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /* --------------------------- derived state ------------------------------ */

  const userIdError = useMemo(() => {
    if (!userId) {
      return null;
    }
    if (userId.trim().length < 3) {
      return t('ERR_INVALID_USERID');
    }
    return null;
  }, [userId, t]);

  const otpError = useMemo(() => {
    if (!otp) {
      return null;
    }
    if (!/^\d{6}$/.test(otp)) {
      return t('ERR_INVALID_OTP');
    }
    return null;
  }, [otp, t]);

  const newPasswordError = useMemo(() => {
    if (!newPassword) {
      return null;
    }
    if (!RegexType.PASSWORD.test(newPassword)) {
      return t('ERR_PASSWORD_TOO_SHORT');
    }
    return null;
  }, [newPassword, t]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) {
      return null;
    }
    if (confirmPassword !== newPassword) {
      return t('ERR_PASSWORDS_DO_NOT_MATCH');
    }
    return null;
  }, [confirmPassword, newPassword, t]);

  const canSubmitStep1 = userId.trim().length >= 3 && !userIdError && !loading;
  const canSubmitStep2 = otp.length === 6 && !otpError && !loading;
  const canSubmitStep3 =
    newPassword.length >= 6 &&
    confirmPassword.length >= 6 &&
    newPassword === confirmPassword &&
    !newPasswordError &&
    !confirmPasswordError &&
    !loading;

  /* ------------------------------ handlers -------------------------------- */

  const handleRequestOtp = useCallback(
    async ({silent = false} = {}) => {
      if (!silent && !canSubmitStep1) {
        return;
      }
      try {
        setLoading(true);
        const res = await requestPasswordOtpApi({userId: userId.trim()});
        setMaskedMobile(res.maskedMobile || '');
        setStep(STEP.OTP);
        startResendCountdown();
        showToast({
          type: 'success',
          message: t('OTP_SENT_TO', {mobile: res.maskedMobile}),
        });
      } catch (e) {
        showToast({
          type: 'error',
          message:
            e?.status === 404
              ? t('USER_NOT_FOUND')
              : e?.message || t('ERR_NETWORK'),
        });
      } finally {
        setLoading(false);
      }
    },
    [canSubmitStep1, userId, startResendCountdown, t],
  );

  const handleResendOtp = useCallback(() => {
    if (resendIn > 0 || loading) {
      return;
    }
    setOtp('');
    handleRequestOtp({silent: true});
  }, [resendIn, loading, handleRequestOtp]);

  const handleVerifyOtp = useCallback(async () => {
    if (!canSubmitStep2) {
      return;
    }
    try {
      setLoading(true);
      const res = await verifyPasswordOtpApi({
        userId: userId.trim(),
        otp: otp,
      });
      setResetToken(res.resetToken);
      setStep(STEP.NEW_PASSWORD);
    } catch (e) {
      showToast({
        type: 'error',
        message: e?.message || t('ERR_INVALID_OTP'),
      });
    } finally {
      setLoading(false);
    }
  }, [canSubmitStep2, userId, otp, t]);

  const handleResetPassword = useCallback(async () => {
    if (!canSubmitStep3) {
      return;
    }
    try {
      setLoading(true);
      await resetPasswordApi({
        userId: userId.trim(),
        resetToken,
        newPassword,
      });
      showToast({
        type: 'success',
        message: t('PASSWORD_CHANGED_SUCCESS'),
      });
      // Pop back to Login. CommonActions.reset would also work but
      // since this screen is pushed straight from Login, popping is
      // enough — the user lands back where they started.
      navigation.navigate(ROUTES.LOGIN);
    } catch (e) {
      showToast({
        type: 'error',
        message: e?.message || t('ERR_NETWORK'),
      });
    } finally {
      setLoading(false);
    }
  }, [canSubmitStep3, userId, resetToken, newPassword, t, navigation]);

  const handleBack = useCallback(() => {
    if (step === STEP.NEW_PASSWORD) {
      setStep(STEP.OTP);
    } else if (step === STEP.OTP) {
      setStep(STEP.USER_ID);
      setOtp('');
    } else {
      navigation.goBack();
    }
  }, [step, navigation]);

  /* -------------------------------- render -------------------------------- */

  const renderStepper = () => (
    <View style={styles.stepperRow}>
      {[STEP.USER_ID, STEP.OTP, STEP.NEW_PASSWORD].map((s, idx) => {
        const active = step === s;
        const done = step > s;
        return (
          <React.Fragment key={s}>
            <View
              style={[
                styles.stepDot,
                active && styles.stepDotActive,
                done && styles.stepDotDone,
              ]}>
              <Text
                style={[
                  styles.stepDotText,
                  (active || done) && styles.stepDotTextActive,
                ]}>
                {done ? '\u2713' : s}
              </Text>
            </View>
            {idx < 2 ? (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderUserIdStep = () => (
    <>
      <Text style={styles.title}>{t('FORGOT_PASSWORD')}</Text>
      <Text style={styles.subtitle}>{t('FORGOT_PASSWORD_DESC')}</Text>

      <MyInput
        label={t('USERID')}
        placeholder={t('USERID_PLACEHOLDER')}
        value={userId}
        onChangeText={setUserId}
        autoCapitalize="none"
        autoCorrect={false}
        required
        error={userIdError}
        leftIcon={<Text style={styles.fieldIcon}>{'\uD83D\uDC64'}</Text>}
      />

      <CustomButton
        title={t('SEND_OTP')}
        onPress={handleRequestOtp}
        loading={loading}
        disabled={!canSubmitStep1}
        style={styles.primaryBtn}
      />

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.linkRow}>
        <Text style={styles.linkText}>{t('BACK_TO_LOGIN')}</Text>
      </TouchableOpacity>
    </>
  );

  const renderOtpStep = () => (
    <>
      <Text style={styles.title}>{t('ENTER_OTP')}</Text>
      <Text style={styles.subtitle}>
        {t('OTP_SENT_TO', {mobile: maskedMobile || '\u2014'})}
      </Text>

      <MyInput
        label={t('OTP')}
        placeholder={t('OTP_PLACEHOLDER')}
        value={otp}
        onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        required
        error={otpError}
        leftIcon={<Text style={styles.fieldIcon}>{'\uD83D\uDD11'}</Text>}
      />

      <View style={styles.resendRow}>
        {resendIn > 0 ? (
          <Text style={styles.resendCountdown}>
            {t('RESEND_IN', {time: formatSec(resendIn)})}
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
            <Text style={styles.resendLink}>{t('RESEND_OTP')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <CustomButton
        title={t('VERIFY_OTP')}
        onPress={handleVerifyOtp}
        loading={loading}
        disabled={!canSubmitStep2}
        style={styles.primaryBtn}
      />

      <TouchableOpacity onPress={handleBack} style={styles.linkRow}>
        <Text style={styles.linkText}>{t('CHANGE_USER_ID')}</Text>
      </TouchableOpacity>
    </>
  );

  const renderNewPasswordStep = () => (
    <>
      <Text style={styles.title}>{t('SET_NEW_PASSWORD')}</Text>
      <Text style={styles.subtitle}>{t('SET_NEW_PASSWORD_DESC')}</Text>

      <MyInput
        label={t('NEW_PASSWORD')}
        placeholder={t('PASSWORD_PLACEHOLDER')}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
        required
        error={newPasswordError}
        leftIcon={<Text style={styles.fieldIcon}>{'\uD83D\uDD12'}</Text>}
      />

      <MyInput
        label={t('CONFIRM_PASSWORD')}
        placeholder={t('PASSWORD_PLACEHOLDER')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        required
        error={confirmPasswordError}
        leftIcon={<Text style={styles.fieldIcon}>{'\uD83D\uDD12'}</Text>}
      />

      <CustomButton
        title={t('CHANGE_PASSWORD')}
        onPress={handleResetPassword}
        loading={loading}
        disabled={!canSubmitStep3}
        style={styles.primaryBtn}
      />
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <CustomHeader title={t('CHANGE_PASSWORD')} onBack={handleBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {renderStepper()}

          <View style={[styles.card, SHADOWS.card]}>
            {step === STEP.USER_ID && renderUserIdStep()}
            {step === STEP.OTP && renderOtpStep()}
            {step === STEP.NEW_PASSWORD && renderNewPasswordStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const STEP_DOT = 32;

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: COLORS.background},
  flex: {flex: 1},
  scroll: {
    flexGrow: 1,
    padding: SPACING.lg,
  },

  /* Stepper */
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  stepDot: {
    width: STEP_DOT,
    height: STEP_DOT,
    borderRadius: STEP_DOT / 2,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  stepDotDone: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success,
  },
  stepDotText: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textMuted,
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    maxWidth: 60,
    marginHorizontal: SPACING.xs,
    backgroundColor: COLORS.border,
  },
  stepLineDone: {
    backgroundColor: COLORS.success,
  },

  /* Card */
  card: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  title: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  fieldIcon: {fontSize: 16},

  primaryBtn: {marginTop: SPACING.sm},

  linkRow: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.small,
    fontWeight: FONT_WEIGHT.semibold,
  },

  /* Resend */
  resendRow: {
    alignItems: 'flex-end',
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  resendLink: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.small,
    fontWeight: FONT_WEIGHT.semibold,
  },
  resendCountdown: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.small,
  },
});

export default ChangePasswordScreen;
