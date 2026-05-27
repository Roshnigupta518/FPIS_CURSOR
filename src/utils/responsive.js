/**
 * Responsive scaling helpers.
 *
 * Design baseline: 375 x 812 (iPhone 11 Pro). All UI sizes are scaled
 * relative to this baseline so the layout looks consistent on small
 * phones, large phones and tablets.
 */

import {Dimensions, PixelRatio} from 'react-native';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const widthRatio = SCREEN_WIDTH / BASE_WIDTH;
const heightRatio = SCREEN_HEIGHT / BASE_HEIGHT;

/** Scale a horizontal size proportionally to screen width. */
export const wp = size => PixelRatio.roundToNearestPixel(size * widthRatio);

/** Scale a vertical size proportionally to screen height. */
export const hp = size => PixelRatio.roundToNearestPixel(size * heightRatio);

/**
 * Moderately scale a font size. Pure widthRatio scaling produces huge
 * text on tablets, so we apply a 0.5 factor by default.
 */
export const fp = (size, factor = 0.5) => {
  const newSize = size + (size * widthRatio - size) * factor;
  return PixelRatio.roundToNearestPixel(newSize);
};

export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: SCREEN_WIDTH < 360,
  isTablet: SCREEN_WIDTH >= 600,
};
