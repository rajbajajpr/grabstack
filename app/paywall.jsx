// app/paywall.jsx
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { setSetting } from '../services/database';
import { colors, spacing, radius, fontSize } from '../constants/theme';

const FEATURES = [
  { icon: '♾️', name: 'Unlimited screenshots', desc: 'Manage your entire camera roll — not just 100' },
  { icon: '🤖', name: 'AI auto-categorisation', desc: 'Detects shopping, food, tickets, quotes, social posts' },
  { icon: '🔗', name: 'Shareable stack links', desc: 'Anyone can view your stack — no app needed' },
  { icon: '👥', name: 'Collaborative stacks', desc: 'Build stacks together with friends or your partner' },
  { icon: '☁️', name: 'iCloud sync', desc: 'Access your stacks on every device' },
];

export default function Paywall() {
  const router = useRouter();
  const [plan, setPlan] = useState('y');

  async function subscribe() {
    // In production: call RevenueCat here
    await setSetting('isPremium', 'true');
    router.back();
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        </View>
        <View style={s.hero}>
          <Text style={s.eyebrow}>GrabStack Premium</Text>
          <Text style={s.title}>More screenshots.{'\n'}Less chaos.</Text>
          <Text style={s.sub}>Unlimited storage, AI that actually understands what you save, and stacks you can share with anyone.</Text>
        </View>
        <View style={s.feats}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.feat}>
              <Text style={s.featIcon}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.featName}>{f.name}</Text>
                <Text style={s.featDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={s.plans}>
          <TouchableOpacity style={[s.plan, plan === 'm' && s.planOn]} onPress={() => setPlan('m')} activeOpacity={0.8}>
            <Text style={s.planPer}>Monthly</Text>
            <Text style={s.planAmt}>£2.99</Text>
            <Text style={s.planCad}>per month</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.plan, plan === 'y' && s.planOn]} onPress={() => setPlan('y')} activeOpacity={0.8}>
            <Text style={s.planPer}>Annual</Text>
            <Text style={s.planAmt}>£19.99</Text>
            <Text style={s.planCad}>£1.67 / month</Text>
            <Text style={s.planSave}>Save 44%</Text>
          </TouchableOpacity>
        </View>
        <View style={s.cta}>
          <TouchableOpacity style={s.ctaBtn} onPress={subscribe} activeOpacity={0.88}>
            <Text style={s.ctaBtnText}>Start 7-day free trial</Text>
          </TouchableOpacity>
          <Text style={s.restore}>Restore purchase</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.cream },
  nav:     { padding: spacing.xxl },
  back:    { fontFamily: 'Geist-Medium', fontSize: fontSize.lg, color: colors.gold },
  hero:    { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl },
  eyebrow: { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  title:   { fontFamily: 'InstrumentSerif-Regular', fontSize: 34, color: colors.ink, letterSpacing: -0.8, lineHeight: 40, marginBottom: 10 },
  sub:     { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, lineHeight: 21 },
  feats:   { paddingHorizontal: spacing.xxl, marginBottom: 4 },
  feat:    { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border, alignItems: 'flex-start' },
  featIcon:{ fontSize: 20, marginTop: 1 },
  featName:{ fontFamily: 'Geist-Medium', fontSize: 14, color: colors.ink },
  featDesc:{ fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink2, marginTop: 2, lineHeight: 17 },
  plans:   { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xxl, marginTop: 20 },
  plan:    { flex: 1, backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, padding: 16, alignItems: 'center' },
  planOn:  { borderColor: colors.ink, backgroundColor: colors.cream },
  planPer: { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink2, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  planAmt: { fontFamily: 'InstrumentSerif-Regular', fontSize: 28, color: colors.ink, letterSpacing: -0.8 },
  planCad: { fontFamily: 'Geist-Regular', fontSize: 11, color: colors.ink3, marginTop: 2 },
  planSave:{ fontFamily: 'Geist-SemiBold', fontSize: 10, color: colors.green, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  cta:     { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  ctaBtn:  { backgroundColor: colors.ink, borderRadius: radius.sm, height: 54, alignItems: 'center', justifyContent: 'center' },
  ctaBtnText: { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.cream, letterSpacing: -0.2 },
  restore: { textAlign: 'center', marginTop: 12, fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink3 },
});
