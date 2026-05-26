// app/(tabs)/index.jsx
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  ScrollView, Dimensions, RefreshControl, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { getAllStacksWithCounts, getSetting, getStackItems, addToStack, upsertScreenshot } from '../../services/database';
import { storeShot, clearOld } from '../../services/shotCache';
import { Image } from 'expo-image';
import { colors, radius } from '../../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const GRID_PAD = 16;
const GRID_GAP = 8;
const CELL_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP * 2) / 3;
const CELL_H = CELL_W * (17 / 9);
const FREE_LIMIT = 100;

function ScreenshotCell({ shot, assignedStacks, selected, onPress, onLongPress }) {
  const stacks = assignedStacks || [];
  const inWant = shot.inWantList === 1 || shot.inWantList === true;
  return (
    <TouchableOpacity
      style={[styles.cell, selected && styles.cellSelected]}
      onPress={() => onPress(shot)}
      onLongPress={() => onLongPress(shot)}
      activeOpacity={0.82}
      delayLongPress={400}
    >
      <Image
        source={{ uri: shot.uri }}
        style={styles.cellImg}
        contentFit="cover"
        recyclingKey={shot.id}
      />
      {selected && (
        <View style={styles.selectOverlay}>
          <View style={styles.selectCheck}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>
          </View>
        </View>
      )}
      {!selected && stacks.length > 0 && (
        <View style={styles.stackBadges}>
          {stacks.slice(0, 3).map((st, i) => (
            <View key={st.id} style={styles.stackBadge}>
              <Text style={{ fontSize: 10 }}>{st.emoji}</Text>
            </View>
          ))}
        </View>
      )}
      {!selected && inWant && (
        <View style={styles.heartBadge}>
          <Text style={{ fontSize: 10 }}>❤️</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Render 3 cells per row
function RowItem({ shots, stackContents, selected, onPress, onLongPress }) {
  return (
    <View style={styles.gridRow}>
      {shots.map(shot => (
        <ScreenshotCell
          key={shot.id}
          shot={shot}
          assignedStacks={stackContents[shot.id]}
          selected={selected.has(shot.id)}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      ))}
      {shots.length === 2 && <View style={[styles.cell, { backgroundColor: 'transparent' }]} />}
      {shots.length === 1 && (
        <>
          <View style={[styles.cell, { backgroundColor: 'transparent' }]} />
          <View style={[styles.cell, { backgroundColor: 'transparent' }]} />
        </>
      )}
    </View>
  );
}

function chunkIntoRows(arr) {
  const rows = [];
  for (let i = 0; i < arr.length; i += 3) rows.push(arr.slice(i, i + 3));
  return rows;
}

export default function HomeScreen() {
  const router = useRouter();
  const [shots, setShots] = useState([]);
  const [stacks, setStacks] = useState([]);
  const [stackContents, setStackContents] = useState({});
  const [filter, setFilter] = useState('all');
  const [isPremium, setIsPremium] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  async function loadScreenshots() {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    console.log('Permission status:', perm.status, 'granted:', perm.granted, 'accessPrivileges:', perm.accessPrivileges);
    if (!perm.granted) return [];
    await new Promise(r => setTimeout(r, 500));
    try {
      const r = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: [['creationTime', false]],
        first: FREE_LIMIT,
      });
      return r.assets.map(a => ({
        id: 'ss-' + a.id,
        localIdentifier: a.id,
        uri: a.uri,
        capturedAt: a.creationTime < 1e10 ? a.creationTime * 1000 : a.creationTime,
        filename: a.filename,
      }));
    } catch (e) {
      console.error('loadScreenshots error:', e);
      return [];
    }
  }

  async function load() {
    const [allStacks, premium, screenshots] = await Promise.all([
      getAllStacksWithCounts(), getSetting('isPremium'), loadScreenshots(),
    ]);
    setStacks(allStacks);
    setIsPremium(premium === 'true');
    setShots(screenshots);
    const contents = {};
    await Promise.all(allStacks.map(async s => {
      try {
        const items = await getStackItems(s.id, { limit: 500 });
        items.forEach(item => {
          const sid = 'ss-' + item.localIdentifier;
          if (!contents[sid]) contents[sid] = [];
          contents[sid].push({ id: s.id, name: s.name, emoji: s.emoji });
        });
      } catch (e) {}
    }));
    // Mark want list items on shots
    const wantStack = allStacks.find(s => s.id === 'want-list');
    if (wantStack) {
      const wantItems = await getStackItems('want-list', { limit: 500 });
      const wantIds = new Set(wantItems.map(i => 'ss-' + i.localIdentifier));
      setShots(prev => prev.map(s => ({ ...s, inWantList: wantIds.has(s.id) ? 1 : 0 })));
    }
    setStackContents(contents);
  }

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

  // Build month options from actual screenshot dates
  const monthOptions = [];
  const seenMonths = new Set();
  shots.forEach(s => {
    const d = new Date(s.capturedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seenMonths.has(key)) {
      seenMonths.add(key);
      monthOptions.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      });
    }
  });

  // Filter shots
  let filtered = shots;
  if (dateFilter) {
    filtered = filtered.filter(s => {
      const d = new Date(s.capturedAt);
      return d.getFullYear() === dateFilter.year && d.getMonth() === dateFilter.month;
    });
  }
  if (filter !== 'all') {
    const ids = new Set(Object.entries(stackContents)
      .filter(([_, stks]) => stks.some(s => s.id === filter))
      .map(([id]) => id));
    filtered = filtered.filter(s => ids.has(s.id));
  }

  const unsorted = filtered.filter(s => !stackContents[s.id] || stackContents[s.id].length === 0);
  // Most recently sorted first — shots array is already newest-first, so sorted preserves that
  const sorted   = filtered.filter(s =>  stackContents[s.id] && stackContents[s.id].length > 0);

  // Build sections for SectionList
  const sections = [];
  if (filter === 'all' && !dateFilter) {
    if (unsorted.length > 0) sections.push({ title: `Unsorted · ${unsorted.length}`, data: chunkIntoRows(unsorted) });
    if (sorted.length > 0)   sections.push({ title: `Sorted · ${sorted.length}`, data: chunkIntoRows(sorted) });
  } else {
    if (filtered.length > 0) sections.push({ title: `${filtered.length} screenshots`, data: chunkIntoRows(filtered) });
  }

  const chips = [
    { id: 'all', label: 'All', emoji: '', count: shots.length },
    ...stacks.filter(s => !s.isSystem).map(s => ({
      id: s.id, label: s.name, emoji: s.emoji, count: s.itemCount || 0,
    })),
  ];

  function handlePress(shot) {
    if (bulkMode) {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(shot.id) ? next.delete(shot.id) : next.add(shot.id);
        return next;
      });
    } else {
      storeShot(shot); clearOld(); router.push({ pathname: '/preview', params: { id: shot.id } });
    }
  }

  function handleLongPress(shot) {
    if (!bulkMode) { setBulkMode(true); setSelected(new Set([shot.id])); }
    else {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(shot.id) ? next.delete(shot.id) : next.add(shot.id);
        return next;
      });
    }
  }

  function cancelBulk() { setBulkMode(false); setSelected(new Set()); }

  async function assignBulkToStack(stackId) {
    const shotsList = shots.filter(s => selected.has(s.id));
    await Promise.all(shotsList.map(async shot => {
      try {
        await upsertScreenshot({ id: shot.id, localIdentifier: shot.localIdentifier, capturedAt: shot.capturedAt, filename: shot.filename });
        await addToStack(stackId, shot.id);
      } catch (e) { console.error(e); }
    }));
    setShowBulkModal(false);
    cancelBulk();
    await load();
  }

  const userStacks = stacks.filter(s => !s.isSystem);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>GrabStack</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.dateBtn, dateFilter && styles.dateBtnOn]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dateBtnTxt, dateFilter && styles.dateBtnTxtOn]}>
              📅 {dateFilter ? dateFilter.label : 'Filter by month'}
            </Text>
            {dateFilter && (
              <TouchableOpacity onPress={() => setDateFilter(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 12, color: colors.gold, marginLeft: 4 }}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/settings')}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bulk action bar */}
      {bulkMode && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{selected.size} selected — long-press more to add</Text>
          <TouchableOpacity
            style={[styles.bulkBtn, selected.size === 0 && { opacity: 0.4 }]}
            onPress={() => selected.size > 0 && setShowBulkModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.bulkBtnTxt}>Move to stack →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stack filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
        bounces={false}
      >
        {chips.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, filter === c.id && styles.chipOn]}
            onPress={() => setFilter(c.id)}
            activeOpacity={0.8}
          >
            {c.emoji ? <Text style={styles.chipEmoji}>{c.emoji}</Text> : null}
            <Text style={[styles.chipLabel, filter === c.id && styles.chipLabelOn]} numberOfLines={1}>
              {c.label}
            </Text>
            <View style={[styles.chipPill, filter === c.id && styles.chipPillOn]}>
              <Text style={[styles.chipPillTxt, filter === c.id && styles.chipPillTxtOn]}>{c.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!isPremium && shots.length >= FREE_LIMIT && (
        <TouchableOpacity style={styles.limitBar} onPress={() => router.push('/paywall')} activeOpacity={0.8}>
          <Text style={styles.limitTxt}>Showing first {FREE_LIMIT} — upgrade for all</Text>
          <Text style={styles.limitCta}>Upgrade →</Text>
        </TouchableOpacity>
      )}

      {!bulkMode && (
        <View style={styles.hintBar}>
          <Text style={styles.hintTxt}>Long-press to select multiple screenshots</Text>
        </View>
      )}

      {/* Main grid using SectionList */}
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `row-${index}-${item.map(s => s.id).join('-')}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTxt}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item: rowShots }) => (
          <RowItem
            shots={rowShots}
            stackContents={stackContents}
            selected={selected}
            onPress={handlePress}
            onLongPress={handleLongPress}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📷</Text>
            <Text style={styles.emptyTitle}>
              {dateFilter ? `Nothing in ${dateFilter.label}` : 'No screenshots'}
            </Text>
            <Text style={styles.emptyBody}>Pull down to refresh</Text>
          </View>
        }
      />

      {/* Date picker modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowDatePicker(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter by month</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.monthRow} onPress={() => { setDateFilter(null); setShowDatePicker(false); }}>
                <Text style={[styles.monthLabel, !dateFilter && { color: colors.gold, fontFamily: 'Geist-Medium' }]}>All time</Text>
                <Text style={styles.monthCount}>{shots.length}</Text>
                {!dateFilter && <Text style={{ color: colors.gold, marginLeft: 8 }}>✓</Text>}
              </TouchableOpacity>
              {monthOptions.map((m, i) => {
                const isActive = dateFilter && dateFilter.year === m.year && dateFilter.month === m.month;
                const count = shots.filter(s => {
                  const d = new Date(s.capturedAt);
                  return d.getFullYear() === m.year && d.getMonth() === m.month;
                }).length;
                return (
                  <TouchableOpacity key={i} style={styles.monthRow}
                    onPress={() => { setDateFilter(m); setShowDatePicker(false); }}>
                    <Text style={[styles.monthLabel, isActive && { color: colors.gold, fontFamily: 'Geist-Medium' }]}>{m.label}</Text>
                    <Text style={styles.monthCount}>{count}</Text>
                    {isActive && <Text style={{ color: colors.gold, marginLeft: 8 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bulk assign modal */}
      <Modal visible={showBulkModal} transparent animationType="slide" onRequestClose={() => setShowBulkModal(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowBulkModal(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Move {selected.size} to…</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {userStacks.length === 0 ? (
                <Text style={{ fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, textAlign: 'center', padding: 20 }}>
                  Create a stack first in the Stacks tab
                </Text>
              ) : userStacks.map(st => (
                <TouchableOpacity key={st.id} style={styles.stackRow} onPress={() => assignBulkToStack(st.id)} activeOpacity={0.8}>
                  <Text style={{ fontSize: 22 }}>{st.emoji}</Text>
                  <Text style={styles.stackRowName}>{st.name}</Text>
                  <Text style={{ color: colors.ink3, fontSize: 16 }}>→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: GRID_PAD, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cream2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  settingsBtnText: { fontSize: 16, color: colors.ink2 },
  dateBtn: { backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  dateBtnOn: { backgroundColor: colors.goldBg, borderColor: colors.gold },
  dateBtnTxt: { fontFamily: 'Geist-Medium', fontSize: 12, color: colors.ink2 },
  dateBtnTxtOn: { color: colors.gold },
  cancelBtn: { backgroundColor: colors.redBg, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(192,57,43,0.2)', paddingVertical: 8, paddingHorizontal: 14 },
  cancelBtnText: { fontFamily: 'Geist-Medium', fontSize: 13, color: colors.red },
  bulkBar: { position: 'absolute', bottom: 100, left: GRID_PAD, right: GRID_PAD, backgroundColor: colors.ink, borderRadius: radius.sm, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  bulkCount: { fontFamily: 'Geist-Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 },
  bulkBtn: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 14 },
  bulkBtnTxt: { fontFamily: 'Geist-SemiBold', fontSize: 13, color: '#fff' },
  // CHIPS — explicit height so they never get clipped
  chipsScroll: { flexShrink: 0, flexGrow: 0, height: 56 },
  chipsRow: { paddingHorizontal: GRID_PAD, gap: 8, alignItems: 'center', height: 56 },
  chip: {
    height: 40,
    backgroundColor: colors.cream2, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontFamily: 'Geist-Medium', fontSize: 13, color: colors.ink, maxWidth: 100 },
  chipLabelOn: { color: colors.cream },
  chipPill: { backgroundColor: colors.cream3, borderRadius: 100, paddingHorizontal: 6, paddingVertical: 2 },
  chipPillOn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  chipPillTxt: { fontFamily: 'Geist-Regular', fontSize: 11, color: colors.ink2 },
  chipPillTxtOn: { color: 'rgba(255,255,255,0.7)' },
  limitBar: { marginHorizontal: GRID_PAD, marginBottom: 8, backgroundColor: colors.redBg, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(192,57,43,0.15)', paddingVertical: 9, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitTxt: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.red, flex: 1 },
  limitCta: { fontFamily: 'Geist-SemiBold', fontSize: 12, color: colors.red },
  hintBar: { marginHorizontal: GRID_PAD, marginBottom: 8 },
  hintTxt: { fontFamily: 'Geist-Regular', fontSize: 11, color: colors.ink3, textAlign: 'center' },
  listContent: { paddingHorizontal: GRID_PAD, paddingBottom: 24 },
  sectionHeader: { paddingTop: 12, paddingBottom: 8, backgroundColor: colors.cream },
  sectionHeaderTxt: { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8 },
  gridRow: { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },
  cell: { width: CELL_W, height: CELL_H, borderRadius: radius.xs, overflow: 'hidden', backgroundColor: colors.cream2 },
  cellSelected: { opacity: 0.7 },
  cellImg: { width: '100%', height: '100%' },
  selectOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(196,149,106,0.25)', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 5 },
  selectCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  assignedBadge: { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(250,248,245,0.92)', borderRadius: 100, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stackBadges:  { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', gap: 2 },
  stackBadge:   { backgroundColor: 'rgba(250,248,245,0.92)', borderRadius: 100, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  heartBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(250,248,245,0.88)', borderRadius: 100, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingTop: 60, alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: 'InstrumentSerif-Regular', fontSize: 22, color: colors.ink },
  emptyBody: { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, textAlign: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(26,25,22,0.42)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.border, padding: 24, paddingBottom: 40, maxHeight: '65%' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.cream3, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'InstrumentSerif-Regular', fontSize: 22, color: colors.ink, marginBottom: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border },
  monthLabel: { fontFamily: 'Geist-Regular', fontSize: 15, color: colors.ink, flex: 1 },
  monthCount: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink3 },
  stackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
  stackRowName: { fontFamily: 'Geist-Medium', fontSize: 15, color: colors.ink, flex: 1 },
});
