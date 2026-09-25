import { describe, expect, it } from "vitest";

import { inspectPublicCallback } from "../server/routes/public-callback-monitor";

const inactiveStatus = {
  enabled: false,
  networkRequestsAllowed: false,
  consentAllowed: false,
  registrationAllowed: false,
  publicCallbackJsonVerified: true,
};

describe("public callback monitor", () => {
  it("riconosce il callback JSON inattivo come condizione tecnica pronta", async () => {
    const probe = await inspectPublicCallback("/api/open-banking/callback", async () =>
      new Response(JSON.stringify({ accepted: false, status: inactiveStatus }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(probe).toMatchObject({ outcome: "inactive_json", safeguardsMatch: true, httpStatus: 200 });
  });

  it("rifiuta esplicitamente la pagina HTML di indisponibilità", async () => {
    const probe = await inspectPublicCallback("/api/open-banking/status", async () =>
      new Response("<html><title>Site Unavailable</title></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    expect(probe).toMatchObject({ outcome: "availability_page", safeguardsMatch: false, httpStatus: 200 });
  });

  it("non accetta JSON che dichiara una salvaguardia attiva", async () => {
    const probe = await inspectPublicCallback("/api/open-banking/status", async () =>
      new Response(JSON.stringify({ status: { ...inactiveStatus, enabled: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(probe).toMatchObject({ outcome: "unexpected_response", safeguardsMatch: false });
  });
});
