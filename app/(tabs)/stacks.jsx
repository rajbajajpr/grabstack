// app/(tabs)/stacks.jsx

import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image, Modal, TextInput, Pressable,  } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllStacksWithCounts, getStackItems, createStack } from '../../services/database';
import { getAssetUri } from '../../services/media';
import { colors, spacing, radius, fontSize, EMOJI_OPTIONS, STACK_TEMPLATES } from '../../constants/theme';

// Small thumbnail that loads its own URI
function MiniThumb({ shot, style }) {
  const [uri, setUri] = useState(null);
  useCallback(() => {
    if (shot?.localIdentifier) {
      getAssetUri(shot.localIdentifier).then(setUri);
    }
  }, [shot?.localIdentifier])();

  return (
    <View style={[{ backgroundColor: colors.cream2 }, style]}>
      {uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
    </View>
  );
}

export default function StacksScreen() {
  const router = useRouter();
  const [stacks, setStacks] = useState([]);
  const [stackPreviews, setStackPreviews] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [stackName, setStackName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📁');

  async function load() {
    const all = await getAllStacksWithCounts();
    setStacks(all);
    // Load preview thumbnails for each stack (first 4 shots)
    const previews = {};
    await Promise.all(all.map(async s => {
      const items = await getStackItems(s.id, { limit: 4 });
      previews[s.id] = items;
    }));
    setStackPreviews(previews);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleCreateStack() {
    if (!stackName.trim()) return;
    await createStack({ name: stackName.trim(), emoji: selectedEmoji });
    setModalOpen(false);
    setStackName('');
    setSelectedEmoji('📁');
    load();
  }

  function useTemplate(tpl) {
    createStack({ name: tpl.name, emoji: tpl.emoji }).then(() => {
      setModalOpen(false);
      load();
    });
  }

  const wantList = stacks.find(s => s.id === 'want-list');
  const userStacks = stacks.filter(s => !s.isSystem);
  const wantItems = stackPreviews['want-list'] || [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stacks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Want list */}
        {wantList && (
          <TouchableOpacity
            style={styles.wantCard}
            activeOpacity={0.88}
            onPress={() => router.push({ pathname: '/stack-detail', params: { id: 'want-list' } })}
          >
            <View style={styles.wantTop}>
              <View style={styles.wantLeft}>
                <Text>❤️</Text>
                <Text style={styles.wantName}>Want list</Text>
              </View>
              <Text style={styles.wantCount}>{wantList.itemCount} items</Text>
            </View>
            <View style={styles.wantThumbs}>
              {Array(5).fill(null).map((_, i) => (
                <MiniThumb
                  key={i}
                  shot={wantItems[i]}
                  style={styles.wantThumb}
                />
              ))}
            </View>
          </TouchableOpacity>
        )}

        {/* User stacks */}
        {userStacks.map(stack => {
          const items = stackPreviews[stack.id] || [];
          return (
            <TouchableOpacity
              key={stack.id}
              style={styles.stackCard}
              activeOpacity={0.88}
              onPress={() => router.push({ pathname: '/stack-detail', params: { id: stack.id } })}
            >
              <View style={styles.stackCardTop}>
                <View style={styles.stackCardLeft}>
                  <Text style={styles.stackEmoji}>{stack.emoji}</Text>
                  <Text style={styles.stackName}>{stack.name}</Text>
                </View>
                <View style={styles.stackCardRight}>
                  <Text style={styles.stackCount}>{stack.itemCount}</Text>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={e => { e.stopPropagation(); router.push({ pathname: '/share', params: { id: stack.id } }); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.shareBtnText}>↗ Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.thumbRow}>
                {Array(4).fill(null).map((_, i) => (
                  <MiniThumb key={i} shot={items[i]} style={styles.thumbCell} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {userStacks.length === 0 && (
          <TouchableOpacity style={styles.createPrompt} onPress={() => setModalOpen(true)} activeOpacity={0.8}>
            <Text style={styles.createPromptEmoji}>📁</Text>
            <Text style={styles.createPromptTitle}>Create your first stack</Text>
            <Text style={styles.createPromptBody}>Group your screenshots by topic, mood, or anything you like.</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Add Stack Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New stack</Text>

            <Text style={styles.sectionLabel}>Start from a template</Text>
            <View style={styles.templateGrid}>
              {STACK_TEMPLATES.map((tpl, i) => (
                <TouchableOpacity key={i} style={styles.templateBtn} onPress={() => useTemplate(tpl)} activeOpacity={0.8}>
                  <Text style={styles.templateEmoji}>{tpl.emoji}</Text>
                  <Text style={styles.templateName}>{tpl.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Or create your own</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Name your stack…"
              placeholderTextColor={colors.ink3}
              value={stackName}
              onChangeText={setStackName}
              maxLength={30}
              autoFocus
            />

            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiOpt, selectedEmoji === e && styles.emojiOptOn]}
                  onPress={() => setSelectedEmoji(e)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emojiChar}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.createBtn} onPress={handleCreateStack} activeOpacity={0.88}>
              <Text style={styles.createBtnText}>Create stack</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 34, color: colors.ink, letterSpacing: -0.8 },
  addBtn: { width: 36, height: 36, backgroundColor: colors.cream2, borderRadius: 18, borderWidth: 1, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 22, color: colors.ink2, lineHeight: 30 },

  wantCard: { marginHorizontal: spacing.xxl, marginBottom: 12, backgroundColor: '#FBF5EE', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(196,149,106,0.22)', padding: 18 },
  wantTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  wantLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wantName: { fontFamily: 'Geist-Medium', fontSize: fontSize.xl, color: colors.ink },
  wantCount:{ fontFamily: 'Geist-Regular', fontSize: 13, color: colors.gold },
  wantThumbs: { flexDirection: 'row', gap: 5 },
  wantThumb:  { flex: 1, height: 48, borderRadius: radius.xs, overflow: 'hidden', backgroundColor: 'rgba(196,149,106,0.1)' },

  stackCard: { marginHorizontal: spacing.xxl, marginBottom: 10, backgroundColor: colors.cream, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', shadowColor: '#1A1916', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  stackCardTop: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stackCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stackCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stackEmoji: { fontSize: 20 },
  stackName:  { fontFamily: 'Geist-Medium', fontSize: 15, color: colors.ink },
  stackCount: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3 },
  shareBtn:   { backgroundColor: colors.cream2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 4, paddingHorizontal: 10 },
  shareBtnText: { fontFamily: 'Geist-Medium', fontSize: 11, color: colors.ink2 },
  thumbRow:   { flexDirection: 'row', gap: 2, height: 68 },
  thumbCell:  { flex: 1, overflow: 'hidden' },

  createPrompt: { margin: spacing.xxl, padding: spacing.xxl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', gap: spacing.sm },
  createPromptEmoji: { fontSize: 36, marginBottom: 4 },
  createPromptTitle: { fontFamily: 'InstrumentSerif-Regular', fontSize: 20, color: colors.ink },
  createPromptBody:  { fontFamily: 'Geist-Regular', fontSize: fontSize.md, color: colors.ink2, textAlign: 'center', lineHeight: 19 },

  modalBg:    { flex: 1, backgroundColor: 'rgba(26,25,22,0.42)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.border, padding: spacing.xxl, paddingBottom: 40, maxHeight: '90%' },
  modalHandle:{ width: 40, height: 4, backgroundColor: colors.cream3, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  modalTitle: { fontFamily: 'InstrumentSerif-Regular', fontSize: 24, color: colors.ink, marginBottom: 18 },
  sectionLabel:{ fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  templateGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  templateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 14, width: '47%' },
  templateEmoji:{ fontSize: 20 },
  templateName: { fontFamily: 'Geist-Medium', fontSize: 13, color: colors.ink },
  textInput:  { backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border2, height: 50, paddingHorizontal: 16, fontFamily: 'Geist-Regular', fontSize: 16, color: colors.ink, marginBottom: 14 },
  emojiGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  emojiOpt:   { width: 44, height: 44, borderRadius: radius.xs, backgroundColor: colors.cream2, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emojiOptOn: { borderColor: colors.ink },
  emojiChar:  { fontSize: 22 },
  createBtn:  { backgroundColor: colors.ink, borderRadius: radius.sm, height: 54, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.cream },
});
