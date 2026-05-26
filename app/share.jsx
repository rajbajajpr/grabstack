// app/share.jsx
// Share a stack as a image collage — captures the grid and shares via native sheet
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share,
  ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { getStackWithCount, getStackItems } from '../services/database';
import { colors, radius } from '../constants/theme';

export default function ShareScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const viewShotRef = useRef(null);

  const [stack, setStack] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const s = await getStackWithCount(id);
        setStack(s);
        const dbItems = await getStackItems(id, { limit: 9 });
        if (dbItems.length === 0) { setLoading(false); return; }
        const { status } = await MediaLibrary.getPermissionsAsync();
        if (status !== 'granted') { setLoading(false); return; }
        const localIds = new Set(dbItems.map(i => i.localIdentifier));
        const uriMap = {};
        let after = undefined;
        let hasMore = true;
        while (hasMore && Object.keys(uriMap).length < localIds.size) {
          const page = await MediaLibrary.getAssetsAsync({
            mediaType: 'photo', sortBy: [['creationTime', false]], first: 100, after,
          });
          page.assets.forEach(a => { if (localIds.has(a.id)) uriMap[a.id] = a.uri; });
          hasMore = page.hasNextPage;
          after = page.endCursor;
          if (page.assets.length === 0) break;
        }
        setItems(dbItems.map(i => ({ ...i, uri: uriMap[i.localIdentifier] || null })));
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [id]);

  async function shareAsImage() {
    if (!viewShotRef.current) return;
    setCapturing(true);
    try {
      const uri = await viewShotRef.current.capture();
      await Share.share({
        url: uri,
        message: `My "${stack?.name}" stack — organised with GrabStack 📚`,
        title: stack?.name,
      });
      setShared(true);
    } catch (e) {
      console.error('Share error:', e);
    }
    setCapturing(false);
  }

  async function shareToWhatsApp() {
    if (!viewShotRef.current) return;
    setCapturing(true);
    try {
      const capturedUri = await viewShotRef.current.capture();
      // Try WhatsApp first, fall back to general share
      Linking.openURL(`whatsapp://send`).catch(() => {});
      setTimeout(async () => {
        await Share.share({
          url: capturedUri,
          message: `My "${stack?.name}" stack — organised with GrabStack 📚`,
        });
      }, 300);
    } catch (e) { console.error(e); }
    setCapturing(false);
  }

  const goBack = () => { try { router.back(); } catch { router.replace('/(tabs)/stacks'); } };

  // The collage that gets captured
  const CollageView = () => (
    <View style={c.collage}>
      {/* Header */}
      <View style={c.collageHeader}>
        <Text style={c.collageEmoji}>{stack?.emoji}</Text>
        <View>
          <Text style={c.collageName}>{stack?.name}</Text>
          <Text style={c.collageSub}>{stack?.itemCount || items.length} screenshots · GrabStack</Text>
        </View>
      </View>
      {/* Grid */}
      <View style={c.collageGrid}>
        {Array(9).fill(null).map((_, i) => {
          const item = items[i];
          return (
            <View key={i} style={c.collageCell}>
              {item?.uri
                ? <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                : <View style={{ flex: 1, backgroundColor: colors.cream3 }} />
              }
            </View>
          );
        })}
      </View>
      {/* Footer */}
      <View style={c.collageFooter}>
        <Text style={c.collageFooterText}>Made with GrabStack</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.nav}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Share stack</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Stack info */}
        <View style={s.stackHeader}>
          <Text style={s.stackEmoji}>{stack?.emoji}</Text>
          <Text style={s.stackName}>{stack?.name}</Text>
          <Text style={s.stackCount}>{stack?.itemCount || items.length} screenshots</Text>
        </View>

        {/* Preview of collage */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={colors.gold} />
            <Text style={s.loadingText}>Loading screenshots…</Text>
          </View>
        ) : (
          <>
            {/* The capturable view */}
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'jpg', quality: 0.92 }}
              style={s.viewShotWrap}
            >
              <CollageView />
            </ViewShot>

            <Text style={s.previewLabel}>This is what gets shared</Text>

            {/* Share buttons */}
            <View style={s.buttons}>
              <TouchableOpacity
                style={[s.mainBtn, (capturing || items.length === 0) && { opacity: 0.5 }]}
                onPress={shareAsImage}
                disabled={capturing || items.length === 0}
                activeOpacity={0.88}
              >
                {capturing
                  ? <ActivityIndicator color={colors.cream} />
                  : <Text style={s.mainBtnText}>{shared ? '✓ Shared!' : '↗  Share image'}</Text>
                }
              </TouchableOpacity>

              <View style={s.optRow}>
                <TouchableOpacity style={s.optBtn} onPress={shareToWhatsApp} activeOpacity={0.8} disabled={capturing}>
                  <Text style={s.optIcon}>💬</Text>
                  <Text style={s.optLabel}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.optBtn} onPress={shareAsImage} activeOpacity={0.8} disabled={capturing}>
                  <Text style={s.optIcon}>📱</Text>
                  <Text style={s.optLabel}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.optBtn} onPress={shareAsImage} activeOpacity={0.8} disabled={capturing}>
                  <Text style={s.optIcon}>📸</Text>
                  <Text style={s.optLabel}>Instagram</Text>
                </TouchableOpacity>
              </View>
            </View>

            {items.length === 0 && (
              <View style={s.emptyNote}>
                <Text style={s.emptyNoteText}>Add screenshots to this stack first before sharing.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Collage styles (fixed dimensions for consistent capture)
const COLLAGE_W = 360;
const CELL_SIZE = (COLLAGE_W - 24 - 8) / 3;

const c = StyleSheet.create({
  collage: { width: COLLAGE_W, backgroundColor: colors.cream, borderRadius: 0, overflow: 'hidden' },
  collageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  collageEmoji: { fontSize: 32 },
  collageName: { fontFamily: 'InstrumentSerif-Regular', fontSize: 20, color: colors.ink, letterSpacing: -0.5 },
  collageSub:  { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, marginTop: 2 },
  collageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 12, paddingBottom: 12 },
  collageCell: { width: CELL_SIZE, height: CELL_SIZE * 1.4, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.cream2 },
  collageFooter: { paddingVertical: 10, alignItems: 'center', borderTopWidth: 0.5, borderColor: colors.border },
  collageFooterText: { fontFamily: 'Geist-Medium', fontSize: 11, color: colors.ink3, letterSpacing: 0.5 },
});

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.cream },
  nav:     { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back:    { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.gold, width: 60 },
  navTitle:{ fontFamily: 'Geist-Medium', fontSize: 16, color: colors.ink },
  stackHeader: { alignItems: 'center', paddingVertical: 16 },
  stackEmoji:  { fontSize: 40, marginBottom: 8 },
  stackName:   { fontFamily: 'InstrumentSerif-Regular', fontSize: 24, color: colors.ink, letterSpacing: -0.5, marginBottom: 4 },
  stackCount:  { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink3 },
  loadingBox:  { height: 160, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2 },
  viewShotWrap:{ alignSelf: 'center', marginHorizontal: 24, marginBottom: 8, borderRadius: radius.sm, overflow: 'hidden', shadowColor: '#1A1916', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  previewLabel:{ fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, textAlign: 'center', marginBottom: 20 },
  buttons: { paddingHorizontal: 24 },
  mainBtn: { backgroundColor: colors.ink, borderRadius: radius.sm, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  mainBtnText: { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.cream },
  optRow:  { flexDirection: 'row', gap: 10 },
  optBtn:  { flex: 1, backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', gap: 5 },
  optIcon: { fontSize: 22 },
  optLabel:{ fontFamily: 'Geist-Medium', fontSize: 12, color: colors.ink },
  emptyNote: { marginHorizontal: 24, marginTop: 16, backgroundColor: colors.goldBg, borderRadius: radius.sm, padding: 14 },
  emptyNoteText: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2, textAlign: 'center' },
});
