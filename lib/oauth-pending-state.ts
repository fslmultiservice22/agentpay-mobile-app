import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PENDING_OAUTH_STATE_KEY = "pending_oauth_state";
const PENDING_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type PendingOAuthState = {
  state: string;
  expiresAt: number;
};

let operationQueue: Promise<void> = Promise.resolve();

function getWebStorage(): Storage | null {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage;
}

async function readPendingState(): Promise<PendingOAuthState | null> {
  try {
    const storage = getWebStorage();
    const raw = storage
      ? storage.getItem(PENDING_OAUTH_STATE_KEY)
      : await SecureStore.getItemAsync(PENDING_OAUTH_STATE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as PendingOAuthState).state !== "string" ||
      typeof (parsed as PendingOAuthState).expiresAt !== "number" ||
      !Number.isFinite((parsed as PendingOAuthState).expiresAt)
    ) {
      return null;
    }
    return {
      state: (parsed as PendingOAuthState).state,
      expiresAt: (parsed as PendingOAuthState).expiresAt,
    };
  } catch {
    return null;
  }
}

async function removePendingState(): Promise<void> {
  try {
    const storage = getWebStorage();
    if (storage) {
      storage.removeItem(PENDING_OAUTH_STATE_KEY);
    } else {
      await SecureStore.deleteItemAsync(PENDING_OAUTH_STATE_KEY);
    }
  } catch {
    // Storage failures must never turn an invalid callback into a valid one.
  }
}

function serialize<T>(operation: () => Promise<T> | T): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function savePendingOAuthState(state: string): Promise<void> {
  return serialize(async () => {
    if (!state) throw new Error("OAuth state is missing");
    const value = JSON.stringify({
      state,
      expiresAt: Date.now() + PENDING_OAUTH_STATE_TTL_MS,
    } satisfies PendingOAuthState);
    try {
      const storage = getWebStorage();
      if (storage) {
        storage.setItem(PENDING_OAUTH_STATE_KEY, value);
      } else {
        await SecureStore.setItemAsync(PENDING_OAUTH_STATE_KEY, value);
      }
    } catch {
      throw new Error("Unable to persist OAuth state");
    }
  });
}

export function hasPendingOAuthState(state: string): Promise<boolean> {
  return serialize(async () => {
    if (!state) return false;
    const pending = await readPendingState();
    if (!pending) return false;
    if (pending.expiresAt <= Date.now()) {
      await removePendingState();
      return false;
    }
    return pending.state === state;
  });
}

export function consumePendingOAuthState(state: string): Promise<boolean> {
  return serialize(async () => {
    if (!state) return false;
    const pending = await readPendingState();
    if (!pending) return false;
    if (pending.expiresAt <= Date.now()) {
      await removePendingState();
      return false;
    }
    if (pending.state !== state) return false;

    await removePendingState();
    // If deletion failed, do not claim a successful one-time consume.
    try {
      return !(await hasPendingState());
    } catch {
      return false;
    }
  });
}

async function hasPendingState(): Promise<boolean> {
  try {
    const storage = getWebStorage();
    const raw = storage
      ? storage.getItem(PENDING_OAUTH_STATE_KEY)
      : await SecureStore.getItemAsync(PENDING_OAUTH_STATE_KEY);
    return raw !== null;
  } catch {
    return true;
  }
}
