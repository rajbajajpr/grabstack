// app/(tabs)/_layout.jsx
import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

function TabIcon({ label, glyph, focused }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6, width: 72 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.28, lineHeight: 24 }}>{glyph}</Text>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 8.5,
          fontFamily: 'Geist-Medium',
          color: focused ? colors.gold : colors.ink3,
          letterSpacing: 0.1,
          marginTop: 3,
          width: 72,
          textAlign: 'center',
        }}
      >{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 54 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(250,248,245,0.98)',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index"    options={{ tabBarIcon: ({ focused }) => <TabIcon label="All"      glyph="⊞" focused={focused} /> }} />
      <Tabs.Screen name="stacks"   options={{ tabBarIcon: ({ focused }) => <TabIcon label="Stacks"   glyph="⊟" focused={focused} /> }} />
      <Tabs.Screen name="ai"       options={{ tabBarIcon: ({ focused }) => <TabIcon label="AI Sort"  glyph="✦" focused={focused} /> }} />
      <Tabs.Screen name="discover" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Discover" glyph="◎" focused={focused} /> }} />
    </Tabs>
  );
}
