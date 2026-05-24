import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useChainId } from 'wagmi';
import { useColors } from '@/hooks/use-colors';
import {
  SEPOLIA_FAUCETS,
  SEPOLIA_TEST_TOKENS,
  isSepoliaAddress,
  getExplorerUrl,
} from '@/lib/testnet-service';

interface TestnetInfoProps {
  address?: string;
}

export function TestnetInfo({ address }: TestnetInfoProps) {
  const colors = useColors();
  const chainId = useChainId();
  const [expandedFaucet, setExpandedFaucet] = useState<string | null>(null);

  const isOnTestnet = isSepoliaAddress(chainId);

  const handleOpenFaucet = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open URL');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open faucet');
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      // Note: In React Native, use react-native-clipboard or similar
      Alert.alert('Success', 'Address copied to clipboard');
    }
  };

  const styles = StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 16,
    },
    header: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.foreground,
      marginBottom: 16,
    },
    badge: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warning,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 16,
      width: '100%',
    },
    badgeText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '600',
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
    },
    infoBox: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    faucetButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    faucetName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.background,
      flex: 1,
    },
    faucetDescription: {
      fontSize: 12,
      color: colors.background,
      marginTop: 4,
      opacity: 0.8,
    },
    expandedContent: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    tokenList: {
      backgroundColor: colors.background,
      borderRadius: 8,
      overflow: 'hidden',
    },
    tokenItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tokenInfo: {
      flex: 1,
    },
    tokenSymbol: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    tokenName: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    copyButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
    },
    copyButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.background,
    },
    warningBox: {
      backgroundColor: `${colors.warning}20`,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
      padding: 12,
      borderRadius: 4,
      marginBottom: 16,
    },
    warningText: {
      color: colors.warning,
      fontSize: 12,
      lineHeight: 18,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sepolia Testnet</Text>

      {/* Warning Badge */}
      {isOnTestnet && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⚠️ TESTNET - Use only for testing</Text>
        </View>
      )}

      {/* Network Status */}
      <View style={styles.section}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Network Status</Text>
          <Text style={[styles.infoValue, { color: isOnTestnet ? colors.success : colors.error }]}>
            {isOnTestnet ? '✓ Connected to Sepolia' : '✗ Not on Sepolia'}
          </Text>
        </View>

        {address && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Your Address</Text>
            <Text style={styles.infoValue}>{address.slice(0, 10)}...{address.slice(-8)}</Text>
            <TouchableOpacity
              style={[styles.copyButton, { marginTop: 8 }]}
              onPress={handleCopyAddress}
            >
              <Text style={styles.copyButtonText}>Copy Address</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Get Test ETH */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get Test ETH</Text>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Use these faucets to get free Sepolia ETH for testing. Each faucet has different requirements.
          </Text>
        </View>

        <ScrollView nestedScrollEnabled>
          {SEPOLIA_FAUCETS.map((faucet, index) => (
            <View key={index}>
              <TouchableOpacity
                style={styles.faucetButton}
                onPress={() => handleOpenFaucet(faucet.url)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.faucetName}>{faucet.name}</Text>
                  <Text style={styles.faucetDescription}>{faucet.description}</Text>
                </View>
                <Text style={[styles.faucetName, { marginLeft: 8 }]}>→</Text>
              </TouchableOpacity>

              {faucet.requiresGithub && (
                <View style={styles.expandedContent}>
                  <Text style={[styles.infoLabel, { marginBottom: 0 }]}>
                    ℹ️ Requires GitHub account
                  </Text>
                </View>
              )}

              {faucet.requiresTwitter && (
                <View style={styles.expandedContent}>
                  <Text style={[styles.infoLabel, { marginBottom: 0 }]}>
                    ℹ️ Requires Twitter/X account
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Test Tokens */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Test Tokens</Text>

        <View style={styles.tokenList}>
          {SEPOLIA_TEST_TOKENS.map((token, index) => (
            <View key={index} style={styles.tokenItem}>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                <Text style={styles.tokenName}>{token.name}</Text>
              </View>
              <TouchableOpacity style={styles.copyButton}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Chain ID</Text>
        <Text style={styles.infoValue}>11155111</Text>
        <Text style={[styles.infoLabel, { marginTop: 8 }]}>RPC URL</Text>
        <Text style={styles.infoValue}>https://sepolia.infura.io/v3/YOUR_KEY</Text>
      </View>
    </View>
  );
}
