/**
 * Profile screen.
 *
 * Shows the active user, current login type, and offers language toggle
 * and logout actions.
 */

import React, {useCallback} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';

import CustomHeader from '../../components/CustomHeader';
import CustomButton from '../../components/CustomButton';

import {COLORS} from '../../constants/colors';
import {logout} from '../../redux/slices/authSlice';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';
import {changeLanguage} from '../../utils/i18n';
import { LOGIN_TYPES } from '../../constants/facilities';

const Row = ({label, value, onPress}) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.7 : 1}
    onPress={onPress}
    style={styles.row}>
    <View style={{flex: 1}}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
    {onPress ? <Text style={styles.chev}>{'\u203A'}</Text> : null}
  </TouchableOpacity>
);

const ProfileScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {t, i18n} = useTranslation();
  const user = useSelector(s => s.auth.user);
  const fallbackLoginType = useSelector(s => s.auth.loginType);
  const loginType = user?.role || fallbackLoginType;

  const toggleLanguage = useCallback(() => {
    const next = i18n.language === 'hi' ? 'en' : 'hi';
    changeLanguage(next);
  }, [i18n.language]);

  const handleLogout = useCallback(() => {
    Alert.alert(t('LOGOUT'), t('LOGOUT_CONFIRM'), [
      {text: t('NO'), style: 'cancel'},
      {
        text: t('YES'),
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  }, [dispatch, t]);

  console.log({user})

  return (
    <View style={styles.flex}>
      <CustomHeader title={t('PROFILE')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, SHADOWS.card]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name || '—'}</Text>
          <Text style={styles.role}>
            {t(
              user.role === LOGIN_TYPES.BLOCK
                ? 'BLOCK_LOGIN'
                : user.role === LOGIN_TYPES.DISTRICT
                ? 'DISTRICT_LOGIN'
                : 'MEDICAL_LOGIN',
            )}
          </Text>
        </View>

        <View style={[styles.card, SHADOWS.card, {padding: 0}]}>

        <Row label={t('DIVISION')} value={user?.facility?.devision || '—'} />
        <View style={styles.divider} />

        <Row label={t('DISTRICT')} value={user?.facility?.district || '—'} />
        <View style={styles.divider} />

        <Row label={t('BLOCK')} value={user?.facility?.block || '—'} />
        <View style={styles.divider} />
         
          {user?.facility ? (
            <>
              <Row
                label={t('FACILITY')}
                value={user.facility.name || '—'}
              />
              <View style={styles.divider} />
            </>
          ) : null}

        <Row label={t('MOBILE')} value={user?.mobile || '—'} />
        <View style={styles.divider} />

          <Row
            label={t('LANGUAGE')}
            value={i18n.language === 'hi' ? t('HINDI') : t('ENGLISH')}
            onPress={toggleLanguage}
          />
          <View style={styles.divider} />
          {/* <Row label={t('VERSION')} value="1.0.0" /> */}
        </View>

        <View style={{marginTop: SPACING.xl}}>
          <CustomButton
            title={t('LOGOUT')}
            variant="danger"
            onPress={handleLogout}
          />
        </View>

        <Text style={styles.footer}>{t('MIN_HEALTH')}</Text>
        <Text style={styles.footer}>{t('GOVT_OF_INDIA')}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.background},
  scroll: {padding: SPACING.lg, paddingBottom: SPACING.xxl},

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: {
    fontSize: 34,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  name: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  role: {
    marginTop: 4,
    fontSize: FONT_SIZE.small,
    color: COLORS.textSecondary,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rowLabel: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
  },
  rowValue: {
    marginTop: 2,
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },
  chev: {fontSize: 22, color: COLORS.textMuted},
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.lg,
  },

  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.caption,
    marginTop: SPACING.md,
  },
});

export default ProfileScreen;
