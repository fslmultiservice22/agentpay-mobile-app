import { useState } from 'react';
import { Text, View, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';

export default function SettingsScreen() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);

  return (
    <ScreenContainer className="p-4">
      <View className="gap-6 flex-1">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Settings</Text>
          <Text className="text-base text-muted">Customize your wallet experience</Text>
        </View>

        {/* Display Settings */}
        <View className="gap-4">
          <Text className="text-lg font-semibold text-foreground">Display</Text>
          
          <View className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View>
              <Text className="text-foreground font-semibold">Dark Mode</Text>
              <Text className="text-muted text-sm">Use dark theme</Text>
            </View>
            <Switch value={darkMode} onValueChange={setDarkMode} />
          </View>
        </View>

        {/* Security Settings */}
        <View className="gap-4">
          <Text className="text-lg font-semibold text-foreground">Security</Text>
          
          <View className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View>
              <Text className="text-foreground font-semibold">Biometric Lock</Text>
              <Text className="text-muted text-sm">Use Face ID or Fingerprint</Text>
            </View>
            <Switch value={biometric} onValueChange={setBiometric} />
          </View>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4">
            <Text className="text-foreground font-semibold">Change Password</Text>
            <Text className="text-muted text-sm">Update your wallet password</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View className="gap-4">
          <Text className="text-lg font-semibold text-foreground">Notifications</Text>
          
          <View className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View>
              <Text className="text-foreground font-semibold">Push Notifications</Text>
              <Text className="text-muted text-sm">Get transaction alerts</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} />
          </View>
        </View>

        {/* Network Settings */}
        <View className="gap-4">
          <Text className="text-lg font-semibold text-foreground">Network</Text>
          
          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4">
            <Text className="text-foreground font-semibold">Current Network</Text>
            <Text className="text-muted text-sm">Ethereum Mainnet</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4">
            <Text className="text-foreground font-semibold">RPC Endpoint</Text>
            <Text className="text-muted text-sm">Configure custom RPC</Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          className="rounded-lg p-4 items-center justify-center border border-border"
          onPress={() => router.back()}
        >
          <Text className="text-foreground font-semibold text-base">Back</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}