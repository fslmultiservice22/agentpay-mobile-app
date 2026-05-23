/**
 * Telegram Bot Service
 * Gestisce l'integrazione completa con Telegram
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  is_bot: boolean;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export class TelegramBotService {
  private botToken: string;
  private botUsername: string;
  private apiUrl = 'https://api.telegram.org';

  constructor(botToken: string, botUsername: string = 'tradingT23_bot') {
    this.botToken = botToken;
    this.botUsername = botUsername;
  }

  /**
   * Invia un messaggio di testo a un utente
   */
  async sendMessage(chatId: number, text: string, options?: any): Promise<any> {
    const url = `${this.apiUrl}/bot${this.botToken}/sendMessage`;
    
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }
      return data.result;
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      throw error;
    }
  }

  /**
   * Invia una notifica di transazione
   */
  async sendTransactionNotification(
    chatId: number,
    type: 'swap' | 'transfer' | 'deposit',
    data: any
  ): Promise<void> {
    let message = '';

    switch (type) {
      case 'swap':
        message = `
<b>🔄 Token Swap Completato</b>

<b>Da:</b> ${data.fromAmount} ${data.fromToken}
<b>A:</b> ${data.toAmount} ${data.toToken}
<b>Prezzo:</b> 1 ${data.fromToken} = ${data.rate} ${data.toToken}
<b>Timestamp:</b> ${new Date(data.timestamp).toLocaleString('it-IT')}
<b>Status:</b> ✅ Completato
        `;
        break;

      case 'transfer':
        message = `
<b>💳 Trasferimento Bancario</b>

<b>Importo:</b> €${data.amount}
<b>IBAN:</b> ${data.ibanMasked}
<b>Descrizione:</b> ${data.description}
<b>Timestamp:</b> ${new Date(data.timestamp).toLocaleString('it-IT')}
<b>Status:</b> ✅ Confermato
        `;
        break;

      case 'deposit':
        message = `
<b>📥 Deposito Ricevuto</b>

<b>Importo:</b> ${data.amount} ${data.token}
<b>Da:</b> ${data.fromAddress}
<b>Network:</b> ${data.network}
<b>Timestamp:</b> ${new Date(data.timestamp).toLocaleString('it-IT')}
        `;
        break;
    }

    await this.sendMessage(chatId, message);
  }

  /**
   * Invia il menu principale
   */
  async sendMainMenu(chatId: number): Promise<void> {
    const message = `
<b>AgentPay Wallet 💼</b>

Benvenuto! Seleziona un'opzione:

/balance - Visualizza saldo
/history - Cronologia transazioni
/swap - Effettua uno swap
/transfer - Trasferimento bancario
/settings - Impostazioni
/help - Aiuto
    `;

    await this.sendMessage(chatId, message);
  }

  /**
   * Invia il saldo del wallet
   */
  async sendBalance(chatId: number, walletData: any): Promise<void> {
    const message = `
<b>💰 Saldo Wallet</b>

<b>Valore Totale:</b> $${walletData.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
<b>Variazione 24h:</b> ${walletData.totalChangePercent > 0 ? '📈' : '📉'} ${walletData.totalChangePercent.toFixed(2)}%

<b>Asset:</b>
${walletData.assets
  .map(
    (asset: any) => `
• <b>${asset.symbol}</b>: ${asset.balance} (${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2 })})
  ${asset.changePercent24h > 0 ? '📈' : '📉'} ${asset.changePercent24h.toFixed(2)}%
`
  )
  .join('')}
    `;

    await this.sendMessage(chatId, message);
  }

  /**
   * Invia la cronologia delle transazioni
   */
  async sendTransactionHistory(chatId: number, transactions: any[]): Promise<void> {
    if (transactions.length === 0) {
      await this.sendMessage(chatId, '<b>📋 Cronologia Transazioni</b>\n\nNessuna transazione trovata.');
      return;
    }

    const message = `
<b>📋 Cronologia Transazioni (Ultimi 10)</b>

${transactions
  .slice(0, 10)
  .map(
    (tx: any, i: number) => `
<b>${i + 1}.</b> ${tx.type}
   ${tx.description}
   ${new Date(tx.timestamp).toLocaleString('it-IT')}
`
  )
  .join('')}
    `;

    await this.sendMessage(chatId, message);
  }

  /**
   * Invia un alert di prezzo
   */
  async sendPriceAlert(chatId: number, token: string, price: number, change: number): Promise<void> {
    const direction = change > 0 ? '📈 Rialzo' : '📉 Ribasso';
    const message = `
<b>📊 Alert Prezzo</b>

<b>Token:</b> ${token}
<b>Prezzo:</b> $${price.toFixed(2)}
<b>Variazione:</b> ${direction} ${Math.abs(change).toFixed(2)}%
    `;

    await this.sendMessage(chatId, message);
  }

  /**
   * Invia un messaggio di errore
   */
  async sendError(chatId: number, error: string): Promise<void> {
    const message = `
<b>❌ Errore</b>

${error}

Digita /help per ulteriore assistenza.
    `;

    await this.sendMessage(chatId, message);
  }

  /**
   * Elabora i comandi del bot
   */
  async handleCommand(update: TelegramUpdate, walletData?: any): Promise<void> {
    if (!update.message || !update.message.text) {
      return;
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const command = text.split(' ')[0].toLowerCase();

    try {
      switch (command) {
        case '/start':
        case '/help':
          await this.sendMainMenu(chatId);
          break;

        case '/balance':
          if (walletData) {
            await this.sendBalance(chatId, walletData);
          } else {
            await this.sendError(chatId, 'Nessun wallet collegato. Collega il tuo wallet nell\'app.');
          }
          break;

        case '/history':
          if (walletData && walletData.transactions) {
            await this.sendTransactionHistory(chatId, walletData.transactions);
          } else {
            await this.sendError(chatId, 'Nessuna transazione trovata.');
          }
          break;

        case '/swap':
          await this.sendMessage(
            chatId,
            'Per effettuare uno swap, usa l\'app mobile AgentPay Wallet. Accedi alla sezione Trading.'
          );
          break;

        case '/transfer':
          await this.sendMessage(
            chatId,
            'Per effettuare un trasferimento bancario, usa l\'app mobile AgentPay Wallet. Accedi alla sezione Credit.'
          );
          break;

        case '/settings':
          await this.sendMessage(
            chatId,
            `
<b>⚙️ Impostazioni</b>

Bot Username: @${this.botUsername}
Notifiche: ✅ Abilitate
Lingua: 🇮🇹 Italiano

Per modificare le impostazioni, usa l'app mobile.
            `
          );
          break;

        default:
          await this.sendMessage(
            chatId,
            'Comando non riconosciuto. Digita /help per visualizzare i comandi disponibili.'
          );
      }
    } catch (error) {
      console.error('Error handling command:', error);
      await this.sendError(chatId, 'Si è verificato un errore. Riprova più tardi.');
    }
  }

  /**
   * Verifica il webhook
   */
  async setWebhook(webhookUrl: string): Promise<any> {
    const url = `${this.apiUrl}/bot${this.botToken}/setWebhook`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }
      return data.result;
    } catch (error) {
      console.error('Failed to set webhook:', error);
      throw error;
    }
  }

  /**
   * Ottiene le informazioni del bot
   */
  async getMe(): Promise<any> {
    const url = `${this.apiUrl}/bot${this.botToken}/getMe`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }
      return data.result;
    } catch (error) {
      console.error('Failed to get bot info:', error);
      throw error;
    }
  }
}

// Esporta un'istanza singleton
export const telegramService = new TelegramBotService(
  process.env.TELEGRAM_BOT_TOKEN || '',
  'tradingT23_bot'
);
