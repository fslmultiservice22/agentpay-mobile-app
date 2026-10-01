import { useCallback, useState } from 'react';

export interface PaymentLink {
  id: string;
  link: string;
  address: string;
  amount?: string;
  token?: string;
  memo?: string;
  expiresAt?: number;
  claimedAt?: number;
  status: 'active' | 'expired' | 'claimed';
  createdAt: number;
}

export interface UsePaymentLinksReturn {
  links: PaymentLink[];
  loading: boolean;
  error: string | null;
  createPaymentLink: (address: string, amount?: string, token?: string, memo?: string, expiresIn?: number) => Promise<PaymentLink>;
  sharePaymentLink: (link: PaymentLink) => Promise<void>;
  claimPaymentLink: (linkId: string) => Promise<void>;
  deletePaymentLink: (linkId: string) => Promise<void>;
  getActiveLinks: () => PaymentLink[];
}

const UNAVAILABLE = 'I link di pagamento non sono disponibili nella beta tecnica AgentPay.';
const NO_LINKS: PaymentLink[] = [];

/**
 * Interfaccia mantenuta per compatibilità: nessun link viene creato, condiviso o rivendicato.
 * Non sostituire un endpoint di pagamento con la homepage informativa.
 */
export function usePaymentLinks(): UsePaymentLinksReturn {
  const [error, setError] = useState<string | null>(UNAVAILABLE);
  const unavailable = useCallback(async (): Promise<never> => {
    setError(UNAVAILABLE);
    throw new Error(UNAVAILABLE);
  }, []);
  const getActiveLinks = useCallback((): PaymentLink[] => NO_LINKS, []);

  return {
    links: NO_LINKS,
    loading: false,
    error,
    createPaymentLink: unavailable,
    sharePaymentLink: unavailable,
    claimPaymentLink: unavailable,
    deletePaymentLink: unavailable,
    getActiveLinks,
  };
}
