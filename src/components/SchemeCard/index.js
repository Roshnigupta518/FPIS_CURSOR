/**
 * Selectable scheme card used on the Scheme Selection screen.
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

const SCHEME_ACCENT = {
  MALE_STERILIZATION: '#1976D2',
  FEMALE_STERILIZATION: '#C2185B',
  ANTARA_INJECTION: '#7B1FA2',
  PPIUCD: '#0097A7',
  COMPENSATION: '#0B5FA5',
};

const SchemeCard = ({scheme, selected, onPress}) => {
  const {i18n} = useTranslation();
  const isHi = i18n.language === 'hi';
  const accent = SCHEME_ACCENT[scheme.id] || COLORS.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress?.(scheme)}
      style={[styles.card, SHADOWS.card, selected && {borderColor: accent}]}>
      <View style={[styles.accentBar, {backgroundColor: accent}]} />
      <View style={styles.body}>
        <Text style={styles.code}>{scheme.code}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {isHi ? scheme.nameHi : scheme.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {isHi ? scheme.descriptionHi : scheme.description}
        </Text>
      </View>

      <View
        style={[
          styles.check,
          selected && {borderColor: accent, backgroundColor: accent},
        ]}>
        {selected ? <Text style={styles.checkMark}>{'\u2713'}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    paddingLeft: 0,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  accentBar: {
    width: 6,
    marginRight: SPACING.md,
    borderTopLeftRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.lg,
  },
  body: {flex: 1, paddingVertical: 4},
  code: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 1,
  },
  title: {
    marginTop: 2,
    fontSize: FONT_SIZE.subtitle,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FONT_SIZE.small,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: SPACING.sm,
  },
  checkMark: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default SchemeCard;
