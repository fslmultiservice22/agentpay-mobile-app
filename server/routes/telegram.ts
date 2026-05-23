import { Router, Request, Response } from 'express';
import { telegramService, TelegramUpdate } from '@/lib/telegram/telegram-service';

const router = Router();

/**
 * Webhook per ricevere gli aggiornamenti da Telegram
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const update: TelegramUpdate = req.body;

    // Verifica che sia un aggiornamento valido
    if (!update.update_id) {
      return res.status(400).json({ error: 'Invalid update' });
    }

    // Elabora il comando
    if (update.message && update.message.text) {
      // Qui puoi aggiungere la logica per recuperare i dati del wallet
      // Per ora, passiamo solo l'update
      await telegramService.handleCommand(update);
    }

    // Rispondi immediatamente a Telegram
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Endpoint per inviare una notifica di transazione
 */
router.post('/notify/transaction', async (req: Request, res: Response) => {
  try {
    const { chatId, type, data } = req.body;

    if (!chatId || !type || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await telegramService.sendTransactionNotification(chatId, type, data);

    res.status(200).json({ ok: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending transaction notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Endpoint per inviare un alert di prezzo
 */
router.post('/notify/price-alert', async (req: Request, res: Response) => {
  try {
    const { chatId, token, price, change } = req.body;

    if (!chatId || !token || price === undefined || change === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await telegramService.sendPriceAlert(chatId, token, price, change);

    res.status(200).json({ ok: true, message: 'Price alert sent' });
  } catch (error) {
    console.error('Error sending price alert:', error);
    res.status(500).json({ error: 'Failed to send price alert' });
  }
});

/**
 * Endpoint per inviare il saldo
 */
router.post('/send/balance', async (req: Request, res: Response) => {
  try {
    const { chatId, walletData } = req.body;

    if (!chatId || !walletData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await telegramService.sendBalance(chatId, walletData);

    res.status(200).json({ ok: true, message: 'Balance sent' });
  } catch (error) {
    console.error('Error sending balance:', error);
    res.status(500).json({ error: 'Failed to send balance' });
  }
});

/**
 * Endpoint per inviare la cronologia
 */
router.post('/send/history', async (req: Request, res: Response) => {
  try {
    const { chatId, transactions } = req.body;

    if (!chatId || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await telegramService.sendTransactionHistory(chatId, transactions);

    res.status(200).json({ ok: true, message: 'History sent' });
  } catch (error) {
    console.error('Error sending history:', error);
    res.status(500).json({ error: 'Failed to send history' });
  }
});

/**
 * Endpoint per configurare il webhook
 */
router.post('/setup-webhook', async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'Missing webhook URL' });
    }

    const result = await telegramService.setWebhook(webhookUrl);

    res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({ error: 'Failed to set webhook' });
  }
});

/**
 * Endpoint per ottenere le informazioni del bot
 */
router.get('/bot-info', async (req: Request, res: Response) => {
  try {
    const botInfo = await telegramService.getMe();
    res.status(200).json({ ok: true, data: botInfo });
  } catch (error) {
    console.error('Error getting bot info:', error);
    res.status(500).json({ error: 'Failed to get bot info' });
  }
});

export default router;
