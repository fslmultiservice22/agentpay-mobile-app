import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkOffline = (state: Network.NetworkState) => {
      // Only consider truly disconnected (no WiFi/cellular at all).
      // isInternetReachable can be false when the device has connectivity
      // but the API server is unreachable (e.g., Expo tunnel, VPN, proxy).
      setIsOffline(state.isConnected === false);
    };

    Network.getNetworkStateAsync().then(checkOffline).catch(() => {});

    const sub = Network.addNetworkStateListener(checkOffline);

    return () => sub.remove();
  }, []);

  return { isOffline };
}
