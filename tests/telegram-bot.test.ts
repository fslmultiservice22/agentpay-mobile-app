import { describe, expect, it } from "vitest";

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const testWithTelegramToken = telegramBotToken && process.env.RUN_LIVE_INTEGRATION_TESTS === "1" ? it : it.skip;

describe("Telegram Bot Integration", () => {
  it("valida il formato del token solo quando è disponibile", () => {
    if (!telegramBotToken) return;
    expect(telegramBotToken).toMatch(/^\d+:[A-Za-z0-9_-]+$/);
  });

  testWithTelegramToken("convalida il nuovo token con Telegram getMe senza inviare messaggi", async () => {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getMe`, {
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      ok?: boolean;
      result?: { is_bot?: boolean; username?: string };
    };

    expect(payload.ok).toBe(true);
    expect(payload.result?.is_bot).toBe(true);
    expect(payload.result?.username).toBe("tradingT23_bot");
  });
});
