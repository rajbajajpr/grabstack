// app/(tabs)/index.jsx
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, Dimensions, RefreshControl, SafeAreaView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllStacksWithCounts, getSetting } from '../../services/database';
import { colors, spacing, radius, fontSize } from '../../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const GRID_PAD = 20;
const GRID_GAP = 3;
const CELL_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP * 2) / 3;
const CELL_H = CELL_W * (17 / 9);
const FREE_LIMIT = 100;

const CATS = {
  shopping:{ label:'Shopping', bg:'#FFF8F0', accent:'#CC8844', dark:'#331100' },
  food:    { label:'Food',     bg:'#F0FFF4', accent:'#338844', dark:'#001A00' },
  ticket:  { label:'Travel',   bg:'#F0F4FF', accent:'#3355CC', dark:'#001033' },
  quote:   { label:'Quote',    bg:'#F8F8F8', accent:'#666666', dark:'#111111' },
  social:  { label:'Social',   bg:'#FFF0F8', accent:'#CC3388', dark:'#1A0030' },
  work:    { label:'Work',     bg:'#F0FFFE', accent:'#336677', dark:'#001015' },
};
const CAT_KEYS = Object.keys(CATS);

function makeSampleShots(count = 60) {
  return Array.from({ length: count }, (_, i) => ({
    id: 'ss' + i,
    localIdentifier: 'ss' + i,
    capturedAt: Date.now() - i * 3600000,
    aiCategory: CAT_KEYS[i % CAT_KEYS.length],
    inWantList: i % 7 === 0 ? 1 : 0,
  }));
}

function FakeScreenshot({ cat }) {
  const c = CATS[cat] || CATS.work;
  const icons = { shopping:'👟', food:'🍜', ticket:'✈️', quote:'"', social:'📸', work:'💼' };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 6, overflow: 'hidden' }}>
      <View style={{ flex: 1, backgroundColor: c.accent + '22', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18 }}>{icons[cat] || '📄'}</Text>
      </View>
      {[0.8, 0.6, 0.7].map((w, i) => (
        <View key={i} style={{ height: 3, backgroundColor: c.accent + '44', borderRadius: 2, width: `${w * 100}%`, marginTop: 3 }} />
      ))}
    </View>
  );
}

function ScreenshotCell({ shot, onPress }) {
  return (
    <TouchableOpacity style={styles.cell} onPress={() => onPress(shot)} activeOpacity={0.82}>
      <FakeScreenshot cat={shot.aiCategory} />
      {shot.aiCategory && (
        <View style={styles.catPill}>
          <Text style={styles.catPillText}>{CATS[shot.aiCategory]?.label?.toUpperCase()}</Text>
        </View>
      )}
      {shot.inWantList ? <Text style={styles.heartPin}>❤️</Text> : null}
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [shots, setShots] = useState([]);
  const [stacks, setStacks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isPremium, setIsPremium] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNudge, setShowNudge] = useState(true);

  async function load() {
    const [allStacks, premium] = await Promise.all([
      getAllStacksWithCounts(),
      getSetting('isPremium'),
    ]);
    setShots(makeSampleShots(60));
    setStacks(allStacks);
    setIsPremium(premium === 'true');
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const displayed = filter === 'all' ? shots : shots.filter((_, i) => i % 3 === 0);
  const chips = [
    { id: 'all', label: 'All', emoji: '', count: shots.length },
    ...stacks.map(s => ({ id: s.id, label: s.name, emoji: s.emoji, count: s.itemCount || 0 })),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Good morning.</Text>
        <Text style={styles.meta}>{shots.length} screenshots · {stacks.filter(s => !s.isSystem).length} stacks</Text>
      </View>

      <TouchableOpacity style={styles.searchBar} activeOpacity={0.7}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPh}>Search screenshots…</Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent} style={styles.chipsScroll}>
        {chips.map(c => (
          <TouchableOpacity key={c.id}
            style={[styles.chip, filter === c.id && styles.chipOn]}
            onPress={() => setFilter(c.id)} activeOpacity={0.8}>
            {c.emoji ? <Text style={{ fontSize: 12 }}>{c.emoji}</Text> : null}
            <Text style={[styles.chipLabel, filter === c.id && styles.chipLabelOn]}>{c.label}</Text>
            <View style={[styles.chipBadge, filter === c.id && styles.chipBadgeOn]}>
              <Text style={[styles.chipBadgeText, filter === c.id && styles.chipBadgeTextOn]}>{c.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {showNudge && (
        <View style={styles.nudge}>
          <Text style={{ fontSize: 16, flexShrink: 0 }}>💡</Text>
          <Text style={styles.nudgeText}>
            <Text style={{ fontFamily: 'Geist-Medium', color: colors.ink }}>{shots.length} screenshots</Text>
            {' '}ready to sort into stacks.
          </Text>
          <TouchableOpacity onPress={() => setShowNudge(false)}>
            <Text style={{ fontSize: 16, color: colors.ink3 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isPremium && (
        <TouchableOpacity style={styles.limitBar} onPress={() => router.push('/paywall')} activeOpacity={0.8}>
          <Text style={styles.limitText}>{FREE_LIMIT} screenshot limit — tap to unlock all</Text>
          <Text style={styles.limitCta}>Upgrade →</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={displayed}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => <ScreenshotCell shot={item} onPress={s => router.push({ pathname: '/preview', params: { id: s.id, cat: s.aiCategory } })} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Text style={styles.gridLabel}>Recent</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: GRID_PAD, paddingTop: 12 },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 32, color: colors.ink, letterSpacing: -0.8 },
  meta:   { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink3, marginTop: 2, marginBottom: 14 },
  searchBar: { marginHorizontal: GRID_PAD, marginBottom: 12, backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, height: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchIcon: { fontSize: 14 },
  searchPh:   { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink3 },
  chipsScroll:   { flexGrow: 0, marginBottom: 12 },
  chipsContent:  { paddingHorizontal: GRID_PAD, gap: 8 },
  chip:          { backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 7, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipOn:        { backgroundColor: colors.ink, borderColor: colors.ink },
  chipLabel:     { fontFamily: 'Geist-Medium', fontSize: 12, color: colors.ink },
  chipLabelOn:   { color: colors.cream },
  chipBadge:     { backgroundColor: colors.cream3, borderRadius: 100, paddingHorizontal: 5, paddingVertical: 1 },
  chipBadgeOn:   { backgroundColor: 'rgba(255,255,255,0.18)' },
  chipBadgeText: { fontFamily: 'Geist-Regular', fontSize: 10, color: colors.ink2 },
  chipBadgeTextOn:{ color: 'rgba(255,255,255,0.7)' },
  nudge: { marginHorizontal: GRID_PAD, marginBottom: 10, backgroundColor: colors.goldBg, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(196,149,106,0.25)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nudgeText: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink, flex: 1, lineHeight: 18 },
  limitBar:  { marginHorizontal: GRID_PAD, marginBottom: 10, backgroundColor: colors.redBg, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(192,57,43,0.15)', paddingVertical: 9, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitText: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.red, flex: 1 },
  limitCta:  { fontFamily: 'Geist-SemiBold', fontSize: 12, color: colors.red },
  gridContent: { paddingHorizontal: GRID_PAD, paddingBottom: 16 },
  gridRow:     { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridLabel:   { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  cell:        { width: CELL_W, height: CELL_H, borderRadius: radius.xs, overflow: 'hidden', backgroundColor: colors.cream2 },
  catPill:     { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(250,248,245,0.92)', borderRadius: 100, paddingHorizontal: 6, paddingVertical: 2 },
  catPillText: { fontFamily: 'Geist-SemiBold', fontSize: 8, color: colors.ink, letterSpacing: 0.5 },
  heartPin:    { position: 'absolute', top: 5, right: 5, fontSize: 12 },
});
