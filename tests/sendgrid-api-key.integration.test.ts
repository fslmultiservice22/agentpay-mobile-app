import { describe, expect, it } from "vitest";

const sendgridApiKey = process.env.SENDGRID_API_KEY;

describe.skipIf(!sendgridApiKey)("SendGrid API key integration", () => {
  it(
    "valida la chiave in sola lettura e limita lo scope a Mail Send",
    async () => {
      const response = await fetch("https://api.sendgrid.com/v3/scopes", {
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
        },
      });

      expect(response.status).toBe(200);

      const body = (await response.json()) as { scopes?: string[] };
      const scopes = body.scopes ?? [];

      expect(scopes).toContain("mail.send");
      expect(scopes).not.toContain("user.scheduled_sends.create");
      expect(scopes).not.toContain("user.scheduled_sends.read");
      expect(scopes).not.toContain("user.scheduled_sends.update");
      expect(scopes).not.toContain("user.scheduled_sends.delete");
      expect(scopes).not.toContain("api_keys.read");
      expect(scopes).not.toContain("api_keys.update");
      expect(scopes).not.toContain("billing.read");
    },
    15_000,
  );
});
