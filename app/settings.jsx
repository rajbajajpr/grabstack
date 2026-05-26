// app/settings.jsx
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getAiUsage, getAllStacksWithCounts, getSetting } from '../services/database';
import { colors, radius } from '../constants/theme';

const TIER_META = {
  free:    { label: 'Free',    color: colors.cream2,  textColor: colors.ink2,  border: colors.border },
  starter: { label: 'Starter', color: '#EEF4FF',      textColor: '#2563EB',    border: '#2563EB' },
  pro:     { label: 'Pro',     color: colors.ink,     textColor: colors.gold,  border: colors.ink },
};

const LIMITS = { free: 3, starter: 30, pro: Infinity };

export default function SettingsScreen() {
  const router = useRouter();
  const [usage, setUsage] = useState({ count: 0, tier: 'free' });
  const [stackCount, setStackCount] = useState(0);
  const [screenshotCount, setScreenshotCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [u, stacks] = await Promise.all([
          getAiUsage(),
          getAllStacksWithCounts(),
        ]);
        setUsage(u);
        setStackCount(stacks.filter(s => !s.isSystem).length);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  const tier = TIER_META[usage.tier] || TIER_META.free;
  const limit = LIMITS[usage.tier] || 3;
  const used = usage.count;
  const remaining = limit === Infinity ? '∞' : Math.max(0, limit - used);
  const pct = limit === Infinity ? 0 : Math.min(1, used / limit);

  function handleRestore() {
    Alert.alert('Restore purchases', 'This will restore any previous purchases linked to your App Store account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => Alert.alert('Nothing to restore', 'No previous purchases found.') },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Account</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Current plan */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Your plan</Text>
          <View style={[s.tierCard, { backgroundColor: tier.color, borderColor: tier.border }]}>
            <View style={s.tierRow}>
              <View style={[s.tierBadge, { borderColor: tier.border }]}>
                <Text style={[s.tierBadgeText, { color: tier.textColor }]}>{tier.label}</Text>
              </View>
              {usage.tier !== 'pro' && (
                <TouchableOpacity
                  style={s.upgradeBtn}
                  onPress={() => router.push('/paywall')}
                  activeOpacity={0.88}
                >
                  <Text style={s.upgradeBtnText}>Upgrade →</Text>
                </TouchableOpacity>
              )}
            </View>
            {usage.tier === 'pro' && (
              <Text style={[s.tierDesc, { color: 'rgba(255,255,255,0.7)' }]}>
                You have unlimited access to all features.
              </Text>
            )}
            {usage.tier === 'starter' && (
              <Text style={[s.tierDesc, { color: '#2563EB' }]}>
                30 AI analyses per month · Unlimited screenshots
              </Text>
            )}
            {usage.tier === 'free' && (
              <Text style={s.tierDesc}>
                100 screenshots · 3 AI analyses · Manual stacking
              </Text>
            )}
          </View>
        </View>

        {/* AI Usage */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>AI Sort usage</Text>
          <View style={s.statCard}>
            <View style={s.statRow}>
              <Text style={s.statLabel}>Analyses used</Text>
              <Text style={s.statValue}>
                {used} / {limit === Infinity ? 'Unlimited' : limit}
              </Text>
            </View>
            {limit !== Infinity && (
              <>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${pct * 100}%`, backgroundColor: pct > 0.8 ? colors.red : colors.gold }]} />
                </View>
                <Text style={s.statHint}>
                  {remaining === 0
                    ? 'No analyses remaining — upgrade for more'
                    : `${remaining} analysis${remaining !== 1 ? 'es' : ''} remaining`}
                </Text>
              </>
            )}
            {usage.tier !== 'free' && (
              <Text style={s.statHint}>Resets monthly</Text>
            )}
          </View>
        </View>

        {/* Library stats */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Your library</Text>
          <View style={s.statsGrid}>
            <View style={s.statBox}>
              <Text style={s.statBoxValue}>{stackCount}</Text>
              <Text style={s.statBoxLabel}>Stacks created</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statBoxValue}>{used}</Text>
              <Text style={s.statBoxLabel}>AI analyses run</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Account</Text>
          <View style={s.actionList}>
            <TouchableOpacity style={s.actionRow} onPress={handleRestore} activeOpacity={0.7}>
              <Text style={s.actionText}>Restore purchases</Text>
              <Text style={s.actionArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionRow} onPress={() => router.push('/paywall')} activeOpacity={0.7}>
              <Text style={s.actionText}>View all plans</Text>
              <Text style={s.actionArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>GrabStack · Version 1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.cream },
  nav:     { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back:    { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.gold, width: 60 },
  navTitle:{ fontFamily: 'Geist-Medium', fontSize: 16, color: colors.ink },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionLabel: { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  tierCard: { borderRadius: radius.lg, borderWidth: 1.5, padding: 18, gap: 10 },
  tierRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierBadge:{ borderRadius: radius.pill, borderWidth: 1.5, paddingVertical: 4, paddingHorizontal: 14 },
  tierBadgeText: { fontFamily: 'Geist-SemiBold', fontSize: 14 },
  upgradeBtn:    { backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 18 },
  upgradeBtnText:{ fontFamily: 'Geist-SemiBold', fontSize: 13, color: '#fff' },
  tierDesc: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2, lineHeight: 18 },
  statCard: { backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  statRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel:{ fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2 },
  statValue:{ fontFamily: 'Geist-SemiBold', fontSize: 14, color: colors.ink },
  progressTrack: { height: 6, backgroundColor: colors.cream3, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  statHint: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3 },
  statsGrid:{ flexDirection: 'row', gap: 10 },
  statBox:  { flex: 1, backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center', gap: 4 },
  statBoxValue:{ fontFamily: 'InstrumentSerif-Regular', fontSize: 32, color: colors.ink },
  statBoxLabel:{ fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, textAlign: 'center' },
  actionList: { backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  actionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: colors.border },
  actionText: { fontFamily: 'Geist-Regular', fontSize: 15, color: colors.ink },
  actionArrow:{ fontFamily: 'Geist-Regular', fontSize: 16, color: colors.ink3 },
  footer:   { paddingHorizontal: 24, alignItems: 'center', gap: 4, marginTop: 8 },
  footerText:{ fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3 },
});
