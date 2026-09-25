export const ENABLE_BANKING_CALLBACK_PATH = "/api/open-banking/callback";

export type EnableBankingSandboxStatus = {
  provider: "enable_banking";
  environment: "sandbox";
  enabled: false;
  networkRequestsAllowed: false;
  consentAllowed: false;
  registrationAllowed: false;
  publicCallbackJsonVerified: true;
  callbackPath: typeof ENABLE_BANKING_CALLBACK_PATH;
  reason: string;
  nextRequirement: string;
};

const SANDBOX_STATUS: EnableBankingSandboxStatus = {
  provider: "enable_banking",
  environment: "sandbox",
  enabled: false,
  networkRequestsAllowed: false,
  consentAllowed: false,
  registrationAllowed: false,
  publicCallbackJsonVerified: true,
  callbackPath: ENABLE_BANKING_CALLBACK_PATH,
  reason: "La Sandbox è predisposta solo come endpoint tecnico; consenso e dati di conto restano disattivati.",
  nextRequirement: "Mantenere provider, registrazione e chiavi disattivati; qualunque sandbox futura richiede revisione e autorizzazione separate.",
};

export function getEnableBankingSandboxStatus(): EnableBankingSandboxStatus {
  return { ...SANDBOX_STATUS };
}
