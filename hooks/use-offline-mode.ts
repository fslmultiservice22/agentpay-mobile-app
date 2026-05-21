import { useState, useCallback, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflineData {
  id: string;
  type: 'transaction' | 'message' | 'update';
  data: Record<string, any>;
  timestamp: number;
  synced: boolean;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingItems: number;
  syncedItems: number;
}

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    pendingItems: 0,
    syncedItems: 0,
  });

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
      if (state.isConnected) {
        // Trigger sync when connection is restored
        syncOfflineData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Load offline data from storage
  const loadOfflineData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_offline_data');
      if (stored) {
        const data = JSON.parse(stored);
        setOfflineData(data);
        updateSyncStatus(data);
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }, []);

  // Save offline data to storage
  const saveOfflineData = useCallback(async (data: OfflineData[]) => {
    try {
      await AsyncStorage.setItem('agentpay_offline_data', JSON.stringify(data));
      setOfflineData(data);
      updateSyncStatus(data);
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }, []);

  // Update sync status
  const updateSyncStatus = useCallback((data: OfflineData[]) => {
    const pending = data.filter((d) => !d.synced).length;
    const synced = data.filter((d) => d.synced).length;

    setSyncStatus((prev) => ({
      ...prev,
      pendingItems: pending,
      syncedItems: synced,
    }));
  }, []);

  // Add offline data
  const addOfflineData = useCallback(
    async (type: OfflineData['type'], data: Record<string, any>) => {
      try {
        const newItem: OfflineData = {
          id: `offline_${Date.now()}`,
          type,
          data,
          timestamp: Date.now(),
          synced: false,
        };

        const updated = [...offlineData, newItem];
        await saveOfflineData(updated);
        return newItem;
      } catch (error) {
        console.error('Failed to add offline data:', error);
        return null;
      }
    },
    [offlineData, saveOfflineData]
  );

  // Sync offline data
  const syncOfflineData = useCallback(async () => {
    if (!isOnline || offlineData.length === 0) return;

    try {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));

      // Simulate sync process
      const updated = offlineData.map((item) => ({
        ...item,
        synced: true,
      }));

      await saveOfflineData(updated);

      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to sync offline data:', error);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  }, [isOnline, offlineData, saveOfflineData]);

  // Get pending items
  const getPendingItems = useCallback(() => {
    return offlineData.filter((d) => !d.synced);
  }, [offlineData]);

  // Get synced items
  const getSyncedItems = useCallback(() => {
    return offlineData.filter((d) => d.synced);
  }, [offlineData]);

  // Clear offline data
  const clearOfflineData = useCallback(
    async (type?: OfflineData['type']) => {
      try {
        const filtered = type
          ? offlineData.filter((d) => d.type !== type)
          : [];

        await saveOfflineData(filtered);
      } catch (error) {
        console.error('Failed to clear offline data:', error);
      }
    },
    [offlineData, saveOfflineData]
  );

  // Remove offline item
  const removeOfflineItem = useCallback(
    async (id: string) => {
      try {
        const updated = offlineData.filter((d) => d.id !== id);
        await saveOfflineData(updated);
      } catch (error) {
        console.error('Failed to remove offline item:', error);
      }
    },
    [offlineData, saveOfflineData]
  );

  // Get offline stats
  const getOfflineStats = useCallback(() => {
    const total = offlineData.length;
    const pending = offlineData.filter((d) => !d.synced).length;
    const synced = offlineData.filter((d) => d.synced).length;

    return {
      total,
      pending,
      synced,
      syncPercentage: total > 0 ? (synced / total) * 100 : 0,
    };
  }, [offlineData]);

  // Initialize on mount
  useEffect(() => {
    loadOfflineData();
  }, [loadOfflineData]);

  return {
    isOnline,
    offlineData,
    syncStatus,
    addOfflineData,
    syncOfflineData,
    getPendingItems,
    getSyncedItems,
    clearOfflineData,
    removeOfflineItem,
    getOfflineStats,
    loadOfflineData,
  };
}
