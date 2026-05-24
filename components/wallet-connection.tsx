import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useColors } from '@/hooks/use-colors';
import { shortenAddress } from '@/lib/real-transaction-service';

interface WalletConnectionProps {
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function WalletConnection({ onConnected, onDisconnected }: WalletConnectionProps) {
  const colors = useColors();
  const { connect, connectors, isPending, error } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [showModal, setShowModal] = useState(false);

  const handleConnect = async (connectorName: string) => {
    try {
      const connector = connectors.find(c => c.name === connectorName);
      if (connector) {
        connect({ connector });
        setShowModal(false);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onDisconnected?.();
  };

  const styles = StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 16,
    },
    header: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
    },
    statusBox: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    statusLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 4,
    },
    statusValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    connectedStatus: {
      color: colors.success,
    },
    disconnectedStatus: {
      color: colors.error,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    connectButton: {
      backgroundColor: colors.primary,
    },
    disconnectButton: {
      backgroundColor: colors.error,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.foreground,
      marginBottom: 16,
    },
    connectorButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    connectorName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    connectorDescription: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 4,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 8,
    },
  });

  const connectorDescriptions: Record<string, string> = {
    metaMask: 'Connect with MetaMask wallet extension',
    walletConnect: 'Scan QR code with WalletConnect compatible wallet',
    ledger: 'Connect with Ledger hardware wallet',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Wallet Connection</Text>

      {/* Status */}
      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Connection Status</Text>
        <Text
          style={[
            styles.statusValue,
            isConnected ? styles.connectedStatus : styles.disconnectedStatus,
          ]}
        >
          {isConnected ? '✓ Connected' : '✗ Not Connected'}
        </Text>

        {isConnected && address && (
          <>
            <Text style={[styles.statusLabel, { marginTop: 12 }]}>Address</Text>
            <Text style={styles.statusValue}>{shortenAddress(address)}</Text>
          </>
        )}

        {isConnected && chain && (
          <>
            <Text style={[styles.statusLabel, { marginTop: 12 }]}>Network</Text>
            <Text style={styles.statusValue}>{chain.name}</Text>
          </>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>
          Error: {error.message}
        </Text>
      )}

      {/* Action Button */}
      {isConnected ? (
        <TouchableOpacity
          style={[styles.button, styles.disconnectButton]}
          onPress={handleDisconnect}
        >
          <Text style={styles.buttonText}>Disconnect Wallet</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.connectButton]}
          onPress={() => setShowModal(true)}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={styles.buttonText}>Connect Wallet</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Wallet Selection Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Wallet</Text>

            <ScrollView>
              {connectors.map(connector => (
                <TouchableOpacity
                  key={connector.name}
                  style={styles.connectorButton}
                  onPress={() => handleConnect(connector.name)}
                  disabled={isPending}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.connectorName}>{connector.name}</Text>
                    <Text style={styles.connectorDescription}>
                      {connectorDescriptions[connector.name.toLowerCase()] || 'Connect with ' + connector.name}
                    </Text>
                  </View>
                  {isPending && (
                    <ActivityIndicator color={colors.primary} size="small" />
                  )}
                </TouchableOpacity>
              ))}

              {/* Close Button */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.surface, marginTop: 12 }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.buttonText, { color: colors.foreground }]}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
