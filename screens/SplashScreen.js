import React, { useEffect, useRef } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { supabase } from '../supabase/supabaseConfig';

const logoSource = require('../assets/smashq-logo.png');
const splashMusicSource = require('../assets/hub-intro-sound-effect.mp3');
const SPLASH_DURATION_MS = 3000;

export default function SplashScreen({ onFinish }) {
  const containerOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.92);
  const copyOpacity = useSharedValue(0);
  const bottomOpacity = useSharedValue(0);
  const bottomTranslate = useSharedValue(22);
  const brandReveal = useSharedValue(0);
  const soundRef = useRef(null);
  const { height, width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.78, height * 0.42, 350);
  const brandTextWidth = Math.min(width * 0.72, 310);

  function finishSplash(session) {
    onFinish?.(session ?? null);
  }

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const copyStyle = useAnimatedStyle(() => ({
    opacity: copyOpacity.value,
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    opacity: bottomOpacity.value,
    transform: [{ translateY: bottomTranslate.value }],
  }));

  const brandRevealStyle = useAnimatedStyle(() => ({
    width: brandTextWidth * brandReveal.value,
  }));

  useEffect(() => {
    let mounted = true;
    let finishTimer;

    logoOpacity.value = withTiming(1, {
      duration: 820,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: 950,
      easing: Easing.out(Easing.exp),
    });
    copyOpacity.value = withDelay(
      420,
      withTiming(1, {
        duration: 760,
        easing: Easing.out(Easing.cubic),
      })
    );
    bottomOpacity.value = withDelay(
      760,
      withTiming(1, {
        duration: 760,
        easing: Easing.out(Easing.cubic),
      })
    );
    bottomTranslate.value = withDelay(
      760,
      withTiming(0, {
        duration: 760,
        easing: Easing.out(Easing.cubic),
      })
    );
    brandReveal.value = withDelay(
      1120,
      withTiming(1, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      })
    );

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
          volume: 0.35,
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

    async function checkAuth() {
      if (!supabase) return null;

      try {
        const { data } = await supabase.auth.getSession();
        return data.session ?? null;
      } catch (error) {
        console.warn('Splash auth check failed:', error?.message ?? error);
        return null;
      }
    }

    startMusic();
    const authPromise = checkAuth();

    finishTimer = setTimeout(() => {
      void authPromise.then((session) => {
        containerOpacity.value = withTiming(
          0,
          {
            duration: 420,
            easing: Easing.inOut(Easing.cubic),
          },
          (finished) => {
            if (finished) runOnJS(finishSplash)(session);
          }
        );
      });
    }, SPLASH_DURATION_MS);

    return () => {
      mounted = false;
      clearTimeout(finishTimer);

      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [bottomOpacity, bottomTranslate, brandReveal, containerOpacity, copyOpacity, logoOpacity, logoScale, onFinish]);

  return (
    <Animated.View style={[styles.root, containerStyle]}>
      <LinearGradient colors={['#0B1015', '#0D1C2A', '#12171E']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <CourtLinePattern />

        <View style={styles.mainContent}>
          <Animated.View style={[styles.logoStage, logoStyle]}>
            <View style={[styles.logoGlow, { height: logoSize * 0.86, width: logoSize * 0.86 }]} />
            <Image resizeMode="contain" source={logoSource} style={[styles.logo, { height: logoSize, width: logoSize }]} />
          </Animated.View>

          <Animated.Text style={[styles.subtitle, copyStyle]}>
            SMART BADMINTON QUEUING SYSTEM
          </Animated.Text>
        </View>

        <Animated.View style={[styles.bottomDock, bottomStyle]}>
          <View style={styles.bottomHighlight} />
          <View style={[styles.brandTrack, { width: brandTextWidth }]}>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[styles.brandText, styles.brandTextBase, { width: brandTextWidth }]}
            >
              SMASHQUEUE
            </Text>
            <Animated.View pointerEvents="none" style={[styles.brandRevealMask, brandRevealStyle]}>
              <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.brandText, { width: brandTextWidth }]}>
                SMASHQUEUE
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

function CourtLinePattern() {
  return (
    <View pointerEvents="none" style={styles.patternLayer}>
      <View style={[styles.courtRect, styles.courtRectLarge]} />
      <View style={[styles.courtRect, styles.courtRectMedium]} />
      <View style={[styles.courtLine, styles.courtLineOne]} />
      <View style={[styles.courtLine, styles.courtLineTwo]} />
      <View style={[styles.courtLine, styles.courtLineThree]} />
      <View style={[styles.courtLine, styles.courtLineFour]} />
      <View style={[styles.courtLine, styles.courtLineFive]} />
      <View style={[styles.courtLine, styles.courtLineSix]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0B1015',
    flex: 1,
  },
  safeArea: {
    flex: 1,
    overflow: 'hidden',
  },
  patternLayer: {
    bottom: 0,
    left: 0,
    opacity: 0.48,
    position: 'absolute',
    right: 0,
    top: 0,
    transform: [{ rotate: '-39deg' }],
  },
  courtRect: {
    borderColor: 'rgba(86,190,220,0.16)',
    borderWidth: 2,
    position: 'absolute',
  },
  courtRectLarge: {
    height: 360,
    left: -70,
    top: 145,
    width: 620,
  },
  courtRectMedium: {
    height: 260,
    left: 52,
    top: 228,
    width: 430,
  },
  courtLine: {
    backgroundColor: 'rgba(92,210,232,0.15)',
    height: 2,
    position: 'absolute',
    width: 620,
  },
  courtLineOne: {
    left: -60,
    top: 210,
  },
  courtLineTwo: {
    left: -20,
    top: 282,
  },
  courtLineThree: {
    left: 12,
    top: 356,
  },
  courtLineFour: {
    height: 620,
    left: 150,
    top: 58,
    width: 2,
  },
  courtLineFive: {
    height: 620,
    left: 248,
    top: 58,
    width: 2,
  },
  courtLineSix: {
    height: 620,
    left: 346,
    top: 58,
    width: 2,
  },
  mainContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 170,
    paddingHorizontal: 18,
    paddingTop: 126,
  },
  logoStage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoGlow: {
    backgroundColor: 'rgba(41,191,255,0.2)',
    borderRadius: 165,
    position: 'absolute',
    shadowColor: '#2BD9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 36,
  },
  logo: {
    borderRadius: 8,
  },
  subtitle: {
    color: 'rgba(225,232,238,0.76)',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    lineHeight: 19,
    marginTop: 26,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  bottomDock: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(14,20,27,0.9)',
    borderColor: 'rgba(225,238,242,0.58)',
    borderRadius: 27,
    borderTopWidth: 2,
    borderWidth: 1,
    bottom: -14,
    height: 100,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 8,
    position: 'absolute',
    width: '86%',
  },
  bottomHighlight: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 999,
    height: 2,
    position: 'absolute',
    top: 10,
    width: '62%',
  },
  brandTrack: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    overflow: 'hidden',
  },
  brandRevealMask: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  brandText: {
    color: '#42F58D',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 3.6,
    lineHeight: 38,
    textAlign: 'center',
    textShadowColor: 'rgba(66,245,141,0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  brandTextBase: {
    color: 'rgba(66,245,141,0.18)',
    textShadowRadius: 0,
  },
});
