/**
 * Global toast/snackbar.
 *
 * Mounted once at the root of App.js. Anywhere in the app you can call:
 *
 *   import {showToast} from 'src/components/Toast';
 *   showToast({type: 'success', message: 'Saved!'});
 *
 * Plays well outside React because the toast subscribes to a small
 * module-level event emitter.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS} from '../../constants/colors';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../styles/theme';

const PALETTE = {
  success: {bg: COLORS.success, fg: '#fff', icon: '\u2713'},
  error:   {bg: COLORS.error,   fg: '#fff', icon: '\u2715'},
  info:    {bg: COLORS.info,    fg: '#fff', icon: 'i'},
  warning: {bg: COLORS.warning, fg: '#fff', icon: '!'},
};

/* -------------------------------------------------------------------------- */
/*  module-level emitter                                                       */
/* -------------------------------------------------------------------------- */

let listener = null;

export const showToast = ({type = 'info', message, duration = 2800}) => {
  if (listener) listener({type, message, duration});
};

/* -------------------------------------------------------------------------- */
/*  component                                                                  */
/* -------------------------------------------------------------------------- */

const Toast = () => {
  const [toast, setToast] = useState(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  useEffect(() => {
    listener = next => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(next);
    };
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    translateY.setValue(-100);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(hide, toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [toast, hide, opacity, translateY]);

  if (!toast) return null;

  const palette = PALETTE[toast.type] || PALETTE.info;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safe}>
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.toast,
          SHADOWS.card,
          {
            backgroundColor: palette.bg,
            transform: [{translateY}],
            opacity,
          },
        ]}>
        <View style={styles.iconCircle}>
          <Text style={[styles.icon, {color: palette.bg}]}>{palette.icon}</Text>
        </View>
        <Text style={[styles.text, {color: palette.fg}]} numberOfLines={3}>
          {toast.message}
        </Text>
        <TouchableOpacity onPress={hide} style={styles.close} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={[styles.closeText, {color: palette.fg}]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '70%',
    maxWidth: '92%',
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  icon: {fontSize: 14, fontWeight: '700'},
  text: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
  },
  close: {paddingHorizontal: SPACING.xs, paddingVertical: 2, marginLeft: SPACING.sm},
  closeText: {fontSize: 14, fontWeight: '700'},
});

export default Toast;
