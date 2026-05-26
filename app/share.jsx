// app/share.jsx
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import ViewShot from 'react-native-view-shot';
import RNShare from 'react-native-share';
import { getStackWithCount, getStackItems } from '../services/database';
import { colors, radius } from '../constants/theme';

const COLLAGE_W = 360;
const CELL_SIZE = (COLLAGE_W - 24 - 8) / 3;

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
        const dbItems = await getStackItems(id, { limit: 200 });
        if (dbItems.length === 0) { setLoading(false); return; }
        const { status } = await MediaLibrary.getPermissionsAsync();
        if (status !== 'granted') { setLoading(false); return; }
        const localIds = new Set(dbItems.map(i => i.localIdentifier));
        const uriMap = {};
        let after = undefined;
        let hasMore = true;
        let attempts = 0;
        while (hasMore && Object.keys(uriMap).length < localIds.size && attempts < 20) {
          const page = await MediaLibrary.getAssetsAsync({
            mediaType: 'photo', sortBy: [['creationTime', false]], first: 200, after,
          });
          page.assets.forEach(a => { if (localIds.has(a.id)) uriMap[a.id] = a.uri; });
          hasMore = page.hasNextPage;
          after = page.endCursor;
          attempts++;
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
      const captured = await viewShotRef.current.capture();
      const dest = FileSystem.cacheDirectory + `grabstack_stack_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: captured, to: dest });
      await RNShare.open({
        url: dest, type: 'image/jpeg',
        message: `My "${stack?.name}" stack — organised with GrabStack 📚`,
        failOnCancel: false,
      });
      setShared(true);
    } catch (e) {
      if (!String(e).includes('cancel') && !String(e).includes('dismiss')) console.error(e);
    }
    setCapturing(false);
  }

  async function shareFullRes() {
    const uris = items.filter(i => i.uri).map(i => i.uri);
    if (uris.length === 0) return;
    setCapturing(true);
    try {
      const destUris = await Promise.all(uris.map(async (u, i) => {
        const dest = FileSystem.cacheDirectory + `grabstack_img_${i}_${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: u, to: dest });
        return dest;
      }));
      await RNShare.open({
        urls: destUris, type: 'image/*',
        message: `My "${stack?.name}" stack — organised with GrabStack 📚`,
        failOnCancel: false,
      });
      setShared(true);
    } catch (e) {
      if (!String(e).includes('cancel') && !String(e).includes('dismiss')) console.error(e);
    }
    setCapturing(false);
  }

  async function shareToWhatsApp() {
    if (!viewShotRef.current) return;
    setCapturing(true);
    try {
      const captured = await viewShotRef.current.capture();
      const dest = FileSystem.cacheDirectory + `grabstack_wa_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: captured, to: dest });
      await RNShare.shareSingle({
        url: dest, type: 'image/jpeg',
        social: RNShare.Social.WHATSAPP,
        message: `My "${stack?.name}" stack — organised with GrabStack 📚`,
        failOnCancel: false,
      });
      setShared(true);
    } catch (e) {
      if (!String(e).includes('cancel')) await shareAsImage();
    }
    setCapturing(false);
  }

  const goBack = () => { try { router.back(); } catch { router.replace('/(tabs)/stacks'); } };
  const totalCount = stack?.itemCount || items.length;
  const showScrollHint = !loading && items.length > 6;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Nav */}
      <View style={s.nav}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Share stack</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Floating scroll hint — sits above tab bar, always visible */}
      {showScrollHint && (
        <View style={s.floatingHint} pointerEvents="none">
          <View style={s.floatingHintPill}>
            <Text style={s.floatingHintText}>↓ Scroll down to share</Text>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Stack header */}
        <View style={s.stackHeader}>
          <Text style={s.stackEmoji}>{stack?.emoji}</Text>
          <Text style={s.stackName}>{stack?.name}</Text>
          <Text style={s.stackCount}>{totalCount} screenshots</Text>
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={colors.gold} />
            <Text style={s.loadingText}>Loading screenshots…</Text>
          </View>
        ) : (
          <>
            {/* Capturable collage */}
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'jpg', quality: 0.92 }}
              style={s.viewShotWrap}
            >
              <View style={c.collage}>
                <View style={c.collageHeader}>
                  <Text style={c.collageEmoji}>{stack?.emoji}</Text>
                  <View>
                    <Text style={c.collageName}>{stack?.name}</Text>
                    <Text style={c.collageSub}>{totalCount} screenshots · GrabStack</Text>
                  </View>
                </View>
                <View style={c.collageGrid}>
                  {items.map((item, i) => (
                    <View key={i} style={c.collageCell}>
                      {item?.uri
                        ? <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        : <View style={{ flex: 1, backgroundColor: colors.cream3 }} />
                      }
                    </View>
                  ))}
                </View>
                <View style={c.collageFooter}>
                  <Text style={c.collageFooterText}>Made with GrabStack</Text>
                </View>
              </View>
            </ViewShot>

            <Text style={s.previewLabel}>This is what gets shared</Text>

            {/* Share options */}
            <View style={s.buttons}>
              <View style={s.optionBlock}>
                <Text style={s.optionTitle}>Share as card</Text>
                <Text style={s.optionDesc}>A single image of your stack — great for WhatsApp, Instagram, iMessage</Text>
                <TouchableOpacity
                  style={[s.mainBtn, (capturing || items.length === 0) && { opacity: 0.5 }]}
                  onPress={shareAsImage}
                  disabled={capturing || items.length === 0}
                  activeOpacity={0.88}
                >
                  {capturing
                    ? <ActivityIndicator color={colors.cream} />
                    : <Text style={s.mainBtnText}>{shared ? '✓ Shared!' : '↗  Share card'}</Text>
                  }
                </TouchableOpacity>
                <View style={s.optRow}>
                  <TouchableOpacity style={s.optBtn} onPress={shareToWhatsApp} disabled={capturing} activeOpacity={0.8}>
                    <Text style={s.optIcon}>💬</Text>
                    <Text style={s.optLabel}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.optBtn} onPress={shareAsImage} disabled={capturing} activeOpacity={0.8}>
                    <Text style={s.optIcon}>📱</Text>
                    <Text style={s.optLabel}>Messages</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.optBtn} onPress={shareAsImage} disabled={capturing} activeOpacity={0.8}>
                    <Text style={s.optIcon}>📸</Text>
                    <Text style={s.optLabel}>Instagram</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.optionBlock}>
                <Text style={s.optionTitle}>Share all images</Text>
                <Text style={s.optionDesc}>All {items.length} screenshots at full resolution — recipient can save them to their camera roll</Text>
                <TouchableOpacity
                  style={[s.fullResBtn, (capturing || items.length === 0) && { opacity: 0.5 }]}
                  onPress={shareFullRes}
                  disabled={capturing || items.length === 0}
                  activeOpacity={0.88}
                >
                  {capturing
                    ? <ActivityIndicator color={colors.ink} />
                    : <Text style={s.fullResBtnText}>↗  Share {items.length} full-res images</Text>
                  }
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

const c = StyleSheet.create({
  collage:       { width: COLLAGE_W, backgroundColor: colors.cream, overflow: 'hidden' },
  collageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  collageEmoji:  { fontSize: 32 },
  collageName:   { fontFamily: 'InstrumentSerif-Regular', fontSize: 20, color: colors.ink, letterSpacing: -0.5 },
  collageSub:    { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, marginTop: 2 },
  collageGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 12, paddingBottom: 12 },
  collageCell:   { width: CELL_SIZE, height: CELL_SIZE * 1.4, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.cream2 },
  collageFooter: { paddingVertical: 10, alignItems: 'center', borderTopWidth: 0.5, borderColor: colors.border },
  collageFooterText: { fontFamily: 'Geist-Medium', fontSize: 11, color: colors.ink3, letterSpacing: 0.5 },
});

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.cream },
  nav:         { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back:        { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.gold, width: 60 },
  navTitle:    { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.ink },
  floatingHint:     { position: 'absolute', bottom: 110, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  floatingHintPill: { backgroundColor: 'rgba(26,25,22,0.82)', borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 18 },
  floatingHintText: { fontFamily: 'Geist-Medium', fontSize: 13, color: '#fff' },
  stackHeader: { alignItems: 'center', paddingVertical: 16 },
  stackEmoji:  { fontSize: 40, marginBottom: 8 },
  stackName:   { fontFamily: 'InstrumentSerif-Regular', fontSize: 24, color: colors.ink, letterSpacing: -0.5, marginBottom: 4 },
  stackCount:  { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink3 },
  loadingBox:  { height: 160, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2 },
  viewShotWrap:{ alignSelf: 'center', marginHorizontal: 24, marginBottom: 8, borderRadius: radius.sm, overflow: 'hidden', shadowColor: '#1A1916', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  previewLabel:{ fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, textAlign: 'center', marginBottom: 20 },
  buttons:     { paddingHorizontal: 24 },
  optionBlock: { marginBottom: 4 },
  optionTitle: { fontFamily: 'Geist-SemiBold', fontSize: 14, color: colors.ink, marginBottom: 4 },
  optionDesc:  { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2, lineHeight: 18, marginBottom: 12 },
  divider:     { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  mainBtn:     { backgroundColor: colors.ink, borderRadius: radius.sm, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  mainBtnText: { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.cream },
  fullResBtn:  { backgroundColor: colors.cream2, borderRadius: radius.sm, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border2 },
  fullResBtnText: { fontFamily: 'Geist-Medium', fontSize: 15, color: colors.ink },
  optRow:      { flexDirection: 'row', gap: 10 },
  optBtn:      { flex: 1, backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', gap: 5 },
  optIcon:     { fontSize: 22 },
  optLabel:    { fontFamily: 'Geist-Medium', fontSize: 12, color: colors.ink },
  emptyNote:   { marginHorizontal: 24, marginTop: 16, backgroundColor: colors.goldBg, borderRadius: radius.sm, padding: 14 },
  emptyNoteText: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2, textAlign: 'center' },
});