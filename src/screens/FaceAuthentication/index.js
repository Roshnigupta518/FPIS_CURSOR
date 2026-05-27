/**
 * Face Authentication screen.
 *
 *  - Captures (or picks) an image via react-native-image-picker.
 *  - POSTs multipart/form-data to /beneficiaries/face-auth with the
 *    beneficiary id, image file, and an auth_status outcome.
 *  - On success, navigates back to the Beneficiary List (resetting the
 *    stack so Back doesn't return to the camera screen).
 */

import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';

import CustomButton from '../../components/CustomButton';
import CustomHeader from '../../components/CustomHeader';
import {showToast} from '../../components/Toast';

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {BENEFICIARY_STATUS} from '../../constants/schemes';
import {runFaceAuth} from '../../redux/slices/beneficiarySlice';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';

const PICKER_OPTS = {
  mediaType: 'photo',
  quality: 0.7,
  maxWidth: 1024,
  maxHeight: 1024,
  cameraType: 'front',
  saveToPhotos: false,
  includeBase64: false,
};

const FaceAuthenticationScreen = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {t, i18n} = useTranslation();
  const isHi = i18n.language === 'hi';

  const draft = useSelector(s => s.beneficiary.draft);
  const faceAuthing = useSelector(s => s.beneficiary.faceAuthing);
  const fromParams = route?.params?.beneficiary;
  const beneficiary = fromParams || draft;

  const [image, setImage] = useState(null);     // {uri, type, fileName}
  const [outcome, setOutcome] = useState(null); // null | 'SUCCESS' | 'FAILED'

  /* ---------------------------------------------------------------- */
  /*  Image capture                                                    */
  /* ---------------------------------------------------------------- */

  const handlePickerResult = useCallback(res => {
    if (res?.didCancel) return;
    if (res?.errorCode) {
      showToast({type: 'error', message: res.errorMessage || 'Camera error'});
      return;
    }
    const asset = res?.assets?.[0];
    if (!asset?.uri) return;
    setImage({
      uri: asset.uri,
      type: asset.type || 'image/jpeg',
      fileName: asset.fileName,
    });
    setOutcome(null);
  }, []);

  const openCamera = useCallback(async () => {
    const res = await launchCamera(PICKER_OPTS);
    handlePickerResult(res);
  }, [handlePickerResult]);

  const openGallery = useCallback(async () => {
    const res = await launchImageLibrary({...PICKER_OPTS, selectionLimit: 1});
    handlePickerResult(res);
  }, [handlePickerResult]);

  /* ---------------------------------------------------------------- */
  /*  Authenticate                                                     */
  /* ---------------------------------------------------------------- */

  const handleAuthenticate = useCallback(async () => {
    if (!beneficiary?.id) {
      showToast({type: 'error', message: 'Save the form before authentication'});
      return;
    }
    if (!image) {
      showToast({type: 'error', message: 'Please capture or pick a photo first'});
      return;
    }

    // Demo logic: random success/failure outcome from the client side.
    // A real integration would call a face-matching SDK here; the
    // backend just records whatever status we send.
    const ok = Math.random() > 0.2;
    const status = ok
      ? BENEFICIARY_STATUS.AUTH_SUCCESS
      : BENEFICIARY_STATUS.AUTH_FAILED;

    const result = await dispatch(
      runFaceAuth({beneficiaryId: beneficiary.id, status, image}),
    );

    if (runFaceAuth.fulfilled.match(result)) {
      setOutcome(ok ? 'SUCCESS' : 'FAILED');
      showToast({
        type: ok ? 'success' : 'error',
        message: ok ? t('FACE_AUTH_SUCCESS') : t('FACE_AUTH_FAILED'),
      });
    } else {
      showToast({type: 'error', message: result.payload || 'Upload failed'});
    }
  }, [beneficiary, dispatch, image, t]);

  const handleFinalSubmit = useCallback(async () => {
    // Mark as SUBMITTED and bounce to the list.
    if (!beneficiary?.id) return;
    const result = await dispatch(
      runFaceAuth({
        beneficiaryId: beneficiary.id,
        status: BENEFICIARY_STATUS.SUBMITTED,
        image,
      }),
    );
    if (runFaceAuth.fulfilled.match(result)) {
      showToast({type: 'success', message: 'Submitted successfully'});
      navigation.reset({
        index: 1,
        routes: [
          {name: ROUTES.DASHBOARD},
          {name: ROUTES.BENEFICIARY_LIST},
        ],
      });
    } else {
      showToast({type: 'error', message: result.payload || 'Failed to submit'});
    }
  }, [beneficiary, dispatch, image, navigation]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (!beneficiary) {
    return (
      <View style={styles.flex}>
        <CustomHeader
          title={t('FACE_AUTHENTICATION')}
          onBack={() => navigation.goBack()}
        />
        <View style={[styles.flex, styles.center]}>
          <Text style={styles.muted}>{t('NO_DATA')}</Text>
        </View>
      </View>
    );
  }

  const renderOutcomeBox = () => {
    if (faceAuthing) {
      return (
        <View style={[styles.statusBox, {backgroundColor: COLORS.infoLight}]}>
          <ActivityIndicator color={COLORS.info} />
          <Text style={[styles.statusText, {color: COLORS.info}]}>
            {t('LOADING')}
          </Text>
        </View>
      );
    }
    if (outcome === 'SUCCESS') {
      return (
        <View
          style={[styles.statusBox, {backgroundColor: COLORS.successLight}]}>
          <Text style={[styles.statusIcon, {color: COLORS.success}]}>
            {'\u2713'}
          </Text>
          <Text style={[styles.statusText, {color: COLORS.success}]}>
            {t('FACE_AUTH_SUCCESS')}
          </Text>
        </View>
      );
    }
    if (outcome === 'FAILED') {
      return (
        <View style={[styles.statusBox, {backgroundColor: COLORS.errorLight}]}>
          <Text style={[styles.statusIcon, {color: COLORS.error}]}>
            {'\u2715'}
          </Text>
          <Text style={[styles.statusText, {color: COLORS.error}]}>
            {t('FACE_AUTH_FAILED')}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.flex}>
      <CustomHeader
        title={t('FACE_AUTHENTICATION')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Beneficiary summary */}
        <View style={[styles.summary, SHADOWS.card]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(beneficiary.beneficiaryName || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.name} numberOfLines={1}>
              {beneficiary.beneficiaryName}
            </Text>
            <Text style={styles.meta}>
              {t('AGE')}: {beneficiary.age} · {t('SAMAGRA_ID')}:{' '}
              {beneficiary.samagraId}
            </Text>
            <Text style={styles.metaSmall} numberOfLines={1}>
              {isHi ? beneficiary.schemeName : beneficiary.schemeName}
            </Text>
          </View>
        </View>

        {/* Camera placeholder / preview */}
        <View style={[styles.cameraCard, SHADOWS.card]}>
          <View style={styles.cameraFrame}>
            {image ? (
              <Image source={{uri: image.uri}} style={styles.preview} />
            ) : (
              <>
                <View style={styles.faceOutline} />
                <Text style={styles.cameraText}>
                  {t('CAMERA_PLACEHOLDER')}
                </Text>
                <Text style={styles.cameraHint} numberOfLines={2}>
                  {t('FACE_AUTH_INSTRUCTION')}
                </Text>
              </>
            )}
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>

          <View style={styles.pickerRow}>
            <TouchableOpacity
              onPress={openCamera}
              style={[styles.pickerBtn, styles.pickerBtnPrimary]}
              activeOpacity={0.85}>
              <Text style={[styles.pickerText, {color: '#fff'}]}>
                {'\uD83D\uDCF7'} {image ? 'Retake' : 'Open Camera'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openGallery}
              style={styles.pickerBtn}
              activeOpacity={0.85}>
              <Text style={styles.pickerText}>{'\uD83D\uDDBC '}Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderOutcomeBox()}

        <View style={styles.actions}>
          {outcome !== 'SUCCESS' && (
            <CustomButton
              title={outcome === 'FAILED' ? t('RETRY') : t('AUTHENTICATE')}
              onPress={handleAuthenticate}
              loading={faceAuthing}
              disabled={!image}
            />
          )}

          {outcome === 'SUCCESS' && (
            <CustomButton
              title={t('FINAL_SUBMIT')}
              onPress={handleFinalSubmit}
              loading={faceAuthing}
              variant="secondary"
            />
          )}

          {!faceAuthing && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{t('CANCEL')}</Text>
            </TouchableOpacity>
          )}
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

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
  name: {
    fontSize: FONT_SIZE.subtitle,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  meta: {marginTop: 2, color: COLORS.textSecondary, fontSize: FONT_SIZE.small},
  metaSmall: {marginTop: 2, color: COLORS.textMuted, fontSize: FONT_SIZE.caption},

  cameraCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cameraFrame: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0F1B2A',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  preview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  faceOutline: {
    width: '60%',
    aspectRatio: 3 / 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    borderStyle: 'dashed',
    marginBottom: SPACING.md,
  },
  cameraText: {
    color: '#fff',
    fontSize: FONT_SIZE.subtitle,
    fontWeight: FONT_WEIGHT.semibold,
  },
  cameraHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZE.small,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  corner: {position: 'absolute', width: 24, height: 24, borderColor: '#fff'},
  tl: {top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6},
  tr: {top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6},
  bl: {bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6},
  br: {bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6},

  pickerRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    width: '100%',
  },
  pickerBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  pickerBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  pickerText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.body,
  },

  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  statusIcon: {fontSize: 22, fontWeight: '700', marginRight: SPACING.sm},
  statusText: {fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.semibold},

  actions: {marginTop: SPACING.sm},
  cancelBtn: {alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.sm},
  cancelText: {color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.semibold},
});

export default FaceAuthenticationScreen;
