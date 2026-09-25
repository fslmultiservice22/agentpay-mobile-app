import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired';
export type VerificationType = 'email' | 'phone' | 'identity' | 'address' | 'income';

export interface KYCDocument {
  id: string;
  type: VerificationType;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: number;
  verifiedAt?: number;
  expiresAt?: number;
  rejectionReason?: string;
}

export interface UserKYC {
  userId: string;
  status: KYCStatus;
  tier: 'tier1' | 'tier2' | 'tier3';
  documents: KYCDocument[];
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    yearlyLimit: number;
  };
  usage: {
    daily: number;
    monthly: number;
    yearly: number;
  };
  lastUpdated: number;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'aml' | 'sanctions' | 'kyc' | 'transaction';
  threshold?: number;
}

export function useKYC() {
  const [kyc, setKYC] = useState<UserKYC | null>(null);
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  const DEFAULT_RULES: ComplianceRule[] = [
    {
      id: 'rule_aml_1',
      name: 'AML Check',
      description: 'Anti-Money Laundering verification',
      enabled: true,
      type: 'aml',
    },
    {
      id: 'rule_sanctions_1',
      name: 'Sanctions List Check',
      description: 'Check against OFAC sanctions list',
      enabled: true,
      type: 'sanctions',
    },
    {
      id: 'rule_kyc_1',
      name: 'KYC Verification',
      description: 'Know Your Customer verification',
      enabled: true,
      type: 'kyc',
    },
    {
      id: 'rule_transaction_1',
      name: 'Large Transaction Alert',
      description: 'Alert on transactions > $10,000',
      enabled: true,
      type: 'transaction',
      threshold: 10000,
    },
  ];

  // Load KYC data
  const loadKYC = useCallback(async (userId: string) => {
    try {
      const stored = await AsyncStorage.getItem(`agentpay_kyc_${userId}`);
      if (stored) {
        setKYC(JSON.parse(stored));
      } else {
        // Initialize new KYC
        const newKYC: UserKYC = {
          userId,
          status: 'not_started',
          tier: 'tier1',
          documents: [],
          limits: {
            dailyLimit: 1000,
            monthlyLimit: 10000,
            yearlyLimit: 100000,
          },
          usage: {
            daily: 0,
            monthly: 0,
            yearly: 0,
          },
          lastUpdated: Date.now(),
        };
        setKYC(newKYC);
      }
    } catch (error) {
      console.error('Failed to load KYC:', error);
    }
  }, []);

  // Save KYC data
  const saveKYC = useCallback(async (kycData: UserKYC) => {
    try {
      await AsyncStorage.setItem(`agentpay_kyc_${kycData.userId}`, JSON.stringify(kycData));
      setKYC(kycData);
    } catch (error) {
      console.error('Failed to save KYC:', error);
    }
  }, []);

  // Start verification
  const startVerification = useCallback(async (userId: string, type: VerificationType) => {
    try {
      setIsVerifying(true);

      if (!kyc) return null;

      const document: KYCDocument = {
        id: `doc_${Date.now()}`,
        type,
        status: 'pending',
        uploadedAt: Date.now(),
      };

      const updated = {
        ...kyc,
        documents: [...kyc.documents, document],
        lastUpdated: Date.now(),
      };

      await saveKYC(updated);
      setIsVerifying(false);

      return document;
    } catch (error) {
      console.error('Failed to start verification:', error);
      setIsVerifying(false);
      return null;
    }
  }, [kyc, saveKYC]);

  // Approve document
  const approveDocument = useCallback(
    async (documentId: string) => {
      try {
        if (!kyc) return;

        const updated = {
          ...kyc,
          documents: kyc.documents.map((d) =>
            d.id === documentId
              ? {
                  ...d,
                  status: 'approved' as const,
                  verifiedAt: Date.now(),
                  expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
                }
              : d
          ),
          lastUpdated: Date.now(),
        };

        // Check if all documents approved
        if (updated.documents.every((d) => d.status === 'approved')) {
          updated.status = 'approved';
          updated.tier = 'tier3';
          // Update limits for tier 3
          updated.limits = {
            dailyLimit: 100000,
            monthlyLimit: 1000000,
            yearlyLimit: 10000000,
          };
        }

        await saveKYC(updated);
      } catch (error) {
        console.error('Failed to approve document:', error);
      }
    },
    [kyc, saveKYC]
  );

  // Reject document
  const rejectDocument = useCallback(
    async (documentId: string, reason: string) => {
      try {
        if (!kyc) return;

        const updated = {
          ...kyc,
          documents: kyc.documents.map((d) =>
            d.id === documentId
              ? {
                  ...d,
                  status: 'rejected' as const,
                  rejectionReason: reason,
                }
              : d
          ),
          status: 'rejected' as const,
          lastUpdated: Date.now(),
        };

        await saveKYC(updated);
      } catch (error) {
        console.error('Failed to reject document:', error);
      }
    },
    [kyc, saveKYC]
  );

  // Check transaction compliance
  const checkTransactionCompliance = useCallback(
    async (amount: number): Promise<{ compliant: boolean; reason?: string }> => {
      try {
        if (!kyc) return { compliant: false, reason: 'KYC not initialized' };

        // Check KYC status
        if (kyc.status !== 'approved') {
          return { compliant: false, reason: 'KYC not approved' };
        }

        // Check limits
        if (amount > kyc.limits.dailyLimit) {
          return { compliant: false, reason: 'Exceeds daily limit' };
        }

        if (kyc.usage.daily + amount > kyc.limits.dailyLimit) {
          return { compliant: false, reason: 'Daily limit exceeded' };
        }

        if (kyc.usage.monthly + amount > kyc.limits.monthlyLimit) {
          return { compliant: false, reason: 'Monthly limit exceeded' };
        }

        // Check compliance rules
        for (const rule of complianceRules) {
          if (rule.enabled && rule.type === 'transaction' && rule.threshold) {
            if (amount > rule.threshold) {
              // Large transaction - would trigger alert in production
            }
          }
        }

        return { compliant: true };
      } catch (error) {
        console.error('Failed to check compliance:', error);
        return { compliant: false, reason: 'Compliance check failed' };
      }
    },
    [kyc, complianceRules]
  );

  // Get KYC status
  const getKYCStatus = useCallback(() => {
    return kyc?.status || 'not_started';
  }, [kyc]);

  // Get compliance rules
  const getComplianceRules = useCallback(() => {
    return complianceRules;
  }, [complianceRules]);

  // Initialize compliance rules
  useEffect(() => {
    setComplianceRules(DEFAULT_RULES);
  }, []);

  return {
    kyc,
    complianceRules,
    isVerifying,
    loadKYC,
    saveKYC,
    startVerification,
    approveDocument,
    rejectDocument,
    checkTransactionCompliance,
    getKYCStatus,
    getComplianceRules,
  };
}
