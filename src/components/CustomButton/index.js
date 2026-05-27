/**
 * Themed button with primary / secondary / outline / ghost variants
 * and a built-in loading state.
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {COLORS} from '../../constants/colors';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SIZES,
  SPACING,
} from '../../styles/theme';

const CustomButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  size = 'md',
}) => {
  const isDisabled = disabled || loading;

  const palette = getPalette(variant, isDisabled);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          height: size === 'sm' ? 40 : SIZES.buttonHeight,
          paddingHorizontal: size === 'sm' ? SPACING.md : SPACING.lg,
        },
        variant === 'primary' && !isDisabled && SHADOWS.button,
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.inner}>
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          <Text
            numberOfLines={1}
            style={[
              styles.text,
              {color: palette.fg, fontSize: size === 'sm' ? FONT_SIZE.body : FONT_SIZE.subtitle},
              textStyle,
            ]}>
            {title}
          </Text>
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const getPalette = (variant, disabled) => {
  if (disabled) {
    return {
      bg: COLORS.disabled,
      fg: COLORS.disabledText,
      border: COLORS.disabled,
    };
  }
  switch (variant) {
    case 'secondary':
      return {bg: COLORS.accent, fg: '#fff', border: COLORS.accent};
    case 'outline':
      return {bg: 'transparent', fg: COLORS.primary, border: COLORS.primary};
    case 'ghost':
      return {bg: 'transparent', fg: COLORS.primary, border: 'transparent'};
    case 'danger':
      return {bg: COLORS.error, fg: '#fff', border: COLORS.error};
    case 'primary':
    default:
      return {bg: COLORS.primary, fg: '#fff', border: COLORS.primary};
  }
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {alignSelf: 'stretch'},
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.2,
  },
  iconLeft: {marginRight: SPACING.sm},
  iconRight: {marginLeft: SPACING.sm},
});

export default CustomButton;
