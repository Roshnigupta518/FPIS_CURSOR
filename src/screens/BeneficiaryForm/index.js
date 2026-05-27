/**
 * Beneficiary Form screen.
 *
 *  - Dynamic field list driven by getFieldsForScheme().
 *  - On submit, dispatches createBeneficiary OR updateBeneficiary, then
 *    routes to the Face Authentication screen with the saved record so
 *    the multipart face-auth call has a real beneficiary_id.
 *  - Server-side validation errors are surfaced inline on the matching
 *    field (mapped from snake_case → camelCase keys) AND as a toast.
 */

import React, {useEffect, useMemo} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';

import CustomButton from '../../components/CustomButton';
import CustomHeader from '../../components/CustomHeader';
import DatePickerField from '../../components/DatePickerField';
import MyInput from '../../components/MyInput';
import {showToast} from '../../components/Toast';

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {getFieldsForScheme} from '../../constants/schemes';
import {
  createBeneficiary,
  setDraft,
  updateBeneficiary,
} from '../../redux/slices/beneficiarySlice';
import useForm from '../../hooks/useForm';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
} from '../../styles/theme';

// Translate snake_case keys returned by the backend validator into
// camelCase form keys we use on the client.
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

const BeneficiaryFormScreen = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {t, i18n} = useTranslation();
  const isHi = i18n.language === 'hi';

  const facility = useSelector(s => s.facility.selected);
  const scheme = useSelector(s => s.scheme.selected);
  const {submitting, fieldErrors: serverFieldErrors} = useSelector(
    s => s.beneficiary,
  );

  const existing = route?.params?.beneficiary;
  const isEdit = Boolean(existing?.id);

  const fields = useMemo(() => getFieldsForScheme(scheme?.key || scheme?.id), [
    scheme?.key,
    scheme?.id,
  ]);

  const initial = useMemo(() => {
    const seed = existing || {};
    return {
      ...seed,
      facilityName: facility
        ? isHi
          ? facility.nameHi
          : facility.name
        : seed.facilityName || '',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {values, errors, setValue, setError, validate} = useForm(
    fields,
    initial,
  );

  // Keep facility name display in sync if user toggles language.
  useEffect(() => {
    if (facility) {
      setValue('facilityName', isHi ? facility.nameHi : facility.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHi, facility]);

  // Project server-side field errors back onto the form.
  // Errors are stored as i18n keys so render-time t() can localize them.
  useEffect(() => {
    if (!serverFieldErrors) return;
    for (const [serverKey, errKey] of Object.entries(serverFieldErrors)) {
      const clientKey = SERVER_TO_CLIENT_KEY[serverKey] || serverKey;
      setError(clientKey, errKey);
    }
  }, [serverFieldErrors, setError]);

  const handleSubmit = async () => {
    const {isValid} = validate();
    if (!isValid) return;

    const payload = {
      ...values,
      schemeId: scheme?.id,
      facilityId: facility?.id,
    };

    const action = isEdit
      ? updateBeneficiary({id: existing.id, form: payload})
      : createBeneficiary(payload);

    const result = await dispatch(action);

    if (
      createBeneficiary.fulfilled.match(result) ||
      updateBeneficiary.fulfilled.match(result)
    ) {
      const saved = result.payload;
      dispatch(setDraft(saved));
      showToast({
        type: 'success',
        message: isEdit ? 'Beneficiary updated' : t('FORM_SUBMITTED'),
      });
      // Move on to face authentication using the persisted id.
      navigation.navigate(ROUTES.FACE_AUTHENTICATION, {beneficiary: saved});
    } else {
      showToast({
        type: 'error',
        message: result.payload?.message || 'Failed to save',
      });
    }
  };

  return (
    <View style={styles.flex}>
      <CustomHeader
        title={t('BENEFICIARY_FORM')}
        subtitle={isHi ? scheme?.nameHi : scheme?.name}
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
              {isHi ? scheme?.nameHi : scheme?.name}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {isHi ? facility?.nameHi : facility?.name}
            </Text>
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

          <View style={{height: SPACING.lg}} />
          <CustomButton
            title={isEdit ? t('SAVE') : t('CONTINUE')}
            onPress={handleSubmit}
            loading={submitting}
            rightIcon={<Text style={styles.btnArrow}>{'\u2192'}</Text>}
          />
          <View style={{height: SPACING.xl}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.background},
  scroll: {padding: SPACING.lg, paddingBottom: SPACING.xxl},
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
  btnArrow: {color: '#fff', fontSize: 18, fontWeight: '700'},
});

export default BeneficiaryFormScreen;
