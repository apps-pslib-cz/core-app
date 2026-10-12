import { ROLE_CLAIMS, UserRole } from "@/types/roles";
import { logger } from "./logger";

export interface OAuthClaim {
  type: string;
  value: string;
}

interface OAuthServiceCredentials {
  accessToken: string;
  issuer: string;
  clientId: string;
}

interface OAuthRoleSnapshot {
  claims: OAuthClaim[];
  upstreamRoles: string[];
  roles: UserRole[];
  stillCurrent: boolean | undefined;
}

// OAuth scope appky - ve výchozím stavu jen standardní "openid profile
// email", dokud appka nemá na identity serveru zaregistrovaný vlastní
// claim/scope (viz ROLE_CLAIMS v src/types/roles.ts). Sdíleno s auth.ts,
// aby se provider i role-sync dotazovaly na stejný scope.
export const OAUTH_SCOPE =
  process.env.AUTH_DUENDE_IDENTITY_SERVER6_SCOPE || "openid profile email";

// Role, co na oauth.pslib.cz znamenají "současný" vs. "bývalý" člen školy -
// škola-wide vokabulář sdílený mezi appkami na stejném identity serveru
// (ne appka-specifická konvence, na rozdíl od ROLE_CLAIMS výš).
const CURRENT_ROLE_NAMES = new Set(["student", "učitel"]);
const FORMER_ROLE_NAMES = new Set(["exstudent", "exučitel"]);

/**
 * Z výpisu rolí na OAuth serveru pozná, jestli uživatel potvrzeně ještě má
 * aktuální roli (Student/Učitel), potvrzeně jen bývalou (Exstudent/ExUčitel),
 * nebo z toho nejde nic poznat (Externista, Administrátor, neznámá/chybějící
 * role) - poslední případ se musí řešit případ od případu, ne automaticky.
 */
export function resolveStillHasCurrentRole(
  upstreamRoles: string[] = [],
): boolean | undefined {
  const normalized = upstreamRoles.map((role) => role.trim().toLowerCase());
  if (normalized.some((role) => CURRENT_ROLE_NAMES.has(role))) return true;
  if (normalized.some((role) => FORMER_ROLE_NAMES.has(role))) return false;
  return undefined;
}

export function claimValueToBoolean(value: unknown, defaultValue = false): boolean {
  // Duende serializuje víc claimů se stejným typem (např. když je claim
  // definovaný jak na roli, tak přímo na uživateli) jako JSON pole hodnot,
  // ne jako skalár.
  if (Array.isArray(value)) {
    return value.some((v) => claimValueToBoolean(v, false));
  }
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["yes", "y", "on"].includes(normalized)) return true;
    if (["no", "n", "off"].includes(normalized)) return false;
  }
  return defaultValue;
}

/**
 * Z OAuth claimů (podle konfigurovatelné mapy ROLE_CLAIMS v
 * src/types/roles.ts) sestaví seznam rolí, které appka uživateli přidělí.
 */
export function resolveUserRoles(
  claims: Record<string, unknown>,
): UserRole[] {
  return Object.entries(ROLE_CLAIMS)
    .filter(([claimName]) => claimValueToBoolean(claims[claimName]))
    .map(([, role]) => role);
}

function getRolesFromClaims(claims: OAuthClaim[]): UserRole[] {
  const claimMap: Record<string, unknown> = {};
  for (const claim of claims) {
    claimMap[claim.type] = claim.value;
  }
  return resolveUserRoles(claimMap);
}

export async function getOAuthServiceCredentials(): Promise<OAuthServiceCredentials> {
  const issuer = process.env.AUTH_DUENDE_IDENTITY_SERVER6_ISSUER;
  const clientId = process.env.AUTH_DUENDE_IDENTITY_SERVER6_ID;
  const clientSecret = process.env.AUTH_DUENDE_IDENTITY_SERVER6_SECRET;

  if (!issuer || !clientId || !clientSecret) {
    throw new Error("OAuth konfigurace chybí (ISSUER/ID/SECRET)");
  }

  const tokenResponse = await fetch(`${issuer}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "IdentityServerApi",
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`Nelze získat OAuth token: ${tokenResponse.status} - ${errorBody}`);
  }

  const { access_token } = (await tokenResponse.json()) as { access_token: string };

  return {
    accessToken: access_token,
    issuer,
    clientId,
  };
}

export async function fetchOAuthRoleSnapshot(
  sub: string,
  credentials?: OAuthServiceCredentials,
): Promise<OAuthRoleSnapshot> {
  const { accessToken, issuer, clientId } = credentials ?? (await getOAuthServiceCredentials());

  const [claimsResponse, rolesResponse] = await Promise.all([
    fetch(
      `${issuer}/api/users/${sub}/effectiveClaims?clientId=${encodeURIComponent(clientId)}&scopes=${encodeURIComponent(OAUTH_SCOPE)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    ),
    fetch(`${issuer}/api/users/${sub}/roles`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }),
  ]);

  let claims: OAuthClaim[] = [];
  if (claimsResponse.ok) {
    const claimsData = (await claimsResponse.json()) as { items?: OAuthClaim[] };
    claims = Array.isArray(claimsData.items) ? claimsData.items : [];
  } else {
    const errorBody = await claimsResponse.text();
    logger.warn("[OAuthRoleSync] effectiveClaims lookup failed", {
      sub,
      status: claimsResponse.status,
      errorBody,
    });
  }

  let upstreamRoles: string[] = [];
  if (rolesResponse.ok) {
    const rolesData = (await rolesResponse.json()) as unknown;
    upstreamRoles = Array.isArray(rolesData)
      ? rolesData.filter((role): role is string => typeof role === "string")
      : [];
  } else {
    const errorBody = await rolesResponse.text();
    logger.warn("[OAuthRoleSync] roles lookup failed", {
      sub,
      status: rolesResponse.status,
      errorBody,
    });
  }

  return {
    claims,
    upstreamRoles,
    roles: getRolesFromClaims(claims),
    stillCurrent: resolveStillHasCurrentRole(upstreamRoles),
  };
}
