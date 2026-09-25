import type { ErrorRequestHandler, Response } from "express";

export const API_BODY_LIMIT = "1mb";
export const API_CONTENT_SECURITY_POLICY = "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export function applyApiSafetyHeaders(response: Response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Security-Policy", API_CONTENT_SECURITY_POLICY);
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  response.setHeader("Cache-Control", "no-store");
}

export function getApiErrorResponse(error: unknown) {
  const typedError = error as { type?: string; status?: number } | undefined;

  if (typedError?.type === "entity.too.large" || typedError?.status === 413) {
    return { status: 413, message: "Richiesta troppo grande" } as const;
  }

  if (error instanceof SyntaxError || typedError?.status === 400) {
    return { status: 400, message: "Richiesta non valida" } as const;
  }

  return { status: 500, message: "Errore tecnico interno" } as const;
}

export const apiErrorHandler: ErrorRequestHandler = (error, _req, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const result = getApiErrorResponse(error);
  response.status(result.status).json({ success: false, error: result.message });
};
