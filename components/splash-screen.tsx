import React, { useEffect } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

interface SplashScreenProps {
  onFinish: () => void;
}

export function CustomSplashScreen({ onFinish }: SplashScreenProps) {
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Keep splash screen visible while animating
    SplashScreen.preventAutoHideAsync();

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
  }, []);

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
              style={{
                opacity: Animated.loop(
                  Animated.sequence([
                    Animated.timing(new Animated.Value(0.3), {
                      toValue: 1,
                      duration: 600,
                      useNativeDriver: true,
                    }),
                    Animated.timing(new Animated.Value(1), {
                      toValue: 0.3,
                      duration: 600,
                      useNativeDriver: true,
                    }),
                  ])
                ),
              }}
              className="w-2 h-2 bg-white rounded-full"
            />
            <Animated.View
              style={{
                opacity: Animated.loop(
                  Animated.sequence([
                    Animated.timing(new Animated.Value(0.3), {
                      toValue: 1,
                      duration: 600,
                      delay: 200,
                      useNativeDriver: true,
                    }),
                    Animated.timing(new Animated.Value(1), {
                      toValue: 0.3,
                      duration: 600,
                      useNativeDriver: true,
                    }),
                  ])
                ),
              }}
              className="w-2 h-2 bg-white rounded-full"
            />
            <Animated.View
              style={{
                opacity: Animated.loop(
                  Animated.sequence([
                    Animated.timing(new Animated.Value(0.3), {
                      toValue: 1,
                      duration: 600,
                      delay: 400,
                      useNativeDriver: true,
                    }),
                    Animated.timing(new Animated.Value(1), {
                      toValue: 0.3,
                      duration: 600,
                      useNativeDriver: true,
                    }),
                  ])
                ),
              }}
              className="w-2 h-2 bg-white rounded-full"
            />
          </View>
          <Text className="text-xs text-white/60 text-center">Loading...</Text>
        </View>
      </Animated.View>
    </View>
  );
}
