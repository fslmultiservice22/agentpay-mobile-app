import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useTraderVerification, type VerificationLevel } from '@/hooks/use-trader-verification';
import * as Haptics from 'expo-haptics';

/** Documents handled by the verification flow. */
type DocumentKey = 'idVerification' | 'addressVerification' | 'incomeVerification' | 'bankVerification';

/**
 * Per-document lifecycle. Previously each document was a plain switch, so the
 * user could "declare" an upload without any state in between; now a document
 * moves from missing to uploaded and only then to verified.
 */
type DocumentStatus = 'missing' | 'uploaded' | 'verified';

const DOCUMENT_KEYS: DocumentKey[] = [
  'idVerification',
  'addressVerification',
  'incomeVerification',
  'bankVerification',
];

/**
 * Documents actually required by each level. The hook only knows about a
 * generic document map, so the requirement matrix lives here and drives both
 * the progress indicator and the submit validation.
 */
const LEVEL_REQUIREMENTS: Record<VerificationLevel, DocumentKey[]> = {
  unverified: [],
  basic: ['idVerification'],
  intermediate: ['idVerification', 'addressVerification'],
  advanced: ['idVerification', 'addressVerification', 'incomeVerification'],
  elite: ['idVerification', 'addressVerification', 'incomeVerification', 'bankVerification'],
};

interface PersonalInfo {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  residentialAddress: string;
  taxId: string;
}

const EMPTY_PERSONAL_INFO: PersonalInfo = {
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  residentialAddress: '',
  taxId: '',
};

/** ISO-like date validation (YYYY-MM-DD) with a plausibility check on the age. */
function isValidDateOfBirth(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return age >= 18 && age <= 120;
}

export default function KYCProcessScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const { verification, submitVerification, updateDocument, VERIFICATION_LEVELS } =
    useTraderVerification('current-user');

  const [selectedLevel, setSelectedLevel] = useState<VerificationLevel>('basic');
  const [documentStatus, setDocumentStatus] = useState<Record<DocumentKey, DocumentStatus>>({
    idVerification: 'missing',
    addressVerification: 'missing',
    incomeVerification: 'missing',
    bankVerification: 'missing',
  });
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(EMPTY_PERSONAL_INFO);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PersonalInfo, string>>>({});
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const requiredDocuments = LEVEL_REQUIREMENTS[selectedLevel];

  /**
   * Progress is measured against the documents required by the selected level,
   * not against the full document list, so choosing "basic" no longer shows 25%
   * as a ceiling.
   */
  const progress = useMemo(() => {
    const personalFilled =
      personalInfo.fullName.trim().length > 0 &&
      isValidDateOfBirth(personalInfo.dateOfBirth) &&
      personalInfo.nationality.trim().length > 0 &&
      personalInfo.residentialAddress.trim().length > 0;

    if (requiredDocuments.length === 0) return personalFilled ? 100 : 0;

    const verifiedRequired = requiredDocuments.filter(
      key => documentStatus[key] !== 'missing',
    ).length;
    const documentShare = (verifiedRequired / requiredDocuments.length) * 70;
    return Math.min(100, (personalFilled ? 30 : 0) + documentShare);
  }, [personalInfo, requiredDocuments, documentStatus]);

  const missingDocuments = useMemo(
    () => requiredDocuments.filter(key => documentStatus[key] === 'missing'),
    [requiredDocuments, documentStatus],
  );

  const validatePersonalInfo = useCallback((): boolean => {
    const errors: Partial<Record<keyof PersonalInfo, string>> = {};

    if (personalInfo.fullName.trim().length < 3) {
      errors.fullName = t('kyc.errorFullName');
    }
    if (!isValidDateOfBirth(personalInfo.dateOfBirth)) {
      errors.dateOfBirth = t('kyc.errorDateOfBirth');
    }
    if (personalInfo.nationality.trim().length < 2) {
      errors.nationality = t('kyc.errorNationality');
    }
    if (personalInfo.residentialAddress.trim().length < 5) {
      errors.residentialAddress = t('kyc.errorAddress');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [personalInfo, t]);

  /** Simulates picking a document and moves it to the "uploaded" state. */
  const handleUploadDocument = useCallback(
    async (key: DocumentKey) => {
      setDocumentStatus(previous => ({ ...previous, [key]: 'uploaded' }));
      setDocumentError(null);
      await updateDocument(key, true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [updateDocument],
  );

  const handleRemoveDocument = useCallback(
    async (key: DocumentKey) => {
      setDocumentStatus(previous => ({ ...previous, [key]: 'missing' }));
      await updateDocument(key, false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [updateDocument],
  );

  const handleSubmit = useCallback(async () => {
    const personalValid = validatePersonalInfo();

    if (missingDocuments.length > 0) {
      setDocumentError(
        `${t('kyc.errorMissingDocuments')} ${missingDocuments
          .map(key => t(`kyc.doc${key.charAt(0).toUpperCase()}${key.slice(1)}`))
          .join(', ')}`,
      );
    } else {
      setDocumentError(null);
    }

    if (!personalValid || missingDocuments.length > 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const documents = DOCUMENT_KEYS.reduce<Record<DocumentKey, boolean>>(
        (accumulator, key) => {
          accumulator[key] = documentStatus[key] !== 'missing';
          return accumulator;
        },
        {
          idVerification: false,
          addressVerification: false,
          incomeVerification: false,
          bankVerification: false,
        },
      );

      await submitVerification(selectedLevel, documents);
      setSubmitted(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(t('kyc.submittedTitle'), t('kyc.submittedMessage'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('KYC submission failed:', error);
      setDocumentError(t('kyc.errorSubmission'));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [
    validatePersonalInfo,
    missingDocuments,
    documentStatus,
    selectedLevel,
    submitVerification,
    router,
    t,
  ]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingVertical: 20,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        title: { fontSize: 28, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
        subtitle: { fontSize: 14, color: colors.muted },
        section: { marginVertical: 16, paddingHorizontal: 16 },
        sectionTitle: {
          fontSize: 14,
          color: colors.muted,
          marginBottom: 12,
          fontWeight: '600',
          textTransform: 'uppercase',
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
        },
        levelButton: {
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 12,
          borderWidth: 2,
          marginBottom: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        levelName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
        documentRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 14,
        },
        documentLabel: { fontSize: 14, fontWeight: '500', color: colors.foreground },
        statusPill: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          alignSelf: 'flex-start',
          marginTop: 4,
        },
        statusText: { fontSize: 10, fontWeight: '700' },
        progressBar: {
          height: 8,
          backgroundColor: colors.border,
          borderRadius: 4,
          overflow: 'hidden',
          marginVertical: 12,
        },
        progressFill: { height: '100%', backgroundColor: colors.primary },
        progressText: { fontSize: 12, color: colors.muted, marginTop: 8 },
        input: {
          backgroundColor: colors.background,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 14,
          color: colors.foreground,
          borderWidth: 1,
          borderColor: colors.border,
        },
        inputLabel: { fontSize: 12, color: colors.muted, marginBottom: 6 },
        inputError: { fontSize: 11, color: colors.error, marginTop: 4 },
        button: {
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 12,
          alignItems: 'center',
        },
        buttonText: { fontSize: 14, fontWeight: '700', color: colors.background },
        actionButton: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
        },
        actionButtonText: { fontSize: 12, fontWeight: '600' },
        banner: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 12 },
        bannerText: { fontSize: 12, fontWeight: '500' },
      }),
    [colors],
  );

  const statusTone = useCallback(
    (status: DocumentStatus) => {
      if (status === 'verified') return colors.success;
      if (status === 'uploaded') return colors.warning;
      return colors.muted;
    },
    [colors],
  );

  const statusLabel = useCallback(
    (status: DocumentStatus) => {
      if (status === 'verified') return t('kyc.statusVerified');
      if (status === 'uploaded') return t('kyc.statusUploaded');
      return t('kyc.statusMissing');
    },
    [t],
  );

  const personalFields: Array<{
    key: keyof PersonalInfo;
    labelKey: string;
    placeholder: string;
    required: boolean;
  }> = [
    { key: 'fullName', labelKey: 'kyc.fullName', placeholder: 'Jane Doe', required: true },
    { key: 'dateOfBirth', labelKey: 'kyc.dateOfBirth', placeholder: '1990-04-27', required: true },
    { key: 'nationality', labelKey: 'kyc.nationality', placeholder: 'Italy', required: true },
    {
      key: 'residentialAddress',
      labelKey: 'kyc.residentialAddress',
      placeholder: 'Via Roma 1, Milano',
      required: true,
    },
    { key: 'taxId', labelKey: 'kyc.taxId', placeholder: 'RSSMRA90D27F205X', required: false },
  ];

  return (
    <ScreenContainer className="flex-1">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        style={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('kyc.title')}</Text>
          <Text style={styles.subtitle}>{t('kyc.subtitle')}</Text>
        </View>

        {/* Current status of the stored verification */}
        {verification && verification.level !== 'unverified' && !submitted && (
          <View style={styles.section}>
            <View
              style={[
                styles.banner,
                { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.primary }]}>
                {t('kyc.currentLevel')}: {VERIFICATION_LEVELS[verification.level].name} ·{' '}
                {t('trading.score')} {verification.score}/100
              </Text>
            </View>
          </View>
        )}

        {submitted && (
          <View style={styles.section}>
            <View
              style={[
                styles.banner,
                { borderColor: colors.success, backgroundColor: `${colors.success}18` },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.success }]}>
                {t('kyc.underReview')}
              </Text>
            </View>
          </View>
        )}

        {/* Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('kyc.progressTitle')}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress)}% · {t('kyc.requiredDocuments')}: {requiredDocuments.length}
          </Text>
        </View>

        {/* Level selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('kyc.selectLevel')}</Text>
          {(Object.keys(VERIFICATION_LEVELS) as VerificationLevel[])
            .filter(level => level !== 'unverified')
            .map(level => {
              const info = VERIFICATION_LEVELS[level];
              const active = selectedLevel === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButton,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}20` : colors.surface,
                    },
                  ]}
                  onPress={() => {
                    setSelectedLevel(level);
                    setDocumentError(null);
                    void Haptics.selectionAsync();
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.levelName}>
                      {info.icon} {info.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                      {info.requirements.join(', ')}
                    </Text>
                    {info.benefits.length > 0 && (
                      <Text style={{ fontSize: 11, color: colors.success, marginTop: 4 }}>
                        {info.benefits.join(' · ')}
                      </Text>
                    )}
                  </View>
                  {active && <Text style={{ fontSize: 18, color: colors.primary }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
        </View>

        {/* Personal information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('kyc.personalInfo')}</Text>
          <View style={styles.card}>
            {personalFields.map((field, index) => (
              <View key={field.key} style={{ marginBottom: index === personalFields.length - 1 ? 0 : 16 }}>
                <Text style={styles.inputLabel}>
                  {t(field.labelKey)}
                  {field.required ? ' *' : ''}
                </Text>
                <TextInput
                  value={personalInfo[field.key]}
                  onChangeText={value => {
                    setPersonalInfo(previous => ({ ...previous, [field.key]: value }));
                    setFieldErrors(previous => ({ ...previous, [field.key]: undefined }));
                  }}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.muted}
                  autoCapitalize={field.key === 'taxId' ? 'characters' : 'words'}
                  style={[
                    styles.input,
                    fieldErrors[field.key] ? { borderColor: colors.error } : null,
                  ]}
                />
                {fieldErrors[field.key] && (
                  <Text style={styles.inputError}>{fieldErrors[field.key]}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('kyc.documents')}</Text>
          <View style={styles.card}>
            {DOCUMENT_KEYS.map((key, index) => {
              const status = documentStatus[key];
              const required = requiredDocuments.includes(key);
              const tone = statusTone(status);
              return (
                <View
                  key={key}
                  style={[
                    styles.documentRow,
                    index < DOCUMENT_KEYS.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                      : null,
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.documentLabel}>
                      {t(`kyc.doc${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                      {required ? ' *' : ''}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: `${tone}22` }]}>
                      <Text style={[styles.statusText, { color: tone }]}>{statusLabel(status)}</Text>
                    </View>
                  </View>

                  {status === 'missing' ? (
                    <TouchableOpacity
                      onPress={() => handleUploadDocument(key)}
                      style={[
                        styles.actionButton,
                        { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
                      ]}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                        {t('kyc.upload')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleRemoveDocument(key)}
                      style={[styles.actionButton, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.muted }]}>
                        {t('common.delete')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          {documentError && (
            <View
              style={[
                styles.banner,
                { borderColor: colors.error, backgroundColor: `${colors.error}18` },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.error }]}>{documentError}</Text>
            </View>
          )}

          <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 16 }}>
            {t('kyc.privacyNote')}
          </Text>
        </View>

        {/* Submit */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: loading ? colors.border : colors.primary,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common.loading') : t('kyc.submit')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
