// app/(tabs)/ai.jsx
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import {
  getAllStacksWithCounts, getStackItems, createStack,
  addToStack, upsertScreenshot,
} from '../../services/database';
import { storeShot } from '../../services/shotCache';
import { colors, radius } from '../../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const BATCH = 10;

import * as ImageManipulator from 'expo-image-manipulator';

async function uriToBase64(uri) {
  try {
    // Resize to max 768px wide before encoding — reduces memory from 60MB to ~1MB
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

  // Build image content blocks
  const imageBlocks = [];
  for (let i = 0; i < shots.length; i++) {
    const b64 = await uriToBase64(shots[i].uri);
    if (!b64) continue;
    imageBlocks.push({
      type: 'text',
      text: `Screenshot ${i + 1}:`,
    });
    imageBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
    });
  }

  const prompt = `You are categorising ${shots.length} screenshots for a mobile app called GrabStack.

The user already has these stacks: ${stackNames || 'none yet'}.

Look at each screenshot and assign it to the best matching existing stack, OR suggest a new stack name if none fit.

Return ONLY a JSON array like this (no markdown, no explanation):
[
  {"index": 1, "stack": "Recipes to try", "emoji": "🍳", "isNew": false},
  {"index": 2, "stack": "Travel ideas", "emoji": "✈️", "isNew": true}
]

Rules:
- Match existing stacks by name when possible (isNew: false)
- Suggest new stacks only when truly needed (isNew: true)
- Keep stack names short (2-4 words max)
- Use a relevant emoji
- Be decisive — every screenshot gets a category`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '[]';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export default function AiSortScreen() {
  const router = useRouter();
  const [unsorted, setUnsorted] = useState([]);
  const [stacks, setStacks] = useState([]);
  const [analysing, setAnalysing] = useState(false);
  const [results, setResults] = useState(null); // grouped results
  const [progress, setProgress] = useState('');
  const [accepted, setAccepted] = useState(new Set());
  const [done, setDone] = useState(false);
  const [loadingShots, setLoadingShots] = useState(true);

  useFocusEffect(useCallback(() => {
    async function load() {
      setLoadingShots(true);
      try {
        const allStacks = await getAllStacksWithCounts();
        setStacks(allStacks.filter(s => !s.isSystem));

        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        if (status !== 'granted') { setLoadingShots(false); return; }

        // Get stackContents to find unsorted
        const contents = {};
        await Promise.all(allStacks.map(async s => {
          const items = await getStackItems(s.id, { limit: 500 });
          items.forEach(item => { contents['ss-' + item.localIdentifier] = true; });
        }));

        const r = await MediaLibrary.getAssetsAsync({
          mediaType: 'photo', sortBy: [['creationTime', false]], first: 100,
        });
        const unsortedShots = r.assets
          .filter(a => !contents['ss-' + a.id])
          .slice(0, BATCH)
          .map(a => ({
            id: 'ss-' + a.id, localIdentifier: a.id, uri: a.uri,
            capturedAt: a.creationTime < 1e10 ? a.creationTime * 1000 : a.creationTime,
            filename: a.filename,
          }));
        setUnsorted(unsortedShots);
      } catch (e) { console.error(e); }
      setLoadingShots(false);
    }
    load();
    setResults(null);
    setAccepted(new Set());
    setDone(false);
  }, []));

  async function runAnalysis() {
    if (unsorted.length === 0) return;
    setAnalysing(true);
    setResults(null);
    setProgress('Sending screenshots to Claude…');
    try {
      const raw = await analyseScreenshots(unsorted, stacks);
      setProgress('Grouping results…');

      // Group by stack name
      const groups = {};
      raw.forEach(item => {
        const shot = unsorted[item.index - 1];
        if (!shot) return;
        const key = item.stack;
        if (!groups[key]) groups[key] = { stack: item.stack, emoji: item.emoji, isNew: item.isNew, shots: [] };
        groups[key].shots.push(shot);
      });

      setResults(Object.values(groups));
      // Pre-select all groups
      setAccepted(new Set(Object.keys(groups)));
    } catch (e) {
      console.error('Analysis error:', e);
      setProgress('Something went wrong — try again');
    }
    setAnalysing(false);
    setProgress('');
  }

  async function applyResults() {
    if (!results) return;
    setAnalysing(true);
    setProgress('Applying…');
    try {
      for (const group of results) {
        if (!accepted.has(group.stack)) continue;

        // Find or create stack
        let stackId = stacks.find(s => s.name === group.stack)?.id;
        if (!stackId) {
          stackId = await createStack({ name: group.stack, emoji: group.emoji });
        }

        // Add each shot to stack
        for (const shot of group.shots) {
          await upsertScreenshot({
            id: shot.id, localIdentifier: shot.localIdentifier,
            capturedAt: shot.capturedAt, filename: shot.filename,
          });
          await addToStack(stackId, shot.id);
        }
      }
      setDone(true);
    } catch (e) {
      console.error('Apply error:', e);
    }
    setAnalysing(false);
    setProgress('');
  }

  function toggleGroup(stackName) {
    setAccepted(prev => {
      const next = new Set(prev);
      next.has(stackName) ? next.delete(stackName) : next.add(stackName);
      return next;
    });
  }

  if (loadingShots) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>AI Sort</Text>
        <Text style={s.sub}>Let Claude look at your screenshots and sort them automatically</Text>
      </View>

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
              <Text style={s.resultsSub}>Tap a group to deselect it, then apply what you want</Text>
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
                      <Text style={s.groupCount}>
                        {group.shots.length} screenshot{group.shots.length > 1 ? 's' : ''}
                        {group.isNew ? ' · New stack' : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={[s.checkCircle, accepted.has(group.stack) && s.checkCircleOn]}>
                    {accepted.has(group.stack) && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbRow}>
                  {group.shots.map(shot => (
                    <TouchableOpacity
                      key={shot.id}
                      onPress={() => { storeShot(shot); router.push({ pathname: '/preview', params: { id: shot.id } }); }}
                      activeOpacity={0.8}
                    >
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
                {analysing
                  ? <ActivityIndicator color={colors.cream} />
                  : <Text style={s.applyBtnText}>Apply {accepted.size} group{accepted.size !== 1 ? 's' : ''} →</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={s.rerunBtn} onPress={runAnalysis} activeOpacity={0.8}>
                <Text style={s.rerunBtnText}>Re-analyse</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Preview of shots to analyse */}
            <View style={s.previewSection}>
              <Text style={s.sectionLabel}>Ready to analyse · {unsorted.length} unsorted screenshots</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.previewRow}>
                {unsorted.map(shot => (
                  <Image key={shot.id} source={{ uri: shot.uri }} style={s.previewThumb} contentFit="cover" recyclingKey={shot.id} />
                ))}
              </ScrollView>
            </View>

            {/* How it works */}
            <View style={s.howBox}>
              <Text style={s.howTitle}>How it works</Text>
              <Text style={s.howItem}>1  Claude looks at each screenshot</Text>
              <Text style={s.howItem}>2  Suggests the best stack for each one</Text>
              <Text style={s.howItem}>3  You review and approve the groupings</Text>
              <Text style={s.howItem}>4  Screenshots move to their stacks</Text>
              <View style={s.privacyNote}>
                <Text style={s.privacyText}>
                  🔒  Screenshots are sent to Claude's API for analysis only. They are not stored or used for training.
                </Text>
              </View>
            </View>

            <View style={{ paddingHorizontal: 24 }}>
              <TouchableOpacity
                style={[s.analyseBtn, (analysing || unsorted.length === 0) && { opacity: 0.5 }]}
                onPress={runAnalysis}
                disabled={analysing || unsorted.length === 0}
                activeOpacity={0.88}
              >
                {analysing ? (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color={colors.cream} />
                    <Text style={[s.analyseBtnText, { fontSize: 13 }]}>{progress}</Text>
                  </View>
                ) : (
                  <Text style={s.analyseBtnText}>
                    {unsorted.length === 0 ? 'No unsorted screenshots' : `✦ Analyse ${unsorted.length} screenshots`}
                  </Text>
                )}
              </TouchableOpacity>
              {unsorted.length === 0 && (
                <Text style={s.allSortedText}>All your screenshots are sorted. Nice work! 🎉</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const THUMB_SIZE = 80;

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 30, color: colors.ink, letterSpacing: -0.5, marginBottom: 4 },
  sub:    { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, lineHeight: 20 },

  previewSection: { paddingHorizontal: 24, marginBottom: 16 },
  sectionLabel:   { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  previewRow:     { gap: 6 },
  previewThumb:   { width: THUMB_SIZE, height: THUMB_SIZE * 1.6, borderRadius: radius.xs, backgroundColor: colors.cream2 },

  howBox:    { marginHorizontal: 24, marginBottom: 20, backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 18 },
  howTitle:  { fontFamily: 'Geist-SemiBold', fontSize: 14, color: colors.ink, marginBottom: 12 },
  howItem:   { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, lineHeight: 26 },
  privacyNote: { marginTop: 14, backgroundColor: colors.goldBg, borderRadius: radius.xs, padding: 12 },
  privacyText: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink2, lineHeight: 17 },

  analyseBtn:     { backgroundColor: colors.ink, borderRadius: radius.sm, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  analyseBtnText: { fontFamily: 'Geist-Medium', fontSize: 17, color: colors.cream },
  allSortedText:  { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, textAlign: 'center', marginTop: 8 },

  resultsHeader: { paddingHorizontal: 24, marginBottom: 12 },
  resultsTitle:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 22, color: colors.ink, marginBottom: 4 },
  resultsSub:    { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2 },

  groupCard:    { marginHorizontal: 24, marginBottom: 10, backgroundColor: colors.cream, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', shadowColor: '#1A1916', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  groupCardOff: { opacity: 0.45 },
  groupHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  groupLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupName:    { fontFamily: 'Geist-Medium', fontSize: 15, color: colors.ink },
  groupCount:   { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, marginTop: 2 },
  checkCircle:  { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center' },
  checkCircleOn:{ backgroundColor: colors.gold, borderColor: colors.gold },
  thumbRow:     { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  thumb:        { width: THUMB_SIZE, height: THUMB_SIZE * 1.6, borderRadius: radius.xs, backgroundColor: colors.cream2 },

  applyRow:    { paddingHorizontal: 24, marginTop: 8, gap: 10 },
  applyBtn:    { backgroundColor: colors.ink, borderRadius: radius.sm, height: 52, alignItems: 'center', justifyContent: 'center' },
  applyBtnText:{ fontFamily: 'Geist-Medium', fontSize: 16, color: colors.cream },
  rerunBtn:    { backgroundColor: colors.cream2, borderRadius: radius.sm, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  rerunBtnText:{ fontFamily: 'Geist-Medium', fontSize: 14, color: colors.ink2 },

  doneBox:    { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  doneTitle:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 32, color: colors.ink, marginBottom: 8 },
  doneSub:    { fontFamily: 'Geist-Regular', fontSize: 15, color: colors.ink2, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  doneBtn:    { backgroundColor: colors.ink, borderRadius: radius.sm, paddingVertical: 14, paddingHorizontal: 28 },
  doneBtnText:{ fontFamily: 'Geist-Medium', fontSize: 15, color: colors.cream },
});