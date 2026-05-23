import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const shuttleLogo = require('../assets/shuttle-logo.png');

export default function BackgroundShuttle({ style }) {
  return (
    <View pointerEvents="none" style={[styles.layer, style]}>
      <Image resizeMode="contain" source={shuttleLogo} style={[styles.shuttle, styles.goldShadow]} />
      <Image resizeMode="contain" source={shuttleLogo} style={[styles.shuttle, styles.grayMark]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    height: 370,
    position: 'absolute',
    right: -108,
    top: 118,
    transform: [{ rotate: '-18deg' }],
    width: 370,
    zIndex: 0,
  },
  shuttle: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  goldShadow: {
    opacity: 0.2,
    tintColor: '#E7D773',
    transform: [{ translateX: 12 }, { translateY: 14 }],
  },
  grayMark: {
    opacity: 0.28,
    tintColor: '#B9BEC8',
  },
});
