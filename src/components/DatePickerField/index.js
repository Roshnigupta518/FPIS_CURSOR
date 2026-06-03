/**
 * Date picker form field that mirrors the MyInput look-and-feel.
 *
 * Uses react-native-date-picker for the modal picker. The value held in
 * parent state is a JS Date instance; we render a formatted string in
 * the field, and surface an error message in the same style as MyInput.
 */

import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DatePicker from 'react-native-date-picker';

import {COLORS} from '../../constants/colors';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SIZES,
  SPACING,
} from '../../styles/theme';
import {formatDate} from '../../utils/formatters';

const DatePickerField = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  required,
  mode = 'date',
  minimumDate,
  maximumDate,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const hasError = Boolean(error);

  const renderValue = () => {
    if (!value) return placeholder;
    const d = value instanceof Date ? value : new Date(value);
    if (mode === 'time') {
      return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
    return formatDate(d);
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            borderColor: hasError ? COLORS.borderError : COLORS.border,
            backgroundColor: disabled ? COLORS.background : COLORS.surface,
          },
        ]}>
        <Text
          style={[
            styles.text,
            !value && styles.placeholder,
          ]}>
          {renderValue()}
        </Text>
        <Text style={styles.icon}>{'\uD83D\uDCC5'}</Text>
      </TouchableOpacity>

      {hasError ? <Text style={styles.error}>{error}</Text> : null}

      <DatePicker
        modal
        mode={mode}
        open={open}
        date={value instanceof Date ? value : new Date()}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onConfirm={d => {
          setOpen(false);
          onChange?.(d);
        }}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {marginBottom: SPACING.md},
  label: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  required: {color: COLORS.error},
  field: {
    minHeight: SIZES.inputHeight,
    borderWidth: 1.2,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
  },
  placeholder: {color: COLORS.placeholder},
  icon: {fontSize: 18, marginLeft: SPACING.sm},
  error: {
    color: COLORS.error,
    fontSize: FONT_SIZE.caption,
    marginTop: 4,
    marginLeft: 2,
  },
});

export default DatePickerField;
