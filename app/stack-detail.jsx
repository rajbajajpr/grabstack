// app/stack-detail.jsx
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  Dimensions, Modal, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { getStackWithCount, getStackItems, updateStack, deleteStack } from '../services/database';
import { storeShot, clearOld } from '../services/shotCache';
import { colors, radius, EMOJI_OPTIONS } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const GRID_PAD = 16;
const GRID_GAP = 8;
const CELL_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP * 2) / 3;
const CELL_H = CELL_W * (17 / 9);

export default function StackDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [stack, setStack] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('📁');

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const s = await getStackWithCount(id);
      setStack(s);
      setEditName(s?.name || '');
      setEditEmoji(s?.emoji || '📁');

      const dbItems = await getStackItems(id, { limit: 200 });
      if (dbItems.length === 0) { setItems([]); setLoading(false); return; }

      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== 'granted') {
        setItems(dbItems.map(i => ({ ...i, uri: null })));
        setLoading(false);
        return;
      }

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

      setItems(dbItems.map(item => ({ ...item, uri: uriMap[item.localIdentifier] || null })));
    } catch (e) { console.error('Stack detail error:', e); }
    setLoading(false);
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    try {
      await updateStack(id, { name: editName.trim(), emoji: editEmoji });
      setStack(prev => ({ ...prev, name: editName.trim(), emoji: editEmoji }));
      setEditOpen(false);
    } catch (e) { console.error(e); }
  }

  async function handleDelete() {
    try {
      await deleteStack(id);
      router.replace('/(tabs)/stacks');
    } catch (e) { console.error(e); }
  }

  const goBack = () => { try { router.back(); } catch (e) { router.replace('/(tabs)/stacks'); } };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.nav}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={{ width: 60 }}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.stackTitle} numberOfLines={1}>{stack?.emoji} {stack?.name}</Text>
        <TouchableOpacity onPress={() => setEditOpen(true)} style={s.editBtn} activeOpacity={0.7}>
          <Text style={s.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.itemCount}>{stack?.itemCount || items.length} screenshots</Text>

      {loading ? (
        <View style={s.loading}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>⏳</Text>
          <Text style={s.loadingText}>Loading screenshots…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          numColumns={3}
          contentContainerStyle={s.grid}
          columnWrapperStyle={{ gap: GRID_GAP, marginBottom: GRID_GAP }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
              <Text style={s.emptyTitle}>Stack is empty</Text>
              <Text style={s.emptyBody}>Tap any screenshot in the All tab and add it to this stack</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.cell}
              onPress={() => if(item.uri) storeShot(item); clearOld(); router.push({ pathname: '/preview', params: { id: item.id } })}
              activeOpacity={0.82}
            >
              {item.uri
                ? <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <View style={s.noUri}><Text style={{ fontSize: 20 }}>📷</Text></View>
              }
            </TouchableOpacity>
          )}
        />
      )}

      {/* Edit modal */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={s.modalBg} onPress={() => setEditOpen(false)}>
          <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Edit stack</Text>

            <TextInput
              style={s.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Stack name…"
              placeholderTextColor={colors.ink3}
              maxLength={30}
            />

            <Text style={s.sectionLabel}>Icon</Text>
            <View style={s.emojiGrid}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiOpt, editEmoji === e && s.emojiOptOn]}
                  onPress={() => setEditEmoji(e)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={handleSaveEdit} activeOpacity={0.88}>
              <Text style={s.saveBtnText}>Save changes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.88}>
              <Text style={s.deleteBtnText}>Delete stack</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.cream },
  nav:       { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back:      { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.gold },
  stackTitle:{ fontFamily: 'InstrumentSerif-Regular', fontSize: 20, color: colors.ink, flex: 1, textAlign: 'center' },
  editBtn:   { backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border2, paddingVertical: 7, paddingHorizontal: 14 },
  editBtnText:{ fontFamily: 'Geist-Medium', fontSize: 13, color: colors.ink },
  itemCount: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, textAlign: 'center', marginBottom: 12 },
  grid:      { paddingHorizontal: GRID_PAD, paddingBottom: 24 },
  cell:      { width: CELL_W, height: CELL_H, borderRadius: radius.xs, overflow: 'hidden', backgroundColor: colors.cream2 },
  noUri:     { flex: 1, backgroundColor: colors.cream2, alignItems: 'center', justifyContent: 'center' },
  loading:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:{ fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2 },
  empty:     { paddingTop: 80, alignItems: 'center', paddingHorizontal: 32, gap: 8 },
  emptyTitle:{ fontFamily: 'InstrumentSerif-Regular', fontSize: 22, color: colors.ink, textAlign: 'center' },
  emptyBody: { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, textAlign: 'center', lineHeight: 20 },
  modalBg:   { flex: 1, backgroundColor: 'rgba(26,25,22,0.42)', justifyContent: 'flex-end' },
  modalSheet:{ backgroundColor: colors.cream, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.border, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  modalHandle:{ width: 40, height: 4, backgroundColor: colors.cream3, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  modalTitle:{ fontFamily: 'InstrumentSerif-Regular', fontSize: 24, color: colors.ink, marginBottom: 18 },
  sectionLabel:{ fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  textInput: { backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border2, height: 48, paddingHorizontal: 16, fontFamily: 'Geist-Regular', fontSize: 16, color: colors.ink, marginBottom: 16 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  emojiOpt:  { width: 44, height: 44, borderRadius: radius.xs, backgroundColor: colors.cream2, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emojiOptOn:{ borderColor: colors.ink },
  saveBtn:   { backgroundColor: colors.ink, borderRadius: radius.sm, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  saveBtnText:{ fontFamily: 'Geist-Medium', fontSize: 16, color: colors.cream },
  deleteBtn: { backgroundColor: colors.redBg, borderRadius: radius.sm, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(192,57,43,0.2)' },
  deleteBtnText:{ fontFamily: 'Geist-Medium', fontSize: 15, color: colors.red },
});
