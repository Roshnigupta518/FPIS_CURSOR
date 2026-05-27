/**
 * Empty-state component for lists. Shows an icon glyph, a title and
 * an optional description + CTA button.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {COLORS} from '../../constants/colors';
import {FONT_SIZE, FONT_WEIGHT, SPACING} from '../../styles/theme';
import CustomButton from '../CustomButton';

const EmptyItem = ({
  icon = '\uD83D\uDCC4',
  title = 'No data',
  description,
  actionLabel,
  onActionPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onActionPress ? (
        <View style={styles.button}>
          <CustomButton
            title={actionLabel}
            onPress={onActionPress}
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  icon: {fontSize: 38},
  title: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  description: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {marginTop: SPACING.lg},
});

export default EmptyItem;
