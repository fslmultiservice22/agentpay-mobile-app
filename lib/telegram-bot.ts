/**
 * Telegram Bot Integration Service
 * Handles bot commands and user interactions
 */

export interface TelegramUser {
  id: string;
  username: string;
  firstName: string;
  lastName?: string;
  chatId: string;
  connectedAt: number;
}

export interface TelegramCommand {
  command: string;
  description: string;
  handler: (args: string[]) => Promise<string>;
}

export interface BotMessage {
  id: string;
  userId: string;
  command: string;
  args: string[];
  response: string;
  timestamp: number;
}

class TelegramBotService {
  private botToken?: string;
  private users: Map<string, TelegramUser> = new Map();
  private messageHistory: Map<string, BotMessage[]> = new Map();
  private commands: Map<string, TelegramCommand> = new Map();

  constructor() {
    this.registerDefaultCommands();
  }

  private registerDefaultCommands() {
    this.registerCommand({
      command: 'start',
      description: 'Start the bot and connect your wallet',
      handler: async () => {
        return '👋 Welcome to AgentPay Wallet Bot!';
      },
    });

    this.registerCommand({
      command: 'balance',
      description: 'Check your wallet balance',
      handler: async () => {
        return '💰 Your Balance: €8,000.00';
      },
    });

    this.registerCommand({
      command: 'help',
      description: 'Show all available commands',
      handler: async () => {
        let help = '📚 Available Commands:\n\n';
        for (const [, cmd] of this.commands) {
          help += `/${cmd.command} - ${cmd.description}\n`;
        }
        return help;
      },
    });
  }

  registerCommand(command: TelegramCommand) {
    this.commands.set(command.command, command);
  }

  async handleMessage(userId: string, text: string): Promise<string> {
    const parts = text.trim().split(' ');
    const commandName = parts[0].startsWith('/') ? parts[0].slice(1) : parts[0];
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (!command) {
      return `❌ Command not found: /${commandName}`;
    }

    try {
      return await command.handler(args);
    } catch (error) {
      return `❌ Error executing command`;
    }
  }

  getUser(userId: string): TelegramUser | null {
    return this.users.get(userId) || null;
  }

  getAllUsers(): TelegramUser[] {
    return Array.from(this.users.values());
  }

  getCommands(): TelegramCommand[] {
    return Array.from(this.commands.values());
  }
}

export const telegramBot = new TelegramBotService();
