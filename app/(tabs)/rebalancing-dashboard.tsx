import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Switch, Modal, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useAutoRebalancing } from '@/hooks/use-auto-rebalancing';
import { useColors } from '@/hooks/use-colors';
import { translations } from '@/lib/i18n/translations';
import type { Language } from '@/lib/i18n/translations';
import * as Haptics from 'expo-haptics';

const DEFAULT_LANGUAGE: Language = 'en';

export default function RebalancingDashboardScreen() {
  const colors = useColors();
  const t = translations[DEFAULT_LANGUAGE];
  const { config, stats, updateConfig, getRebalancingHistory, getSuccessRate } =
    useAutoRebalancing('default_copy_trade');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'history' | 'settings'>('overview');

  const handleToggleEnabled = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateConfig({ enabled: !config.enabled });
  };

  const handleSaveConfig = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowConfigModal(false);
  };

  const successRate = getSuccessRate();
  const recentHistory = getRebalancingHistory(5);

  const renderOverviewTab = () => (
    <View className="gap-4">
      {/* Status Card */}
      <View
        className="rounded-2xl p-6 border"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-foreground">
            {t['rebalancing.title']}
          </Text>
          <View
            className="px-3 py-1 rounded-full"
            style={{
              backgroundColor: config.enabled ? '#22C55E' : '#EF4444',
            }}
          >
            <Text className="text-xs font-semibold text-white">
              {config.enabled ? t['rebalancing.enabled'] : t['rebalancing.disabled']}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleToggleEnabled}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.background,
            },
          ]}
          className="flex-row items-center justify-between py-3 px-4 rounded-lg"
        >
          <Text className="text-foreground font-medium">{t['rebalancing.enabled']}</Text>
          <Switch
            value={config.enabled}
            onValueChange={handleToggleEnabled}
            trackColor={{ false: colors.border, true: '#22C55E' }}
          />
        </Pressable>
      </View>

      {/* Statistics Cards */}
      <View className="gap-3">
        <View
          className="flex-row rounded-2xl p-4 border"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <View className="flex-1">
            <Text className="text-sm text-muted mb-1">{t['rebalancing.successRate']}</Text>
            <Text className="text-2xl font-bold text-foreground">{successRate.toFixed(1)}%</Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-sm text-muted mb-1">{t['rebalancing.totalRebalances']}</Text>
            <Text className="text-2xl font-bold text-foreground">{stats.totalRebalances}</Text>
          </View>
        </View>

        <View
          className="flex-row rounded-2xl p-4 border"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <View className="flex-1">
            <Text className="text-sm text-muted mb-1">Riusciti</Text>
            <Text className="text-2xl font-bold" style={{ color: '#22C55E' }}>
              {stats.successfulRebalances}
            </Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-sm text-muted mb-1">Falliti</Text>
            <Text className="text-2xl font-bold" style={{ color: '#EF4444' }}>
              {stats.failedRebalances}
            </Text>
          </View>
        </View>
      </View>

      {/* Configuration Summary */}
      <View
        className="rounded-2xl p-4 border"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <Text className="text-sm font-semibold text-foreground mb-3">Configuration</Text>
        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">{t['rebalancing.threshold']}</Text>
            <Text className="text-sm font-semibold text-foreground">{config.threshold}%</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">{t['rebalancing.frequency']}</Text>
            <Text className="text-sm font-semibold text-foreground capitalize">
              {config.frequency}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted">{t['rebalancing.maxPerDay']}</Text>
            <Text className="text-sm font-semibold text-foreground">
              {config.maxRebalancesPerDay}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderHistoryTab = () => (
    <View className="gap-4">
      {recentHistory.length > 0 ? (
        <FlatList
          data={recentHistory}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View
              className="rounded-2xl p-4 border mb-3"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-semibold text-foreground">
                  {item.changes.length} Assets Rebalanced
                </Text>
                <View
                  className="px-2 py-1 rounded"
                  style={{
                    backgroundColor:
                      item.status === 'completed'
                        ? '#22C55E'
                        : item.status === 'failed'
                          ? '#EF4444'
                          : '#F59E0B',
                  }}
                >
                  <Text className="text-xs font-semibold text-white capitalize">
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-muted mb-2">
                {new Date(item.timestamp).toLocaleString()}
              </Text>
              {item.changes.length > 0 && (
                <View className="gap-1">
                  {item.changes.slice(0, 3).map((change, idx) => (
                    <View key={idx} className="flex-row justify-between">
                      <Text className="text-xs text-muted">{change.asset}</Text>
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color: change.percentChange > 0 ? '#22C55E' : '#EF4444',
                        }}
                      >
                        {change.percentChange > 0 ? '+' : ''}{change.percentChange.toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        />
      ) : (
        <View className="items-center justify-center py-12">
          <Text className="text-muted">{t['rebalancing.noHistory']}</Text>
        </View>
      )}
    </View>
  );

  const renderSettingsTab = () => (
    <View className="gap-4">
      <Pressable
        onPress={() => setShowConfigModal(true)}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.7 : 1,
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          },
        ]}
        className="rounded-2xl p-4 border"
      >
        <Text className="text-white font-semibold text-center">Modifica Configurazione</Text>
      </Pressable>

      <View
        className="rounded-2xl p-4 border"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <Text className="text-sm font-semibold text-foreground mb-3">Impostazioni Attuali</Text>
        <View className="gap-3">
          <View>
            <Text className="text-xs text-muted mb-1">{t['rebalancing.threshold']}</Text>
            <Text className="text-base font-semibold text-foreground">{config.threshold}%</Text>
          </View>
          <View>
            <Text className="text-xs text-muted mb-1">{t['rebalancing.frequency']}</Text>
            <Text className="text-base font-semibold text-foreground capitalize">
              {config.frequency}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-muted mb-1">{t['rebalancing.maxPerDay']}</Text>
            <Text className="text-base font-semibold text-foreground">
              {config.maxRebalancesPerDay}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">
            {t['rebalancing.title']}
          </Text>
          <Text className="text-sm text-muted">Gestisci il ribilanciamento automatico del portafoglio</Text>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row gap-2 mb-6">
          {(['overview', 'history', 'settings'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                setSelectedTab(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: selectedTab === tab ? colors.primary : colors.surface,
                  borderColor: selectedTab === tab ? colors.primary : colors.border,
                },
              ]}
              className="flex-1 py-2 px-3 rounded-lg border"
            >
              <Text
                className="text-sm font-semibold text-center capitalize"
                style={{
                  color: selectedTab === tab ? '#ffffff' : colors.foreground,
                }}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'history' && renderHistoryTab()}
        {selectedTab === 'settings' && renderSettingsTab()}
      </ScrollView>

      {/* Configuration Modal */}
      <Modal visible={showConfigModal} transparent animationType="slide">
        <View
          className="flex-1 justify-end"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <View
            className="rounded-t-3xl p-6 gap-4"
            style={{
              backgroundColor: colors.background,
            }}
          >
            <Text className="text-2xl font-bold text-foreground mb-4">Modifica Configurazione</Text>

            <View className="gap-3">
              <View>
                <Text className="text-sm font-semibold text-foreground mb-2">
                  {t['rebalancing.threshold']} (%)
                </Text>
                <View className="flex-row gap-2">
                  {[1, 3, 5, 10].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => updateConfig({ threshold: val })}
                      style={{
                        backgroundColor: config.threshold === val ? colors.primary : colors.surface,
                        borderColor: colors.border,
                      }}
                      className="flex-1 py-2 rounded border"
                    >
                      <Text
                        className="text-sm font-semibold text-center"
                        style={{
                          color: config.threshold === val ? '#ffffff' : colors.foreground,
                        }}
                      >
                        {val}%
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-sm font-semibold text-foreground mb-2">
                  {t['rebalancing.frequency']}
                </Text>
                <View className="gap-2">
                  {(['realtime', 'hourly', 'daily'] as const).map((freq) => (
                    <Pressable
                      key={freq}
                      onPress={() => updateConfig({ frequency: freq })}
                      style={{
                        backgroundColor: config.frequency === freq ? colors.primary : colors.surface,
                        borderColor: colors.border,
                      }}
                      className="py-3 px-4 rounded-lg border flex-row items-center"
                    >
                      <Text
                        className="font-semibold capitalize flex-1"
                        style={{
                          color: config.frequency === freq ? '#ffffff' : colors.foreground,
                        }}
                      >
                        {freq}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-sm font-semibold text-foreground mb-2">
                  {t['rebalancing.maxPerDay']}
                </Text>
                <View className="flex-row gap-2">
                  {[5, 10, 20, 50].map((val) => (
                      <Pressable
                        key={val}
                        onPress={() => updateConfig({ maxRebalancesPerDay: val })}
                        style={{
                          backgroundColor:
                            config.maxRebalancesPerDay === val ? colors.primary : colors.surface,
                          borderColor: colors.border,
                        }}
                        className="flex-1 py-2 rounded border"
                      >
                      <Text
                        className="text-sm font-semibold text-center"
                        style={{
                          color:
                            config.maxRebalancesPerDay === val ? '#ffffff' : colors.foreground,
                        }}
                      >
                        {val}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-4">
              <Pressable
                onPress={() => setShowConfigModal(false)}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                    borderColor: colors.border,
                  },
                ]}
                className="flex-1 py-3 rounded-lg border"
              >
                <Text className="text-center font-semibold text-foreground">Annulla</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveConfig}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor: colors.primary,
                  },
                ]}
                className="flex-1 py-3 rounded-lg"
              >
                <Text className="text-center font-semibold text-white">Salva</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
