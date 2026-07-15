/**
 * Beneficiary Form screen.
 *
 *  - Dynamic field list driven by getFieldsForScheme().
 *  - On submit, dispatches createBeneficiary, then routes to the Face
 *    Authentication screen with the saved record so the multipart
 *    face-auth call has a real beneficiary_id.
 *  - Server-side validation errors are surfaced inline on the matching
 *    field (mapped from snake_case → camelCase keys) AND as a toast.
 */

import React, { useEffect, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import CustomButton from '../../components/CustomButton';
import CustomHeader from '../../components/CustomHeader';
import DatePickerField from '../../components/DatePickerField';
import MyInput from '../../components/MyInput';
import { showToast } from '../../components/Toast';

import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import {
  getFieldsForScheme,
  getSchemeKeyFromApi,
} from '../../constants/schemes';
import {
  createBeneficiary,
  setDraft,
} from '../../redux/slices/beneficiarySlice';
import useForm from '../../hooks/useForm';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from '../../styles/theme';
import { startParichaiAuth } from '../../services/ParichaiAuthService';
import { prepareAadhaarRequest } from '../../api/AadhaarGatewayService';
import { logger } from '../../utils/logger';
import {CommonActions} from '@react-navigation/native';

const SERVER_TO_CLIENT_KEY = {
  beneficiary_name: 'beneficiaryName',
  father_husband_name: 'guardianName',
  samagra_id: 'samagraId',
  doctor_name: 'doctorName',
  procedure_date: 'procedureDate',
  follow_up_date: 'followUpDate',
  claim_id: 'claimId',
  scheme_id: 'schemeId',
  facility_id: 'facilityId',
};

const BeneficiaryFormScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const isHi = i18n.language === 'hi';

  const facility = useSelector(s => s.facility.selected);
  const scheme = useSelector(s => s.scheme.selected);
  const { submitting, fieldErrors: serverFieldErrors } = useSelector(
    s => s.beneficiary,
  );

  const schemeKey = useMemo(() => getSchemeKeyFromApi(scheme), [scheme]);
  const fields = useMemo(() => getFieldsForScheme(schemeKey), [schemeKey]);

  const initial = useMemo(
    () => ({
      facilityName: facility?.facility_name || '',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { values, errors, setValue, setError, validate } = useForm(
    fields,
    initial,
  );

  // Keep facility name in sync if the selected facility changes.
  useEffect(() => {
    if (facility) {
      setValue('facilityName', facility.facility_name || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility]);

  // Project server-side field errors back onto the form.
  useEffect(() => {
    if (!serverFieldErrors) return;
    for (const [serverKey, errKey] of Object.entries(serverFieldErrors)) {
      const clientKey = SERVER_TO_CLIENT_KEY[serverKey] || serverKey;
      setError(clientKey, errKey);
    }
  }, [serverFieldErrors, setError]);


  const handleSubmit = async () => {
    const { isValid } = validate();
    if (!isValid) return;

    // 1) Backend se encrypted Aadhaar payload tayar karwa lo
    let aadhaar;
    try {
      aadhaar = await prepareAadhaarRequest({ serviceType: 6 });
      logger.debug('[AADHAAR] PrepareRequest response', aadhaar);
    } catch (e) {
      showToast({ type: 'error', message: 'Aadhaar gateway error' });
      return;
    }

    // 2) Parichai SDK kholo. SDK fail ho ya key na de -> referenceKey null rakhenge.
    let referenceKey = null;
    let authSuccess = false;
    try {
      const sdkResponse = await startParichaiAuth({
        sa: aadhaar.sa,
        serviceType: String(aadhaar.serviceType),
        encData: aadhaar.encData,
        transactionId: aadhaar.transactionId,
        disclosureInfoType: String(aadhaar.disclosureInfoType ?? 1),
        environment: 'PREPROD',
      });
      logger.debug('[AADHAAR] Parichai SDK response', sdkResponse);

      // setTimeout(() => {
      //   Alert.alert(
      //     'SDK Response',
      //     JSON.stringify(sdkResponse?.data || sdkResponse)
      //   );
      // }, 1000);

      const gatewayResponse = sdkResponse?.data?.gatewayResponse;

      if (gatewayResponse) {
        const parsed =
          typeof gatewayResponse === 'string'
            ? JSON.parse(gatewayResponse)
            : gatewayResponse;

        logger.debug('[AADHAAR] Parsed Gateway Response', parsed);

        authSuccess =
          parsed?.ret === '1' &&
          parsed?.uidToken &&
          parsed?.uidToken.trim() !== '';

        referenceKey =
          parsed?.refKey !== undefined
            ? String(parsed.refKey)
            : null;
      }

    } catch (e) {
      logger.warn('[AADHAAR] Parichai SDK error', e?.message || e);
      showToast({
        type: 'error',
        message: 'Parichai SDK error',
      });

    }

    // 3) Beneficiary hamesha save karo (referenceKey null bhi ja sakta hai).
    // console.log({values})
    const payload = {
      ...values,
      schemeId: scheme?.id,
      facilityId: facility?.id,
      facilityTypeId: facility?.health_facility_type_id,   // <- naya
      referenceKey,                                          // null when auth failed
      transactionId: aadhaar.transactionId,
    };

    const result = await dispatch(createBeneficiary(payload));
    logger.debug('[BENEFICIARY.CREATE] result', result.payload);

    // 4) Save fail -> just show toast, stop.
    if (!createBeneficiary.fulfilled.match(result)) {
      showToast({
        type: 'error',
        message: result.payload?.message || 'Failed to save',
      });
      return;
    }

    if (!authSuccess) {
      showToast({
        type: 'error',
        message: 'Aadhaar authentication failed',
      });

      navigation.navigate(ROUTES.DASHBOARD);
      return;
    }

    const saved = result.payload;
    dispatch(setDraft(saved));

    // 5) Sab sahi -> success toast + list screen.
    showToast({ type: 'success', message: t('FORM_SUBMITTED') });
    // navigation.navigate(ROUTES.BENEFICIARY_LIST);
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          {name: ROUTES.DASHBOARD},
          {name: ROUTES.BENEFICIARY_LIST},
        ],
      }),
    );
    
  };

  const schemeTitle = isHi ? scheme?.scheme_name : scheme?.scheme_name_e;
  const facilityTitle = facility?.facility_name;

  return (
    <View style={styles.flex}>
      <CustomHeader
        title={t('BENEFICIARY_FORM')}
        subtitle={schemeTitle}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.banner}>
            <Text style={styles.bannerTitle} numberOfLines={2}>
              {schemeTitle}
            </Text>
            <Text style={styles.bannerSubtitle}>{facilityTitle}</Text>
          </View>

          {fields.map(f => {
            const labelText = isHi ? f.labelHi : f.label;
            const errKey = errors[f.key];
            const errMsg = errKey ? t(errKey) : null;

            if (f.type === 'date') {
              return (
                <DatePickerField
                  key={f.key}
                  label={labelText}
                  value={values[f.key] || null}
                  onChange={d => setValue(f.key, d)}
                  required={f.required}
                  error={errMsg}
                  mode={f.mode || 'date'}
                  maximumDate={new Date()}
                />
              );
            }

            return (
              <MyInput
                key={f.key}
                label={labelText}
                value={values[f.key] || ''}
                onChangeText={v => setValue(f.key, v)}
                required={f.required}
                error={errMsg}
                keyboardType={f.keyboardType || 'default'}
                maxLength={f.maxLength}
                multiline={f.multiline}
                readOnly={f.readOnly}
                autoCapitalize={f.type === 'name' ? 'words' : 'sentences'}
                placeholder={labelText}
              />
            );
          })}

          <View style={{ height: SPACING.lg }} />
          <CustomButton
            title={t('CONTINUE')}
            onPress={handleSubmit}
            loading={submitting}
            rightIcon={<Text style={styles.btnArrow}>{'\u2192'}</Text>}
          />
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  banner: {
    backgroundColor: COLORS.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  bannerTitle: {
    fontSize: FONT_SIZE.subtitle,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primaryDark,
  },
  bannerSubtitle: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.small,
  },
  btnArrow: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

export default BeneficiaryFormScreen;