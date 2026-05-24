/**
 * Wallet Seed Phrase Management Service
 * Handles secure storage, encryption, and management of wallet seed phrases
 */

// Crypto utilities (mock for testing)

export interface SeedPhraseBackup {
  id: string;
  encryptedSeedPhrase: string;
  encryptionKey: string;
  iv: string; // Initialization vector
  walletAddress: string;
  createdAt: number;
  lastBackupAt: number;
  backupMethod: 'manual' | 'cloud' | 'local';
  isVerified: boolean;
  verificationDate?: number;
  metadata: {
    walletName: string;
    derivationPath: string;
    coinType: string;
  };
}

export interface SeedPhraseValidation {
  isValid: boolean;
  wordCount: number;
  invalidWords: string[];
  checksum: boolean;
}

export interface RecoveryCode {
  id: string;
  code: string;
  createdAt: number;
  usedAt?: number;
  isUsed: boolean;
}

class WalletSeedPhraseService {
  private readonly BIP39_WORDLIST_URL = 'https://raw.githubusercontent.com/trezor/python-mnemonic/master/vectors.json';
  private wordlist: Set<string> = new Set();
  private backups: Map<string, SeedPhraseBackup> = new Map();
  private recoveryCodes: Map<string, RecoveryCode[]> = new Map();

  constructor() {
    this.initializeWordlist();
  }

  /**
   * Initialize BIP39 wordlist (mock)
   */
  private initializeWordlist(): void {
    // Mock wordlist - in production, fetch from BIP39
    const commonWords = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'abuse', 'access',
      'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act', 'action',
      'actor', 'actual', 'acuity', 'acute', 'ad', 'adapt', 'add', 'addict', 'added', 'adder',
      // Add more words in production
    ];
    this.wordlist = new Set(commonWords);
  }

  /**
   * Generate a new seed phrase (12 or 24 words)
   */
  async generateSeedPhrase(wordCount: 12 | 24 = 12): Promise<string> {
    // Mock implementation - in production use proper BIP39
    const words: string[] = [];
    const wordlistArray = Array.from(this.wordlist);

    for (let i = 0; i < wordCount; i++) {
      const randomIndex = Math.floor(Math.random() * wordlistArray.length);
      words.push(wordlistArray[randomIndex]);
    }

    return words.join(' ');
  }

  /**
   * Convert entropy to BIP39 words (mock implementation)
   */
  private entropyToWords(entropy: string, wordCount: 12 | 24): string[] {
    const words: string[] = [];
    const wordlistArray = Array.from(this.wordlist);

    for (let i = 0; i < wordCount; i++) {
      const charCode = entropy.charCodeAt(i % entropy.length);
      const index = charCode % wordlistArray.length;
      words.push(wordlistArray[index]);
    }

    return words;
  }

  /**
   * Validate seed phrase
   */
  validateSeedPhrase(seedPhrase: string): SeedPhraseValidation {
    const words = seedPhrase.trim().toLowerCase().split(/\s+/);
    const invalidWords = words.filter(word => !this.wordlist.has(word));
    const isValidWordCount = words.length === 12 || words.length === 24;

    return {
      isValid: isValidWordCount && invalidWords.length === 0,
      wordCount: words.length,
      invalidWords,
      checksum: this.validateChecksum(words),
    };
  }

  /**
   * Validate BIP39 checksum (mock)
   */
  private validateChecksum(words: string[]): boolean {
    // In production, implement proper BIP39 checksum validation
    return words.length === 12 || words.length === 24;
  }

  /**
   * Encrypt seed phrase
   */
  async encryptSeedPhrase(seedPhrase: string, password: string): Promise<{
    encryptedSeedPhrase: string;
    encryptionKey: string;
    iv: string;
  }> {
    try {
      // Generate random IV (mock)
      const ivHex = Math.random().toString(36).substring(2, 34);

      // Derive key from password
      const encryptionKey = await this.deriveKeyFromPassword(password);

      // Encrypt seed phrase (mock)
      const encryptedSeedPhrase = await this.encryptAES256(seedPhrase, encryptionKey, ivHex);

      return {
        encryptedSeedPhrase,
        encryptionKey,
        iv: ivHex,
      };
    } catch (error) {
      throw new Error(`Failed to encrypt seed phrase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt seed phrase
   */
  async decryptSeedPhrase(encryptedSeedPhrase: string, password: string, iv: string): Promise<string> {
    try {
      const encryptionKey = await this.deriveKeyFromPassword(password);
      const decryptedSeedPhrase = await this.decryptAES256(encryptedSeedPhrase, encryptionKey, iv);
      return decryptedSeedPhrase;
    } catch (error) {
      throw new Error(`Failed to decrypt seed phrase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private async deriveKeyFromPassword(password: string): Promise<string> {
    // Mock implementation - in production use proper PBKDF2
    return Buffer.from(password).toString('base64');
  }

  /**
   * Encrypt data using AES-256 (mock)
   */
  private async encryptAES256(data: string, key: string, iv: string): Promise<string> {
    // Mock implementation - in production use proper AES-256-CBC
    const combined = `${data}:${key}:${iv}`;
    return Buffer.from(combined).toString('base64');
  }

  /**
   * Decrypt data using AES-256 (mock)
   */
  private async decryptAES256(encryptedData: string, key: string, iv: string): Promise<string> {
    // Mock implementation - in production use proper AES-256-CBC
    // For now, return a mock decrypted value
    return 'abandon ability able about above absent absorb abstract abuse access accident account';
  }

  /**
   * Create a backup of seed phrase
   */
  async createBackup(
    seedPhrase: string,
    password: string,
    walletAddress: string,
    walletName: string,
    backupMethod: 'manual' | 'cloud' | 'local' = 'local'
  ): Promise<SeedPhraseBackup> {
    // Validate seed phrase
    const validation = this.validateSeedPhrase(seedPhrase);
    if (!validation.isValid) {
      throw new Error(`Invalid seed phrase: ${validation.invalidWords.join(', ')}`);
    }

    // Encrypt seed phrase
    const { encryptedSeedPhrase, encryptionKey, iv } = await this.encryptSeedPhrase(seedPhrase, password);

    const backup: SeedPhraseBackup = {
      id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      encryptedSeedPhrase,
      encryptionKey,
      iv,
      walletAddress,
      createdAt: Date.now(),
      lastBackupAt: Date.now(),
      backupMethod,
      isVerified: false,
      metadata: {
        walletName,
        derivationPath: "m/44'/60'/0'/0/0",
        coinType: '60', // ETH
      },
    };

    this.backups.set(backup.id, backup);
    return backup;
  }

  /**
   * Verify backup by decrypting and validating
   */
  async verifyBackup(backupId: string, password: string): Promise<boolean> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    try {
      const decryptedSeedPhrase = await this.decryptSeedPhrase(backup.encryptedSeedPhrase, password, backup.iv);
      const validation = this.validateSeedPhrase(decryptedSeedPhrase);

      if (validation.isValid) {
        backup.isVerified = true;
        backup.verificationDate = Date.now();
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate recovery codes
   */
  async generateRecoveryCodes(backupId: string, count: number = 10): Promise<RecoveryCode[]> {
    const codes: RecoveryCode[] = [];

    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 14).toUpperCase();

      codes.push({
        id: `code_${Date.now()}_${i}`,
        code: `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`,
        createdAt: Date.now(),
        isUsed: false,
      });
    }

    this.recoveryCodes.set(backupId, codes);
    return codes;
  }

  /**
   * Use a recovery code
   */
  useRecoveryCode(backupId: string, code: string): boolean {
    const codes = this.recoveryCodes.get(backupId);
    if (!codes) return false;

    const recoveryCode = codes.find(c => c.code === code && !c.isUsed);
    if (!recoveryCode) return false;

    recoveryCode.isUsed = true;
    recoveryCode.usedAt = Date.now();
    return true;
  }

  /**
   * Get backup by ID
   */
  getBackup(backupId: string): SeedPhraseBackup | undefined {
    return this.backups.get(backupId);
  }

  /**
   * Get all backups
   */
  getAllBackups(): SeedPhraseBackup[] {
    return Array.from(this.backups.values());
  }

  /**
   * Delete backup
   */
  deleteBackup(backupId: string): boolean {
    this.backups.delete(backupId);
    this.recoveryCodes.delete(backupId);
    return true;
  }

  /**
   * Export backup for cloud storage
   */
  exportBackup(backupId: string): string {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    return JSON.stringify(backup);
  }

  /**
   * Import backup from cloud storage
   */
  importBackup(backupData: string): SeedPhraseBackup {
    const backup = JSON.parse(backupData) as SeedPhraseBackup;
    this.backups.set(backup.id, backup);
    return backup;
  }

  /**
   * Get recovery codes for backup
   */
  getRecoveryCodes(backupId: string): RecoveryCode[] {
    return this.recoveryCodes.get(backupId) || [];
  }

  /**
   * Get unused recovery codes count
   */
  getUnusedRecoveryCodesCount(backupId: string): number {
    const codes = this.recoveryCodes.get(backupId) || [];
    return codes.filter(c => !c.isUsed).length;
  }

  /**
   * Format seed phrase for display (masked)
   */
  static formatSeedPhraseForDisplay(seedPhrase: string, showCount: number = 3): string {
    const words = seedPhrase.split(' ');
    const displayed = words.slice(0, showCount).join(' ');
    const hidden = '•'.repeat(words.length - showCount);
    return `${displayed} ${hidden}`;
  }

  /**
   * Generate QR code data for seed phrase
   */
  generateQRCodeData(seedPhrase: string): string {
    // In production, encrypt before QR encoding
    return `ethereum:seedphrase:${Buffer.from(seedPhrase).toString('base64')}`;
  }
}

export const walletSeedPhraseService = new WalletSeedPhraseService();
