import AsyncStorage from "@react-native-async-storage/async-storage";

const PIN_KEY = "agentpay_pin_lock";
const PIN_ENABLED_KEY = "agentpay_pin_enabled";

export interface PinConfig {
  hash: string; // simple hash of the PIN
  enabled: boolean;
  readOnlyMode: boolean; // if true, app is in read-only mode when locked
}

function simpleHash(pin: string): string {
  // Simple deterministic hash (not cryptographic, but sufficient for local PIN)
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export async function getPinConfig(): Promise<PinConfig | null> {
  const raw = await AsyncStorage.getItem(PIN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setPinConfig(pin: string, readOnlyMode: boolean): Promise<void> {
  const config: PinConfig = {
    hash: simpleHash(pin),
    enabled: true,
    readOnlyMode,
  };
  await AsyncStorage.setItem(PIN_KEY, JSON.stringify(config));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const config = await getPinConfig();
  if (!config) return false;
  return config.hash === simpleHash(pin);
}

export async function disablePin(): Promise<void> {
  await AsyncStorage.removeItem(PIN_KEY);
}

export async function isPinEnabled(): Promise<boolean> {
  const config = await getPinConfig();
  return config?.enabled ?? false;
}
