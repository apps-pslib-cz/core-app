import { logger } from "./logger";

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    status = 500,
    code = "INTERNAL_ERROR",
    message?: string,
    details?: unknown,
  ) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Unauthorized = (msg = "Authentication required") =>
  new HttpError(401, "UNAUTHORIZED", msg);
export const Forbidden = (msg = "Insufficient permissions") =>
  new HttpError(403, "FORBIDDEN", msg);
export const Conflict = (msg = "Conflict", details?: unknown) =>
  new HttpError(409, "CONFLICT", msg, details);
export const NotFound = (msg = "Not found") =>
  new HttpError(404, "NOT_FOUND", msg);
export const BadRequest = (msg = "Bad request", details?: unknown) =>
  new HttpError(400, "BAD_REQUEST", msg, details);

// Helper function to generate trace IDs
export function generateTraceId(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function handleError(err: unknown): Response {
  // Attach a simple trace id for correlation (timestamp + random)
  const traceId = generateTraceId();

  if (err instanceof HttpError) {
    console.warn(`[${traceId}] HttpError:`, {
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return new Response(
      JSON.stringify({
        error: {
          message: err.message,
          code: err.code,
          details: err.details,
          traceId,
        },
      }),
      {
        status: err.status,
        headers: { "Content-Type": "application/json", "X-Trace-Id": traceId },
      },
    );
  }

  // Unexpected error
  console.error(`[${traceId}] Unhandled error:`, err);
  return new Response(
    JSON.stringify({
      error: {
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        traceId,
      },
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json", "X-Trace-Id": traceId },
    },
  );
}

// Helper to wrap Next.js route handlers
export function withErrorHandling(
  handler: (req: Request) => Promise<Response | unknown>,
) {
  return async function (req: Request) {
    const traceId = generateTraceId();
    const startTime = Date.now();

    try {
      logger.info("API request started", {
        traceId,
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
      });

      const result = await handler(req as unknown as Request);

      const duration = Date.now() - startTime;

      if (result instanceof Response) {
        logger.info("API request completed", {
          traceId,
          status: result.status,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
        return result;
      }

      // If handler returned a plain value, wrap it as JSON
      logger.info("API request completed with JSON response", {
        traceId,
        status: 200,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return Response.json(result);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error("API request failed", {
        traceId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return handleError(err);
    }
  };
}
