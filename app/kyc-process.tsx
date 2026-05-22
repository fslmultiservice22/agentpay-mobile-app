import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Modal, Switch } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useTraderVerification, type VerificationLevel } from '@/hooks/use-trader-verification';
import * as Haptics from 'expo-haptics';

export default function KYCProcessScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const { verification, submitVerification, updateDocument, getVerificationProgress, VERIFICATION_LEVELS } = useTraderVerification('current-user');
  const [selectedLevel, setSelectedLevel] = useState<VerificationLevel>('basic');
  const [documents, setDocuments] = useState({
    idVerification: false,
    addressVerification: false,
    incomeVerification: false,
    bankVerification: false,
  });
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await submitVerification(selectedLevel, documents);
      router.back();
    } catch (error) {
      console.error('KYC submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentToggle = async (doc: keyof typeof documents) => {
    const updated = { ...documents, [doc]: !documents[doc] };
    setDocuments(updated);
    await updateDocument(doc, updated[doc]);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const progress = getVerificationProgress();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingVertical: 20, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.muted },
    section: { marginVertical: 16, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 14, color: colors.muted, marginBottom: 12, fontWeight: '600', textTransform: 'uppercase' },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    levelButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    levelButtonActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
    levelButtonInactive: { borderColor: colors.border, backgroundColor: colors.surface },
    levelName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    levelIcon: { fontSize: 16 },
    documentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    documentLabel: { fontSize: 14, fontWeight: '500', color: colors.foreground },
    progressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginVertical: 12 },
    progressFill: { height: '100%', backgroundColor: colors.primary },
    progressText: { fontSize: 12, color: colors.muted, marginTop: 8 },
    button: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', marginTop: 16 },
    buttonPrimary: { backgroundColor: colors.primary },
    buttonDisabled: { backgroundColor: colors.border, opacity: 0.5 },
    buttonText: { fontSize: 14, fontWeight: '600', color: colors.background },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingVertical: 20, paddingHorizontal: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 16 },
    closeButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.border, alignItems: 'center', marginTop: 12 },
    closeButtonText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  });

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('kyc.title') || 'KYC Verification'}</Text>
          <Text style={styles.subtitle}>{t('kyc.subtitle') || 'Complete your verification to unlock trading features'}</Text>
        </View>

        {/* Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
        </View>

        {/* Verification Level Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Verification Level</Text>
          {Object.entries(VERIFICATION_LEVELS).map(([level, info]) => (
            <TouchableOpacity
              key={level}
              style={[styles.levelButton, selectedLevel === level ? styles.levelButtonActive : styles.levelButtonInactive]}
              onPress={() => {
                setSelectedLevel(level as VerificationLevel);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View>
                <Text style={styles.levelName}>{info.icon} {info.name}</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                  {info.requirements.join(', ')}
                </Text>
              </View>
              {selectedLevel === level && <Text style={{ fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          <View style={styles.card}>
            <View style={[styles.documentRow, { borderBottomWidth: 1 }]}>
              <Text style={styles.documentLabel}>ID Verification</Text>
              <Switch
                value={documents.idVerification}
                onValueChange={() => handleDocumentToggle('idVerification')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={[styles.documentRow, { borderBottomWidth: 1 }]}>
              <Text style={styles.documentLabel}>Address Verification</Text>
              <Switch
                value={documents.addressVerification}
                onValueChange={() => handleDocumentToggle('addressVerification')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={[styles.documentRow, { borderBottomWidth: 1 }]}>
              <Text style={styles.documentLabel}>Income Verification</Text>
              <Switch
                value={documents.incomeVerification}
                onValueChange={() => handleDocumentToggle('incomeVerification')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={styles.documentRow}>
              <Text style={styles.documentLabel}>Bank Verification</Text>
              <Switch
                value={documents.bankVerification}
                onValueChange={() => handleDocumentToggle('bankVerification')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Verification'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
