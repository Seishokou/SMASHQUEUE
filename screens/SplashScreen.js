import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';

const logoSource = require('../assets/smashq-logo.png');
const splashMusicSource = require('../assets/hub-intro-sound-effect.mp3');
const SPLASH_DURATION_MS = 5000;

export default function SplashScreen({ onFinish }) {
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOffset = useRef(new Animated.Value(18)).current;
  const titleReveal = useRef(new Animated.Value(0)).current;
  const [titleWidth, setTitleWidth] = useState(0);
  const soundRef = useRef(null);

  const animatedTitleWidth = titleReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, titleWidth || 1],
  });

  useEffect(() => {
    let mounted = true;
    let finishTimer;
    const titleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(titleReveal, {
          duration: 900,
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.delay(520),
        Animated.timing(titleReveal, {
          duration: 420,
          toValue: 0,
          useNativeDriver: false,
        }),
        Animated.delay(180),
      ]),
    );

    Animated.parallel([
      Animated.spring(logoScale, {
        friction: 7,
        tension: 42,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        duration: 650,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(contentOffset, {
        duration: 650,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();

    titleAnimation.start();

    async function startMusic() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          interruptionModeAndroid: 1,
          interruptionModeIOS: 1,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
        });

        const { sound } = await Audio.Sound.createAsync(splashMusicSource, {
          isLooping: false,
          shouldPlay: true,
          volume: 0.45,
        });

        if (!mounted) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
      } catch (error) {
        console.warn('Splash music could not start:', error?.message ?? error);
      }
    }

    startMusic();

    finishTimer = setTimeout(() => {
      onFinish?.();
    }, SPLASH_DURATION_MS);

    return () => {
      mounted = false;
      clearTimeout(finishTimer);
      titleAnimation.stop();

      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [contentOffset, logoOpacity, logoScale, onFinish, titleReveal]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowCyan} />
      <View style={styles.glowGold} />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: contentOffset }],
            },
          ]}
        >
          <Image resizeMode="contain" source={logoSource} style={styles.logo} />
        </Animated.View>

        <BlurView intensity={24} tint="dark" style={styles.copyPanel}>
          <View
            onLayout={(event) => setTitleWidth(event.nativeEvent.layout.width)}
            style={styles.animatedTitleWrap}
          >
            <Text style={styles.appNameBase}>SMASHQUEUE</Text>
            <Animated.View
              pointerEvents="none"
              style={[styles.appNameRevealWrap, { width: animatedTitleWidth }]}
            >
              <Text style={styles.appNameReveal}>SMASHQUEUE</Text>
            </Animated.View>
          </View>
          <Text style={styles.tagline}>Badminton Queuing System</Text>
          <View style={styles.loadingBar}>
            <View style={styles.loadingFill} />
          </View>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#071522',
    flex: 1,
  },
  glowCyan: {
    backgroundColor: 'rgba(28,210,238,0.18)',
    borderRadius: 160,
    height: 320,
    position: 'absolute',
    right: -120,
    top: 72,
    width: 320,
  },
  glowGold: {
    backgroundColor: 'rgba(231,215,115,0.14)',
    borderRadius: 130,
    bottom: -60,
    height: 260,
    left: -110,
    position: 'absolute',
    width: 260,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  logo: {
    aspectRatio: 1,
    maxHeight: 380,
    width: '84%',
  },
  copyPanel: {
    alignItems: 'center',
    backgroundColor: 'rgba(12,24,36,0.58)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingVertical: 18,
    width: '94%',
  },
  animatedTitleWrap: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 36,
    overflow: 'hidden',
  },
  appNameBase: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 4,
  },
  appNameRevealWrap: {
    borderRightColor: '#37FF8B',
    borderRightWidth: 4,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  appNameReveal: {
    color: '#37FF8B',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(55,255,139,0.75)',
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 14,
  },
  tagline: {
    color: '#BFDCEB',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  loadingBar: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    height: 5,
    marginTop: 18,
    overflow: 'hidden',
    width: 142,
  },
  loadingFill: {
    backgroundColor: '#E7D773',
    borderRadius: 999,
    height: '100%',
    width: '62%',
  },
});
