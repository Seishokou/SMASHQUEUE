import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AnimatedActionButton({
  children,
  compact = false,
  contentStyle,
  disabled = false,
  icon,
  onPress,
  reflect = true,
  style,
  textStyle,
  title,
  variant = 'primary',
}) {
  const pressValue = useRef(new Animated.Value(0)).current;

  const animateTo = (value) => {
    Animated.timing(pressValue, {
      duration: value ? 130 : 420,
      toValue: value,
      useNativeDriver: true,
    }).start();
  };

  const scale = pressValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });
  const glowOpacity = pressValue.interpolate({
    inputRange: [0, 1],
    outputRange: variant === 'gold' ? [0.32, 0.72] : [0.38, 1],
  });
  const gradientOpacity = pressValue.interpolate({
    inputRange: [0, 1],
    outputRange: variant === 'gold' ? [0, 0.16] : [0.08, 1],
  });
  const isGold = variant === 'gold';

  return (
    <View style={[styles.shell, compact && styles.shellCompact, disabled && styles.disabled]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          compact && styles.glowCompact,
          variant === 'danger' && styles.glowDanger,
          isGold && styles.glowGold,
          { opacity: glowOpacity },
        ]}
      />

      <AnimatedPressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animateTo(1)}
        onPressOut={() => animateTo(0)}
        style={[
          styles.button,
          compact && styles.buttonCompact,
          variant === 'danger' && styles.buttonDanger,
          isGold && styles.buttonGold,
          style,
          { transform: [{ scale }] },
        ]}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: gradientOpacity }]}>
          <LinearGradient
            colors={
              variant === 'danger'
                ? ['rgba(78,2,21,0.84)', 'rgba(255,139,150,0.88)']
                : isGold
                  ? ['rgba(231,215,115,0.08)', 'rgba(255,245,163,0.34)']
                : ['rgba(2,29,78,0.74)', 'rgba(31,215,232,0.9)']
            }
            end={{ x: 0, y: 0.5 }}
            start={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={[styles.content, compact && styles.contentCompact, contentStyle]}>
          {icon}
          {children ?? (
            <Text style={[styles.text, isGold && styles.textGold, compact && styles.textCompact, textStyle]}>
              {title}
            </Text>
          )}
        </View>
      </AnimatedPressable>

      {reflect && !compact && !isGold ? (
        <LinearGradient
          colors={['rgba(31,215,232,0.22)', 'rgba(31,215,232,0)']}
          pointerEvents="none"
          style={styles.reflection}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: 8,
    width: '100%',
  },
  shellCompact: {
    marginTop: 0,
    width: undefined,
  },
  disabled: {
    opacity: 0.62,
  },
  glow: {
    backgroundColor: '#1F4C65',
    borderRadius: 22,
    bottom: -7,
    left: 8,
    position: 'absolute',
    right: 8,
    top: -7,
  },
  glowCompact: {
    borderRadius: 999,
    bottom: -4,
    left: -3,
    right: -3,
    top: -4,
  },
  glowDanger: {
    backgroundColor: '#7E2434',
  },
  glowGold: {
    backgroundColor: '#E7D773',
  },
  button: {
    alignItems: 'center',
    backgroundColor: 'rgb(14,14,26)',
    borderColor: 'rgba(31,215,232,0.38)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
    overflow: 'hidden',
    shadowColor: '#1F4C65',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 18,
    elevation: 10,
  },
  buttonCompact: {
    borderRadius: 999,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  buttonDanger: {
    borderColor: 'rgba(255,139,150,0.48)',
  },
  buttonGold: {
    backgroundColor: '#E7D773',
    borderColor: 'rgba(255,245,163,0.58)',
    shadowColor: '#E7D773',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  contentCompact: {
    gap: 6,
    paddingHorizontal: 0,
  },
  text: {
    color: '#EAEAEA',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  textCompact: {
    fontSize: 12,
  },
  textGold: {
    color: '#121212',
  },
  reflection: {
    alignSelf: 'center',
    borderRadius: 18,
    height: 18,
    marginTop: 8,
    opacity: 0.35,
    transform: [{ scaleY: -1 }],
    width: '88%',
  },
});
