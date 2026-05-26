// app/(tabs)/_layout.jsx
import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { colors, fontSize } from '../../constants/theme';

function TabIcon({ label, glyph, focused }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 4 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.28 }}>{glyph}</Text>
      <Text style={{
        fontSize: 9,
        fontFamily: 'Geist-Medium',
        color: focused ? colors.gold : colors.ink3,
        letterSpacing: 0.2,
      }}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(250,248,245,0.98)',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 100,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
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
