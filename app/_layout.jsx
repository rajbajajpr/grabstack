// app/_layout.jsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase, getSetting } from '../services/database';
import { colors } from '../constants/theme';

export default function RootLayout() {
  const router = useRouter();
  const [dbReady, setDbReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(null);

  const [fontsLoaded] = useFonts({
    'InstrumentSerif-Regular': InstrumentSerif_400Regular,
    'InstrumentSerif-Italic':  InstrumentSerif_400Regular_Italic,
    'Geist-Regular':           Geist_400Regular,
    'Geist-Medium':            Geist_500Medium,
    'Geist-SemiBold':          Geist_600SemiBold,
  });

  useEffect(() => {
    async function init() {
      await initDatabase();
      const done = await getSetting('onboardingComplete');
      setOnboardingDone(done === 'true');
      setDbReady(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (!dbReady || !fontsLoaded || onboardingDone === null) return;
    if (!onboardingDone) {
      router.replace('/onboarding');
    }
  }, [dbReady, fontsLoaded, onboardingDone]);

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.cream} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)"     options={{ animation: 'fade' }} />
          <Stack.Screen name="preview"    options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="paywall"    options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
