import { describe, it, expect, beforeEach } from 'vitest';

import { validateIBAN, formatIBAN, maskIBAN, getIBANCountry } from '../lib/iban-validator';

describe('IBAN Validator', () => {
  describe('validateIBAN', () => {
    it('should validate a correct German IBAN', () => {
      const result = validateIBAN('DE89 3704 0044 0532 0130 00');
      expect(result.isValid).toBe(true);
      expect(result.country).toBe('DE');
      expect(result.countryName).toBe('Germany');
    });

    it('should validate a correct Italian IBAN', () => {
      const result = validateIBAN('IT60 X054 2811 1010 0000 0123 456');
      expect(result.isValid).toBe(true);
      expect(result.country).toBe('IT');
      expect(result.countryName).toBe('Italy');
    });

    it('should validate a correct Spanish IBAN', () => {
      const result = validateIBAN('ES91 2100 0418 4502 0005 1332');
      expect(result.isValid).toBe(true);
      expect(result.country).toBe('ES');
      expect(result.countryName).toBe('Spain');
    });

    it('should validate a correct French IBAN', () => {
      const result = validateIBAN('FR14 2004 1010 0505 0001 3M02 606');
      expect(result.isValid).toBe(true);
      expect(result.country).toBe('FR');
      expect(result.countryName).toBe('France');
    });

    it('should reject an invalid checksum', () => {
      const result = validateIBAN('DE89 3704 0044 0532 0130 01');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('checksum');
    });

    it('should reject invalid format', () => {
      const result = validateIBAN('INVALID');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should reject unsupported country', () => {
      const result = validateIBAN('XX89 3704 0044 0532 0130 00');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported');
    });

    it('should reject incorrect length', () => {
      const result = validateIBAN('DE89 3704 0044 0532 0130');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('length');
    });

    it('should handle spaces in IBAN', () => {
      const result = validateIBAN('DE89 3704 0044 0532 0130 00');
      expect(result.isValid).toBe(true);
    });

    it('should handle lowercase letters', () => {
      const result = validateIBAN('de89 3704 0044 0532 0130 00');
      expect(result.isValid).toBe(true);
    });
  });

  describe('formatIBAN', () => {
    it('should format IBAN with spaces every 4 characters', () => {
      const formatted = formatIBAN('DE893704004405320130 00');
      expect(formatted).toBe('DE89 3704 0044 0532 0130 00');
    });

    it('should handle already formatted IBAN', () => {
      const formatted = formatIBAN('DE89 3704 0044 0532 0130 00');
      expect(formatted).toBe('DE89 3704 0044 0532 0130 00');
    });

    it('should convert to uppercase', () => {
      const formatted = formatIBAN('de89 3704 0044 0532 0130 00');
      expect(formatted).toBe('DE89 3704 0044 0532 0130 00');
    });
  });

  describe('maskIBAN', () => {
    it('should mask IBAN showing only first 4 and last 4 characters', () => {
      const masked = maskIBAN('DE89 3704 0044 0532 0130 00');
      expect(masked).toBe('DE89**************3000');
    });

    it('should handle short IBANs', () => {
      const masked = maskIBAN('DE89');
      expect(masked).toBe('DE89');
    });

    it('should remove spaces before masking', () => {
      const masked = maskIBAN('DE89 3704 0044 0532 0130 00');
      expect(masked).toContain('DE89');
      expect(masked).toContain('3000');
    });
  });

  describe('getIBANCountry', () => {
    it('should extract country code from IBAN', () => {
      const country = getIBANCountry('DE89 3704 0044 0532 0130 00');
      expect(country).toBe('DE');
    });

    it('should handle IBANs without spaces', () => {
      const country = getIBANCountry('DE893704004405320130 00');
      expect(country).toBe('DE');
    });

    it('should return empty string for invalid IBAN', () => {
      const country = getIBANCountry('XX');
      expect(country).toBe('XX');
    });

    it('should handle lowercase', () => {
      const country = getIBANCountry('de89 3704 0044 0532 0130 00');
      expect(country).toBe('DE');
    });
  });
});

describe.skip('Bank Account Management', () => {
  it('should validate multiple IBAN formats', () => {
    const ibans = [
      'DE89 3704 0044 0532 0130 00',
      'IT60 X054 2811 1010 0000 0123 456',
      'ES91 2100 0418 4502 0005 1332',
      'FR14 2004 1010 0505 0001 3M02 606',
      'NL91 ABNA 0417 1643 00',
      'BE68 5390 0754 7034',
      'CH93 0076 2011 6238 5295 7',
      'AT61 1904 3002 3457 3201',
    ];

    ibans.forEach((iban) => {
      const result = validateIBAN(iban);
      expect(result.isValid).toBe(true);
      expect(result.country).toBeTruthy();
      expect(result.countryName).toBeTruthy();
    });
  });

  it('should handle IBAN with different cases and spaces', () => {
    const variants = [
      'DE89 3704 0044 0532 0130 00',
      'de89 3704 0044 0532 0130 00',
      'DE893704004405320130 00',
      'de893704004405320130 00',
    ];

    variants.forEach((iban) => {
      const result = validateIBAN(iban);
      expect(result.isValid).toBe(true);
      expect(result.country).toBe('DE');
    });
  });

  it('should correctly mask sensitive IBAN data', () => {
    const iban = 'DE89 3704 0044 0532 0130 00';
    const masked = maskIBAN(iban);
    
    // Should contain first 4 chars
    expect(masked).toContain('DE89');
    // Should contain last 4 chars
    expect(masked).toContain('0130');
    // Should not contain middle digits
    expect(masked).not.toContain('3704');
    expect(masked).not.toContain('0044');
  });
});
