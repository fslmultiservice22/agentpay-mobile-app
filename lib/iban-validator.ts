/**
 * IBAN Validator - Validates and processes IBAN numbers
 * Supports all EU and international IBAN formats
 */

export interface IBANInfo {
  isValid: boolean;
  country: string;
  countryName: string;
  length: number;
  checksum: string;
  accountNumber: string;
  bankCode: string;
  error?: string;
}

// IBAN country codes and their lengths
const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22,
  BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28,
  EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23,
  GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23, IS: 26, IT: 27,
  JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21,
  MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15,
  PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SE: 24,
  SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

const COUNTRY_NAMES: Record<string, string> = {
  AD: "Andorra", AE: "United Arab Emirates", AL: "Albania", AT: "Austria",
  AZ: "Azerbaijan", BA: "Bosnia and Herzegovina", BE: "Belgium", BG: "Bulgaria",
  BH: "Bahrain", BR: "Brazil", BY: "Belarus", CH: "Switzerland", CR: "Costa Rica",
  CY: "Cyprus", CZ: "Czech Republic", DE: "Germany", DK: "Denmark",
  DO: "Dominican Republic", EE: "Estonia", EG: "Egypt", ES: "Spain",
  FI: "Finland", FO: "Faroe Islands", FR: "France", GB: "United Kingdom",
  GE: "Georgia", GI: "Gibraltar", GL: "Greenland", GR: "Greece", GT: "Guatemala",
  HR: "Croatia", HU: "Hungary", IE: "Ireland", IL: "Israel", IS: "Iceland",
  IT: "Italy", JO: "Jordan", KW: "Kuwait", KZ: "Kazakhstan", LB: "Lebanon",
  LC: "Saint Lucia", LI: "Liechtenstein", LT: "Lithuania", LU: "Luxembourg",
  LV: "Latvia", MC: "Monaco", MD: "Moldova", ME: "Montenegro", MK: "North Macedonia",
  MR: "Mauritania", MT: "Malta", MU: "Mauritius", NL: "Netherlands", NO: "Norway",
  PK: "Pakistan", PL: "Poland", PS: "Palestine", PT: "Portugal", QA: "Qatar",
  RO: "Romania", RS: "Serbia", SA: "Saudi Arabia", SE: "Sweden", SI: "Slovenia",
  SK: "Slovakia", SM: "San Marino", TN: "Tunisia", TR: "Turkey", UA: "Ukraine",
  VA: "Vatican City", VG: "Virgin Islands", XK: "Kosovo",
};

/**
 * Validate IBAN using mod-97 algorithm
 */
function validateIBANChecksum(iban: string): boolean {
  // Move first 4 characters to end
  const rearranged = iban.slice(4) + iban.slice(0, 4);

  // Replace letters with numbers (A=10, B=11, ..., Z=35)
  let numeric = "";
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged[i];
    if (/[0-9]/.test(char)) {
      numeric += char;
    } else {
      numeric += (char.charCodeAt(0) - 55).toString();
    }
  }

  // Calculate mod 97
  let remainder = numeric;
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9);
    remainder = ((parseInt(block) % 97) + remainder.slice(9)).toString();
  }

  return parseInt(remainder) % 97 === 1;
}

/**
 * Validate IBAN format and checksum
 */
export function validateIBAN(iban: string): IBANInfo {
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s/g, "").toUpperCase();

  // Check if it starts with 2 letters (country code)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIBAN)) {
    return {
      isValid: false,
      country: "",
      countryName: "",
      length: 0,
      checksum: "",
      accountNumber: "",
      bankCode: "",
      error: "Invalid IBAN format",
    };
  }

  const countryCode = cleanIBAN.slice(0, 2);
  const checkDigits = cleanIBAN.slice(2, 4);
  const expectedLength = IBAN_LENGTHS[countryCode];

  // Check if country is supported
  if (!expectedLength) {
    return {
      isValid: false,
      country: countryCode,
      countryName: "",
      length: cleanIBAN.length,
      checksum: checkDigits,
      accountNumber: "",
      bankCode: "",
      error: `Unsupported country code: ${countryCode}`,
    };
  }

  // Check length
  if (cleanIBAN.length !== expectedLength) {
    return {
      isValid: false,
      country: countryCode,
      countryName: COUNTRY_NAMES[countryCode] || countryCode,
      length: cleanIBAN.length,
      checksum: checkDigits,
      accountNumber: "",
      bankCode: "",
      error: `Invalid length for ${countryCode}. Expected ${expectedLength}, got ${cleanIBAN.length}`,
    };
  }

  // Validate checksum
  if (!validateIBANChecksum(cleanIBAN)) {
    return {
      isValid: false,
      country: countryCode,
      countryName: COUNTRY_NAMES[countryCode] || countryCode,
      length: cleanIBAN.length,
      checksum: checkDigits,
      accountNumber: cleanIBAN.slice(4),
      bankCode: cleanIBAN.slice(4, 12),
      error: "Invalid IBAN checksum",
    };
  }

  return {
    isValid: true,
    country: countryCode,
    countryName: COUNTRY_NAMES[countryCode] || countryCode,
    length: cleanIBAN.length,
    checksum: checkDigits,
    accountNumber: cleanIBAN.slice(4),
    bankCode: cleanIBAN.slice(4, 12),
  };
}

/**
 * Format IBAN with spaces for display
 */
export function formatIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Mask IBAN for display (show only last 4 digits)
 */
export function maskIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  if (clean.length <= 8) return clean;
  return clean.slice(0, 4) + "*".repeat(clean.length - 8) + clean.slice(-4);
}

/**
 * Extract country from IBAN
 */
export function getIBANCountry(iban: string): string {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  if (clean.length >= 2) {
    return clean.slice(0, 2);
  }
  return "";
}
