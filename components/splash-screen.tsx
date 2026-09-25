import React, { useEffect } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

interface SplashScreenProps {
  onFinish: () => void;
}

export function CustomSplashScreen({ onFinish }: SplashScreenProps) {
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const dot1Anim = React.useRef(new Animated.Value(0.3)).current;
  const dot2Anim = React.useRef(new Animated.Value(0.3)).current;
  const dot3Anim = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Keep splash screen visible while animating
    SplashScreen.preventAutoHideAsync();

    // Animate dots
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    animateDot(dot1Anim, 0);
    animateDot(dot2Anim, 200);
    animateDot(dot3Anim, 400);

    // Start animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Hide splash screen after animation
      setTimeout(() => {
        SplashScreen.hideAsync();
        onFinish();
      }, 1500);
    });
  }, [dot1Anim, dot2Anim, dot3Anim, onFinish, opacityAnim, scaleAnim]);

  return (
    <View className="flex-1 bg-gradient-to-b from-primary to-background items-center justify-center">
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
        className="items-center gap-4"
      >
        {/* Logo */}
        <View className="w-24 h-24 bg-white rounded-full items-center justify-center shadow-lg">
          <Text className="text-4xl font-bold text-primary">AP</Text>
        </View>

        {/* App Name */}
        <Text className="text-3xl font-bold text-white">AgentPay</Text>
        <Text className="text-sm text-white/80">Wallet</Text>

        {/* Loading Indicator */}
        <View className="mt-8 gap-2">
          <View className="flex-row gap-2 items-center justify-center">
            <Animated.View
              style={{ opacity: dot1Anim }}
              className="w-2 h-2 bg-white rounded-full"
            />
            <Animated.View
              style={{ opacity: dot2Anim }}
              className="w-2 h-2 bg-white rounded-full"
            />
            <Animated.View
              style={{ opacity: dot3Anim }}
              className="w-2 h-2 bg-white rounded-full"
            />
          </View>
          <Text className="text-xs text-white/60 text-center">Loading...</Text>
        </View>
      </Animated.View>
    </View>
  );
}
