// app/paywall.jsx
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { setUserTier } from '../services/database';
import { colors, radius } from '../constants/theme';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: null,
    color: colors.cream2,
    borderColor: colors.border,
    features: [
      '100 screenshots',
      'Unlimited stacks',
      '3 AI analyses',
      'Stack sharing',
    ],
    cta: 'Current plan',
    disabled: true,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '£1.99',
    period: '/month',
    annual: '£9.99/year',
    color: '#EEF4FF',
    borderColor: '#2563EB',
    accent: '#2563EB',
    features: [
      'Unlimited screenshots',
      'Unlimited stacks',
      '30 AI analyses/month',
      'Stack sharing',
      'Filter by date',
    ],
    cta: 'Start Starter',
    badge: 'Most popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '£4.99',
    period: '/month',
    annual: '£29.99/year',
    color: '#1A1916',
    borderColor: '#1A1916',
    accent: colors.gold,
    dark: true,
    features: [
      'Everything in Starter',
      'Unlimited AI analyses',
      'AI analyses all at once',
      'Priority processing',
      'Early access to features',
    ],
    cta: 'Go Pro',
    badge: 'Best value',
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams();
  const [purchasing, setPurchasing] = useState(null);

  async function handleUpgrade(tier) {
    if (tier.disabled) return;
    setPurchasing(tier.id);

    // TODO: wire up real in-app purchase (RevenueCat)
    // For now, simulate upgrade
    Alert.alert(
      `Upgrade to ${tier.name}`,
      `In-app purchases coming soon. For now, tapping OK will activate ${tier.name} for testing.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setPurchasing(null) },
        {
          text: 'Activate (test)',
          onPress: async () => {
            await setUserTier(tier.id);
            setPurchasing(null);
            router.back();
          },
        },
      ]
    );
  }

  const reasonText = {
    screenshots: 'Upgrade to see all your screenshots',
    ai: "You've used your 3 free AI analyses",
    ai_starter: "You've reached your monthly AI limit",
  }[reason] || 'Upgrade GrabStack';

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.header}>
          <Text style={s.title}>GrabStack</Text>
          <Text style={s.subtitle}>{reasonText}</Text>
        </View>

        {TIERS.map(tier => (
          <View
            key={tier.id}
            style={[s.card, { backgroundColor: tier.color, borderColor: tier.borderColor }]}
          >
            {tier.badge && (
              <View style={[s.badge, { backgroundColor: tier.dark ? colors.gold : tier.accent }]}>
                <Text style={s.badgeText}>{tier.badge}</Text>
              </View>
            )}

            <View style={s.cardHeader}>
              <Text style={[s.tierName, tier.dark && { color: '#fff' }]}>{tier.name}</Text>
              {tier.price ? (
                <View style={s.priceRow}>
                  <Text style={[s.price, { color: tier.dark ? colors.gold : tier.accent }]}>{tier.price}</Text>
                  <Text style={[s.period, tier.dark && { color: 'rgba(255,255,255,0.5)' }]}>{tier.period}</Text>
                </View>
              ) : (
                <Text style={s.freeLabel}>Free forever</Text>
              )}
              {tier.annual && (
                <Text style={[s.annual, { color: tier.dark ? 'rgba(255,255,255,0.5)' : colors.ink3 }]}>or {tier.annual}</Text>
              )}
            </View>

            <View style={s.featureList}>
              {tier.features.map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <Text style={[s.featureTick, { color: tier.dark ? colors.gold : tier.accent || colors.green }]}>✓</Text>
                  <Text style={[s.featureText, tier.dark && { color: 'rgba(255,255,255,0.85)' }]}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                s.ctaBtn,
                tier.disabled && s.ctaBtnDisabled,
                !tier.disabled && !tier.dark && { backgroundColor: tier.accent || colors.ink },
                tier.dark && { backgroundColor: colors.gold },
                purchasing === tier.id && { opacity: 0.7 },
              ]}
              onPress={() => handleUpgrade(tier)}
              disabled={tier.disabled || purchasing !== null}
              activeOpacity={0.88}
            >
              <Text style={[s.ctaBtnText, tier.disabled && { color: colors.ink3 }]}>
                {tier.cta}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={s.footer}>
          Subscriptions auto-renew. Cancel anytime in your App Store settings.{'\n'}
          AI analyses reset monthly.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.cream },
  nav:      { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4, alignItems: 'flex-end' },
  close:    { fontFamily: 'Geist-Regular', fontSize: 20, color: colors.ink2, padding: 4 },
  header:   { paddingHorizontal: 24, paddingBottom: 20 },
  title:    { fontFamily: 'InstrumentSerif-Regular', fontSize: 36, color: colors.ink, letterSpacing: -1, marginBottom: 6 },
  subtitle: { fontFamily: 'Geist-Regular', fontSize: 16, color: colors.ink2, lineHeight: 22 },
  card:     { marginHorizontal: 24, marginBottom: 12, borderRadius: radius.lg, borderWidth: 1.5, padding: 20, position: 'relative', overflow: 'hidden' },
  badge:    { position: 'absolute', top: 16, right: 16, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText:{ fontFamily: 'Geist-SemiBold', fontSize: 11, color: '#fff' },
  cardHeader:{ marginBottom: 16 },
  tierName: { fontFamily: 'Geist-SemiBold', fontSize: 13, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  price:    { fontFamily: 'InstrumentSerif-Regular', fontSize: 36, letterSpacing: -1 },
  period:   { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink3 },
  freeLabel:{ fontFamily: 'InstrumentSerif-Regular', fontSize: 28, color: colors.ink },
  annual:   { fontFamily: 'Geist-Regular', fontSize: 12, marginTop: 2 },
  featureList: { gap: 8, marginBottom: 20 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureTick: { fontFamily: 'Geist-SemiBold', fontSize: 14, width: 16 },
  featureText: { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, flex: 1 },
  ctaBtn:        { backgroundColor: colors.ink, borderRadius: radius.sm, height: 48, alignItems: 'center', justifyContent: 'center' },
  ctaBtnDisabled:{ backgroundColor: colors.cream3, borderRadius: radius.sm },
  ctaBtnText:    { fontFamily: 'Geist-Medium', fontSize: 15, color: '#fff' },
  footer: { fontFamily: 'Geist-Regular', fontSize: 11, color: colors.ink3, textAlign: 'center', lineHeight: 17, paddingHorizontal: 32, marginTop: 8 },
});
