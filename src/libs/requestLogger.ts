import { NextRequest } from "next/server";
import { logger, loggerUtils } from "./logger";
import { nanoid } from "nanoid";
import { handleError } from "./errors";

/**
 * Request Logging Middleware
 *
 * Automatically logs all API requests with:
 * - Request ID for correlation
 * - Method and URL
 * - Response status and timing
 * - Error details if applicable
 */

export interface RequestLoggingOptions {
  // Include request/response bodies in logs (be careful with sensitive data)
  logRequestBody?: boolean;
  logResponseBody?: boolean;

  // Custom request ID header name
  requestIdHeader?: string;

  // Skip logging for certain paths
  skipPaths?: string[];

  // Log level for successful requests
  successLevel?: "debug" | "info";
}

const defaultOptions: RequestLoggingOptions = {
  logRequestBody: false,
  logResponseBody: false,
  requestIdHeader: "x-request-id",
  skipPaths: ["/api/health", "/api/_next"],
  successLevel: "info",
};

/**
 * Create request logging middleware
 */
export function createRequestLogger(options: RequestLoggingOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return function logRequest<T extends unknown[]>(
    handler: (request: NextRequest, ...args: T) => Promise<Response>,
  ) {
    return async (request: NextRequest, ...args: T): Promise<Response> => {
      const startTime = Date.now();

      // Generate or extract request ID
      const requestId =
        request.headers.get(config.requestIdHeader!) || nanoid(8);

      // Check if we should skip logging for this path
      const url = new URL(request.url);
      if (config.skipPaths?.some((path) => url.pathname.startsWith(path))) {
        return handler(request, ...args);
      }

      // Log request start
      loggerUtils.logRequestStart(request.method, url.pathname, requestId);

      // Log request body if enabled
      if (
        config.logRequestBody &&
        ["POST", "PUT", "PATCH"].includes(request.method)
      ) {
        try {
          const body = await request.clone().text();
          if (body) {
            logger.debug("Request body", {
              type: "request_body",
              requestId,
              body: body.length > 1000 ? `${body.substring(0, 1000)}...` : body,
            });
          }
        } catch (error) {
          logger.warn("Failed to log request body", {
            type: "request_body_error",
            requestId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      let response: Response;
      let error: Error | null = null;

      try {
        // Execute the handler
        response = await handler(request, ...args);
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));

        // Log the error
        logger.error(`Request failed: ${request.method} ${url.pathname}`, {
          type: "request_error",
          requestId,
          method: request.method,
          url: url.pathname,
          error: error.message,
          stack: error.stack,
        });

        response = handleError(error);
      }

      // Calculate duration
      const duration = Date.now() - startTime;

      // Log response
      loggerUtils.logRequestEnd(
        request.method,
        url.pathname,
        response.status,
        duration,
        requestId,
      );

      // Log response body if enabled and it's an error
      if (config.logResponseBody && response.status >= 400) {
        try {
          const responseClone = response.clone();
          const body = await responseClone.text();
          if (body) {
            logger.debug("Response body", {
              type: "response_body",
              requestId,
              statusCode: response.status,
              body: body.length > 1000 ? `${body.substring(0, 1000)}...` : body,
            });
          }
        } catch (err) {
          logger.warn("Failed to log response body", {
            type: "response_body_error",
            requestId,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      // Add request ID to response headers
      const headers = new Headers(response.headers);
      headers.set(config.requestIdHeader!, requestId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    };
  };
}

// Pre-configured middleware instances
export const logRequest = createRequestLogger();
export const logRequestVerbose = createRequestLogger({
  logRequestBody: true,
  logResponseBody: true,
  successLevel: "debug",
});

export const logRequestMinimal = createRequestLogger({
  skipPaths: ["/api/health", "/api/_next", "/api/v1/me"],
  successLevel: "debug",
});
