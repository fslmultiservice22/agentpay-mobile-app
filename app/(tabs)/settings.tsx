import { ScrollView, Text, View, TouchableOpacity, Switch, StyleSheet, Modal, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useWallet } from '@/lib/web3/wallet-context';
import { useColors } from '@/hooks/use-colors';
import { useState } from 'react';
import { useI18n, type Language } from '@/hooks/use-i18n';
import { useBlockchain } from '@/lib/blockchain/blockchain-context';
import { BLOCKCHAINS, type BlockchainId } from '@/lib/blockchain/blockchain-config';

export default function SettingsScreen() {
  const colors = useColors();
  const wallet = useWallet();
  const { t, language, setLanguage, availableLanguages, getNativeLanguageName } = useI18n();
  const { selectedBlockchain, setSelectedBlockchain, availableBlockchains } = useBlockchain();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [blockchainModalVisible, setBlockchainModalVisible] = useState(false);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: '700', color: colors.foreground },
    section: { marginVertical: 16, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 12, color: colors.muted, marginBottom: 12, fontWeight: '600', textTransform: 'uppercase' },
    card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    settingLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    settingDescription: { fontSize: 12, color: colors.muted, marginTop: 4 },
    button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12 },
    buttonText: { color: colors.background, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    dangerButton: { backgroundColor: colors.error, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
    addressText: { fontSize: 12, color: colors.muted, fontFamily: 'monospace', marginTop: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16 },
    modalHeader: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
    languageItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    languageItemText: { fontSize: 16, color: colors.foreground, fontWeight: '600' },
    selectedLanguageText: { fontSize: 16, color: colors.primary, fontWeight: '700' },
    checkmark: { fontSize: 20, color: colors.primary },
  });

  const handleLanguageChange = async (newLanguage: Language) => {
    await setLanguage(newLanguage);
    setLanguageModalVisible(false);
  };

  const handleBlockchainChange = async (newBlockchain: BlockchainId) => {
    await setSelectedBlockchain(newBlockchain);
    setBlockchainModalVisible(false);
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.edit')}</Text>
          <View style={styles.card}>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('wallet.address')}</Text>
                <Text style={styles.addressText}>{wallet?.address?.substring(0, 6)}...{wallet?.address?.substring(-4)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Language & Blockchain Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setLanguageModalVisible(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.language')}</Text>
                <Text style={styles.settingDescription}>{getNativeLanguageName(language as Language)}</Text>
              </View>
              <Text style={{ fontSize: 20, color: colors.muted }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, { borderBottomWidth: 0 }]}
              onPress={() => setBlockchainModalVisible(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.blockchain')}</Text>
                <Text style={styles.settingDescription}>{BLOCKCHAINS[selectedBlockchain].name}</Text>
              </View>
              <Text style={{ fontSize: 20, color: colors.muted }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.security')}</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.biometric')}</Text>
                <Text style={styles.settingDescription}>{t('settings.biometricDesc')}</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={biometricEnabled ? colors.background : colors.muted}
              />
            </View>

            <View style={styles.settingRow}>
              <TouchableOpacity style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.backup')}</Text>
                <Text style={styles.settingDescription}>{t('settings.backupDesc')}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, color: colors.muted }}>›</Text>
            </View>

            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <TouchableOpacity style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.changePassword')}</Text>
                <Text style={styles.settingDescription}>{t('settings.changePasswordDesc')}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, color: colors.muted }}>›</Text>
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.notifications')}</Text>
                <Text style={styles.settingDescription}>{t('settings.notificationsDesc')}</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notificationsEnabled ? colors.background : colors.muted}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <TouchableOpacity style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.notificationPreferences')}</Text>
                <Text style={styles.settingDescription}>{t('settings.notificationPreferencesDesc')}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, color: colors.muted }}>›</Text>
            </View>
          </View>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.theme')}</Text>
          <View style={styles.card}>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.darkMode')}</Text>
                <Text style={styles.settingDescription}>{t('settings.darkModeDesc')}</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={darkMode ? colors.background : colors.muted}
              />
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>{t('settings.exportPrivateKey')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.dangerButton]}>
            <Text style={styles.buttonText}>{t('settings.logout')}</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.version')}</Text>
              </View>
              <Text style={styles.settingDescription}>1.0.0</Text>
            </View>

            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <TouchableOpacity style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.termsOfService')}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, color: colors.muted }}>›</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            </View>
            <FlatList
              data={availableLanguages}
              keyExtractor={(item) => item}
              renderItem={({ item: lang }) => (
                <TouchableOpacity
                  style={styles.languageItem}
                  onPress={() => handleLanguageChange(lang as Language)}
                >
                  <Text style={language === lang ? styles.selectedLanguageText : styles.languageItemText}>
                    {getNativeLanguageName(lang as Language)}
                  </Text>
                  {language === lang && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={[styles.button, { margin: 16 }]}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={styles.buttonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Blockchain Selection Modal */}
      <Modal
        visible={blockchainModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBlockchainModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.blockchain')}</Text>
            </View>
            <FlatList
              data={availableBlockchains}
              keyExtractor={(item) => item}
              renderItem={({ item: blockchain }) => (
                <TouchableOpacity
                  style={styles.languageItem}
                  onPress={() => handleBlockchainChange(blockchain)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>{BLOCKCHAINS[blockchain].icon}</Text>
                    <Text style={selectedBlockchain === blockchain ? styles.selectedLanguageText : styles.languageItemText}>
                      {BLOCKCHAINS[blockchain].name}
                    </Text>
                  </View>
                  {selectedBlockchain === blockchain && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={[styles.button, { margin: 16 }]}
              onPress={() => setBlockchainModalVisible(false)}
            >
              <Text style={styles.buttonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
