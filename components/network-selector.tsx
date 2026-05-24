import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, FlatList } from 'react-native';
import { ScreenContainer } from './screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAnchorWallet, type AnchorNetwork } from '@/hooks/use-anchor-wallet';

export interface NetworkSelectorProps {
  onNetworkSelect: (networkId: string) => void;
  onCancel: () => void;
}

/**
 * Network Selector Component
 * Allows users to select from 25+ blockchain networks
 */
export function NetworkSelector({ onNetworkSelect, onCancel }: NetworkSelectorProps) {
  const colors = useColors();
  const { getMainnetNetworks, getTestnetNetworks } = useAnchorWallet();
  const [showTestnets, setShowTestnets] = useState(false);

  const mainnets = getMainnetNetworks();
  const testnets = getTestnetNetworks();
  const displayNetworks = showTestnets ? testnets : mainnets;

  const renderNetworkItem = ({ item }: { item: AnchorNetwork }) => (
    <TouchableOpacity
      onPress={() => onNetworkSelect(item._id)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">{item.name}</Text>
          <Text className="text-xs text-muted mt-1">{item.symbol}</Text>
          <Text className="text-xs text-muted mt-1">
            {item.node.replace('https://', '').split('/')[0]}
          </Text>
        </View>

        {item.testnet && (
          <View
            style={{
              backgroundColor: colors.warning,
              borderRadius: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text className="text-white text-xs font-semibold">TESTNET</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="p-4 border-b border-border">
          <Text className="text-2xl font-bold text-foreground">Select Network</Text>
          <Text className="text-sm text-muted mt-1">
            {displayNetworks.length} available network{displayNetworks.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Toggle Testnet */}
        <View className="flex-row gap-2 px-4 py-3 border-b border-border">
          <TouchableOpacity
            onPress={() => setShowTestnets(false)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 6,
              backgroundColor: !showTestnets ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: !showTestnets ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                color: !showTestnets ? 'white' : colors.foreground,
                fontSize: 14,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Mainnet ({mainnets.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowTestnets(true)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 6,
              backgroundColor: showTestnets ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: showTestnets ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                color: showTestnets ? 'white' : colors.foreground,
                fontSize: 14,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Testnet ({testnets.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Network List */}
        <FlatList
          data={displayNetworks}
          renderItem={renderNetworkItem}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16 }}
          scrollEnabled={true}
        />

        {/* Bottom Actions */}
        <View className="p-4 border-t border-border">
          <TouchableOpacity
            onPress={onCancel}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text className="text-foreground font-semibold text-center">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  networkItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  networkInfo: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  networkSymbol: {
    fontSize: 12,
    marginTop: 4,
  },
  networkNode: {
    fontSize: 12,
    marginTop: 4,
  },
  testnetBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  testnetText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
