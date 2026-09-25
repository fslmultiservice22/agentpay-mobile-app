import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

type ProtectedTabPlaceholderProps = {
  eyebrow: string;
  title: string;
  summary: string;
  unavailableItems: readonly string[];
};

const LOADING_HOLD_MS = 420;

/**
 * Placeholder nativo minimale per i tab principali non ancora attivi.
 * Non usa router, provider esterni, storage, API o moduli finanziari.
 */
export function ProtectedTabPlaceholder({
  eyebrow,
  title,
  summary,
  unavailableItems,
}: ProtectedTabPlaceholderProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(true);
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [contentOffset] = useState(() => new Animated.Value(8));
  const [loadingOpacity] = useState(() => new Animated.Value(1));
  const [loadingScale] = useState(() => new Animated.Value(0.96));

  useEffect(() => {
    let cancelled = false;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    const useNativeDriver = Platform.OS !== "web";
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingScale, {
          toValue: 1.03,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(loadingScale, {
          toValue: 0.96,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
      ]),
    );

    const revealContent = (reduceMotion: boolean) => {
      if (cancelled) return;

      if (reduceMotion) {
        loadingOpacity.setValue(0);
        contentOpacity.setValue(1);
        contentOffset.setValue(0);
        setIsLoading(false);
        return;
      }

      pulseAnimation.start();
      releaseTimer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(loadingOpacity, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver,
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver,
          }),
          Animated.timing(contentOffset, {
            toValue: 0,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver,
          }),
        ]).start(({ finished }) => {
          if (finished && !cancelled) setIsLoading(false);
        });
      }, LOADING_HOLD_MS);
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then(revealContent)
      .catch(() => revealContent(false));

    return () => {
      cancelled = true;
      if (releaseTimer) clearTimeout(releaseTimer);
      pulseAnimation.stop();
      loadingOpacity.stopAnimation();
      loadingScale.stopAnimation();
      contentOpacity.stopAnimation();
      contentOffset.stopAnimation();
    };
  }, [contentOffset, contentOpacity, loadingOpacity, loadingScale]);

  return (
    <ScreenContainer className="flex-1">
      <View style={styles.stage}>
        {isLoading ? (
          <Animated.View
            accessibilityLabel={`Preparazione di ${title}`}
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={[
              styles.loadingOverlay,
              {
                backgroundColor: colors.background,
                opacity: loadingOpacity,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.loadingCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  transform: [{ scale: loadingScale }],
                },
              ]}
            >
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.loadingTitle, { color: colors.foreground }]}>Preparazione area protetta</Text>
              <Text style={[styles.loadingText, { color: colors.muted }]}>Verifica locale del perimetro tecnico…</Text>
            </Animated.View>
          </Animated.View>
        ) : null}

        <Animated.View
          accessibilityElementsHidden={isLoading}
          importantForAccessibility={isLoading ? "no-hide-descendants" : "auto"}
          style={{
            flex: 1,
            opacity: contentOpacity,
            pointerEvents: isLoading ? "none" : "auto",
            transform: [{ translateY: contentOffset }],
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>

            <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
              {title}
            </Text>

            <Text style={[styles.summary, { color: colors.muted }]}>{summary}</Text>

            <View
              accessibilityRole="alert"
              style={[
                styles.protectedCard,
                {
                  backgroundColor: `${colors.warning}12`,
                  borderColor: `${colors.warning}55`,
                },
              ]}
            >
              <Text style={[styles.protectedTitle, { color: colors.warning }]}>Funzione protetta e non operativa</Text>
              <Text style={[styles.protectedText, { color: colors.foreground }]}>
                Questa beta non avvia pagamenti, ordini, firme, carte, credito,
                trasferimenti o collegamenti a provider esterni.
              </Text>
            </View>

            <View style={[styles.unavailableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.unavailableTitle, { color: colors.foreground }]}>Non disponibile in questa versione</Text>

              {unavailableItems.map((item, index) => (
                <View key={item} style={[styles.listRow, { marginTop: index === 0 ? 12 : 10 }]}>
                  <Text accessibilityElementsHidden style={[styles.bullet, { color: colors.muted }]}>
                    •
                  </Text>
                  <Text style={[styles.listText, { color: colors.muted }]}>{item}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.footer, { color: colors.muted }]}>
              Usa i tab Home, Pannello e Impostazioni per i controlli tecnici disponibili.
            </Text>
          </ScrollView>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
  },
  loadingOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    zIndex: 2,
  },
  loadingCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    maxWidth: 360,
    paddingHorizontal: 28,
    paddingVertical: 24,
    width: "100%",
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 8,
  },
  summary: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
  },
  protectedCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 22,
    padding: 16,
  },
  protectedTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  protectedText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  unavailableCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  unavailableTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  listRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    marginRight: 9,
  },
  listText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    textAlign: "center",
  },
});
