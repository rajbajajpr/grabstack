// app/onboarding.jsx
// First screen the user sees. Privacy-first messaging, no account required.

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { setSetting } from '../services/database';
import { colors, fontSize, spacing, radius } from '../constants/theme';

const POINTS = [
  { title: 'Tidy stacks.', body: 'Group by anything — shopping, recipes, bookings, ideas.' },
  { title: 'Share stacks.', body: 'Send a link to anyone. No app needed to view.' },
  { title: 'Collaborate.', body: 'Build stacks together with friends or your partner.' },
  { title: 'AI sorting.', body: 'Group everything automatically in seconds.' },
];

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAllow() {
    setLoading(true);
    try {
      await setSetting('onboardingComplete', 'true');
      await setSetting('isPremium', 'false');
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function handleSkip() {
    try {
      await setSetting('onboardingComplete', 'true');
      await setSetting('isPremium', 'false');
      router.replace('/(tabs)');
    } catch (e) {
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Wordmark */}
        <View style={styles.lockup}>
          <Text style={styles.wordmark}>
            Grab<Text style={styles.wordmarkItalic}>Stack</Text>
          </Text>
          <Text style={styles.tagline}>
            Your screenshots, finally organised and shareable.
          </Text>
        </View>

        {/* Points */}
        <View style={styles.points}>
          {POINTS.map((p, i) => (
            <View key={i} style={styles.point}>
              <View style={styles.dot} />
              <Text style={styles.pointText}>
                <Text style={styles.pointBold}>{p.title}</Text>
                {'  ' + p.body}
              </Text>
            </View>
          ))}
        </View>

        {/* Privacy box */}
        <View style={styles.privacyBox}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            Your screenshots stay on your device. No account required. No cloud uploads. No tracking.
          </Text>
        </View>
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnMain}
          onPress={handleAllow}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading
            ? <ActivityIndicator color={colors.cream} />
            : <Text style={styles.btnMainText}>Allow access to screenshots</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.btnGhostText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  body: {
    padding: spacing.xxxl,
    paddingTop: spacing.xxxl + 16,
    gap: spacing.xxxl,
  },
  lockup: {
    gap: spacing.md,
  },
  wordmark: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 52,
    color: colors.ink,
    lineHeight: 56,
    letterSpacing: -1,
  },
  wordmarkItalic: {
    fontFamily: 'InstrumentSerif-Italic',
    color: colors.gold,
  },
  tagline: {
    fontFamily: 'Geist-Regular',
    fontSize: fontSize.lg,
    color: colors.ink2,
    lineHeight: 24,
    maxWidth: 280,
  },
  points: {
    gap: spacing.lg,
  },
  point: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
    marginTop: 8,
    flexShrink: 0,
  },
  pointText: {
    fontFamily: 'Geist-Regular',
    fontSize: fontSize.lg,
    color: colors.ink2,
    lineHeight: 23,
    flex: 1,
  },
  pointBold: {
    fontFamily: 'Geist-Medium',
    color: colors.ink,
  },
  privacyBox: {
    backgroundColor: colors.cream2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  privacyIcon: {
    fontSize: 16,
    flexShrink: 0,
  },
  privacyText: {
    fontFamily: 'Geist-Regular',
    fontSize: fontSize.sm,
    color: colors.ink2,
    lineHeight: 19,
    flex: 1,
  },
  footer: {
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: 10,
  },
  btnMain: {
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMainText: {
    fontFamily: 'Geist-Medium',
    fontSize: fontSize.xl,
    color: colors.cream,
    letterSpacing: -0.2,
  },
  btnGhost: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    fontFamily: 'Geist-Regular',
    fontSize: fontSize.lg,
    color: colors.ink2,
  },
});
