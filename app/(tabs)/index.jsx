// app/(tabs)/index.jsx
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, Dimensions, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { getAllStacksWithCounts, getSetting, upsertScreenshot } from '../../services/database';
import { colors, spacing, radius, fontSize } from '../../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const GRID_PAD = 20;
const GRID_GAP = 3;
const CELL_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP * 2) / 3;
const CELL_H = CELL_W * (17 / 9);
const FREE_LIMIT = 100;

const CATS = {
  shopping:{ label:'Shopping', bg:'#FFF8F0', accent:'#CC8844' },
  food:    { label:'Food',     bg:'#F0FFF4', accent:'#338844' },
  ticket:  { label:'Travel',   bg:'#F0F4FF', accent:'#3355CC' },
  quote:   { label:'Quote',    bg:'#F8F8F8', accent:'#666666' },
  social:  { label:'Social',   bg:'#FFF0F8', accent:'#CC3388' },
  work:    { label:'Work',     bg:'#F0FFFE', accent:'#336677' },
};

function ScreenshotCell({ shot, onPress }) {
  return (
    <TouchableOpacity style={styles.cell} onPress={() => onPress(shot)} activeOpacity={0.82}>
      {shot.uri ? (
        <Image source={{ uri: shot.uri }} style={styles.cellImg} resizeMode="cover" />
      ) : (
        <View style={[styles.cellImg, { backgroundColor: colors.cream2, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 22 }}>📷</Text>
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
  const [totalOnDevice, setTotalOnDevice] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showNudge, setShowNudge] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState(null);

  async function loadScreenshots() {
    // Request permission
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setPermissionStatus(status);
    if (status !== 'granted') return [];

    // Get screenshots album
    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    const screenshotAlbum = albums.find(a =>
      a.title === 'Screenshots' || a.title === 'Screenshot'
    );

    let assets = [];
    if (screenshotAlbum) {
      const result = await MediaLibrary.getAssetsAsync({
        album: screenshotAlbum,
        mediaType: 'photo',
        sortBy: [['creationTime', false]],
        first: FREE_LIMIT,
      });
      assets = result.assets;
    } else {
      // Fallback: recent photos
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: [['creationTime', false]],
        first: FREE_LIMIT,
      });
      assets = result.assets;
    }

    // Get full asset info for URIs
    const withUris = await Promise.all(
      assets.map(async (asset) => {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        return {
          id: 'ss-' + asset.id,
          localIdentifier: asset.id,
          uri: info.localUri || info.uri,
          capturedAt: asset.creationTime,
          filename: asset.filename,
          inWantList: 0,
          aiCategory: null,
        };
      })
    );

    return withUris;
  }

  async function load() {
    const [allStacks, premium] = await Promise.all([
      getAllStacksWithCounts(),
      getSetting('isPremium'),
    ]);
    setStacks(allStacks);
    setIsPremium(premium === 'true');

    const screenshots = await loadScreenshots();
    setShots(screenshots);
    setTotalOnDevice(screenshots.length);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const displayed = filter === 'all' ? shots : shots;

  const chips = [
    { id: 'all', label: 'All', emoji: '', count: shots.length },
    ...stacks.map(s => ({ id: s.id, label: s.name, emoji: s.emoji, count: s.itemCount || 0 })),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Good morning.</Text>
        <Text style={styles.meta}>
          {permissionStatus !== 'granted'
            ? 'Tap to allow screenshot access'
            : `${shots.length} screenshots · ${stacks.filter(s => !s.isSystem).length} stacks`}
        </Text>
      </View>

      <TouchableOpacity style={styles.searchBar} activeOpacity={0.7}>
        <Text style={{ fontSize: 14 }}>🔍</Text>
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

      {permissionStatus !== 'granted' && permissionStatus !== null && (
        <TouchableOpacity style={styles.permissionBar} onPress={load} activeOpacity={0.8}>
          <Text style={styles.permissionText}>📷 Tap to allow access to your screenshots</Text>
        </TouchableOpacity>
      )}

      {showNudge && shots.length > 0 && (
        <View style={styles.nudge}>
          <Text style={{ fontSize: 16 }}>💡</Text>
          <Text style={styles.nudgeText}>
            <Text style={{ fontFamily: 'Geist-Medium', color: colors.ink }}>{shots.length} screenshots</Text>
            {' '}ready to sort into stacks.
          </Text>
          <TouchableOpacity onPress={() => setShowNudge(false)}>
            <Text style={{ fontSize: 16, color: colors.ink3 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isPremium && shots.length >= FREE_LIMIT && (
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
        renderItem={({ item }) => (
          <ScreenshotCell
            shot={item}
            onPress={s => router.push({ pathname: '/preview', params: { id: s.id, uri: s.uri } })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={shots.length > 0 ? <Text style={styles.gridLabel}>Recent</Text> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>📷</Text>
            <Text style={styles.emptyTitle}>
              {permissionStatus === 'granted' ? 'No screenshots found' : 'Allow access to get started'}
            </Text>
            <Text style={styles.emptyBody}>
              {permissionStatus === 'granted'
                ? 'Pull down to refresh'
                : 'GrabStack needs access to your Screenshots album'}
            </Text>
            {permissionStatus !== 'granted' && (
              <TouchableOpacity style={styles.emptyBtn} onPress={load} activeOpacity={0.88}>
                <Text style={styles.emptyBtnText}>Allow access</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: GRID_PAD, paddingTop: 8, paddingBottom: 2 },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 32, color: colors.ink, letterSpacing: -0.8 },
  meta:   { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink3, marginTop: 2, marginBottom: 14 },
  searchBar: { marginHorizontal: GRID_PAD, marginBottom: 12, backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, height: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchPh:  { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink3 },
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
  permissionBar: { marginHorizontal: GRID_PAD, marginBottom: 10, backgroundColor: colors.blueBg, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)', paddingVertical: 10, paddingHorizontal: 14 },
  permissionText:{ fontFamily: 'Geist-Medium', fontSize: 13, color: colors.blue, textAlign: 'center' },
  nudge: { marginHorizontal: GRID_PAD, marginBottom: 10, backgroundColor: colors.goldBg, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(196,149,106,0.25)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nudgeText: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink, flex: 1, lineHeight: 18 },
  limitBar:  { marginHorizontal: GRID_PAD, marginBottom: 10, backgroundColor: colors.redBg, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(192,57,43,0.15)', paddingVertical: 9, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitText: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.red, flex: 1 },
  limitCta:  { fontFamily: 'Geist-SemiBold', fontSize: 12, color: colors.red },
  gridContent: { paddingHorizontal: GRID_PAD, paddingBottom: 16 },
  gridRow:     { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridLabel:   { fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  cell:        { width: CELL_W, height: CELL_H, borderRadius: radius.xs, overflow: 'hidden', backgroundColor: colors.cream2 },
  cellImg:     { width: '100%', height: '100%' },
  heartPin:    { position: 'absolute', top: 5, right: 5, fontSize: 12 },
  empty:       { paddingTop: 60, alignItems: 'center', gap: 10, paddingHorizontal: 32 },
  emptyTitle:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 22, color: colors.ink, textAlign: 'center' },
  emptyBody:   { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, textAlign: 'center', lineHeight: 20 },
  emptyBtn:    { marginTop: 8, backgroundColor: colors.ink, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 24 },
  emptyBtnText:{ fontFamily: 'Geist-Medium', fontSize: 15, color: colors.cream },
});
