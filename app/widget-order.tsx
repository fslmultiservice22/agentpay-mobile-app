import { View, Text, TouchableOpacity , Platform } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import {
  ALL_WIDGETS,
  loadWidgetPrefs,
  saveWidgetPrefs,
  type WidgetPrefs,
} from "@/lib/widget-order";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";

type WidgetItem = { id: string };

export default function WidgetOrderScreen() {
  const router = useRouter();
  const colors = useColors();
  const [prefs, setPrefs] = useState<WidgetPrefs>({ order: ALL_WIDGETS.map((w) => w.id), hidden: [] });

  useFocusEffect(
    useCallback(() => {
      loadWidgetPrefs().then(setPrefs);
    }, [])
  );

  const handleToggleVisibility = async (id: string) => {
    const newHidden = prefs.hidden.includes(id)
      ? prefs.hidden.filter((h) => h !== id)
      : [...prefs.hidden, id];
    const newPrefs = { ...prefs, hidden: newHidden };
    setPrefs(newPrefs);
    await saveWidgetPrefs(newPrefs);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDragEnd = async ({ data }: { data: WidgetItem[] }) => {
    const newOrder = data.map((d) => d.id);
    const newPrefs = { ...prefs, order: newOrder };
    setPrefs(newPrefs);
    await saveWidgetPrefs(newPrefs);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReset = async () => {
    const defaultPrefs = { order: ALL_WIDGETS.map((w) => w.id), hidden: [] };
    setPrefs(defaultPrefs);
    await saveWidgetPrefs(defaultPrefs);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const visibleCount = prefs.order.filter((id) => !prefs.hidden.includes(id)).length;
  const items: WidgetItem[] = prefs.order.map((id) => ({ id }));

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<WidgetItem>) => {
    const idx = getIndex() ?? 0;
    const widget = ALL_WIDGETS.find((w) => w.id === item.id);
    if (!widget) return null;
    const isHidden = prefs.hidden.includes(item.id);

    return (
      <ScaleDecorator>
        <View
          style={{
            backgroundColor: isActive ? colors.primary + "18" : colors.surface,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: isActive ? colors.primary : isHidden ? colors.border : colors.primary + "30",
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            opacity: isHidden ? 0.55 : 1,
            marginBottom: 10,
          }}
        >
          {/* Drag handle */}
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={100}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: isHidden ? colors.border : colors.primary + "15",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: isHidden ? colors.muted : colors.primary }}>⠿</Text>
          </TouchableOpacity>

          {/* Order badge */}
          <View style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: isHidden ? colors.border : colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: isHidden ? colors.muted : "#fff" }}>
              {idx + 1}
            </Text>
          </View>

          {/* Icon + label */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 18 }}>{widget.icon}</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: isHidden ? colors.muted : colors.foreground }}>
                {widget.label}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{widget.description}</Text>
          </View>

          {/* Toggle visibility */}
          <TouchableOpacity
            onPress={() => handleToggleVisibility(item.id)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: isHidden ? colors.error + "15" : colors.success + "15",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name={isHidden ? "visibility-off" : "visibility"} size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenContainer className="flex-1">
        {/* Header */}
        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}>← Indietro</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>Widget Home</Text>
            <TouchableOpacity
              onPress={handleReset}
              style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>↺ Reset</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
            {visibleCount} di {ALL_WIDGETS.length} widget visibili
          </Text>
        </View>

        {/* Info banner */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={{
            backgroundColor: colors.primary + "10",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.primary + "25",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 12,
          }}>
            <Text style={{ fontSize: 16 }}>✋</Text>
            <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 20, flex: 1 }}>
              Tieni premuto il simbolo <Text style={{ fontWeight: "700" }}>⠿</Text> e trascina per riordinare.
              Tocca l&apos;occhio 👁 per mostrare/nascondere il widget.
            </Text>
          </View>
        </View>

        {/* Draggable list */}
        <DraggableFlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          activationDistance={10}
        />
      </ScreenContainer>
    </GestureHandlerRootView>
  );
}
