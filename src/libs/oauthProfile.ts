import { z } from "zod";
import { APP_ROLES, type UserRole } from "@/types/roles";
import { resolveUserRoles } from "./oauthUserRoles";

/**
 * Data uživatele odvozená z OIDC claimů (/connect/userinfo, viz
 * withUserinfoProfile v auth.ts). Tvar odpovídá sloupcům modelu User, takže
 * výstup provider.profile() může adaptér rovnou uložit při založení nového
 * uživatele (DECISIONS D-4) a stejný tvar dostanou i signIn a
 * events.linkAccount - jedna normalizace pro všechny cesty přihlášení.
 */
export interface OAuthProfileData {
  sub: string;
  email: string | null;
  name: string | null;
  image: string | null;
  givenName: string | null;
  middleName: string | null;
  familyName: string | null;
  roles: UserRole[];
}

// Claimy jsou nedůvěryhodný vnější vstup: povinné je jen neprázdné sub,
// ostatní se bere, jen když je to neprázdný řetězec (OAuth server může
// stejný údaj posílat pod různými názvy, viz firstString níž).
const RawClaimsSchema = z
  .object({ sub: z.string().trim().min(1) })
  .catchall(z.unknown());

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

// Avatar se podle image stahuje na serveru (downloadAvatar), takže
// propustíme jen absolutní http(s) URL, nic jiného.
function httpUrlOrNull(value: unknown): string | null {
  const candidate = firstString(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Surové OIDC claimy → data uživatele. Bez platného `sub` vyhodí chybu. */
export function normalizeOAuthProfile(raw: unknown): OAuthProfileData {
  const claims = RawClaimsSchema.parse(raw);

  const givenName = firstString(
    claims.given_name,
    claims.givenName,
    claims.first_name,
    claims.firstName,
  );
  const middleName = firstString(claims.middle_name, claims.middleName);
  const familyName = firstString(
    claims.family_name,
    claims.familyName,
    claims.last_name,
    claims.lastName,
  );
  const email = firstString(claims.email);
  const fullName =
    [givenName, middleName, familyName].filter(Boolean).join(" ") || null;

  return {
    sub: claims.sub,
    email,
    name:
      firstString(
        claims.name,
        claims.display_name,
        claims.displayName,
        fullName,
        claims.preferred_username,
        claims.preferredUsername,
        email,
      ) ?? null,
    image: httpUrlOrNull(claims.picture),
    givenName,
    middleName,
    familyName,
    roles: resolveUserRoles(claims),
  };
}

/**
 * Výstup provider.profile(). Prisma adaptér ho při prvním přihlášení předá
 * celý do prisma.user.create (bez `id`), takže smí obsahovat jen sloupce
 * modelu User - neznámé pole by přihlášení shodilo. Hlídá
 * tests/unit/oauthProfile.test.ts (DECISIONS D-4).
 */
export function toAdapterUser(data: OAuthProfileData) {
  return {
    id: data.sub,
    ...data,
    name: data.name ?? undefined,
    email: data.email ?? undefined,
    image: data.image ?? undefined,
    emailVerified: null,
  };
}

// Tvar, který vrací provider.profile() a který Auth.js předá do
// events.linkAccount jako `profile` - ne surové claimy.
const ProviderUserSchema = z.object({
  sub: z.string().min(1),
  email: z.string().nullish(),
  name: z.string().nullish(),
  image: z.string().nullish(),
  givenName: z.string().nullish(),
  middleName: z.string().nullish(),
  familyName: z.string().nullish(),
  roles: z.array(z.enum(APP_ROLES)).default([]),
});

/** Výstup provider.profile() (viz events.linkAccount) → data uživatele. */
export function profileDataFromProviderUser(value: unknown): OAuthProfileData {
  const user = ProviderUserSchema.parse(value);
  return {
    sub: user.sub,
    email: user.email ?? null,
    name: user.name ?? null,
    image: user.image ?? null,
    givenName: user.givenName ?? null,
    middleName: user.middleName ?? null,
    familyName: user.familyName ?? null,
    roles: user.roles,
  };
}

interface DbUserForSession {
  id: string;
  sub?: string | null;
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
  roles?: string[] | null;
}

/**
 * Doplní session.user z řádku uživatele v DB. Appka používá database
 * session, takže callback session dostává uživatele přímo od adaptéru -
 * dřívější dohledání podle e-mailu selhalo u uživatele bez e-mailu
 * (DECISIONS D-4) a stálo jeden dotaz navíc.
 */
export function sessionUserFields(user: DbUserForSession) {
  return {
    id: user.id,
    sub: user.sub ?? undefined,
    given_name: user.givenName ?? null,
    middle_name: user.middleName ?? null,
    family_name: user.familyName ?? null,
    roles: user.roles ?? [],
  };
}
