/**
 * Themed confirmation modal.
 *
 * A polished replacement for React Native's built-in `Alert.alert(...)`.
 * Renders as a centered card over a dimmed overlay with an icon, title,
 * message, and two buttons. Use the `variant` prop to switch the icon /
 * accent colour between neutral and destructive intents (logout, delete,
 * etc.).
 *
 * Example
 * ────────
 *   const [show, setShow] = useState(false);
 *
 *   <ConfirmModal
 *     visible={show}
 *     variant="danger"
 *     title={t('LOGOUT')}
 *     message={t('LOGOUT_CONFIRM')}
 *     confirmLabel={t('YES')}
 *     cancelLabel={t('NO')}
 *     onCancel={() => setShow(false)}
 *     onConfirm={() => {
 *       setShow(false);
 *       dispatch(logout());
 *     }}
 *   />
 */

import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {COLORS} from '../../constants/colors';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';

const VARIANT_MAP = {
  danger: {
    icon: '\u26A0',
    iconBg: COLORS.errorLight,
    iconColor: COLORS.error,
    confirmBg: COLORS.error,
  },
  info: {
    icon: '\u2139',
    iconBg: COLORS.infoLight,
    iconColor: COLORS.info,
    confirmBg: COLORS.info,
  },
  primary: {
    icon: '\u2714',
    iconBg: COLORS.primaryLight,
    iconColor: COLORS.primary,
    confirmBg: COLORS.primary,
  },
};

const ConfirmModal = ({
  visible,
  variant = 'primary',
  icon,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  dismissible = true,
}) => {
  const palette = VARIANT_MAP[variant] || VARIANT_MAP.primary;
  const displayIcon = icon || palette.icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissible ? onCancel : undefined}
      statusBarTranslucent>
      <Pressable
        style={styles.overlay}
        onPress={dismissible ? onCancel : undefined}>
        <Pressable style={[styles.card, SHADOWS.card]} onPress={() => {}}>
          <View style={[styles.iconWrap, {backgroundColor: palette.iconBg}]}>
            <Text style={[styles.iconText, {color: palette.iconColor}]}>
              {displayIcon}
            </Text>
          </View>

          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              disabled={loading}
              onPress={onCancel}
              style={({pressed}) => [
                styles.btn,
                styles.btnGhost,
                pressed && styles.btnPressed,
              ]}>
              <Text style={styles.btnGhostText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={onConfirm}
              style={({pressed}) => [
                styles.btn,
                {backgroundColor: palette.confirmBg},
                pressed && styles.btnPressed,
                loading && styles.btnDisabled,
              ]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  iconText: {
    fontSize: 34,
    fontWeight: FONT_WEIGHT.bold,
  },
  title: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  message: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderColor: COLORS.border,
  },
  btnGhostText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.subtitle,
    fontWeight: FONT_WEIGHT.semibold,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: FONT_SIZE.subtitle,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.3,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{scale: 0.98}],
  },
  btnDisabled: {
    opacity: 0.7,
  },
});

export default ConfirmModal;
