/**
 * Reusable input component with:
 *  - floating label
 *  - inline error message
 *  - red border on invalid state
 *  - left/right adornment slots
 *  - secureTextEntry toggle for password fields
 *
 * The component is fully controlled (value + onChangeText), which keeps
 * validation logic centralized in the parent screen.
 */

import React, {memo, useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {COLORS} from '../../constants/colors';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SIZES,
  SPACING,
} from '../../styles/theme';

const MyInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required,
  keyboardType = 'default',
  secureTextEntry = false,
  maxLength,
  multiline = false,
  readOnly = false,
  leftIcon,
  rightIcon,
  onBlur,
  onFocus,
  autoCapitalize = 'sentences',
  autoCorrect = false,
  contextMenuHidden = false,
  style,
  inputStyle,
  testID,
}) => {
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(secureTextEntry);

  const hasError = Boolean(error);

  const handleFocus = e => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = e => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          multiline && styles.multiline,
          {
            borderColor: hasError
              ? COLORS.borderError
              : focused
              ? COLORS.borderFocus
              : COLORS.border,
            backgroundColor: readOnly ? COLORS.background : COLORS.surface,
          },
        ]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          testID={testID}
          value={value !== undefined && value !== null ? String(value) : ''}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          keyboardType={keyboardType}
          secureTextEntry={secure}
          maxLength={maxLength}
          multiline={multiline}
          editable={!readOnly}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          contextMenuHidden={contextMenuHidden}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            inputStyle,
            readOnly && styles.readOnly,
          ]}
        />

        {secureTextEntry ? (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setSecure(s => !s)}>
            <Text style={styles.toggleText}>{secure ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </View>

      {hasError ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  required: {color: COLORS.error},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: SIZES.inputHeight,
    borderWidth: 1.2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  multiline: {
    minHeight: 96,
    paddingVertical: SPACING.sm,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readOnly: {color: COLORS.textSecondary},
  leftIcon: {marginRight: SPACING.sm},
  rightIcon: {marginLeft: SPACING.sm},
  toggleText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.small,
  },
  error: {
    color: COLORS.error,
    fontSize: FONT_SIZE.caption,
    marginTop: 4,
    marginLeft: 2,
  },
});

export default memo(MyInput);
