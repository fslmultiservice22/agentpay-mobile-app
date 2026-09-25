import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { validateIBAN, maskIBAN } from "@/lib/iban-validator";
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Helper: send a local notification for transfer status change
async function sendTransferStatusNotification(
  status: 'completed' | 'failed',
  amount: number,
  currency: string,
  reference: string
): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const { status: perm } = await Notifications.getPermissionsAsync();
    if (perm !== 'granted') return;

    const isOk = status === 'completed';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isOk ? '✅ Bonifico completato' : '❌ Bonifico fallito',
        body: isOk
          ? `Il tuo bonifico di €${amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} (${reference}) è stato completato con successo.`
          : `Il bonifico di €${amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} (${reference}) non è andato a buon fine.`,
        data: { status, amount, currency, reference },
        ...(Platform.OS === 'android' ? { channelId: 'agentpay-reminders' } : {}),
      },
      trigger: { seconds: 1, repeats: false } as any,
    });
  } catch (err) {
    // Non-blocking: ignore notification errors
    console.warn('Transfer notification error:', err);
  }
}

export interface BankAccount {
  id: string;
  iban: string;
  maskedIBAN: string;
  accountHolder: string;
  country: string;
  isDefault: boolean;
  createdAt: number;
  lastUsed?: number;
  status: "active" | "inactive" | "pending";
}

export interface BankTransfer {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: number;
  completedAt?: number;
  reference: string;
  error?: string;
}

const STORAGE_KEY = "agentpay_bank_accounts";
const TRANSFERS_KEY = "agentpay_bank_transfers";

/**
 * Hook for managing bank accounts and transfers
 */
export function useBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load accounts from storage
  useEffect(() => {
    loadAccounts();
    loadTransfers();
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setAccounts(JSON.parse(data));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransfers = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(TRANSFERS_KEY);
      if (data) {
        setTransfers(JSON.parse(data));
      }
    } catch (err) {
      console.error("Failed to load transfers:", err);
    }
  }, []);

  const addAccount = useCallback(
    async (iban: string, accountHolder: string): Promise<BankAccount | null> => {
      try {
        // Validate IBAN
        const validation = validateIBAN(iban);
        if (!validation.isValid) {
          setError(validation.error || "Invalid IBAN");
          return null;
        }

        const newAccount: BankAccount = {
          id: `bank_${Date.now()}`,
          iban: iban.replace(/\s/g, "").toUpperCase(),
          maskedIBAN: maskIBAN(iban),
          accountHolder,
          country: validation.country,
          isDefault: accounts.length === 0, // First account is default
          createdAt: Date.now(),
          status: "active",
        };

        const updated = [...accounts, newAccount];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setAccounts(updated);
        setError(null);
        return newAccount;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add account";
        setError(message);
        return null;
      }
    },
    [accounts]
  );

  const removeAccount = useCallback(
    async (accountId: string): Promise<boolean> => {
      try {
        const updated = accounts.filter((a) => a.id !== accountId);

        // If removed account was default, set new default
        if (accounts.find((a) => a.id === accountId)?.isDefault && updated.length > 0) {
          updated[0].isDefault = true;
        }

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setAccounts(updated);
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove account");
        return false;
      }
    },
    [accounts]
  );

  const setDefaultAccount = useCallback(
    async (accountId: string): Promise<boolean> => {
      try {
        const updated = accounts.map((a) => ({
          ...a,
          isDefault: a.id === accountId,
        }));

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setAccounts(updated);
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set default account");
        return false;
      }
    },
    [accounts]
  );

  const createTransfer = useCallback(
    async (
      accountId: string,
      amount: number,
      currency: string = "EUR"
    ): Promise<BankTransfer | null> => {
      try {
        const account = accounts.find((a) => a.id === accountId);
        if (!account) {
          setError("Account not found");
          return null;
        }

        const transfer: BankTransfer = {
          id: `transfer_${Date.now()}`,
          accountId,
          amount,
          currency,
          status: "processing",
          createdAt: Date.now(),
          reference: `AGP${Date.now().toString().slice(-8)}`,
        };

        const updated = [...transfers, transfer];
        await AsyncStorage.setItem(TRANSFERS_KEY, JSON.stringify(updated));
        setTransfers(updated);

        // Simulate transfer completion after 2 seconds
        setTimeout(() => {
          completeTransfer(transfer.id);
        }, 2000);

        setError(null);
        return transfer;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create transfer";
        setError(message);
        return null;
      }
    },
    [accounts, transfers]
  );

  const completeTransfer = useCallback(
    async (transferId: string, success: boolean = true): Promise<boolean> => {
      try {
        // Read fresh data from AsyncStorage to avoid stale closure bug
        const raw = await AsyncStorage.getItem(TRANSFERS_KEY);
        const currentTransfers: BankTransfer[] = raw ? JSON.parse(raw) : [];
        const updated = currentTransfers.map((t) =>
          t.id === transferId
            ? {
                ...t,
                status: success ? ("completed" as const) : ("failed" as const),
                completedAt: Date.now(),
                error: success ? undefined : "Transfer failed",
              }
            : t
        );

        await AsyncStorage.setItem(TRANSFERS_KEY, JSON.stringify(updated));
        setTransfers(updated);

        // Update account last used
        const transfer = updated.find((t) => t.id === transferId);
        if (transfer && success) {
          const rawAccounts = await AsyncStorage.getItem(STORAGE_KEY);
          const currentAccounts: BankAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];
          const accountUpdated = currentAccounts.map((a) =>
            a.id === transfer.accountId ? { ...a, lastUsed: Date.now() } : a
          );
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(accountUpdated));
          setAccounts(accountUpdated);
        }

        // Send automatic status-change notification
        if (transfer) {
          sendTransferStatusNotification(
            success ? 'completed' : 'failed',
            transfer.amount,
            transfer.currency,
            transfer.reference
          );
        }

        return success;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to complete transfer");
        return false;
      }
    },
    [] // no deps: reads fresh from AsyncStorage every time
  );

  const getTransferHistory = useCallback(
    (accountId?: string) => {
      if (accountId) {
        return transfers.filter((t) => t.accountId === accountId);
      }
      return transfers;
    },
    [transfers]
  );

  const getDefaultAccount = useCallback(() => {
    return accounts.find((a) => a.isDefault) || accounts[0];
  }, [accounts]);

  return {
    accounts,
    transfers,
    loading,
    error,
    addAccount,
    removeAccount,
    setDefaultAccount,
    createTransfer,
    completeTransfer,
    getTransferHistory,
    getDefaultAccount,
    reloadTransfers: loadTransfers,
  };
}
