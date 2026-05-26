// app/(tabs)/ai.jsx
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getSetting, getScreenshotsByCategory, createStack, addToStack } from '../../services/database';
import { CATEGORIES, CATEGORY_KEYS, colors, spacing, radius, fontSize } from '../../constants/theme';

export default function AIScreen() {
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [counts, setCounts] = useState({});
  const [dismissed, setDismissed] = useState(new Set());
  const [accepted, setAccepted] = useState(new Set());

  useFocusEffect(useCallback(() => {
    async function load() {
      const premium = await getSetting('isPremium');
      setIsPremium(premium === 'true');
      const c = {};
      await Promise.all(CATEGORY_KEYS.map(async cat => {
        const shots = await getScreenshotsByCategory(cat);
        c[cat] = shots.length;
      }));
      setCounts(c);
    }
    load();
  }, []));

  async function accept(cat) {
    const shots = await getScreenshotsByCategory(cat);
    if (shots.length === 0) return;
    const stackId = await createStack({ name: CATEGORIES[cat].label, emoji: CATEGORIES[cat].emoji, isAiSuggested: true });
    await Promise.all(shots.map(s => addToStack(stackId, s.id, 'ai')));
    setAccepted(prev => new Set([...prev, cat]));
  }

  const visible = CATEGORY_KEYS.filter(cat => !dismissed.has(cat) && !accepted.has(cat) && (counts[cat] || 0) > 0);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>AI Sort</Text>
        <Text style={s.sub}>Smart groupings for your screenshots</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {!isPremium ? (
          <>
            <TouchableOpacity style={s.upgradeCard} onPress={() => router.push('/paywall')} activeOpacity={0.88}>
              <Text style={s.upgradeEyebrow}>Premium feature</Text>
              <Text style={s.upgradeTitle}>Let AI sort everything for you</Text>
              <Text style={s.upgradeBody}>GrabStack will scan all your screenshots and group them by type automatically. Takes under 10 seconds.</Text>
              <View style={s.upgradeBtn}><Text style={s.upgradeBtnText}>Try free for 7 days</Text></View>
            </TouchableOpacity>
            <View style={s.catList}>
              {CATEGORY_KEYS.map(cat => (
                <View key={cat} style={s.catRow}>
                  <Text style={s.catIcon}>{CATEGORIES[cat].emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.catName}>{CATEGORIES[cat].label}</Text>
                    <Text style={s.catSub}>{counts[cat] || 0} found in your library</Text>
                  </View>
                  <Text style={s.lock}>🔒</Text>
                </View>
              ))}
            </View>
          </>
        ) : visible.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.xxl }}>
            {visible.map(cat => (
              <View key={cat} style={s.suggCard}>
                <View style={s.suggTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{CATEGORIES[cat].emoji}</Text>
                    <View>
                      <Text style={s.suggName}>{CATEGORIES[cat].label}</Text>
                      <Text style={s.suggCt}>{counts[cat]} screenshots</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={s.yesBtn} onPress={() => accept(cat)} activeOpacity={0.8}><Text style={s.yesBtnText}>Accept</Text></TouchableOpacity>
                    <TouchableOpacity style={s.noBtn} onPress={() => setDismissed(prev => new Set([...prev, cat]))} activeOpacity={0.8}><Text style={s.noBtnText}>✕</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.empty}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>✅</Text>
            <Text style={[s.title, { fontSize: 22, marginBottom: 6 }]}>All sorted</Text>
            <Text style={s.sub}>All AI suggestions reviewed.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 34, color: colors.ink, letterSpacing: -0.8 },
  sub:    { fontFamily: 'Geist-Regular', fontSize: fontSize.md, color: colors.ink2, marginTop: 4 },
  upgradeCard: { marginHorizontal: spacing.xxl, marginBottom: 14, backgroundColor: colors.cream2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border2, padding: 22 },
  upgradeEyebrow: { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 },
  upgradeTitle:   { fontFamily: 'InstrumentSerif-Regular', fontSize: 22, color: colors.ink, marginBottom: 6, lineHeight: 28 },
  upgradeBody:    { fontFamily: 'Geist-Regular', fontSize: fontSize.md, color: colors.ink2, lineHeight: 19, marginBottom: 18 },
  upgradeBtn:     { backgroundColor: colors.ink, borderRadius: radius.sm, height: 46, alignItems: 'center', justifyContent: 'center' },
  upgradeBtnText: { fontFamily: 'Geist-Medium', fontSize: 14, color: colors.cream },
  catList: { paddingHorizontal: spacing.xxl },
  catRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border },
  catIcon: { fontSize: 22 },
  catName: { fontFamily: 'Geist-Medium', fontSize: 14, color: colors.ink },
  catSub:  { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink2, marginTop: 1 },
  lock:    { fontSize: 13, color: colors.ink3 },
  suggCard:{ backgroundColor: colors.cream, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 10, padding: 14, shadowColor: '#1A1916', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  suggTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  suggName:{ fontFamily: 'Geist-Medium', fontSize: 15, color: colors.ink },
  suggCt:  { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink2, marginTop: 1 },
  yesBtn:  { backgroundColor: colors.greenBg, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(45,106,79,0.2)', paddingVertical: 7, paddingHorizontal: 16 },
  yesBtnText: { fontFamily: 'Geist-SemiBold', fontSize: 12, color: colors.green },
  noBtn:   { backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 7, paddingHorizontal: 11 },
  noBtnText:  { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2 },
  empty:   { padding: 60, alignItems: 'center' },
});


// ─────────────────────────────────────────────────────────────────────────────
// app/(tabs)/discover.jsx
// ─────────────────────────────────────────────────────────────────────────────
