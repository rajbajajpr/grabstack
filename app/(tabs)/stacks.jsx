// app/(tabs)/stacks.jsx
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllStacksWithCounts, getStackItems, createStack } from '../../services/database';
import { colors, radius, EMOJI_OPTIONS, STACK_TEMPLATES } from '../../constants/theme';

function MiniThumb({ uri }) {
  if (!uri) return <View style={{ flex: 1, height: '100%', backgroundColor: colors.cream3 }} />;
  return <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />;
}

export default function StacksScreen() {
  const router = useRouter();
  const [stacks, setStacks] = useState([]);
  const [previews, setPreviews] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [stackName, setStackName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📁');

  async function load() {
    try {
      const all = await getAllStacksWithCounts();
      setStacks(all);
      const p = {};
      await Promise.all(all.map(async s => {
        try {
          const items = await getStackItems(s.id, { limit: 5 });
          p[s.id] = items;
        } catch (e) { p[s.id] = []; }
      }));
      setPreviews(p);
    } catch (e) { console.error('Stacks load error:', e); }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleCreate() {
    if (!stackName.trim()) return;
    try {
      await createStack({ name: stackName.trim(), emoji: selectedEmoji });
      setModalOpen(false);
      setStackName('');
      setSelectedEmoji('📁');
      load();
    } catch (e) { console.error(e); }
  }

  function useTemplate(tpl) {
    createStack({ name: tpl.name, emoji: tpl.emoji })
      .then(() => { setModalOpen(false); load(); })
      .catch(console.error);
  }

  const wantList = stacks.find(s => s.id === 'want-list');
  const userStacks = stacks.filter(s => !s.isSystem);
  const wantItems = previews['want-list'] || [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Stacks</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalOpen(true)} activeOpacity={0.8}>
          <Text style={s.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* Want list */}
        {wantList && (
          <View style={s.wantCard}>
            <View style={s.wantTop}>
              <View style={s.wantLeft}>
                <Text style={{ fontSize: 20 }}>❤️</Text>
                <Text style={s.wantName}>Want list</Text>
              </View>
              <Text style={s.wantCount}>{wantList.itemCount || 0} items</Text>
            </View>
            <View style={s.wantThumbs}>
              {Array(5).fill(null).map((_, i) => (
                <View key={i} style={s.wantThumb}>
                  <MiniThumb uri={wantItems[i]?.uri} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* User stacks */}
        {userStacks.map(stack => {
          const items = previews[stack.id] || [];
          return (
            <TouchableOpacity
              key={stack.id}
              style={s.stackCard}
              onPress={() => router.push({ pathname: '/stack-detail', params: { id: stack.id } })}
              activeOpacity={0.88}
            >
              <View style={s.stackCardTop}>
                <View style={s.stackCardLeft}>
                  <Text style={s.stackEmoji}>{stack.emoji}</Text>
                  <Text style={s.stackName}>{stack.name}</Text>
                </View>
                <Text style={s.stackCount}>{stack.itemCount || 0} items →</Text>
              </View>
              <View style={s.thumbRow}>
                {Array(4).fill(null).map((_, i) => (
                  <View key={i} style={s.thumbCell}>
                    <MiniThumb uri={items[i]?.uri} />
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {userStacks.length === 0 && (
          <TouchableOpacity style={s.createPrompt} onPress={() => setModalOpen(true)} activeOpacity={0.8}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📁</Text>
            <Text style={s.createPromptTitle}>Create your first stack</Text>
            <Text style={s.createPromptBody}>Group screenshots by topic, mood, or anything you like.</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Add Stack Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={s.modalBg} onPress={() => setModalOpen(false)}>
          <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>New stack</Text>

            <Text style={s.sectionLabel}>Start from a template</Text>
            <View style={s.templateGrid}>
              {STACK_TEMPLATES.map((tpl, i) => (
                <TouchableOpacity key={i} style={s.templateBtn} onPress={() => useTemplate(tpl)} activeOpacity={0.8}>
                  <Text style={{ fontSize: 20 }}>{tpl.emoji}</Text>
                  <Text style={s.templateName}>{tpl.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sectionLabel}>Or name your own</Text>
            <TextInput
              style={s.textInput}
              placeholder="Stack name…"
              placeholderTextColor={colors.ink3}
              value={stackName}
              onChangeText={setStackName}
              maxLength={30}
              autoFocus
            />
            <View style={s.emojiGrid}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiOpt, selectedEmoji === e && s.emojiOptOn]}
                  onPress={() => setSelectedEmoji(e)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.createBtn} onPress={handleCreate} activeOpacity={0.88}>
              <Text style={s.createBtnText}>Create stack</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  addBtn: { width: 36, height: 36, backgroundColor: colors.cream2, borderRadius: 18, borderWidth: 1, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 24, color: colors.ink2, lineHeight: 30 },
  wantCard:  { marginHorizontal: 24, marginBottom: 12, backgroundColor: '#FBF5EE', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(196,149,106,0.22)', padding: 18 },
  wantTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  wantLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wantName:  { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.ink },
  wantCount: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.gold },
  wantThumbs:{ flexDirection: 'row', gap: 5 },
  wantThumb: { flex: 1, height: 52, borderRadius: radius.xs, overflow: 'hidden', backgroundColor: 'rgba(196,149,106,0.1)' },
  stackCard: { marginHorizontal: 24, marginBottom: 10, backgroundColor: colors.cream, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', shadowColor: '#1A1916', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  stackCardTop: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stackCardLeft:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  stackEmoji:   { fontSize: 20 },
  stackName:    { fontFamily: 'Geist-Medium', fontSize: 15, color: colors.ink },
  stackCount:   { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3 },
  thumbRow:     { flexDirection: 'row', gap: 2, height: 72 },
  thumbCell:    { flex: 1, overflow: 'hidden', backgroundColor: colors.cream2 },
  createPrompt: { margin: 24, padding: 24, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', gap: 8 },
  createPromptTitle: { fontFamily: 'InstrumentSerif-Regular', fontSize: 20, color: colors.ink },
  createPromptBody:  { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, textAlign: 'center', lineHeight: 20 },
  modalBg:     { flex: 1, backgroundColor: 'rgba(26,25,22,0.42)', justifyContent: 'flex-end' },
  modalSheet:  { backgroundColor: colors.cream, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.border, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.cream3, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  modalTitle:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 24, color: colors.ink, marginBottom: 18 },
  sectionLabel:{ fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  templateGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  templateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 12, width: '47%' },
  templateName:{ fontFamily: 'Geist-Medium', fontSize: 12, color: colors.ink },
  textInput:   { backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border2, height: 48, paddingHorizontal: 16, fontFamily: 'Geist-Regular', fontSize: 16, color: colors.ink, marginBottom: 14 },
  emojiGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  emojiOpt:    { width: 44, height: 44, borderRadius: radius.xs, backgroundColor: colors.cream2, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emojiOptOn:  { borderColor: colors.ink },
  createBtn:   { backgroundColor: colors.ink, borderRadius: radius.sm, height: 52, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { fontFamily: 'Geist-Medium', fontSize: 16, color: colors.cream },
});
