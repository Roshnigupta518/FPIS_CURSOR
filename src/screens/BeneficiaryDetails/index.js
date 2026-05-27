/**
 * Beneficiary Details screen.
 *
 *  - Fetches fresh data via fetchBeneficiaryById on mount.
 *  - Edit  : visible when status !== SUBMITTED
 *  - Face Auth : visible for PENDING_AUTH / AUTH_FAILED
 *  - Delete : asks for confirmation, then DELETE /:id
 */

import React, {useCallback, useEffect, useMemo} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';

import CustomButton from '../../components/CustomButton';
import CustomHeader from '../../components/CustomHeader';
import Loader from '../../components/Loader';
import SectionCard, {DetailRow} from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import {showToast} from '../../components/Toast';

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {BENEFICIARY_STATUS} from '../../constants/schemes';
import {
  deleteBeneficiary,
  fetchBeneficiaryById,
  setDraft,
} from '../../redux/slices/beneficiarySlice';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';
import {formatDate, formatDateTime} from '../../utils/formatters';

const BeneficiaryDetailsScreen = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const id = route?.params?.id;

  const {current, loadingCurrent, deletingId} = useSelector(s => s.beneficiary);
  const itemFromList = useSelector(s =>
    s.beneficiary.items.find(i => i.id === id),
  );

  // Use the freshest data: server fetch > list cache.
  const item = current?.id === id ? current : itemFromList || null;
  const isDeleting = deletingId === id;

  useEffect(() => {
    if (id) dispatch(fetchBeneficiaryById(id));
  }, [dispatch, id]);

  const canEdit = useMemo(
    () => item && item.status !== BENEFICIARY_STATUS.SUBMITTED,
    [item],
  );
  const canAuth = useMemo(
    () =>
      item &&
      (item.status === BENEFICIARY_STATUS.PENDING_AUTH ||
        item.status === BENEFICIARY_STATUS.AUTH_FAILED),
    [item],
  );

  const handleEdit = useCallback(() => {
    if (!item) return;
    dispatch(setDraft(item));
    navigation.navigate(ROUTES.BENEFICIARY_FORM, {beneficiary: item});
  }, [dispatch, item, navigation]);

  const handleAuth = useCallback(() => {
    if (!item) return;
    dispatch(setDraft(item));
    navigation.navigate(ROUTES.FACE_AUTHENTICATION, {beneficiary: item});
  }, [dispatch, item, navigation]);

  const handleDelete = useCallback(() => {
    if (!item) return;
    Alert.alert(
      'Delete Beneficiary',
      `Delete ${item.beneficiaryName}? This cannot be undone.`,
      [
        {text: t('NO'), style: 'cancel'},
        {
          text: t('YES'),
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(deleteBeneficiary(item.id));
            if (deleteBeneficiary.fulfilled.match(result)) {
              showToast({type: 'success', message: 'Beneficiary deleted'});
              navigation.goBack();
            } else {
              showToast({type: 'error', message: result.payload || 'Failed to delete'});
            }
          },
        },
      ],
    );
  }, [dispatch, item, navigation, t]);

  if (loadingCurrent && !item) {
    return (
      <View style={styles.flex}>
        <CustomHeader
          title={t('BENEFICIARY_DETAILS')}
          onBack={() => navigation.goBack()}
        />
        <Loader text={t('LOADING')} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.flex}>
        <CustomHeader
          title={t('BENEFICIARY_DETAILS')}
          onBack={() => navigation.goBack()}
        />
        <View style={[styles.flex, styles.center]}>
          <Text style={styles.muted}>{t('NO_DATA')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CustomHeader
        title={t('BENEFICIARY_DETAILS')}
        subtitle={`ID: ${item.id}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status / hero card */}
        <View style={[styles.heroCard, SHADOWS.card]}>
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.beneficiaryName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.heroName} numberOfLines={1}>
                {item.beneficiaryName}
              </Text>
              <Text style={styles.heroSub}>
                {t('AGE')}: {item.age}
              </Text>
            </View>
          </View>
          <View style={styles.heroFooter}>
            <Text style={styles.statusLabel}>{t('STATUS')}</Text>
            <StatusBadge status={item.status} size="md" />
          </View>
        </View>

        <SectionCard title={t('PERSONAL_DETAILS')} icon="\uD83D\uDC64">
          <DetailRow label={t('BENEFICIARY_NAME')} value={item.beneficiaryName} />
          <DetailRow label={t('GUARDIAN_NAME')} value={item.guardianName} />
          <DetailRow label={t('AGE')} value={item.age} />
          <DetailRow label={t('SAMAGRA_ID')} value={item.samagraId} />
          <DetailRow label={t('MOBILE')} value={item.mobile} />
          <DetailRow label={t('ADDRESS')} value={item.address} />
        </SectionCard>

        <SectionCard title={t('SCHEME_DETAILS')} icon="\uD83D\uDCC4">
          <DetailRow label={t('SCHEME')} value={item.schemeName} />
          {item.claimId ? (
            <DetailRow label={t('CLAIM_ID')} value={item.claimId} />
          ) : null}
          {item.procedureDate ? (
            <DetailRow
              label={t('PROCEDURE_DATE')}
              value={formatDate(item.procedureDate)}
            />
          ) : null}
          {item.followUpDate ? (
            <DetailRow
              label={t('FOLLOW_UP_DATE')}
              value={formatDate(item.followUpDate)}
            />
          ) : null}
          <DetailRow label={t('DOCTOR_NAME')} value={item.doctorName} />
        </SectionCard>

        <SectionCard title={t('FACILITY_DETAILS')} icon="\uD83C\uDFE5">
          <DetailRow label={t('FACILITY')} value={item.facilityName} />
          {item.facilityType ? (
            <DetailRow label="Type" value={item.facilityType} />
          ) : null}
          <DetailRow label={t('DATE')} value={formatDateTime(item.createdAt)} />
        </SectionCard>

        {/* Actions */}
        <View style={styles.actions}>
          {canAuth ? (
            <CustomButton
              title={t('FACE_AUTHENTICATION')}
              onPress={handleAuth}
              variant="secondary"
              style={{marginBottom: SPACING.sm}}
            />
          ) : null}

          {canEdit ? (
            <CustomButton
              title={t('EDIT')}
              onPress={handleEdit}
              variant="outline"
              style={{marginBottom: SPACING.sm}}
            />
          ) : null}

          <CustomButton
            title={isDeleting ? '...' : 'Delete'}
            onPress={handleDelete}
            variant="danger"
            loading={isDeleting}
          />

          {!canEdit && !canAuth ? (
            <View style={styles.completedBanner}>
              <Text style={styles.completedIcon}>{'\u2713'}</Text>
              <Text style={styles.completedText}>{t('FORM_SUBMITTED')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.background},
  center: {alignItems: 'center', justifyContent: 'center'},
  muted: {color: COLORS.textMuted},
  scroll: {padding: SPACING.lg, paddingBottom: SPACING.xxl},

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  heroRow: {flexDirection: 'row', alignItems: 'center'},
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.heading,
  },
  heroName: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  heroSub: {color: COLORS.textSecondary, marginTop: 2},
  heroFooter: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {color: COLORS.textSecondary, fontSize: FONT_SIZE.small},

  actions: {marginTop: SPACING.lg},
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.successLight,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  completedIcon: {
    color: COLORS.success,
    fontWeight: '700',
    marginRight: SPACING.sm,
    fontSize: 18,
  },
  completedText: {color: COLORS.success, fontWeight: FONT_WEIGHT.semibold},
});

export default BeneficiaryDetailsScreen;
