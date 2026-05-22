import { useState, useCallback } from 'react';

export interface QRPaymentData {
  address: string;
  amount?: string;
  token?: string;
  memo?: string;
}

export interface UseQRPaymentReturn {
  isScanning: boolean;
  scannedData: QRPaymentData | null;
  error: string | null;
  startScanning: () => void;
  stopScanning: () => void;
  parseQRCode: (data: string) => QRPaymentData | null;
  generateQRPaymentLink: (address: string, amount?: string, token?: string) => string;
}

/**
 * Hook per gestire QR code scanning per pagamenti
 * Supporta scansione di indirizzi wallet e dati di pagamento
 */
export function useQRPayment(): UseQRPaymentReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<QRPaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseQRCode = useCallback((data: string): QRPaymentData | null => {
    try {
      // Formato: agentpay://pay?address=0x...&amount=1.5&token=ETH&memo=Payment
      if (data.startsWith('agentpay://pay?')) {
        const params = new URLSearchParams(data.replace('agentpay://pay?', ''));
        const address = params.get('address');

        if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
          throw new Error('Invalid address format');
        }

        return {
          address,
          amount: params.get('amount') || undefined,
          token: params.get('token') || 'ETH',
          memo: params.get('memo') || undefined,
        };
      }

      // Formato semplice: solo indirizzo
      if (data.match(/^0x[a-fA-F0-9]{40}$/)) {
        return {
          address: data,
          token: 'ETH',
        };
      }

      throw new Error('Invalid QR code format');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse QR code';
      setError(errorMessage);
      return null;
    }
  }, []);

  const generateQRPaymentLink = useCallback(
    (address: string, amount?: string, token?: string): string => {
      try {
        if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
          throw new Error('Invalid address');
        }

        const params = new URLSearchParams({
          address,
          ...(amount && { amount }),
          ...(token && { token }),
        });

        return `agentpay://pay?${params.toString()}`;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate link';
        setError(errorMessage);
        return '';
      }
    },
    []
  );

  const startScanning = useCallback(() => {
    setIsScanning(true);
    setError(null);
    setScannedData(null);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  // Simulazione di scansione QR (in produzione, userebbe expo-camera)
  const handleQRScanned = useCallback(
    (data: string) => {
      const parsed = parseQRCode(data);
      if (parsed) {
        setScannedData(parsed);
        setIsScanning(false);
      }
    },
    [parseQRCode]
  );

  return {
    isScanning,
    scannedData,
    error,
    startScanning,
    stopScanning,
    parseQRCode,
    generateQRPaymentLink,
  };
}
