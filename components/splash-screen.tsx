import React, { useEffect, useMemo } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

interface SplashScreenProps {
  onFinish: () => void;
}

const DOT_DELAYS = [0, 200, 400];

export function CustomSplashScreen({ onFinish }: SplashScreenProps) {
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  // One driver value per loading dot. Created once so the loops stay stable
  // across re-renders instead of being rebuilt on every render pass.
  const dotAnims = useMemo(
    () => DOT_DELAYS.map(() => new Animated.Value(0.3)),
    []
  );

  useEffect(() => {
    // Keep splash screen visible while animating
    SplashScreen.preventAutoHideAsync();

    // Pulsing loading dots — each dot loops independently with its own delay
    const dotLoops = dotAnims.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(DOT_DELAYS[index]),
          Animated.timing(value, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    dotLoops.forEach((loop) => loop.start());

    // Entrance animation
    const entrance = Animated.parallel([
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
    ]);

    let hideTimeout: ReturnType<typeof setTimeout> | undefined;

    entrance.start(() => {
      // Hide splash screen after animation
      hideTimeout = setTimeout(() => {
        SplashScreen.hideAsync();
        onFinish();
      }, 1500);
    });

    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      entrance.stop();
      dotLoops.forEach((loop) => loop.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {dotAnims.map((value, index) => (
              <Animated.View
                key={index}
                style={{ opacity: value }}
                className="w-2 h-2 bg-white rounded-full"
              />
            ))}
          </View>
          <Text className="text-xs text-white/60 text-center">Loading...</Text>
        </View>
      </Animated.View>
    </View>
  );
}
