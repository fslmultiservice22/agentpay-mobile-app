import { useEffect, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";
import * as SplashScreen from "expo-splash-screen";

interface SplashScreenProps {
  onFinish: () => void;
}

export function CustomSplashScreen({ onFinish }: SplashScreenProps) {
  const [scaleAnim] = useState(() => new Animated.Value(0.3));
  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [dot1Anim] = useState(() => new Animated.Value(0.3));
  const [dot2Anim] = useState(() => new Animated.Value(0.3));
  const [dot3Anim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    let active = true;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;

    // Keep splash screen visible while animating
    void SplashScreen.preventAutoHideAsync();

    // Animate dots
    const createDotAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
    const dotAnimations = [
      createDotAnimation(dot1Anim, 0),
      createDotAnimation(dot2Anim, 200),
      createDotAnimation(dot3Anim, 400),
    ];
    dotAnimations.forEach((animation) => animation.start());

    // Start animation
    const entranceAnimation = Animated.parallel([
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
    entranceAnimation.start(({ finished }) => {
      if (!finished || !active) return;

      // Hide splash screen after animation
      finishTimer = setTimeout(() => {
        if (!active) return;
        void SplashScreen.hideAsync();
        onFinish();
      }, 1500);
    });

    return () => {
      active = false;
      entranceAnimation.stop();
      dotAnimations.forEach((animation) => animation.stop());
      if (finishTimer) clearTimeout(finishTimer);
    };
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
