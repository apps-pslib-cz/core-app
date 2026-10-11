import { NextRequest } from "next/server";
import {
  authenticateApiRequest,
  requireRole,
  AuthenticatedUser,
} from "@/libs/apiAuth";
import { UserRole } from "@/types/roles";

/**
 * Higher-order function for API route protection
 *
 * @param handler - The API route handler function
 * @param options - Optional configuration for role requirements
 * @returns Protected API route handler
 */
export function withAuth<T extends unknown[]>(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    ...args: T
  ) => Promise<Response>,
  options?: {
    requireRole?: UserRole;
  },
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authResult = await authenticateApiRequest(request);

    if (!authResult.success || !authResult.user) {
      return new Response(
        JSON.stringify({
          error: authResult.error || "Authentication required",
        }),
        {
          status: authResult.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check role requirements
    if (
      options?.requireRole &&
      !requireRole(authResult.user, options.requireRole)
    ) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return handler(request, authResult.user, ...args);
  };
}
