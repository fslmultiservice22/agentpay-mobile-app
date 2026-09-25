/**
 * Payment Queue Service
 * Gestione coda pagamenti in sospeso con AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';


const PAYMENT_QUEUE_KEY = 'payment_queue';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueuedPayment {
  id: string;
  beneficiaryName: string;
  beneficiaryIban: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: number;
  scheduledAt?: number;
  status: PaymentStatus;
  errorMessage?: string;
  completedAt?: number;
  sourceAccount: 'primary' | 'secondary';
}

/**
 * Genera un ID univoco per il pagamento
 */
function generatePaymentId(): string {
  return `pmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Carica tutti i pagamenti dalla coda
 */
export async function loadPaymentQueue(): Promise<QueuedPayment[]> {
  try {
    const saved = await AsyncStorage.getItem(PAYMENT_QUEUE_KEY);
    if (saved) return JSON.parse(saved);
    return [];
  } catch (e) {
    console.error('Error loading payment queue:', e);
    return [];
  }
}

/**
 * Salva la coda pagamenti
 */
async function savePaymentQueue(queue: QueuedPayment[]): Promise<void> {
  await AsyncStorage.setItem(PAYMENT_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Aggiunge un pagamento alla coda
 */
export async function addToQueue(payment: Omit<QueuedPayment, 'id' | 'createdAt' | 'status'>): Promise<QueuedPayment> {
  const queue = await loadPaymentQueue();
  const newPayment: QueuedPayment = {
    ...payment,
    id: generatePaymentId(),
    createdAt: Date.now(),
    status: 'pending',
  };
  queue.push(newPayment);
  await savePaymentQueue(queue);
  return newPayment;
}

/**
 * Rimuove un pagamento dalla coda
 */
export async function removeFromQueue(paymentId: string): Promise<void> {
  const queue = await loadPaymentQueue();
  const updated = queue.filter(p => p.id !== paymentId);
  await savePaymentQueue(updated);
}

/**
 * Aggiorna lo stato di un pagamento
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  errorMessage?: string
): Promise<void> {
  const queue = await loadPaymentQueue();
  const idx = queue.findIndex(p => p.id === paymentId);
  if (idx >= 0) {
    queue[idx].status = status;
    if (errorMessage) queue[idx].errorMessage = errorMessage;
    if (status === 'completed') queue[idx].completedAt = Date.now();
    await savePaymentQueue(queue);
  }
}

/**
 * Ottieni solo i pagamenti in sospeso
 */
export async function getPendingPayments(): Promise<QueuedPayment[]> {
  const queue = await loadPaymentQueue();
  return queue.filter(p => p.status === 'pending');
}

/**
 * Ottieni il totale dei pagamenti in sospeso
 */
export async function getPendingTotal(): Promise<{ count: number; total: number }> {
  const pending = await getPendingPayments();
  const total = pending.reduce((sum, p) => sum + p.amount, 0);
  return { count: pending.length, total };
}

/**
 * Invia tutti i pagamenti in sospeso (simula invio via API)
 * In produzione, questo chiamerebbe l'API bancaria per ogni pagamento
 */
export async function sendAllPending(
  onProgress?: (current: number, total: number, payment: QueuedPayment) => void
): Promise<{ success: number; failed: number; results: Array<{ id: string; status: PaymentStatus; error?: string }> }> {
  const pending = await getPendingPayments();
  const results: Array<{ id: string; status: PaymentStatus; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const payment = pending[i];
    onProgress?.(i + 1, pending.length, payment);

    // Aggiorna stato a "processing"
    await updatePaymentStatus(payment.id, 'processing');

    try {
      // Esecuzione locale del pagamento (simulazione)
      await new Promise(resolve => setTimeout(resolve, 500));

      await updatePaymentStatus(payment.id, 'completed');
      success++;
      results.push({ id: payment.id, status: 'completed' });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Errore sconosciuto';
      await updatePaymentStatus(payment.id, 'failed', error);
      failed++;
      results.push({ id: payment.id, status: 'failed', error });
    }
  }

  return { success, failed, results };
}

/**
 * Pulisci pagamenti completati più vecchi di N giorni
 */
export async function cleanupCompleted(olderThanDays: number = 7): Promise<number> {
  const queue = await loadPaymentQueue();
  const cutoff = Date.now() - olderThanDays * 86400000;
  const filtered = queue.filter(
    p => !(p.status === 'completed' && p.completedAt && p.completedAt < cutoff)
  );
  const removed = queue.length - filtered.length;
  await savePaymentQueue(filtered);
  return removed;
}

/**
 * Svuota completamente la coda
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(PAYMENT_QUEUE_KEY);
}
