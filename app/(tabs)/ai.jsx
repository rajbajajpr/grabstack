// app/(tabs)/ai.jsx
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  getAllStacksWithCounts, getStackItems, createStack,
  addToStack, upsertScreenshot, getAiUsage, incrementAiUsage,
} from '../../services/database';
import { storeShot } from '../../services/shotCache';
import { colors, radius } from '../../constants/theme';

const BATCH_BY_TIER = { free: 3, starter: 10, pro: 20 };
// API key lives here — never exposed to users
const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.EXPO_PUBLIC_ANTHROPIC_KEY || '';

async function uriToBase64(uri) {
  try {
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 768 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    const b64 = await FileSystem.readAsStringAsync(resized.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return b64;
  } catch (e) {
    console.error('base64 error:', e);
    return null;
  }
}

async function analyseScreenshots(shots, existingStacks) {
  const stackNames = existingStacks.map(s => `${s.emoji} ${s.name}`).join(', ');
  const imageBlocks = [];
  for (let i = 0; i < shots.length; i++) {
    const b64 = await uriToBase64(shots[i].uri);
    if (!b64) continue;
    imageBlocks.push({ type: 'text', text: `Screenshot ${i + 1}:` });
    imageBlocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
  }

  const prompt = `You are categorising ${shots.length} screenshots for a mobile app called GrabStack.
The user already has these stacks: ${stackNames || 'none yet'}.
Look at each screenshot and assign it to the best matching existing stack, OR suggest a new stack name if none fit.
Return ONLY a JSON array (no markdown, no explanation):
[{"index": 1, "stack": "Recipes to try", "emoji": "🍳", "isNew": false}]
Rules: match existing stacks when possible, suggest new only when needed, short names (2-4 words), relevant emoji, every screenshot gets a category.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: prompt }] }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `API error ${response.status}`);
  const text = data.content?.[0]?.text || '[]';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

const LIMITS = { free: 3, starter: 30, pro: Infinity };

export default function AiSortScreen() {
  const router = useRouter();
  const [unsorted, setUnsorted] = useState([]); // all available (up to 20)
  const [selected, setSelected] = useState(new Set()); // user-picked shots
  const [stacks, setStacks] = useState([]);
  const [analysing, setAnalysing] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState('');
  const [accepted, setAccepted] = useState(new Set());
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ count: 0, tier: 'free' });

  useFocusEffect(useCallback(() => {
    async function load() {
      setLoading(true);
      try {
        const [u, allStacks] = await Promise.all([getAiUsage(), getAllStacksWithCounts()]);
        setUsage(u);
        setStacks(allStacks.filter(s => !s.isSystem));

        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        if (status !== 'granted') { setLoading(false); return; }

        const contents = {};
        await Promise.all(allStacks.map(async s => {
          const items = await getStackItems(s.id, { limit: 500 });
          items.forEach(item => { contents['ss-' + item.localIdentifier] = true; });
        }));

        const r = await MediaLibrary.getAssetsAsync({
          mediaType: 'photo', sortBy: [['creationTime', false]], first: 200,
        });
        const batch = BATCH_BY_TIER[u.tier] || 3;
        const shots = r.assets
          .filter(a => !contents['ss-' + a.id])
          .slice(0, 20)
          .map(a => ({
            id: 'ss-' + a.id, localIdentifier: a.id, uri: a.uri,
            capturedAt: a.creationTime < 1e10 ? a.creationTime * 1000 : a.creationTime,
            filename: a.filename,
          }));
        setUnsorted(shots);
        // Auto-select first batch
        setSelected(new Set(shots.slice(0, batch).map(s => s.id)));
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
    setResults(null);
    setAccepted(new Set());
    setDone(false);
  }, []));

  const limit = LIMITS[usage.tier] || 3;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - usage.count);
  const atLimit = remaining === 0;
  const batch = BATCH_BY_TIER[usage.tier] || 3;
  const selectedShots = unsorted.filter(s => selected.has(s.id));

  function toggleShot(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= batch) return prev; // at limit
        next.add(id);
      }
      return next;
    });
  }

  async function runAnalysis() {
    if (atLimit) {
      router.push({ pathname: '/paywall', params: { reason: usage.tier === 'starter' ? 'ai_starter' : 'ai' } });
      return;
    }
    if (selectedShots.length === 0) return;
    setAnalysing(true);
    setResults(null);
    try {
      setProgress(`Resizing ${selectedShots.length} screenshots…`);
      const raw = await analyseScreenshots(selectedShots, stacks);
      setProgress('Grouping results…');
      await incrementAiUsage();
      const u = await getAiUsage();
      setUsage(u);

      const groups = {};
      raw.forEach(item => {
        const shot = selectedShots[item.index - 1];
        if (!shot) return;
        if (!groups[item.stack]) groups[item.stack] = { stack: item.stack, emoji: item.emoji, isNew: item.isNew, shots: [] };
        groups[item.stack].shots.push(shot);
      });

      const groupList = Object.values(groups);
      setResults(groupList);
      setAccepted(new Set(groupList.map(g => g.stack)));
    } catch (e) {
      console.error('Analysis error:', e);
      Alert.alert('Analysis failed', e.message || 'Something went wrong — try again.');
    }
    setAnalysing(false);
    setProgress('');
  }

  async function applyResults() {
    if (!results) return;
    setAnalysing(true);
    try {
      for (const group of results) {
        if (!accepted.has(group.stack)) continue;
        let stackId = stacks.find(s => s.name === group.stack)?.id;
        if (!stackId) stackId = await createStack({ name: group.stack, emoji: group.emoji });
        for (const shot of group.shots) {
          await upsertScreenshot({ id: shot.id, localIdentifier: shot.localIdentifier, capturedAt: shot.capturedAt, filename: shot.filename });
          await addToStack(stackId, shot.id);
        }
      }
      setDone(true);
    } catch (e) { console.error('Apply error:', e); }
    setAnalysing(false);
  }

  function toggleGroup(name) {
    setAccepted(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  if (loading) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.center}><ActivityIndicator color={colors.gold} /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>AI Sort</Text>
        <View style={s.usagePill}>
          <Text style={s.usageText}>
            {usage.tier === 'pro'
              ? '✦ Unlimited'
              : `${remaining === Infinity ? '∞' : remaining} of ${limit} analyses left`
            }
          </Text>
        </View>
      </View>
      <Text style={s.sub}>Let Claude look at your screenshots and sort them automatically</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {done ? (
          <View style={s.doneBox}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
            <Text style={s.doneTitle}>All sorted!</Text>
            <Text style={s.doneSub}>Your screenshots have been moved to their stacks.</Text>
            <TouchableOpacity style={s.doneBtn} onPress={() => router.push('/(tabs)')} activeOpacity={0.88}>
              <Text style={s.doneBtnText}>Go to All tab →</Text>
            </TouchableOpacity>
          </View>
        ) : results ? (
          <>
            <View style={s.resultsHeader}>
              <Text style={s.resultsTitle}>Claude's suggestions</Text>
              <Text style={s.resultsSub}>Tap a group to deselect it, then apply</Text>
            </View>
            {results.map(group => (
              <TouchableOpacity
                key={group.stack}
                style={[s.groupCard, !accepted.has(group.stack) && s.groupCardOff]}
                onPress={() => toggleGroup(group.stack)}
                activeOpacity={0.85}
              >
                <View style={s.groupHeader}>
                  <View style={s.groupLeft}>
                    <Text style={{ fontSize: 24 }}>{group.emoji}</Text>
                    <View>
                      <Text style={s.groupName}>{group.stack}</Text>
                      <Text style={s.groupCount}>{group.shots.length} screenshot{group.shots.length > 1 ? 's' : ''}{group.isNew ? ' · New stack' : ''}</Text>
                    </View>
                  </View>
                  <View style={[s.checkCircle, accepted.has(group.stack) && s.checkOn]}>
                    {accepted.has(group.stack) && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbRow}>
                  {group.shots.map(shot => (
                    <TouchableOpacity key={shot.id} onPress={() => { storeShot(shot); router.push({ pathname: '/preview', params: { id: shot.id } }); }} activeOpacity={0.8}>
                      <Image source={{ uri: shot.uri }} style={s.thumb} contentFit="cover" recyclingKey={shot.id} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            ))}
            <View style={s.applyRow}>
              <TouchableOpacity
                style={[s.applyBtn, accepted.size === 0 && { opacity: 0.4 }]}
                onPress={applyResults}
                disabled={analysing || accepted.size === 0}
                activeOpacity={0.88}
              >
                {analysing ? <ActivityIndicator color={colors.cream} /> : <Text style={s.applyBtnText}>Apply {accepted.size} group{accepted.size !== 1 ? 's' : ''} →</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.rerunBtn} onPress={runAnalysis} activeOpacity={0.8}>
                <Text style={s.rerunBtnText}>Re-analyse</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={s.previewSection}>
              <Text style={s.sectionLabel}>
                Select up to {batch} · {selected.size} of {batch} chosen
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
                {unsorted.map(shot => {
                  const isSelected = selected.has(shot.id);
                  const atMax = selected.size >= batch && !isSelected;
                  return (
                    <TouchableOpacity
                      key={shot.id}
                      onPress={() => toggleShot(shot.id)}
                      activeOpacity={0.8}
                      style={[s.selectThumbWrap, isSelected && s.selectThumbWrapOn, atMax && { opacity: 0.35 }]}
                    >
                      <Image source={{ uri: shot.uri }} style={s.previewThumb} contentFit="cover" recyclingKey={shot.id} />
                      {isSelected && (
                        <View style={s.selectCheck}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={s.howBox}>
              <Text style={s.howTitle}>How it works</Text>
              <Text style={s.howItem}>1  Claude looks at each screenshot</Text>
              <Text style={s.howItem}>2  Suggests the best stack for each one</Text>
              <Text style={s.howItem}>3  You review and approve the groupings</Text>
              <Text style={s.howItem}>4  Screenshots move to their stacks</Text>
              <View style={s.privacyNote}>
                <Text style={s.privacyText}>🔒  Screenshots are analysed privately and never stored or used for training.</Text>
              </View>
            </View>

            <View style={{ paddingHorizontal: 24 }}>
              {atLimit ? (
                <TouchableOpacity style={s.paywallBtn} onPress={() => router.push({ pathname: '/paywall', params: { reason: 'ai' } })} activeOpacity={0.88}>
                  <Text style={s.paywallBtnText}>✦ Unlock more AI analyses →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.analyseBtn, (analysing || selectedShots.length === 0) && { opacity: 0.5 }]}
                  onPress={runAnalysis}
                  disabled={analysing || selectedShots.length === 0}
                  activeOpacity={0.88}
                >
                  {analysing ? (
                    <View style={{ alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color={colors.cream} />
                      <Text style={[s.analyseBtnText, { fontSize: 13 }]}>{progress}</Text>
                    </View>
                  ) : (
                    <Text style={s.analyseBtnText}>
                      {selectedShots.length === 0 ? 'Select screenshots above' : `✦ Analyse ${selectedShots.length} screenshot${selectedShots.length !== 1 ? 's' : ''}`}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              {unsorted.length === 0 && <Text style={s.allSortedText}>All sorted — nice work! 🎉</Text>}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  usagePill: { backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 5, paddingHorizontal: 12 },
  usageText: { fontFamily: 'Geist-Medium', fontSize: 12, color: colors.ink2 },
  sub:    { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, lineHeight: 20, paddingHorizontal: 24, marginBottom: 16 },
  previewSection: { paddingHorizontal: 24, marginBottom: 16 },
  sectionLabel: { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  previewThumb:    { width: 80, height: 128, borderRadius: radius.xs, backgroundColor: colors.cream2 },
  selectThumbWrap: { position: 'relative', borderRadius: radius.xs, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent' },
  selectThumbWrapOn: { borderColor: colors.gold },
  selectCheck:     { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  howBox: { marginHorizontal: 24, marginBottom: 20, backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 18 },
  howTitle: { fontFamily: 'Geist-SemiBold', fontSize: 14, color: colors.ink, marginBottom: 12 },
  howItem:  { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, lineHeight: 26 },
  privacyNote: { marginTop: 14, backgroundColor: colors.goldBg, borderRadius: radius.xs, padding: 12 },
  privacyText: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink2, lineHeight: 17 },
  analyseBtn: { backgroundColor: colors.ink, borderRadius: radius.sm, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  analyseBtnText: { fontFamily: 'Geist-Medium', fontSize: 17, color: colors.cream },
  paywallBtn: { backgroundColor: colors.gold, borderRadius: radius.sm, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  paywallBtnText: { fontFamily: 'Geist-Medium', fontSize: 16, color: '#fff' },
  allSortedText: { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, textAlign: 'center', marginTop: 8 },
  resultsHeader: { paddingHorizontal: 24, marginBottom: 12 },
  resultsTitle: { fontFamily: 'InstrumentSerif-Regular', fontSize: 22, color: colors.ink, marginBottom: 4 },
  resultsSub: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2 },
  groupCard: { marginHorizontal: 24, marginBottom: 10, backgroundColor: colors.cream, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', elevation: 2 },
  groupCardOff: { opacity: 0.45 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  groupLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupName:  { fontFamily: 'Geist-Medium', fontSize: 15, color: colors.ink },
  groupCount: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, marginTop: 2 },
  checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center' },
  checkOn:     { backgroundColor: colors.gold, borderColor: colors.gold },
  thumbRow: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  thumb: { width: 80, height: 128, borderRadius: radius.xs, backgroundColor: colors.cream2 },
  applyRow: { paddingHorizontal: 24, marginTop: 8, gap: 10 },
  applyBtn: { backgroundColor: colors.ink, borderRadius: radius.sm, height: 52, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.cream },
  rerunBtn: { backgroundColor: colors.cream2, borderRadius: radius.sm, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  rerunBtnText: { fontFamily: 'Geist-Medium', fontSize: 14, color: colors.ink2 },
  doneBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  doneTitle: { fontFamily: 'InstrumentSerif-Regular', fontSize: 32, color: colors.ink, marginBottom: 8 },
  doneSub: { fontFamily: 'Geist-Regular', fontSize: 15, color: colors.ink2, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  doneBtn: { backgroundColor: colors.ink, borderRadius: radius.sm, paddingVertical: 14, paddingHorizontal: 28 },
  doneBtnText: { fontFamily: 'Geist-Medium', fontSize: 15, color: colors.cream },
});