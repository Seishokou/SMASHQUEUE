import React, { useCallback, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import HomeNavigator from './screens/HomeNavigator';
import SplashScreen from './screens/SplashScreen';

const smashQueueTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121212',
    card: 'rgba(33,33,33,0.78)',
    primary: '#E7D773',
    text: '#FFFFFF',
    border: 'rgba(255,255,255,0.12)',
  },
};

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  if (!splashDone) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen onFinish={handleSplashFinish} />
      </>
    );
  }

  return (
    <NavigationContainer theme={smashQueueTheme}>
      <StatusBar style="light" />
      <HomeNavigator />
    </NavigationContainer>
  );
}
