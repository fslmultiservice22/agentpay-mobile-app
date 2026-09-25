import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerEnableBankingRoutes } from "../routes/enable-banking";
import { registerCodegoRoutes } from "../routes/codego";
import { createTechnicalMonitor } from "../operational-monitor";
import { registerOperationalMonitorRoutes } from "../routes/operational-monitor";
import { registerReadOnlyProviderRoutes } from "../routes/read-only-providers";
import { registerPublicCallbackMonitorRoute } from "../routes/public-callback-monitor";
import { registerRootRoute } from "../routes/root";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createAgentPayCorsMiddleware } from "../cors-policy";
import { API_BODY_LIMIT, apiErrorHandler, applyApiSafetyHeaders } from "./api-safety";
import { createApiRateLimitMiddleware } from "./rate-limit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    applyApiSafetyHeaders(res);
    next();
  });
  app.use(createAgentPayCorsMiddleware());
  app.use(createApiRateLimitMiddleware());

  app.use(express.json({ limit: API_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: API_BODY_LIMIT, extended: true }));

  registerRootRoute(app);
  registerOAuthRoutes(app);
  registerEnableBankingRoutes(app);
  registerCodegoRoutes(app);
  const technicalMonitor = createTechnicalMonitor();
  technicalMonitor.run();
  registerOperationalMonitorRoutes(app, technicalMonitor);
  registerReadOnlyProviderRoutes(app);
  registerPublicCallbackMonitorRoute(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  app.use(apiErrorHandler);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
