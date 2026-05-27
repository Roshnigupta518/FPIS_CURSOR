/**
 * Two flavours of loader:
 *  - inline (default)  - small spinner that slots into any layout
 *  - overlay          - full-screen translucent overlay with spinner
 */

import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {COLORS} from '../../constants/colors';
import {FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING} from '../../styles/theme';

const Loader = ({
  visible = true,
  overlay = false,
  text,
  color = COLORS.primary,
  size = 'large',
}) => {
  if (!visible) return null;

  if (overlay) {
    return (
      <Modal transparent animationType="fade" visible={visible}>
        <View style={styles.overlay}>
          <View style={styles.box}>
            <ActivityIndicator size={size} color={color} />
            {text ? <Text style={styles.text}>{text}</Text> : null}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.inline}>
      <ActivityIndicator size={size} color={color} />
      {text ? <Text style={[styles.text, {color: COLORS.textSecondary}]}>{text}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inline: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    minWidth: 140,
  },
  text: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default Loader;
