import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { ScreenContainer } from './screen-container';
import { useColors } from '@/hooks/use-colors';

export interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

/**
 * QR Code Scanner Component
 * Scans QR codes for WalletConnect pairing URIs
 */
export function QRCodeScanner({
  onScan,
  onCancel,
  title = 'Scan QR Code',
  description = 'Point your camera at the QR code',
}: QRCodeScannerProps) {
  const colors = useColors();

  // On web, show a mock scanner
  if (Platform.OS === 'web') {
    return (
      <ScreenContainer className="bg-background">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-2xl font-bold text-foreground mb-4">{title}</Text>
          <Text className="text-base text-muted text-center mb-8">{description}</Text>

          {/* Mock QR Code Area */}
          <View
            style={{
              width: 250,
              height: 250,
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: colors.border,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <Text className="text-sm text-muted">QR Code Scanner</Text>
            <Text className="text-xs text-muted mt-2">(Web Preview)</Text>
          </View>

          {/* Manual Input Option */}
          <TouchableOpacity
            onPress={() => {
              const mockUri = 'wc:test@2?relay-protocol=irn&symKey=test';
              onScan(mockUri);
            }}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <Text className="text-white font-semibold text-center">Scan (Mock)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onCancel}
            style={{
              backgroundColor: colors.surface,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text className="text-foreground font-semibold text-center">Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // On mobile, show camera-based scanner
  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="p-4 border-b border-border">
          <Text className="text-2xl font-bold text-foreground">{title}</Text>
          <Text className="text-sm text-muted mt-1">{description}</Text>
        </View>

        {/* Camera Area */}
        <View className="flex-1 bg-black items-center justify-center">
          <View
            style={{
              width: '80%',
              aspectRatio: 1,
              borderWidth: 2,
              borderColor: colors.primary,
              borderRadius: 12,
            }}
          />
          <Text className="text-white text-sm mt-4">Camera Preview</Text>
          <Text className="text-gray-400 text-xs mt-2">
            (Native camera integration required)
          </Text>
        </View>

        {/* Bottom Controls */}
        <View className="p-4 border-t border-border gap-3">
          <TouchableOpacity
            onPress={() => {
              const mockUri = 'wc:test@2?relay-protocol=irn&symKey=test';
              onScan(mockUri);
            }}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text className="text-white font-semibold text-center">Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onCancel}
            style={{
              backgroundColor: colors.surface,
              paddingVertical: 12,
              borderRadius: 8,
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
