// app/preview.jsx
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Share, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  getAllStacksWithCounts, addToStack, removeFromStack,
  getStacksForScreenshot, upsertScreenshot, setWantList,
} from '../services/database';
import { getShot } from '../services/shotCache';
import { colors, radius } from '../constants/theme';

export default function PreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const shotId = String(id || '');

  const [uri, setUri] = useState(null);
  const [localIdentifier, setLocalIdentifier] = useState('');
  const [stacks, setStacks] = useState([]);
  const [inStacks, setInStacks] = useState([]);
  const [inWant, setInWant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastAdded, setLastAdded] = useState(null);
  const capturedAtRef = useRef(Date.now());

  useEffect(() => {
    async function load() {
      try {
        // Read from cache — must be inside useEffect so module is ready
        const cached = getShot(shotId);
        if (cached?.uri) setUri(cached.uri);
        const lid = cached?.localIdentifier || shotId.replace('ss-', '');
        setLocalIdentifier(lid);
        if (cached?.capturedAt) capturedAtRef.current = cached.capturedAt;

        // Save to DB
        await upsertScreenshot({
          id: shotId,
          localIdentifier: lid,
          capturedAt: cached?.capturedAt || Date.now(),
          filename: cached?.filename || null,
        });

        const [allStacks, shotStacks] = await Promise.all([
          getAllStacksWithCounts(),
          getStacksForScreenshot(shotId),
        ]);
        setStacks(allStacks.filter(s => !s.isSystem));
        setInStacks(shotStacks.map(s => s.id));
      } catch (e) {
        console.error('Preview load:', e);
      }
      setLoading(false);
    }
    load();
  }, [shotId]);

  async function toggleStack(stackId, stackName) {
    try {
      if (inStacks.includes(stackId)) {
        await removeFromStack(stackId, shotId);
        setInStacks(prev => prev.filter(s => s !== stackId));
        setLastAdded(null);
      } else {
        await addToStack(stackId, shotId);
        setInStacks(prev => [...prev, stackId]);
        setLastAdded(stackName);
        setTimeout(() => goBack(), 1200);
      }
    } catch (e) {
      console.error('toggleStack:', e);
    }
  }

  async function toggleWant() {
    try {
      const next = !inWant;
      setInWant(next);
      await setWantList(shotId, next);
    } catch (e) {
      console.error('toggleWant:', e);
      setInWant(v => !v);
    }
  }

  function goBack() {
    try { router.back(); } catch { router.replace('/(tabs)'); }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.nav}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <View style={s.acts}>
          <TouchableOpacity onPress={toggleWant} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
            <Text style={s.actIcon}>{inWant ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Share.share({ message: 'Shared from GrabStack' })}>
            <Text style={s.actIcon}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.imgArea}>
        {uri ? (
          <Image
            source={{ uri }}
            style={s.imgCard}
            resizeMode="contain"

          />
        ) : (
          <View style={[s.imgCard, s.imgPlaceholder]}>
            <Text style={{ fontSize: 44 }}>📷</Text>
            <Text style={{ fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink3, marginTop: 8 }}>
              {loading ? 'Loading…' : 'Image unavailable'}
            </Text>
          </View>
        )}
      </View>

      {lastAdded && (
        <View style={s.successBanner}>
          <Text style={s.successText}>✓ Added to {lastAdded}</Text>
        </View>
      )}

      <View style={s.sheet}>
        <Text style={s.sheetLabel}>Add to stack</Text>
        {loading ? (
          <ActivityIndicator color={colors.gold} />
        ) : stacks.length === 0 ? (
          <Text style={s.noStacks}>No stacks yet — create one in the Stacks tab</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {stacks.map(st => (
              <TouchableOpacity
                key={st.id}
                style={[s.stackBtn, inStacks.includes(st.id) && s.stackBtnOn]}
                onPress={() => toggleStack(st.id, st.name)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16 }}>{st.emoji}</Text>
                <Text style={[s.stackBtnText, inStacks.includes(st.id) && s.stackBtnTextOn]}>
                  {st.name}{inStacks.includes(st.id) ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.cream },
  nav:     { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back:    { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.gold },
  acts:    { flexDirection: 'row', gap: 20 },
  actIcon: { fontSize: 24 },
  imgArea: { flex: 1, padding: 12, paddingBottom: 8 },
  imgCard: { width: '100%', height: '100%', borderRadius: radius.lg, backgroundColor: colors.cream2, overflow: 'hidden' },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  successBanner: { marginHorizontal: 24, marginBottom: 8, backgroundColor: colors.greenBg, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(45,106,79,0.2)' },
  successText: { fontFamily: 'Geist-Medium', fontSize: 13, color: colors.green },
  sheet:    { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 20, borderTopWidth: 1, borderColor: colors.border },
  sheetLabel: { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  noStacks: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2 },
  stackBtn:     { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border2, paddingVertical: 10, paddingHorizontal: 16 },
  stackBtnOn:   { backgroundColor: colors.ink, borderColor: colors.ink },
  stackBtnText: { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink },
  stackBtnTextOn: { color: colors.cream },
});
