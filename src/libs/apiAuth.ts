import { NextRequest } from "next/server";
import { auth } from "./auth";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { prisma } from "./prisma";
import { UserRole, RoleChecker } from "@/types/roles";
import { resolveUserRoles } from "./oauthUserRoles";
import { Unauthorized, Forbidden } from "./errors";

/**
 * API Authentication & Authorization Module
 *
 * Supports dual authentication:
 * 1. Session-based auth (NextAuth cookies) - for web app
 * 2. JWT Bearer tokens from oauth.pslib.cz - for mobile apps
 */

// Types
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  name: string | null;
  sub: string | null;
  givenName: string | null;
  middleName: string | null;
  familyName: string | null;
  image: string | null;
  avatarData: Buffer | null;
  roles: string[];
  lastLoginAt: Date | null;
  allowAutoUpdate: boolean;
  notifyByEmail: boolean;
  notifyByTeams: boolean;
  sendActionNotifications: boolean;
}

export interface ApiAuthResult {
  success: boolean;
  user: AuthenticatedUser | null;
  error?: string;
  status: number;
}

export interface TokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  middle_name?: string;
  family_name?: string;
  preferred_username?: string;
  name?: string;
  picture?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  iat?: number;
  // Vlastní role-claimy appky (viz ROLE_CLAIMS v src/types/roles.ts) -
  // jejich název je datově řízený, proto index signature místo pevných polí.
  [claim: string]: unknown;
}

// Constants
const OAUTH_ISSUER = process.env.AUTH_DUENDE_IDENTITY_SERVER6_ISSUER!;
const EXPECTED_AUDIENCE = process.env.AUTH_DUENDE_IDENTITY_SERVER6_ID!;

// Lazily initialized to avoid module-level URL construction when env vars are not set (e.g. during build)
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(`${OAUTH_ISSUER}/.well-known/jwks`));
  }
  return _jwks;
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
}

/**
 * Verify JWT token from oauth.pslib.cz
 */
async function verifyJwtToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: OAUTH_ISSUER,
      audience: EXPECTED_AUDIENCE,
    });

    return payload as TokenClaims;
  } catch (error) {
    console.warn("JWT verification failed:", error);
    return null;
  }
}

/**
 * Find or create user from JWT claims
 */
async function findOrCreateUserFromToken(
  claims: TokenClaims,
): Promise<AuthenticatedUser | null> {
  if (!claims.sub) {
    return null;
  }

  try {
    // First try to find user by sub (case-insensitive: data přenesená ze
    // staré DB mají GUID uložené velkými písmeny, OAuth server je posílá
    // malými)
    let user = await prisma.user.findFirst({
      where: { sub: { equals: claims.sub, mode: "insensitive" } },
    });

    // If not found and we have email, try to find by email
    if (!user && claims.email) {
      user = await prisma.user.findUnique({
        where: { email: claims.email },
      });

      // If found by email, update the sub
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { sub: claims.sub },
        });
      }
    }

    // If still not found, create new user
    if (!user && claims.email) {
      const fullName =
        [claims.given_name, claims.middle_name, claims.family_name]
          .filter(Boolean)
          .join(" ") || null;

      const displayName =
        claims.name ?? fullName ?? claims.preferred_username ?? claims.email;

      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: claims.email,
          name: displayName,
          sub: claims.sub,
          givenName: claims.given_name ?? null,
          middleName: claims.middle_name ?? null,
          familyName: claims.family_name ?? null,
          image: claims.picture ?? null,
          emailVerified: claims.email_verified ? new Date() : null,
          roles: resolveUserRoles(claims),
          lastLoginAt: new Date(),
          allowAutoUpdate: true,
        },
      });
    }

    if (!user) {
      return null;
    }

    // Convert Uint8Array to Buffer if needed
    return {
      ...user,
      avatarData: user.avatarData ? Buffer.from(user.avatarData) : null,
    };
  } catch (error) {
    console.error("Error finding/creating user from token:", error);
    return null;
  }
}

/**
 * Authenticate via session cookies (NextAuth)
 */
async function authenticateViaSession(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return null;
    }

    // Convert Uint8Array to Buffer if needed
    return {
      ...user,
      avatarData: user.avatarData ? Buffer.from(user.avatarData) : null,
    };
  } catch (error) {
    console.error("Session authentication failed:", error);
    return null;
  }
}

/**
 * Authenticate via JWT Bearer token
 */
async function authenticateViaToken(
  token: string,
): Promise<AuthenticatedUser | null> {
  const claims = await verifyJwtToken(token);
  if (!claims) {
    return null;
  }

  return await findOrCreateUserFromToken(claims);
}

/**
 * Main authentication function - supports both session and JWT
 */
export async function authenticateApiRequest(
  request: NextRequest,
): Promise<ApiAuthResult> {
  // Try JWT Bearer token first
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    const user = await authenticateViaToken(bearerToken);
    if (user) {
      return {
        success: true,
        user,
        status: 200,
      };
    } else {
      // throw on invalid token to centralize handling
      throw Unauthorized("Invalid bearer token");
    }
  }

  // Fallback to session authentication
  const user = await authenticateViaSession();
  if (user) {
    return {
      success: true,
      user,
      status: 200,
    };
  }

  // No session or bearer token
  throw Unauthorized("Authentication required");
}

/**
 * Authorization helpers
 */
export function requireAdmin(user: AuthenticatedUser): boolean {
  return RoleChecker.hasRole(user, "admin");
}

export function requireRole(user: AuthenticatedUser, role: UserRole): boolean {
  return RoleChecker.hasRoleOrHigher(user, role);
}

/**
 * Middleware-style authentication for simpler usage.
 *
 * Always either returns `{ user }` or throws an HttpError (Unauthorized/
 * Forbidden) - never returns a Response. Callers must catch the throw
 * (via a try/catch calling handleError(), or the withErrorHandling()
 * wrapper) for the error to reach the client with the right status code.
 */
export async function requireAuthentication(
  request: NextRequest,
  options?: {
    requireRole?: UserRole;
    /** Overrides the default "Insufficient permissions" 403 message. */
    forbiddenMessage?: string;
  },
): Promise<{ user: AuthenticatedUser }> {
  const authResult = await authenticateApiRequest(request);
  // If authenticateApiRequest throws, it will be handled by error wrapper
  if (!authResult.success || !authResult.user) {
    throw Unauthorized("Authentication required");
  }

  // Check role requirements
  if (
    options?.requireRole &&
    !requireRole(authResult.user, options.requireRole)
  ) {
    throw Forbidden(options.forbiddenMessage ?? "Insufficient permissions");
  }

  return { user: authResult.user };
}

/**
 * Check if the authenticated caller has a given role (or a higher one in
 * the hierarchy), without throwing. Supports both JWT Bearer tokens and
 * session-based auth. Use this where a route wants to branch on a
 * permission rather than hard-reject the whole request.
 */
export async function hasRole(
  request: NextRequest,
  role: UserRole,
): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const claims = await verifyJwtToken(token);
    if (claims) {
      return RoleChecker.hasRoleOrHigher(
        { roles: resolveUserRoles(claims) },
        role,
      );
    }
  }

  const session = await auth();
  if (session?.user) {
    return RoleChecker.hasRoleOrHigher(
      { roles: session.user.roles ?? [] },
      role,
    );
  }

  return false;
}
