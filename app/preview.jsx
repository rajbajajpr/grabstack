// app/preview.jsx
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAllStacksWithCounts, getStacksForScreenshot, addToStack, removeFromStack, setWantList, getSetting } from '../services/database';
import { getAssetUri } from '../services/media';
import { colors, spacing, radius, fontSize } from '../constants/theme';

// We'd look up the shot from DB in a real app; simplified here for clarity
export default function PreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [uri, setUri] = useState(null);
  const [stacks, setStacks] = useState([]);
  const [inStacks, setInStacks] = useState([]);
  const [inWant, setInWant] = useState(false);

  useEffect(() => {
    async function load() {
      const allStacks = await getAllStacksWithCounts();
      setStacks(allStacks.filter(s => !s.isSystem));
      const shotStacks = await getStacksForScreenshot(id);
      setInStacks(shotStacks.map(s => s.id));
    }
    load();
  }, [id]);

  async function toggleStack(stackId) {
    if (inStacks.includes(stackId)) {
      await removeFromStack(stackId, id);
      setInStacks(prev => prev.filter(s => s !== stackId));
    } else {
      await addToStack(stackId, id);
      setInStacks(prev => [...prev, stackId]);
    }
  }

  async function toggleWant() {
    const next = !inWant;
    setInWant(next);
    await setWantList(id, next);
  }

  return (
    <SafeAreaView style={pStyles.safe}>
      <View style={pStyles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={pStyles.backBtn}>
          <Text style={pStyles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={pStyles.acts}>
          <TouchableOpacity onPress={toggleWant}><Text style={pStyles.actIcon}>{inWant ? '❤️' : '🤍'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => Share.share({ message: 'Check out this screenshot from GrabStack' })}><Text style={pStyles.actIcon}>↗</Text></TouchableOpacity>
        </View>
      </View>

      <View style={pStyles.imgArea}>
        <View style={pStyles.imgCard}>
          {uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />}
        </View>
      </View>

      <View style={pStyles.sheet}>
        <Text style={pStyles.sheetLabel}>Add to stack</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {stacks.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[pStyles.stackBtn, inStacks.includes(s.id) && pStyles.stackBtnOn]}
              onPress={() => toggleStack(s.id)}
              activeOpacity={0.8}
            >
              <Text>{s.emoji}</Text>
              <Text style={[pStyles.stackBtnText, inStacks.includes(s.id) && pStyles.stackBtnTextOn]}>
                {s.name}{inStacks.includes(s.id) ? ' ✓' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const pStyles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.cream },
  nav:     { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  backText:{ fontFamily: 'Geist-Medium', fontSize: fontSize.lg, color: colors.gold },
  acts:    { flexDirection: 'row', gap: 18 },
  actIcon: { fontSize: 22 },
  imgArea: { flex: 1, padding: spacing.xxl, paddingTop: 0 },
  imgCard: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.cream2, shadowColor: '#1A1916', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 8 },
  sheet:   { padding: spacing.xxl, borderTopWidth: 1, borderColor: colors.border },
  sheetLabel: { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  stackBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border2, paddingVertical: 8, paddingHorizontal: 14 },
  stackBtnOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  stackBtnText:   { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink },
  stackBtnTextOn: { color: colors.cream },
});
