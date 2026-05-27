/**
 * App header used on every authenticated screen.
 * Optional back button on the left and an arbitrary right slot.
 */

import React from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS} from '../../constants/colors';
import {FONT_SIZE, FONT_WEIGHT, HIT_SLOP, SPACING} from '../../styles/theme';

const ChevronLeft = () => (
  <Text style={styles.icon}>{'\u2039'}</Text>
);

const CustomHeader = ({
  title,
  subtitle,
  onBack,
  rightComponent,
  variant = 'primary',
}) => {
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? COLORS.primary : COLORS.surface;
  const fg = isPrimary ? COLORS.textOnPrimary : COLORS.textPrimary;

  return (
    <SafeAreaView edges={['top']} style={{backgroundColor: bg}}>
      <StatusBar
        barStyle={isPrimary ? 'light-content' : 'dark-content'}
        backgroundColor={bg}
      />
      <View style={[styles.container, {backgroundColor: bg}]}>
        <View style={styles.side}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={HIT_SLOP}
              style={styles.backBtn}>
              <Text style={[styles.icon, {color: fg}]}>{'\u2039'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.center}>
          <Text numberOfLines={1} style={[styles.title, {color: fg}]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[
                styles.subtitle,
                {color: isPrimary ? COLORS.primaryLight : COLORS.textSecondary},
              ]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={[styles.side, styles.sideRight]}>
          {rightComponent || null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Platform.select({ios: 50, android: 56}),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  side: {
    width: 56,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  sideRight: {alignItems: 'flex-end'},
  backBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
  },
  icon: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.textOnPrimary,
    marginTop: -4,
  },
  center: {flex: 1, alignItems: 'center'},
  title: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
  },
  subtitle: {
    fontSize: FONT_SIZE.caption,
    marginTop: 2,
  },
});

export default CustomHeader;
