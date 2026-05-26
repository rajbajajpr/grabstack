// app/onboarding.jsx
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { setSetting } from '../services/database';
import { colors, radius } from '../constants/theme';

const { width: W } = Dimensions.get('window');

const FEATURES = [
  {
    emoji: '📚',
    title: 'Organise instantly',
    body: 'Turn screenshot chaos into tidy stacks. Sort by topic, mood, or anything you like.',
    color: '#FBF5EE',
    accent: '#C4956A',
  },
  {
    emoji: '🔒',
    title: 'Stays on your device',
    body: 'Your screenshots never leave your phone. No account, no cloud, no tracking. Ever.',
    color: '#EDF7F2',
    accent: '#2D6A4F',
  },
  {
    emoji: '↗',
    title: 'Share with anyone',
    body: 'Turn a stack into a shareable image card. Send your inspo, wishlist or ideas to anyone.',
    color: '#EEF4FF',
    accent: '#2563EB',
  },
];

function FeatureCard({ feature, index, scrollX }) {
  const inputRange = [(index - 1) * W, index * W, (index + 1) * W];
  const scale = scrollX.interpolate({ inputRange, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' });
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
  return (
    <Animated.View style={[styles.card, { width: W - 48, transform: [{ scale }], opacity, backgroundColor: feature.color }]}>
      <Text style={styles.cardEmoji}>{feature.emoji}</Text>
      <Text style={[styles.cardTitle, { color: feature.accent }]}>{feature.title}</Text>
      <Text style={styles.cardBody}>{feature.body}</Text>
    </Animated.View>
  );
}

// The GrabStack icon — stacked cards, dark background
function AppIcon({ size = 80 }) {
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: size * 0.22 }]}>
      {/* Three stacked card layers */}
      <View style={[styles.iconCard, { bottom: size * 0.18, left: size * 0.18, width: size * 0.55, height: size * 0.38, opacity: 0.45, borderRadius: size * 0.06 }]} />
      <View style={[styles.iconCard, { bottom: size * 0.24, left: size * 0.22, width: size * 0.55, height: size * 0.38, opacity: 0.72, borderRadius: size * 0.06 }]} />
      <View style={[styles.iconCard, { bottom: size * 0.3, left: size * 0.26, width: size * 0.55, height: size * 0.38, borderRadius: size * 0.06 }]}>
        {/* Lines on top card */}
        <View style={{ position: 'absolute', top: '25%', left: '15%', width: '45%', height: size * 0.04, borderRadius: 2, backgroundColor: 'rgba(26,25,22,0.5)' }} />
        <View style={{ position: 'absolute', top: '45%', left: '15%', width: '65%', height: size * 0.04, borderRadius: 2, backgroundColor: 'rgba(26,25,22,0.35)' }} />
        <View style={{ position: 'absolute', top: '65%', left: '15%', width: '30%', height: size * 0.04, borderRadius: 2, backgroundColor: 'rgba(26,25,22,0.25)' }} />
      </View>
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % FEATURES.length;
        scrollRef.current?.scrollTo({ x: next * (W - 48 + 16), animated: true });
        return next;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  async function handleStart() {
    setLoading(true);
    try {
      await setSetting('onboardingComplete', 'true');
      await setSetting('isPremium', 'false');
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header with icon + wordmark */}
      <View style={styles.header}>
        <AppIcon size={72} />
        <View style={styles.wordmarkWrap}>
          <Text style={styles.wordmark}>
            Grab<Text style={styles.wordmarkItalic}>Stack</Text>
          </Text>
          <Text style={styles.tagline}>Your screenshots, finally sorted.</Text>
        </View>
      </View>

      {/* Feature cards */}
      <View style={styles.carouselWrap}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled={false}
          snapToInterval={W - 48 + 16}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} feature={f} index={i} scrollX={scrollX} />
          ))}
        </Animated.ScrollView>
        <View style={styles.dots}>
          {FEATURES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      </View>

      {/* Privacy */}
      <View style={styles.privacyRow}>
        <Text style={styles.privacyText}>
          🔒  No account needed · Photos stay on your device · No tracking
        </Text>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnMain}
          onPress={handleStart}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading
            ? <ActivityIndicator color={colors.cream} />
            : <Text style={styles.btnMainText}>Get started — it's free</Text>
          }
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          Allow photo access on the next screen to start organising
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 16 },
  icon:   { backgroundColor: '#1A1916', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconCard: { position: 'absolute', backgroundColor: '#C4956A' },
  wordmarkWrap: { flex: 1 },
  wordmark: { fontFamily: 'InstrumentSerif-Regular', fontSize: 36, color: colors.ink, lineHeight: 42, letterSpacing: -1 },
  wordmarkItalic: { fontFamily: 'InstrumentSerif-Italic', color: colors.gold },
  tagline: { fontFamily: 'Geist-Regular', fontSize: 13, color: colors.ink2, marginTop: 2 },
  carouselWrap:    { flex: 1, justifyContent: 'center' },
  carouselContent: { paddingHorizontal: 24, gap: 16, alignItems: 'center' },
  card:     { borderRadius: 24, padding: 28, justifyContent: 'center', minHeight: 200 },
  cardEmoji:{ fontSize: 44, marginBottom: 16 },
  cardTitle:{ fontFamily: 'InstrumentSerif-Regular', fontSize: 26, letterSpacing: -0.5, marginBottom: 10, lineHeight: 32 },
  cardBody: { fontFamily: 'Geist-Regular', fontSize: 16, color: colors.ink2, lineHeight: 24 },
  dots:     { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cream3 },
  dotActive:{ width: 20, backgroundColor: colors.gold },
  privacyRow: { marginHorizontal: 24, marginBottom: 8, backgroundColor: colors.cream2, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 16 },
  privacyText: { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink2, textAlign: 'center', lineHeight: 18 },
  footer:       { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  btnMain:      { backgroundColor: colors.ink, borderRadius: radius.sm, height: 56, alignItems: 'center', justifyContent: 'center' },
  btnMainText:  { fontFamily: 'Geist-Medium', fontSize: 17, color: colors.cream, letterSpacing: -0.2 },
  footerNote:   { fontFamily: 'Geist-Regular', fontSize: 12, color: colors.ink3, textAlign: 'center', lineHeight: 17 },
});