/**
 * Security Blocked Screen
 * Compliance with Aadhaar Face Authentication Audit Checklist v2.0 (Control #3: Jailbreak and Root Detection)
 */

import React from 'react';
import {
  BackHandler,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {COLORS, IMAGES} from '../constants/colors';
import {FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, SPACING} from '../styles/theme';

const SecurityBlockedScreen = () => {
  const handleExitApp = () => {
    BackHandler.exitApp();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.error} />
      
      {/* Header Banner */}
      <View style={styles.header}>
        <Image source={IMAGES.logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.headerTitle}>Family Welfare Program</Text>
        <Text style={styles.headerSub}>Ministry of Health & Family Welfare</Text>
      </View>

      {/* Main Alert Card */}
      <View style={styles.content}>
        <View style={styles.card}>
          {/* Security Alert Icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🛡️</Text>
          </View>

          {/* <Text style={styles.alertBadge}>Aadhaar Audit Checklist v2.0 — Control #3</Text> */}
          
          <Text style={styles.title}>Security Access Denied</Text>
          <Text style={styles.titleHindi}>सुरक्षा एक्सेस अस्वीकृत</Text>

          <View style={styles.divider} />

          <Text style={styles.message}>
            This application has detected that your device is <Text style={styles.highlight}>rooted</Text> or <Text style={styles.highlight}>jailbroken</Text>.
          </Text>

          <Text style={styles.subMessage}>
            In compliance with security controls mandated by UIDAI for Aadhaar Face Authentication onboarding (Control #3), access is strictly restricted on modified operating systems to safeguard beneficiary data.
          </Text>

          <Text style={styles.hindiInstruction}>
            सुरक्षा नीतियों के अनुसार इस ऐप को केवल गैर-रूटेड (Non-Rooted) और मूल ऑपरेटिंग सिस्टम वाले डिवाइस पर ही चलाया जा सकता है।
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.exitButton}
            onPress={handleExitApp}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Exit Application">
            <Text style={styles.exitButtonText}>Exit Application / ऐप बंद करें</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <Text style={styles.footerText}>
          Government of India • National Health Mission
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.error,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    color: COLORS.surface,
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.bold,
  },
  headerSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FONT_SIZE.small,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.errorLight,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconText: {
    fontSize: 36,
  },
  alertBadge: {
    backgroundColor: COLORS.errorLight,
    color: COLORS.error,
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xxs,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  title: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
    textAlign: 'center',
  },
  titleHindi: {
    fontSize: FONT_SIZE.subtitle,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: '100%',
    marginVertical: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
  },
  subMessage: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  hindiInstruction: {
    fontSize: FONT_SIZE.small,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  exitButton: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.button,
  },
  exitButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
  },
  footerText: {
    marginTop: SPACING.xl,
    fontSize: FONT_SIZE.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default SecurityBlockedScreen;
