/**
 * Shared theme tokens. Components consume these instead of hard-coding
 * numbers so spacing / typography stay consistent across screens.
 */

import {fp, hp, wp} from '../utils/responsive';

export const SPACING = {
  xxs: wp(2),
  xs: wp(4),
  sm: wp(8),
  md: wp(12),
  lg: wp(16),
  xl: wp(20),
  xxl: wp(28),
  xxxl: wp(40),
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const FONT_SIZE = {
  caption: fp(11),
  small: fp(12),
  body: fp(14),
  subtitle: fp(15),
  title: fp(17),
  heading: fp(20),
  display: fp(24),
};

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const SHADOWS = {
  card: {
    shadowColor: '#0B5FA5',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: '#0B5FA5',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  fab: {
    shadowColor: '#0B5FA5',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const HIT_SLOP = {top: 10, bottom: 10, left: 10, right: 10};

export const SIZES = {
  inputHeight: hp(50),
  buttonHeight: hp(50),
  headerHeight: hp(56),
  fab: 56,
};
