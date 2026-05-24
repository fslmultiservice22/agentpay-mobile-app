/**
 * Compliance & KYC Module Service
 * User verification workflow with document upload and automated approval
 */

export interface KYCDocument {
  id: string;
  userId: string;
  documentType: 'id' | 'address_proof' | 'income_verification' | 'selfie';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  uploadedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
  expiresAt?: number;
}

export interface KYCVerification {
  userId: string;
  verificationLevel: 'unverified' | 'level1' | 'level2' | 'level3';
  identityVerified: boolean;
  addressVerified: boolean;
  incomeVerified: boolean;
  selfieVerified: boolean;
  overallStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvalDate?: number;
  rejectionReason?: string;
  nextReviewDate?: number;
  documents: KYCDocument[];
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: 'transaction_limit' | 'daily_limit' | 'monthly_limit' | 'kyc_requirement' | 'country_restriction';
  enabled: boolean;
  parameters: Record<string, any>;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
}

class ComplianceKYCService {
  private kycVerifications: Map<string, KYCVerification> = new Map();
  private kycDocuments: Map<string, KYCDocument> = new Map();
  private complianceRules: Map<string, ComplianceRule> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default compliance rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: ComplianceRule[] = [
      {
        id: 'rule_1',
        name: 'Daily Transaction Limit',
        description: 'Maximum daily transaction amount',
        type: 'daily_limit',
        enabled: true,
        parameters: { limit: 50000, currency: 'USD' },
        createdAt: Date.now(),
      },
      {
        id: 'rule_2',
        name: 'Monthly Transaction Limit',
        description: 'Maximum monthly transaction amount',
        type: 'monthly_limit',
        enabled: true,
        parameters: { limit: 500000, currency: 'USD' },
        createdAt: Date.now(),
      },
      {
        id: 'rule_3',
        name: 'KYC Level 2 Requirement',
        description: 'Level 2 KYC required for transactions over $10,000',
        type: 'kyc_requirement',
        enabled: true,
        parameters: { threshold: 10000, requiredLevel: 'level2' },
        createdAt: Date.now(),
      },
    ];

    for (const rule of defaultRules) {
      this.complianceRules.set(rule.id, rule);
    }
  }

  /**
   * Initiate KYC verification
   */
  initiateKYCVerification(userId: string): KYCVerification {
    const existing = this.kycVerifications.get(userId);
    if (existing) return existing;

    const verification: KYCVerification = {
      userId,
      verificationLevel: 'unverified',
      identityVerified: false,
      addressVerified: false,
      incomeVerified: false,
      selfieVerified: false,
      overallStatus: 'pending',
      documents: [],
    };

    this.kycVerifications.set(userId, verification);
    this.logAuditAction(userId, 'kyc_initiated', {});

    return verification;
  }

  /**
   * Upload KYC document
   */
  uploadKYCDocument(
    userId: string,
    documentType: KYCDocument['documentType'],
    fileName: string,
    fileUrl: string,
    fileSize: number,
    mimeType: string
  ): KYCDocument {
    const document: KYCDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      documentType,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      status: 'pending',
      uploadedAt: Date.now(),
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
    };

    this.kycDocuments.set(document.id, document);

    // Update verification documents
    const verification = this.kycVerifications.get(userId);
    if (verification) {
      verification.documents.push(document);
    }

    this.logAuditAction(userId, 'document_uploaded', { documentType, fileName });

    return document;
  }

  /**
   * Review KYC document
   */
  reviewKYCDocument(
    documentId: string,
    approved: boolean,
    reviewedBy: string,
    rejectionReason?: string
  ): boolean {
    const document = this.kycDocuments.get(documentId);
    if (!document) return false;

    document.status = approved ? 'approved' : 'rejected';
    document.reviewedAt = Date.now();
    document.reviewedBy = reviewedBy;
    if (rejectionReason) {
      document.rejectionReason = rejectionReason;
    }

    this.logAuditAction(document.userId, 'document_reviewed', {
      documentId,
      approved,
      rejectionReason,
    });

    // Update verification status
    this.updateVerificationStatus(document.userId);

    return true;
  }

  /**
   * Update verification status
   */
  private updateVerificationStatus(userId: string): void {
    const verification = this.kycVerifications.get(userId);
    if (!verification) return;

    const approvedDocs = verification.documents.filter(d => d.status === 'approved');

    verification.identityVerified = approvedDocs.some(d => d.documentType === 'id');
    verification.addressVerified = approvedDocs.some(d => d.documentType === 'address_proof');
    verification.incomeVerified = approvedDocs.some(d => d.documentType === 'income_verification');
    verification.selfieVerified = approvedDocs.some(d => d.documentType === 'selfie');

    // Determine verification level
    if (verification.identityVerified && verification.selfieVerified) {
      verification.verificationLevel = 'level1';
    }
    if (verification.identityVerified && verification.addressVerified && verification.selfieVerified) {
      verification.verificationLevel = 'level2';
    }
    if (verification.identityVerified && verification.addressVerified && verification.incomeVerified && verification.selfieVerified) {
      verification.verificationLevel = 'level3';
    }

    // Determine overall status
    const rejectedDocs = verification.documents.filter(d => d.status === 'rejected');
    if (rejectedDocs.length > 0) {
      verification.overallStatus = 'rejected';
      verification.rejectionReason = `${rejectedDocs.length} document(s) rejected`;
    } else if (verification.verificationLevel === 'level3') {
      verification.overallStatus = 'approved';
      verification.approvalDate = Date.now();
    }
  }

  /**
   * Get KYC verification
   */
  getKYCVerification(userId: string): KYCVerification | undefined {
    return this.kycVerifications.get(userId);
  }

  /**
   * Get KYC document
   */
  getKYCDocument(documentId: string): KYCDocument | undefined {
    return this.kycDocuments.get(documentId);
  }

  /**
   * Check compliance rules
   */
  checkComplianceRules(userId: string, transactionAmount: number): {
    compliant: boolean;
    violations: string[];
  } {
    const verification = this.kycVerifications.get(userId);
    const violations: string[] = [];

    for (const rule of this.complianceRules.values()) {
      if (!rule.enabled) continue;

      if (rule.type === 'kyc_requirement') {
        const requiredLevel = rule.parameters.requiredLevel;
        const threshold = rule.parameters.threshold;

        if (transactionAmount > threshold && verification?.verificationLevel !== requiredLevel) {
          violations.push(`KYC Level ${requiredLevel} required for transactions over $${threshold}`);
        }
      }

      if (rule.type === 'daily_limit') {
        const limit = rule.parameters.limit;
        if (transactionAmount > limit) {
          violations.push(`Daily transaction limit exceeded: $${limit}`);
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  /**
   * Add compliance rule
   */
  addComplianceRule(rule: ComplianceRule): boolean {
    this.complianceRules.set(rule.id, rule);
    return true;
  }

  /**
   * Update compliance rule
   */
  updateComplianceRule(ruleId: string, updates: Partial<ComplianceRule>): boolean {
    const rule = this.complianceRules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    return true;
  }

  /**
   * Get all compliance rules
   */
  getComplianceRules(): ComplianceRule[] {
    return Array.from(this.complianceRules.values());
  }

  /**
   * Log audit action
   */
  private logAuditAction(userId: string, action: string, details: Record<string, any>): void {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      details,
      timestamp: Date.now(),
    };

    this.auditLogs.set(log.id, log);
  }

  /**
   * Get audit logs
   */
  getAuditLogs(userId?: string): AuditLog[] {
    let logs = Array.from(this.auditLogs.values());

    if (userId) {
      logs = logs.filter(l => l.userId === userId);
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(): {
    totalUsers: number;
    verifiedUsers: number;
    pendingVerifications: number;
    rejectedVerifications: number;
    verificationLevels: Record<string, number>;
  } {
    const verifications = Array.from(this.kycVerifications.values());

    return {
      totalUsers: verifications.length,
      verifiedUsers: verifications.filter(v => v.overallStatus === 'approved').length,
      pendingVerifications: verifications.filter(v => v.overallStatus === 'pending').length,
      rejectedVerifications: verifications.filter(v => v.overallStatus === 'rejected').length,
      verificationLevels: {
        unverified: verifications.filter(v => v.verificationLevel === 'unverified').length,
        level1: verifications.filter(v => v.verificationLevel === 'level1').length,
        level2: verifications.filter(v => v.verificationLevel === 'level2').length,
        level3: verifications.filter(v => v.verificationLevel === 'level3').length,
      },
    };
  }

  /**
   * Suspend user
   */
  suspendUser(userId: string, reason: string): boolean {
    const verification = this.kycVerifications.get(userId);
    if (!verification) return false;

    verification.overallStatus = 'suspended';
    verification.rejectionReason = reason;
    this.logAuditAction(userId, 'user_suspended', { reason });

    return true;
  }

  /**
   * Unsuspend user
   */
  unsuspendUser(userId: string): boolean {
    const verification = this.kycVerifications.get(userId);
    if (!verification) return false;

    verification.overallStatus = 'approved';
    verification.rejectionReason = undefined;
    this.logAuditAction(userId, 'user_unsuspended', {});

    return true;
  }
}

export const complianceKYCService = new ComplianceKYCService();
