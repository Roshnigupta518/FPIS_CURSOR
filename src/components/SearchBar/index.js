/**
 * Search bar used on Facility Selection and Beneficiary List screens.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {COLORS} from '../../constants/colors';
import {FONT_SIZE, RADIUS, SIZES, SPACING} from '../../styles/theme';

const SearchBar = ({value, onChangeText, placeholder = 'Search...'}) => {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{'\uD83D\uDD0D'}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.placeholder}
        style={styles.input}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText?.('')} style={styles.clear}>
          <Text style={styles.clearText}>{'\u2715'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    height: SIZES.inputHeight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {fontSize: 16, marginRight: SPACING.sm, color: COLORS.textMuted},
  input: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  clear: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
  },
  clearText: {color: COLORS.textMuted, fontSize: 14},
});

export default SearchBar;
