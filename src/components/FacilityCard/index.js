/**
 * Selectable facility card used on the Facility Selection screen.
 */

import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {COLORS} from '../../constants/colors';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';

const FacilityCard = ({facility, selected, onPress, disabled = false}) => {
  const {i18n} = useTranslation();
  const isHi = i18n.language === 'hi';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(facility)}
      disabled={disabled}
      style={[
        styles.card,
        selected && styles.cardSelected,
        SHADOWS.card,
      ]}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconBox,
            selected && {backgroundColor: COLORS.primary},
          ]}>
          <Text
            style={[styles.iconText, selected && {color: COLORS.textOnPrimary}]}>
            {facility.type}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {isHi ? facility.nameHi : facility.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {isHi ? facility.name : facility.nameHi}
          </Text>
        </View>

        <View
          style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  iconText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.body,
    letterSpacing: 0.5,
  },
  content: {flex: 1, paddingRight: SPACING.sm},
  title: {
    fontSize: FONT_SIZE.subtitle,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: FONT_SIZE.small,
    color: COLORS.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {borderColor: COLORS.primary},
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
});

export default FacilityCard;
