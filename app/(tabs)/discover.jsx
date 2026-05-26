// app/(tabs)/discover.jsx
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllStacksWithCounts, createStack } from '../../services/database';
import { colors, radius } from '../../constants/theme';

const COLLECTIONS = [
  {
    id: 'lifestyle',
    title: 'Lifestyle',
    emoji: '✨',
    stacks: [
      { name: 'Recipes to try', emoji: '🍳', desc: 'Food inspo, new dishes, meal ideas' },
      { name: 'Outfit ideas', emoji: '👗', desc: 'Looks you love, style references' },
      { name: 'Home inspo', emoji: '🏠', desc: 'Decor, furniture, room ideas' },
      { name: 'Fitness goals', emoji: '💪', desc: 'Workouts, progress, motivation' },
      { name: 'Beauty & skincare', emoji: '💄', desc: 'Products, routines, tutorials' },
    ],
  },
  {
    id: 'travel',
    title: 'Travel',
    emoji: '✈️',
    stacks: [
      { name: 'Places to visit', emoji: '🗺️', desc: 'Dream destinations, bucket list' },
      { name: 'Hotels & stays', emoji: '🏨', desc: 'Accommodation ideas and bookmarks' },
      { name: 'Restaurants abroad', emoji: '🍽️', desc: 'Spots to eat when you\'re away' },
      { name: 'Packing lists', emoji: '🧳', desc: 'What to bring, travel essentials' },
    ],
  },
  {
    id: 'work',
    title: 'Work & Learning',
    emoji: '💼',
    stacks: [
      { name: 'Work research', emoji: '📊', desc: 'Articles, data, references' },
      { name: 'Design inspiration', emoji: '🎨', desc: 'UI, colour palettes, typography' },
      { name: 'Ideas & notes', emoji: '💡', desc: 'Quick captures to revisit later' },
      { name: 'Reading list', emoji: '📚', desc: 'Articles and long reads to save' },
    ],
  },
  {
    id: 'shopping',
    title: 'Shopping',
    emoji: '🛍️',
    stacks: [
      { name: 'Want list', emoji: '❤️', desc: 'Things you love but haven\'t bought' },
      { name: 'Gift ideas', emoji: '🎁', desc: 'Present ideas for people you love' },
      { name: 'Tech & gadgets', emoji: '📱', desc: 'Devices and accessories to buy' },
      { name: 'Sale finds', emoji: '🏷️', desc: 'Deals and discounts worth saving' },
    ],
  },
  {
    id: 'personal',
    title: 'Personal',
    emoji: '🌱',
    stacks: [
      { name: 'Memories', emoji: '📸', desc: 'Moments worth keeping' },
      { name: 'Goals & vision', emoji: '🎯', desc: 'What you\'re working towards' },
      { name: 'Quotes I love', emoji: '💬', desc: 'Words that stuck with you' },
      { name: 'Entertainment', emoji: '🎬', desc: 'Shows, films, music to check out' },
    ],
  },
];

const TIPS = [
  {
    icon: '✦',
    title: 'Long-press to bulk sort',
    body: 'On the All tab, long-press any screenshot to enter select mode. Tap more to add, then move them all to a stack at once.',
  },
  {
    icon: '📅',
    title: 'Filter by month',
    body: 'Tap the calendar icon on the All tab to filter screenshots by month — great for finding that thing you saved last week.',
  },
  {
    icon: '↗',
    title: 'Share a whole stack',
    body: 'Inside any stack, tap the share icon to send a collage card or all full-resolution images to anyone.',
  },
  {
    icon: '✦',
    title: 'AI Sort saves time',
    body: 'Let Claude look at your screenshots and suggest stacks automatically. Free users get 3 tries — upgrade for more.',
  },
  {
    icon: '❤️',
    title: 'Want list is built in',
    body: 'Tap the heart on any screenshot to add it to your Want list — a built-in stack for things you love.',
  },
  {
    icon: '✏️',
    title: 'Edit stacks anytime',
    body: 'Inside any stack, tap Edit to rename it, change the emoji, or delete it entirely.',
  },
];

function TemplateCard({ item, existingNames, onAdd }) {
  const already = existingNames.includes(item.name);
  return (
    <TouchableOpacity
      style={[s.templateCard, already && s.templateCardDone]}
      onPress={() => !already && onAdd(item)}
      activeOpacity={already ? 1 : 0.82}
    >
      <Text style={s.templateEmoji}>{item.emoji}</Text>
      <View style={s.templateMeta}>
        <Text style={[s.templateName, already && { color: colors.ink3 }]}>{item.name}</Text>
        <Text style={s.templateDesc} numberOfLines={1}>{item.desc}</Text>
      </View>
      <View style={[s.templateBadge, already && s.templateBadgeDone]}>
        <Text style={[s.templateBadgeText, already && { color: colors.ink3 }]}>
          {already ? '✓ Added' : '+ Add'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [existingNames, setExistingNames] = useState([]);
  const [openCollection, setOpenCollection] = useState(null);

  useFocusEffect(useCallback(() => {
    async function load() {
      const stacks = await getAllStacksWithCounts();
      setExistingNames(stacks.map(s => s.name));
    }
    load();
  }, []));

  async function addStack(item) {
    try {
      await createStack({ name: item.name, emoji: item.emoji });
      setExistingNames(prev => [...prev, item.name]);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Discover</Text>
        <Text style={s.sub}>Stack ideas and tips to get the most out of GrabStack</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Stack template collections */}
        <Text style={s.sectionTitle}>Stack ideas</Text>
        <Text style={s.sectionSub}>Tap any idea to instantly create that stack</Text>

        {COLLECTIONS.map(col => (
          <View key={col.id} style={s.collection}>
            <TouchableOpacity
              style={s.collectionHeader}
              onPress={() => setOpenCollection(openCollection === col.id ? null : col.id)}
              activeOpacity={0.8}
            >
              <View style={s.collectionLeft}>
                <Text style={{ fontSize: 20 }}>{col.emoji}</Text>
                <Text style={s.collectionTitle}>{col.title}</Text>
              </View>
              <Text style={s.collectionChevron}>{openCollection === col.id ? '↑' : '↓'}</Text>
            </TouchableOpacity>

            {openCollection === col.id && (
              <View style={s.templateList}>
                {col.stacks.map((item, i) => (
                  <TemplateCard
                    key={i}
                    item={item}
                    existingNames={existingNames}
                    onAdd={addStack}
                  />
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Tips */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>Tips & tricks</Text>
        <Text style={s.sectionSub}>Get more out of GrabStack</Text>

        {TIPS.map((tip, i) => (
          <View key={i} style={s.tipCard}>
            <Text style={s.tipIcon}>{tip.icon}</Text>
            <View style={s.tipBody}>
              <Text style={s.tipTitle}>{tip.title}</Text>
              <Text style={s.tipText}>{tip.body}</Text>
            </View>
          </View>
        ))}

        {/* Upgrade CTA */}
        <TouchableOpacity
          style={s.upgradeBanner}
          onPress={() => router.push('/paywall')}
          activeOpacity={0.88}
        >
          <Text style={s.upgradeBannerEmoji}>✦</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.upgradeBannerTitle}>Unlock AI Sort</Text>
            <Text style={s.upgradeBannerSub}>Let Claude automatically sort your screenshots into stacks</Text>
          </View>
          <Text style={s.upgradeBannerArrow}>→</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 30, color: colors.ink, letterSpacing: -0.5, marginBottom: 4 },
  sub:    { fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink2, lineHeight: 20, marginBottom: 16 },

  sectionTitle: { fontFamily: 'InstrumentSerif-Regular', fontSize: 22, color: colors.ink, paddingHorizontal: 24, marginBottom: 2 },
  sectionSub:   { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink3, paddingHorizontal: 24, marginBottom: 12 },

  collection:       { marginHorizontal: 24, marginBottom: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.cream },
  collectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  collectionLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  collectionTitle:  { fontFamily: 'Geist-SemiBold', fontSize: 15, color: colors.ink },
  collectionChevron:{ fontFamily: 'Geist-Regular', fontSize: 14, color: colors.ink3 },
  templateList:     { borderTopWidth: 1, borderColor: colors.border },
  templateCard:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: colors.border, gap: 10, backgroundColor: colors.cream },
  templateCardDone: { backgroundColor: colors.cream2 },
  templateEmoji:    { fontSize: 20, width: 28 },
  templateMeta:     { flex: 1 },
  templateName:     { fontFamily: 'Geist-Medium', fontSize: 14, color: colors.ink },
  templateDesc:     { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, marginTop: 1 },
  templateBadge:    { backgroundColor: colors.goldBg, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(196,149,106,0.3)' },
  templateBadgeDone:{ backgroundColor: colors.cream3, borderColor: colors.border },
  templateBadgeText:{ fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.gold },

  tipCard:  { marginHorizontal: 24, marginBottom: 8, backgroundColor: colors.cream2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: 'row', gap: 14 },
  tipIcon:  { fontSize: 20, width: 24, marginTop: 1 },
  tipBody:  { flex: 1 },
  tipTitle: { fontFamily: 'Geist-SemiBold', fontSize: 14, color: colors.ink, marginBottom: 4 },
  tipText:  { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2, lineHeight: 19 },

  upgradeBanner:      { marginHorizontal: 24, marginTop: 16, backgroundColor: colors.ink, borderRadius: radius.lg, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  upgradeBannerEmoji: { fontSize: 24, color: colors.gold },
  upgradeBannerTitle: { fontFamily: 'Geist-SemiBold', fontSize: 15, color: '#fff', marginBottom: 2 },
  upgradeBannerSub:   { fontFamily: 'Geist-Regular', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 17 },
  upgradeBannerArrow: { fontFamily: 'Geist-Regular', fontSize: 20, color: colors.gold },
});