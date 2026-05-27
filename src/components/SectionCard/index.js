/**
 * Card with an optional title bar used to group content sections on
 * the Beneficiary Details screen.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {COLORS} from '../../constants/colors';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';

export const DetailRow = ({label, value}) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={3}>
      {value || '-'}
    </Text>
  </View>
);

const SectionCard = ({title, icon, children, style}) => {
  return (
    <View style={[styles.card, SHADOWS.card, style]}>
      {title ? (
        <View style={styles.header}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  icon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  body: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  row: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  label: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default SectionCard;
