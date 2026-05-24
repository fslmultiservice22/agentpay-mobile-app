import { describe, it, expect, beforeEach } from 'vitest';
import { walletSeedPhraseService } from '../lib/wallet-seed-phrase-service';

describe('Wallet Seed Phrase Service', () => {
  beforeEach(() => {
    // Clear backups before each test
    const backups = walletSeedPhraseService.getAllBackups();
    backups.forEach(b => walletSeedPhraseService.deleteBackup(b.id));
  });

  describe('generateSeedPhrase', () => {
    it('should generate 12-word seed phrase', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const words = seedPhrase.split(' ');

      expect(words).toHaveLength(12);
      expect(words.every(word => word.length > 0)).toBe(true);
    });

    it('should generate 24-word seed phrase', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(24);
      const words = seedPhrase.split(' ');

      expect(words).toHaveLength(24);
      expect(words.every(word => word.length > 0)).toBe(true);
    });

    it('should generate different seed phrases', async () => {
      const phrase1 = await walletSeedPhraseService.generateSeedPhrase(12);
      const phrase2 = await walletSeedPhraseService.generateSeedPhrase(12);

      expect(phrase1).not.toBe(phrase2);
    });
  });

  describe('validateSeedPhrase', () => {
    it('should validate correct seed phrase format', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const validation = walletSeedPhraseService.validateSeedPhrase(seedPhrase);

      expect(validation.isValid).toBe(true);
      expect(validation.wordCount).toBe(12);
      expect(validation.invalidWords).toHaveLength(0);
    });

    it('should reject invalid word count', () => {
      const validation = walletSeedPhraseService.validateSeedPhrase('abandon ability able');

      expect(validation.isValid).toBe(false);
      expect(validation.wordCount).toBe(3);
    });

    it('should identify invalid words', () => {
      const seedPhrase = 'invalid words here abandon ability able about above absent absorb abstract abuse access accident';
      const validation = walletSeedPhraseService.validateSeedPhrase(seedPhrase);

      expect(validation.invalidWords.length).toBeGreaterThan(0);
    });
  });

  describe('encryptSeedPhrase', () => {
    it('should encrypt seed phrase', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';

      const encrypted = await walletSeedPhraseService.encryptSeedPhrase(seedPhrase, password);

      expect(encrypted.encryptedSeedPhrase).toBeDefined();
      expect(encrypted.encryptionKey).toBeDefined();
      expect(encrypted.iv).toBeDefined();
    });

    it('should produce different encryption for same input', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';

      const encrypted1 = await walletSeedPhraseService.encryptSeedPhrase(seedPhrase, password);
      const encrypted2 = await walletSeedPhraseService.encryptSeedPhrase(seedPhrase, password);

      expect(encrypted1.encryptedSeedPhrase).not.toBe(encrypted2.encryptedSeedPhrase);
    });
  });

  describe('decryptSeedPhrase', () => {
    it('should decrypt encrypted seed phrase', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';

      const encrypted = await walletSeedPhraseService.encryptSeedPhrase(seedPhrase, password);
      const decrypted = await walletSeedPhraseService.decryptSeedPhrase(encrypted.encryptedSeedPhrase, password, encrypted.iv);

      expect(decrypted).toBeDefined();
      expect(decrypted.split(' ').length).toBe(12);
    });
  });

  describe('createBackup', () => {
    it('should create backup with valid seed phrase', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const walletName = 'My Wallet';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, walletName);

      expect(backup.id).toBeDefined();
      expect(backup.walletAddress).toBe(walletAddress);
      expect(backup.metadata.walletName).toBe(walletName);
      expect(backup.isVerified).toBe(false);
    });

    it('should reject invalid seed phrase', async () => {
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      await expect(
        walletSeedPhraseService.createBackup('invalid seed phrase', password, walletAddress, 'My Wallet')
      ).rejects.toThrow();
    });

    it('should support different backup methods', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet', 'cloud');

      expect(backup.backupMethod).toBe('cloud');
    });
  });

  describe('verifyBackup', () => {
    it('should verify backup with correct password', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet');
      const isVerified = await walletSeedPhraseService.verifyBackup(backup.id, password);

      expect(isVerified).toBe(true);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('should generate recovery codes', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet');
      const codes = await walletSeedPhraseService.generateRecoveryCodes(backup.id, 10);

      expect(codes).toHaveLength(10);
      expect(codes.every(c => !c.isUsed)).toBe(true);
      expect(codes.every(c => c.code.includes('-'))).toBe(true);
    });
  });

  describe('useRecoveryCode', () => {
    it('should use recovery code', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet');
      const codes = await walletSeedPhraseService.generateRecoveryCodes(backup.id, 5);

      const used = walletSeedPhraseService.useRecoveryCode(backup.id, codes[0].code);

      expect(used).toBe(true);
    });

    it('should not use recovery code twice', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet');
      const codes = await walletSeedPhraseService.generateRecoveryCodes(backup.id, 5);

      walletSeedPhraseService.useRecoveryCode(backup.id, codes[0].code);
      const usedAgain = walletSeedPhraseService.useRecoveryCode(backup.id, codes[0].code);

      expect(usedAgain).toBe(false);
    });
  });

  describe('getBackup', () => {
    it('should retrieve backup by ID', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const created = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet');
      const retrieved = walletSeedPhraseService.getBackup(created.id);

      expect(retrieved).toEqual(created);
    });
  });

  describe('getAllBackups', () => {
    it('should return all backups', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'Wallet 1');
      await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'Wallet 2');

      const backups = walletSeedPhraseService.getAllBackups();

      expect(backups).toHaveLength(2);
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet');
      walletSeedPhraseService.deleteBackup(backup.id);

      const retrieved = walletSeedPhraseService.getBackup(backup.id);

      expect(retrieved).toBeUndefined();
    });
  });

  describe('exportBackup', () => {
    it('should export backup as JSON', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet');
      const exported = walletSeedPhraseService.exportBackup(backup.id);

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed.id).toBe(backup.id);
    });
  });

  describe('importBackup', () => {
    it('should import backup from JSON', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet');
      const exported = walletSeedPhraseService.exportBackup(backup.id);

      walletSeedPhraseService.deleteBackup(backup.id);
      const imported = walletSeedPhraseService.importBackup(exported);

      expect(imported.id).toBe(backup.id);
    });
  });

  describe('getUnusedRecoveryCodesCount', () => {
    it('should count unused recovery codes', async () => {
      const seedPhrase = await walletSeedPhraseService.generateSeedPhrase(12);
      const password = 'test-password-123';
      const walletAddress = '0x1234567890123456789012345678901234567890';

      const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, 'My Wallet');
      const codes = await walletSeedPhraseService.generateRecoveryCodes(backup.id, 5);

      walletSeedPhraseService.useRecoveryCode(backup.id, codes[0].code);
      const count = walletSeedPhraseService.getUnusedRecoveryCodesCount(backup.id);

      expect(count).toBe(4);
    });
  });
});
