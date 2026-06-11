/**
 * Email Verification & Account Recovery Service
 * Email confirmation, password reset, 2FA
 */

export interface EmailVerificationToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: number;
  isUsed: boolean;
  usedAt?: number;
  createdAt: number;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  isUsed: boolean;
  usedAt?: number;
  createdAt: number;
}

export interface TwoFactorAuth {
  userId: string;
  isEnabled: boolean;
  method: 'email' | 'sms' | 'authenticator';
  secret?: string;
  backupCodes: string[];
  createdAt: number;
  lastUsedAt?: number;
}

export interface TwoFactorChallenge {
  id: string;
  userId: string;
  code: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  isVerified: boolean;
  verifiedAt?: number;
  createdAt: number;
}

export interface AccountRecoveryOption {
  id: string;
  userId: string;
  type: 'email' | 'phone' | 'recovery_code';
  value: string;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt?: number;
  createdAt: number;
}

export interface SessionToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  createdAt: number;
  lastActivityAt: number;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

class EmailVerificationRecoveryService {
  private verificationTokens: Map<string, EmailVerificationToken> = new Map();
  private passwordResetTokens: Map<string, PasswordResetToken> = new Map();
  private twoFactorAuths: Map<string, TwoFactorAuth> = new Map();
  private twoFactorChallenges: Map<string, TwoFactorChallenge> = new Map();
  private recoveryOptions: Map<string, AccountRecoveryOption[]> = new Map();
  private sessionTokens: Map<string, SessionToken> = new Map();
  private emailVerified: Map<string, boolean> = new Map();

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(userId: string, email: string): EmailVerificationToken {
    const tokenId = `evt_${Date.now()}`;
    const token = this.generateRandomToken(32);

    const verificationToken: EmailVerificationToken = {
      id: tokenId,
      userId,
      email,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      isUsed: false,
      createdAt: Date.now(),
    };

    this.verificationTokens.set(tokenId, verificationToken);

    return verificationToken;
  }

  /**
   * Verify email with token
   */
  verifyEmailWithToken(token: string): boolean {
    const verificationToken = Array.from(this.verificationTokens.values()).find(t => t.token === token);

    if (!verificationToken) return false;
    if (verificationToken.isUsed) return false;
    if (verificationToken.expiresAt < Date.now()) return false;

    verificationToken.isUsed = true;
    verificationToken.usedAt = Date.now();

    this.emailVerified.set(verificationToken.userId, true);

    return true;
  }

  /**
   * Is email verified
   */
  isEmailVerified(userId: string): boolean {
    return this.emailVerified.get(userId) || false;
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId: string): PasswordResetToken {
    const tokenId = `prt_${Date.now()}`;
    const token = this.generateRandomToken(32);

    const resetToken: PasswordResetToken = {
      id: tokenId,
      userId,
      token,
      expiresAt: Date.now() + 1 * 60 * 60 * 1000, // 1 hour
      isUsed: false,
      createdAt: Date.now(),
    };

    this.passwordResetTokens.set(tokenId, resetToken);

    return resetToken;
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token: string): string | null {
    const resetToken = Array.from(this.passwordResetTokens.values()).find(t => t.token === token);

    if (!resetToken) return null;
    if (resetToken.isUsed) return null;
    if (resetToken.expiresAt < Date.now()) return null;

    resetToken.isUsed = true;
    resetToken.usedAt = Date.now();

    return resetToken.userId;
  }

  /**
   * Enable two-factor authentication
   */
  enableTwoFactorAuth(userId: string, method: 'email' | 'sms' | 'authenticator'): TwoFactorAuth {
    const backupCodes = this.generateBackupCodes(10);

    const twoFactorAuth: TwoFactorAuth = {
      userId,
      isEnabled: true,
      method,
      backupCodes,
      createdAt: Date.now(),
    };

    if (method === 'authenticator') {
      twoFactorAuth.secret = this.generateRandomToken(32);
    }

    this.twoFactorAuths.set(userId, twoFactorAuth);

    return twoFactorAuth;
  }

  /**
   * Disable two-factor authentication
   */
  disableTwoFactorAuth(userId: string): boolean {
    const twoFactorAuth = this.twoFactorAuths.get(userId);
    if (!twoFactorAuth) return false;

    twoFactorAuth.isEnabled = false;

    return true;
  }

  /**
   * Generate two-factor challenge
   */
  generateTwoFactorChallenge(userId: string): TwoFactorChallenge {
    const challengeId = `2fa_${Date.now()}`;
    const code = this.generateNumericCode(6);

    const challenge: TwoFactorChallenge = {
      id: challengeId,
      userId,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
      maxAttempts: 5,
      isVerified: false,
      createdAt: Date.now(),
    };

    this.twoFactorChallenges.set(challengeId, challenge);

    return challenge;
  }

  /**
   * Verify two-factor code
   */
  verifyTwoFactorCode(userId: string, code: string): boolean {
    const challenge = Array.from(this.twoFactorChallenges.values()).find(
      c => c.userId === userId && !c.isVerified && c.expiresAt > Date.now()
    );

    if (!challenge) return false;

    challenge.attempts++;

    if (challenge.attempts > challenge.maxAttempts) {
      return false;
    }

    if (challenge.code === code) {
      challenge.isVerified = true;
      challenge.verifiedAt = Date.now();

      const twoFactorAuth = this.twoFactorAuths.get(userId);
      if (twoFactorAuth) {
        twoFactorAuth.lastUsedAt = Date.now();
      }

      return true;
    }

    return false;
  }

  /**
   * Use backup code
   */
  useTwoFactorBackupCode(userId: string, backupCode: string): boolean {
    const twoFactorAuth = this.twoFactorAuths.get(userId);
    if (!twoFactorAuth) return false;

    const index = twoFactorAuth.backupCodes.indexOf(backupCode);
    if (index === -1) return false;

    // Remove used backup code
    twoFactorAuth.backupCodes.splice(index, 1);

    return true;
  }

  /**
   * Add account recovery option
   */
  addRecoveryOption(userId: string, type: 'email' | 'phone' | 'recovery_code', value: string): AccountRecoveryOption {
    const optionId = `rec_${Date.now()}`;

    const recoveryOption: AccountRecoveryOption = {
      id: optionId,
      userId,
      type,
      value,
      isPrimary: false,
      isVerified: false,
      createdAt: Date.now(),
    };

    const options = this.recoveryOptions.get(userId) || [];
    options.push(recoveryOption);
    this.recoveryOptions.set(userId, options);

    return recoveryOption;
  }

  /**
   * Verify recovery option
   */
  verifyRecoveryOption(optionId: string): boolean {
    const options = Array.from(this.recoveryOptions.values()).flat();
    const option = options.find(o => o.id === optionId);

    if (!option) return false;

    option.isVerified = true;
    option.verifiedAt = Date.now();

    return true;
  }

  /**
   * Get recovery options
   */
  getRecoveryOptions(userId: string): AccountRecoveryOption[] {
    return this.recoveryOptions.get(userId) || [];
  }

  /**
   * Create session token
   */
  createSessionToken(userId: string, ipAddress?: string, userAgent?: string): SessionToken {
    const tokenId = `sess_${Date.now()}`;
    const token = this.generateRandomToken(64);

    const sessionToken: SessionToken = {
      id: tokenId,
      userId,
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      ipAddress,
      userAgent,
      isActive: true,
    };

    this.sessionTokens.set(tokenId, sessionToken);

    return sessionToken;
  }

  /**
   * Verify session token
   */
  verifySessionToken(token: string): string | null {
    const sessionToken = Array.from(this.sessionTokens.values()).find(t => t.token === token);

    if (!sessionToken) return null;
    if (!sessionToken.isActive) return null;
    if (sessionToken.expiresAt < Date.now()) return null;

    sessionToken.lastActivityAt = Date.now();

    return sessionToken.userId;
  }

  /**
   * Invalidate session token
   */
  invalidateSessionToken(token: string): boolean {
    const sessionToken = Array.from(this.sessionTokens.values()).find(t => t.token === token);

    if (!sessionToken) return false;

    sessionToken.isActive = false;

    return true;
  }

  /**
   * Get active sessions
   */
  getActiveSessions(userId: string): SessionToken[] {
    return Array.from(this.sessionTokens.values()).filter(t => t.userId === userId && t.isActive);
  }

  /**
   * Invalidate all sessions
   */
  invalidateAllSessions(userId: string): boolean {
    const sessions = this.getActiveSessions(userId);

    sessions.forEach(session => {
      session.isActive = false;
    });

    return true;
  }

  /**
   * Generate random token
   */
  private generateRandomToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';

    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return token;
  }

  /**
   * Generate numeric code
   */
  private generateNumericCode(length: number): string {
    let code = '';

    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10);
    }

    return code;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = `${this.generateNumericCode(4)}-${this.generateNumericCode(4)}`;
      codes.push(code);
    }

    return codes;
  }

  /**
   * Clean expired tokens
   */
  cleanExpiredTokens(): void {
    const now = Date.now();

    // Clean verification tokens
    Array.from(this.verificationTokens.entries()).forEach(([key, token]) => {
      if (token.expiresAt < now && token.isUsed) {
        this.verificationTokens.delete(key);
      }
    });

    // Clean password reset tokens
    Array.from(this.passwordResetTokens.entries()).forEach(([key, token]) => {
      if (token.expiresAt < now && token.isUsed) {
        this.passwordResetTokens.delete(key);
      }
    });

    // Clean 2FA challenges
    Array.from(this.twoFactorChallenges.entries()).forEach(([key, challenge]) => {
      if (challenge.expiresAt < now && challenge.isVerified) {
        this.twoFactorChallenges.delete(key);
      }
    });

    // Clean session tokens
    Array.from(this.sessionTokens.entries()).forEach(([key, session]) => {
      if (session.expiresAt < now && !session.isActive) {
        this.sessionTokens.delete(key);
      }
    });
  }
}

export const emailVerificationRecoveryService = new EmailVerificationRecoveryService();
