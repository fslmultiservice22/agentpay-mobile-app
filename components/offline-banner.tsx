import { Text, Animated, TouchableOpacity } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useColors } from '@/hooks/use-colors';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const colors = useColors();
  const translateY = useRef(new Animated.Value(80)).current;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isOffline) {
      setDismissed(false);
    }
  }, [isOffline]);

  const shouldShow = isOffline && !dismissed;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: shouldShow ? 0 : 80,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, translateY]);

  if (!isOffline && !shouldShow) return null;

  return (
    <Animated.View
      pointerEvents={shouldShow ? 'auto' : 'none'}
      style={{
        transform: [{ translateY }],
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.error,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 999,
      }}
    >
      <Text style={{ fontSize: 16 }}>📡</Text>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 }}>
        Nessuna connessione — alcune funzioni non sono disponibili
      </Text>
      <TouchableOpacity
        onPress={() => setDismissed(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
