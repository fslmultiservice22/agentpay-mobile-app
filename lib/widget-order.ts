import AsyncStorage from "@react-native-async-storage/async-storage";

const WIDGET_PREFS_KEY = "@agentpay_widget_prefs";

export interface WidgetDef {
  id: string;
  label: string;
  icon: string;
  description: string;
}

/** Lista canonica dei widget della Home, nell'ordine di default */
export const ALL_WIDGETS: WidgetDef[] = [];

export interface WidgetPrefs {
  order: string[];      // array di widget id nell'ordine desiderato
  hidden: string[];     // array di widget id nascosti
}

const DEFAULT_PREFS: WidgetPrefs = {
  order: ALL_WIDGETS.map((w) => w.id),
  hidden: [],
};

export async function loadWidgetPrefs(): Promise<WidgetPrefs> {
  const raw = await AsyncStorage.getItem(WIDGET_PREFS_KEY);
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const saved = JSON.parse(raw) as Partial<WidgetPrefs>;
    // Merge: aggiungi eventuali nuovi widget non ancora in order
    const order = saved.order ?? DEFAULT_PREFS.order;
    const hidden = saved.hidden ?? [];
    const allIds = ALL_WIDGETS.map((w) => w.id);
    const supportedOrder = order.filter((id) => allIds.includes(id));
    const missingIds = allIds.filter((id) => !order.includes(id));
    return { order: [...supportedOrder, ...missingIds], hidden: hidden.filter((id) => allIds.includes(id)) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function saveWidgetPrefs(prefs: WidgetPrefs): Promise<void> {
  await AsyncStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(prefs));
}

export function getOrderedVisibleWidgets(prefs: WidgetPrefs): string[] {
  return prefs.order.filter((id) => !prefs.hidden.includes(id));
}
