import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

interface TransactionData {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce?: number;
}

interface SignedTransaction {
  hash: string;
  signature: string;
  rawTransaction: string;
}

interface SigningResult {
  success: boolean;
  signedTx?: SignedTransaction;
  error?: string;
}

export function useTransactionSigning() {
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signTransaction = useCallback(
    async (
      txData: TransactionData,
      signer: ethers.Signer | null,
    ): Promise<SigningResult> => {
      try {
        setError(null);
        setIsSigning(true);

        if (!signer) {
          return {
            success: false,
            error: 'No signer available',
          };
        }

        // Valida i dati della transazione
        if (!ethers.isAddress(txData.to)) {
          return {
            success: false,
            error: 'Invalid recipient address',
          };
        }

        // Crea l'oggetto transazione
        const tx: ethers.TransactionRequest = {
          to: txData.to,
          value: ethers.parseEther(txData.value),
          data: txData.data,
          gasLimit: txData.gasLimit ? BigInt(txData.gasLimit) : undefined,
          gasPrice: txData.gasPrice ? ethers.parseUnits(txData.gasPrice, 'gwei') : undefined,
          nonce: txData.nonce,
        };

        // Firma la transazione
        const signedTxResponse = await signer.signTransaction(tx);

        // Decodifica la transazione firmata
        const parsedTx = ethers.Transaction.from(signedTxResponse);

        return {
          success: true,
          signedTx: {
            hash: parsedTx.hash || '',
            signature: signedTxResponse,
            rawTransaction: signedTxResponse,
          },
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Transaction signing failed';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSigning(false);
      }
    },
    [],
  );

  const signMessage = useCallback(
    async (message: string, signer: ethers.Signer | null): Promise<SigningResult> => {
      try {
        setError(null);
        setIsSigning(true);

        if (!signer) {
          return {
            success: false,
            error: 'No signer available',
          };
        }

        // Firma il messaggio
        const signature = await signer.signMessage(message);

        return {
          success: true,
          signedTx: {
            hash: ethers.id(message),
            signature,
            rawTransaction: signature,
          },
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Message signing failed';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsSigning(false);
      }
    },
    [],
  );

  const verifySignature = useCallback(
    (message: string, signature: string, address: string): boolean => {
      try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
      } catch (err) {
        console.error('Signature verification error:', err);
        return false;
      }
    },
    [],
  );

  return {
    signTransaction,
    signMessage,
    verifySignature,
    isSigning,
    error,
  };
}
