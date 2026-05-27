/**
 * Colored pill for beneficiary status. Color + label are sourced from
 * STATUS_META in constants/schemes.js so they stay in sync everywhere.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {STATUS_META, BENEFICIARY_STATUS} from '../../constants/schemes';
import {FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING} from '../../styles/theme';

const STATUS_TO_TKEY = {
  [BENEFICIARY_STATUS.PENDING_AUTH]: 'STATUS_PENDING_AUTH',
  [BENEFICIARY_STATUS.AUTH_SUCCESS]: 'STATUS_AUTH_SUCCESS',
  [BENEFICIARY_STATUS.AUTH_FAILED]: 'STATUS_AUTH_FAILED',
  [BENEFICIARY_STATUS.SUBMITTED]: 'STATUS_SUBMITTED',
};

const StatusBadge = ({status, size = 'sm'}) => {
  const {t} = useTranslation();
  const meta = STATUS_META[status];
  if (!meta) return null;

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: meta.bg},
        size === 'md' && styles.badgeMd,
      ]}>
      <View style={[styles.dot, {backgroundColor: meta.color}]} />
      <Text
        style={[
          styles.text,
          {color: meta.color, fontSize: size === 'md' ? FONT_SIZE.body : FONT_SIZE.caption},
        ]}>
        {t(STATUS_TO_TKEY[status])}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  badgeMd: {paddingHorizontal: SPACING.md, paddingVertical: 6},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {fontWeight: FONT_WEIGHT.semibold},
});

export default StatusBadge;
