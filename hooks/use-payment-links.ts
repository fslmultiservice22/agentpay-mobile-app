import { useState, useCallback } from 'react';
import { Share } from 'react-native';

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

/**
 * Hook per gestire payment links
 * Permette di creare link di pagamento condivisibili
 */
export function usePaymentLinks(): UsePaymentLinksReturn {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentLink = useCallback(
    async (
      address: string,
      amount?: string,
      token?: string,
      memo?: string,
      expiresIn?: number
    ): Promise<PaymentLink> => {
      setLoading(true);
      setError(null);

      try {
        // Validazione indirizzo
        if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
          throw new Error('Invalid address');
        }

        // Generazione link unico
        const linkId = `link_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const baseUrl = 'https://agentpay.app/pay';
        const params = new URLSearchParams({
          id: linkId,
          address,
          ...(amount && { amount }),
          ...(token && { token }),
          ...(memo && { memo }),
        });

        const paymentLink: PaymentLink = {
          id: linkId,
          link: `${baseUrl}?${params.toString()}`,
          address,
          amount,
          token,
          memo,
          expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
          status: 'active',
          createdAt: Date.now(),
        };

        setLinks((prev) => [paymentLink, ...prev]);
        return paymentLink;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create payment link';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const sharePaymentLink = useCallback(async (link: PaymentLink) => {
    try {
      await Share.share({
        message: `Pay me with AgentPay: ${link.link}${link.memo ? `\n\nMemo: ${link.memo}` : ''}`,
        title: 'AgentPay Payment Link',
        url: link.link,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share link';
      setError(errorMessage);
    }
  }, []);

  const claimPaymentLink = useCallback(async (linkId: string) => {
    try {
      setLinks((prev) =>
        prev.map((l) =>
          l.id === linkId
            ? {
                ...l,
                status: 'claimed',
                claimedAt: Date.now(),
              }
            : l
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim link';
      setError(errorMessage);
    }
  }, []);

  const deletePaymentLink = useCallback(async (linkId: string) => {
    try {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete link';
      setError(errorMessage);
    }
  }, []);

  const getActiveLinks = useCallback(() => {
    return links.filter((l) => {
      if (l.status === 'claimed') return false;
      if (l.expiresAt && l.expiresAt < Date.now()) {
        return false;
      }
      return true;
    });
  }, [links]);

  return {
    links,
    loading,
    error,
    createPaymentLink,
    sharePaymentLink,
    claimPaymentLink,
    deletePaymentLink,
    getActiveLinks,
  };
}
