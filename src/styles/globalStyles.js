/**
 * Reusable atomic style fragments shared across screens.
 */

import {StyleSheet} from 'react-native';

import {COLORS} from '../constants/colors';
import {SPACING, RADIUS, SHADOWS, FONT_SIZE, FONT_WEIGHT} from './theme';

export const globalStyles = StyleSheet.create({
  flex: {flex: 1},
  row: {flexDirection: 'row', alignItems: 'center'},
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {alignItems: 'center', justifyContent: 'center'},
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    width: '100%',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  hint: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textSecondary,
  },
});
