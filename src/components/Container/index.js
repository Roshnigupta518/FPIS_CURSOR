/**
 * Screen container. Wraps every screen in a SafeAreaView + scroll or
 * plain view, with consistent background and optional padding.
 */

import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS} from '../../constants/colors';
import {SPACING} from '../../styles/theme';

const Container = ({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'left', 'right'],
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  backgroundColor = COLORS.background,
}) => {
  const innerStyle = [
    padded && styles.padded,
    contentContainerStyle,
  ];

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, {backgroundColor}, style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={innerStyle}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padded && styles.padded, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  flex: {flex: 1},
  padded: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
});

export default Container;
