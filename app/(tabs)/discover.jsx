// app/(tabs)/discover.jsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSize } from '../../constants/theme';

const TRENDING = [
  { name: 'Tokyo trip inspo',       emoji: '✈️', owner: 'Sarah K.',    count: 24 },
  { name: 'Coastal kitchen ideas',  emoji: '🏠', owner: 'James & Amy', count: 18 },
  { name: 'Nike wishlist',          emoji: '🛍️', owner: 'Marcus T.',   count: 11 },
  { name: 'Date night restaurants', emoji: '🍔', owner: 'Priya M.',    count: 9  },
  { name: 'Reading list',           emoji: '📚', owner: 'Tom B.',      count: 31 },
];

export default function DiscoverScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Discover</Text>
        <Text style={s.sub}>Stacks people are sharing</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Collab banner */}
        <TouchableOpacity style={s.collabBanner} activeOpacity={0.88}>
          <Text style={s.collabEyebrow}>New · Collaborative stacks</Text>
          <Text style={s.collabTitle}>Build stacks together</Text>
          <Text style={s.collabBody}>Invite your partner or friends to add screenshots to a shared stack. Perfect for holiday planning, home ideas, or gift lists.</Text>
          <View style={s.avatars}>
            {['😊','😎','🙂'].map((a, i) => <View key={i} style={s.avatar}><Text style={{ fontSize: 16 }}>{a}</Text></View>)}
          </View>
          <View style={s.collabBtn}><Text style={s.collabBtnText}>Start a collab stack</Text></View>
        </TouchableOpacity>

        {/* Trending */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Trending nearby</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {TRENDING.map((ds, i) => (
              <TouchableOpacity key={i} style={s.discCard} activeOpacity={0.88}>
                <View style={s.discCardThumbs}>
                  {Array(4).fill(null).map((_, j) => (
                    <View key={j} style={s.discMini} />
                  ))}
                </View>
                <View style={s.discCardBody}>
                  <Text style={s.discCardName}>{ds.emoji} {ds.name}</Text>
                  <Text style={s.discCardMeta}>{ds.owner} · {ds.count} items</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  title:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 34, color: colors.ink, letterSpacing: -0.8 },
  sub:    { fontFamily: 'Geist-Regular', fontSize: fontSize.md, color: colors.ink2, marginTop: 4 },
  collabBanner: { marginHorizontal: spacing.xxl, marginBottom: 20, backgroundColor: colors.blueBg, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(37,99,235,0.18)', padding: 20 },
  collabEyebrow:{ fontFamily: 'Geist-SemiBold', fontSize: 11, color: colors.blue, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 },
  collabTitle:  { fontFamily: 'InstrumentSerif-Regular', fontSize: 22, color: colors.ink, marginBottom: 6, lineHeight: 28 },
  collabBody:   { fontFamily: 'Geist-Regular', fontSize: fontSize.md, color: colors.ink2, lineHeight: 19, marginBottom: 14 },
  avatars:      { flexDirection: 'row', marginBottom: 14 },
  avatar:       { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.cream, backgroundColor: colors.cream3, alignItems: 'center', justifyContent: 'center', marginLeft: -8, firstChild: { marginLeft: 0 } },
  collabBtn:    { backgroundColor: colors.ink, borderRadius: radius.sm, height: 44, alignItems: 'center', justifyContent: 'center' },
  collabBtnText:{ fontFamily: 'Geist-Medium', fontSize: 14, color: colors.cream },
  section:      { paddingHorizontal: spacing.xxl, marginBottom: 20 },
  sectionTitle: { fontFamily: 'Geist-Medium', fontSize: 13, color: colors.ink, marginBottom: 12 },
  discCard:     { width: 160, backgroundColor: colors.cream, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', shadowColor: '#1A1916', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  discCardThumbs:{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', height: 100, backgroundColor: colors.cream3, gap: 2 },
  discMini:     { width: '49%', height: '49%', backgroundColor: colors.cream2 },
  discCardBody: { padding: 10 },
  discCardName: { fontFamily: 'Geist-Medium', fontSize: 13, color: colors.ink, marginBottom: 2 },
  discCardMeta: { fontFamily: 'Geist-Regular', fontSize: 11, color: colors.ink3 },
});
