/**
 * Card rendered by FlatList on the Beneficiary List screen.
 */

import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {COLORS} from '../../constants/colors';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';
import {formatDate} from '../../utils/formatters';
import StatusBadge from '../StatusBadge';

const initialsOf = name => {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
};

const BeneficiaryCard = ({item, onPress}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(item)}
      style={[styles.card, SHADOWS.card]}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(item.beneficiaryName)}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.beneficiaryName}
            </Text>
            {/* <StatusBadge status={item.status} /> */}
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {item.schemeName}
          </Text>
          <Text style={styles.metaSmall} numberOfLines={1}>
            {item.facilityName}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>ID: {item.id}</Text>
            <Text style={styles.footerText}>
              {formatDate(item.createdAt || item.procedureDate)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  row: {flexDirection: 'row'},
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.subtitle,
  },
  content: {flex: 1},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: FONT_SIZE.subtitle,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  meta: {
    marginTop: 4,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.body,
  },
  metaSmall: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.small,
  },
  footer: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.caption,
  },
});

export default BeneficiaryCard;
