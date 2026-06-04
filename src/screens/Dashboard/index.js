/**
 * Dashboard.
 *
 * Welcome banner at the top + grid of action cards (Add Beneficiary,
 * List, Profile, Logout). Logout dispatches the auth thunk which clears
 * the token and resets the navigator.
 */

import React, {useCallback, useEffect} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View, Button
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {logout} from '../../redux/slices/authSlice';
import {fetchBeneficiaries} from '../../redux/slices/beneficiarySlice';
import {clearFacility} from '../../redux/slices/facilitySlice';
import {clearScheme} from '../../redux/slices/schemeSlice';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';
import {changeLanguage} from '../../utils/i18n';
import {greetingKey} from '../../utils/formatters';
import { startParichaiAuth } from '../../services/ParichaiAuthService';
import { LOGIN_TYPES } from '../../constants/facilities';

const GREETING_KEY_MAP = {
  morning: {en: 'Good morning', hi: 'सुप्रभात'},
  afternoon: {en: 'Good afternoon', hi: 'नमस्ते'},
  evening: {en: 'Good evening', hi: 'शुभ संध्या'},
};

const DashboardScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {t, i18n} = useTranslation();
  const user = useSelector(s => s.auth.user);
  const beneficiaries = useSelector(s => s.beneficiary.items);

  useEffect(() => {
    dispatch(
      fetchBeneficiaries({
        reset: true,
        filters: {facilityId: user?.facility?.id || null},
      }),
    );
  }, [dispatch, user]);

  const greeting = GREETING_KEY_MAP[greetingKey()][i18n.language] ||
    GREETING_KEY_MAP[greetingKey()].en;

  const total = useSelector(s => s.beneficiary.total);
  const totalCount = total || beneficiaries.length;
  const pendingCount = beneficiaries.filter(
    b => b.status === 'PENDING_AUTH' || b.status === 'AUTH_FAILED',
  ).length;
  const submittedCount = beneficiaries.filter(
    b => b.status === 'SUBMITTED',
  ).length;

  const goAddBeneficiary = useCallback(() => {
    dispatch(clearFacility());
    dispatch(clearScheme());
    navigation.navigate(ROUTES.FACILITY_SELECTION);
  }, [dispatch, navigation]);

  const goList = useCallback(() => {
    navigation.navigate(ROUTES.BENEFICIARY_LIST);
  }, [navigation]);

  const goProfile = useCallback(() => {
    navigation.navigate(ROUTES.PROFILE);
  }, [navigation]);

  const toggleLanguage = useCallback(() => {
    changeLanguage(i18n.language === 'hi' ? 'en' : 'hi');
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

  const actions = [
    {
      key: 'add',
      title: t('ADD_BENEFICIARY'),
      icon: '\u2795',
      color: COLORS.primary,
      bg: COLORS.primaryLight,
      onPress: goAddBeneficiary,
    },
    {
      key: 'list',
      title: t('BENEFICIARY_LIST'),
      icon: '\uD83D\uDCCB',
      color: COLORS.accent,
      bg: COLORS.accentLight,
      onPress: goList,
    },
    {
      key: 'profile',
      title: t('PROFILE'),
      icon: '\uD83D\uDC64',
      color: COLORS.info,
      bg: COLORS.infoLight,
      onPress: goProfile,
    },
    {
      key: 'logout',
      title: t('LOGOUT'),
      icon: '🚪',
      color: COLORS.error,
      bg: COLORS.errorLight,
      onPress: handleLogout,
    },
  ];

  const launchParichai = async () => {
    try {
      console.log('1. Before SDK call');
  
      const response = await startParichaiAuth({
        sa: 'LITEMPLTD1',
        serviceType: '1',
        encData: 'encrypted_payload',
        transactionId: 'LITEMPLTD1:20260601120000999',
        disclosureInfoType: '1',
        environment: 'PREPROD',
      });
  
      console.log('2. SDK Response', response);
    } catch (e) {
      console.log('3. SDK Error', e);
    }
  };

  return (
    <View style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerInner}>
          <View style={{flex: 1}}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || 'User'}
            </Text>
            <Text style={styles.role}>
              {t(
                user?.role === LOGIN_TYPES.BLOCK
                  ? 'BLOCK_LOGIN'
                  : user?.role === LOGIN_TYPES.DISTRICT
                  ? 'DISTRICT_LOGIN'
                  : 'MEDICAL_LOGIN',
              )}
              {user?.facility?.name ? ` · ${user.facility.name}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
            <Text style={styles.langText}>
              {i18n.language === 'hi' ? 'EN' : 'हि'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Stats */}
        {/* <View style={[styles.statsCard, SHADOWS.card]}>
          <Stat label={t('BENEFICIARY_LIST')} value={totalCount} color={COLORS.primary} />
          <View style={styles.statDivider} />
          <Stat label={t('STATUS_PENDING_AUTH')} value={pendingCount} color={COLORS.warning} />
          <View style={styles.statDivider} />
          <Stat label={t('STATUS_SUBMITTED')} value={submittedCount} color={COLORS.success} />
        </View> */}

        {/* <Text style={styles.sectionTitle}>{t('DASHBOARD')}</Text> */}

        <View style={styles.grid}>
          {actions.map(a => (
            <TouchableOpacity
              key={a.key}
              activeOpacity={0.85}
              onPress={a.onPress}
              style={[styles.actionCard, SHADOWS.card]}>
              <View style={[styles.actionIcon, {backgroundColor: a.bg}]}>
                <Text style={[styles.actionIconText, {color: a.color}]}>
                  {a.icon}
                </Text>
              </View>
              <Text style={styles.actionTitle}>{a.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title='check sdk' onPress={()=>launchParichai()} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('MIN_HEALTH')}</Text>
          <Text style={styles.footerText}>{t('GOVT_OF_INDIA')}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const Stat = ({label, value, color}) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, {color}]}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={2}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.background},
  headerSafe: {backgroundColor: COLORS.primary},
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl + 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: COLORS.primary,
  },
  greeting: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.subtitle,
  },
  name: {
    color: '#fff',
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: 2,
  },
  role: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZE.body,
    marginTop: 8,
  },
  langBtn: {
    width: 48,
    height: 48,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: {color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.title},
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  stat: {flex: 1, alignItems: 'center'},
  statValue: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.bold,
  },
  statLabel: {
    marginTop: 4,
    fontSize: FONT_SIZE.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginTop: SPACING.md,
  },
  actionCard: {
    // flexBasis: '47%',
    flexGrow: 1,
    margin: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'flex-start',
    height:150
  },
  actionIcon: {
    width: 65,
    height: 65,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  actionIconText: {fontSize: 24, fontWeight: '700'},
  actionTitle: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.caption,
  },
});

export default DashboardScreen;
