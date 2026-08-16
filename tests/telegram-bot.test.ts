import { describe, it, expect } from 'vitest';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * These checks validate a real Telegram bot credential, so they only make sense
 * when `TELEGRAM_BOT_TOKEN` is provided by the environment (CI secret or local
 * `.env`). Without it the suite is skipped instead of failing, so a missing
 * optional secret cannot be mistaken for a regression in the app code.
 */
describe.skipIf(!TELEGRAM_BOT_TOKEN)('Telegram Bot Integration', () => {
  it('should validate Telegram bot token format', () => {
    // Token format: numbers:alphanumeric
    const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
    expect(TELEGRAM_BOT_TOKEN).toMatch(tokenRegex);
  });

  it('should verify bot token structure', () => {
    const [botId, botToken] = (TELEGRAM_BOT_TOKEN as string).split(':');

    expect(botId).toBeTruthy();
    expect(botToken).toBeTruthy();
    expect(botId).toMatch(/^\d+$/);
    expect(botToken.length).toBeGreaterThan(20);
  });

  it('should have valid bot credentials', () => {
    const [botId, botToken] = (TELEGRAM_BOT_TOKEN as string).split(':');

    expect(botId).toBeTruthy();
    expect(botToken).toBeTruthy();
    expect(botId).toMatch(/^\d+$/);
    expect(botToken.length).toBeGreaterThan(20);
  });
});
