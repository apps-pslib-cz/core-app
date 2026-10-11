import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import DuendeIdentityServer6, {
  type DuendeISUser,
} from "next-auth/providers/duende-identity-server6";
import { prisma } from "./prisma";
import { downloadAvatar, shouldUpdateAvatar } from "./avatar-utils";
import {
  fetchOAuthRoleSnapshot,
  fetchOAuthUserNameByEmail,
  resolveUserRoles,
  OAUTH_SCOPE,
} from "./oauthUserRoles";
import { logger } from "./logger";

type ProfileWithClaims = DuendeISUser & {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  givenName?: string;
  first_name?: string;
  firstName?: string;
  middle_name?: string;
  middleName?: string;
  family_name?: string;
  familyName?: string;
  last_name?: string;
  lastName?: string;
  preferred_username?: string;
  preferredUsername?: string;
  name?: string;
  display_name?: string;
  displayName?: string;
  picture?: string;
  // vlastní role-claimy appky (viz ROLE_CLAIMS v src/types/roles.ts) -
  // jejich název je datově řízený, proto index signature místo pevných polí.
  [claim: string]: unknown;
};

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    DuendeIdentityServer6({
      issuer: process.env.AUTH_DUENDE_IDENTITY_SERVER6_ISSUER!,
      clientId: process.env.AUTH_DUENDE_IDENTITY_SERVER6_ID!,
      clientSecret: process.env.AUTH_DUENDE_IDENTITY_SERVER6_SECRET!,
      authorization: { params: { scope: OAUTH_SCOPE } },
      checks: ["pkce", "state"],
      // oauth.pslib.cz is the sole identity source for this app (no other
      // login method exists), and users may be pre-provisioned by email
      // via the admin dashboard before their first real login. Without
      // this, that first login always fails with OAuthAccountNotLinked,
      // because the pre-created User row has no Account row yet - safe to
      // auto-link by email in this single-IdP setup.
      allowDangerousEmailAccountLinking: true,
      profile(raw) {
        const p = raw as ProfileWithClaims;
        const fullName =
          [p.given_name, p.middle_name, p.family_name]
            .filter(Boolean)
            .join(" ") || null;
        const displayName =
          p.name ?? fullName ?? p.preferred_username ?? p.email ?? null;

        return {
          id: p.sub,
          name: displayName ?? undefined,
          email: p.email ?? undefined,
          image: p.picture ?? undefined,
          emailVerified: null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Při každém přihlášení aktualizujeme uživatele v databázi
      if (account && profile && user) {
        const p = profile as ProfileWithClaims;
        const claimedSub = firstNonEmptyString(p.sub, account.providerAccountId);
        const claimedEmail = firstNonEmptyString(user.email ?? undefined, p.email);

        let resolvedUserId = firstNonEmptyString(user.id);

        // U OAuth loginu nemusí user.id vždy odpovídat lokálnímu DB id (hlavně při prvním přihlášení).
        // Proto dohledáváme uživatele přes account/sub/email.
        if (resolvedUserId) {
          const userById = await prisma.user.findUnique({
            where: { id: resolvedUserId },
            select: { id: true },
          });
          if (!userById) {
            resolvedUserId = null;
          }
        }

        if (!resolvedUserId && account.provider && account.providerAccountId) {
          const accountRecord = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            select: { userId: true },
          });
          resolvedUserId = accountRecord?.userId ?? null;
        }

        if (!resolvedUserId && claimedSub) {
          // Case-insensitive: data přenesená ze staré DB mají GUID uložené
          // velkými písmeny, OAuth server je ale posílá malými - přesná
          // shoda (findUnique) by je nikdy nenašla.
          const userBySub = await prisma.user.findFirst({
            where: { sub: { equals: claimedSub, mode: "insensitive" } },
            select: { id: true },
          });
          resolvedUserId = userBySub?.id ?? null;
        }

        if (!resolvedUserId && claimedEmail) {
          const userByEmail = await prisma.user.findUnique({
            where: { email: claimedEmail },
            select: { id: true },
          });
          resolvedUserId = userByEmail?.id ?? null;
        }

        if (!resolvedUserId) {
          // Uživatel v DB ještě neexistuje (nebyl pre-provisioned) - adaptér
          // za chvíli vytvoří nový řádek sám. Obohacení pro tenhle případ
          // proběhne v events.linkAccount, jakmile bude mít adaptér hotovo.
          logger.warn(
            "[Auth] Unable to resolve DB user for sign-in sync (likely a brand-new, non-pre-provisioned account — will be enriched via linkAccount event instead)",
            {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              userId: user.id,
              sub: claimedSub,
              email: claimedEmail,
            },
          );
          return true;
        }

        await syncUserProfile(resolvedUserId, p, claimedSub, claimedEmail);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      if (token?.id) {
        session.user.id = token.id as string;
      }

      // Načteme aktuální data uživatele z databáze
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
        });

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.sub = dbUser.sub ?? undefined;
          session.user.given_name = dbUser.givenName;
          session.user.middle_name = dbUser.middleName;
          session.user.family_name = dbUser.familyName;
          session.user.roles = dbUser.roles;
        }
      }

      return session;
    },
  },
  events: {
    // Spustí se přesně jednou při prvním napojení OAuth účtu na uživatele -
    // ať už jde o nově vytvořeného uživatele (adaptér ho vytvořil těsně
    // předtím, signIn callback ho tedy ještě nemohl najít) nebo o
    // pre-provisioned uživatele, u kterého to signIn callback už stihl
    // vyřešit. Pro pre-provisioned uživatele je to tedy neškodný duplicitní
    // běh; pro úplně nové účty je to jediné místo, kde má obohacení šanci
    // proběhnout hned při prvním přihlášení.
    async linkAccount({ user, account, profile }) {
      if (!user.id || !profile) return;
      const p = profile as ProfileWithClaims;
      const claimedSub = firstNonEmptyString(p.sub, account.providerAccountId);
      const claimedEmail = firstNonEmptyString(user.email ?? undefined, p.email);
      await syncUserProfile(user.id, p, claimedSub, claimedEmail);
    },
  },
});

export const { handlers, signIn, signOut, auth } = nextAuth;

// Přihlášení pomocí Duende Identity Serveru
export async function signInAction() {
  await signIn("duende-identity-server6");
}

// Odhlášení a přesměrování na domovskou stránku
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

// --- pomocné funkce ---

function firstNonEmptyString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

// Sdílená obohacovací logika volaná jak ze signIn callbacku (pro už
// existující/pre-provisioned uživatele), tak z events.linkAccount (pro
// nově vytvořené účty, u kterých signIn callback ještě neměl koho najít).
async function syncUserProfile(
  userId: string,
  p: ProfileWithClaims,
  claimedSub: string | null,
  claimedEmail: string | null,
): Promise<void> {
  try {
    // Načteme aktuální stav uživatele
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        allowAutoUpdate: true,
        avatarData: true,
        updatedAt: true,
        image: true,
      },
    });

    // Připrav data pro aktualizaci - lastLoginAt (a sub, pro budoucí
    // dohledání) se aktualizují vždy, i kdyby dál něco selhalo -
    // jinak by se přihlášení "technicky povedlo", ale uživatel by
    // navždy zůstal bez rolí kvůli jedné přechodné chybě (např.
    // výpadek admin API identity serveru).
    const updateData: {
      sub?: string | null;
      givenName?: string | null;
      middleName?: string | null;
      familyName?: string | null;
      roles?: string[];
      active?: boolean;
      lastLoginAt: Date;
      avatarData?: Uint8Array;
      image?: string;
      name?: string;
    } = {
      lastLoginAt: new Date(),
      sub: claimedSub ?? null,
    };

    // Pokud má uživatel povolenou auto-aktualizaci, aktualizuj všechny údaje.
    // Vlastní try/catch: selhání obohacení (role ze vzdáleného API,
    // stažení avataru) nesmí zabránit uložení lastLoginAt/sub výše.
    if (!currentUser || currentUser.allowAutoUpdate) {
      try {
        let givenName = firstNonEmptyString(
          p.given_name,
          p.givenName,
          p.first_name,
          p.firstName,
        );
        const middleName = firstNonEmptyString(p.middle_name, p.middleName);
        let familyName = firstNonEmptyString(
          p.family_name,
          p.familyName,
          p.last_name,
          p.lastName,
        );

        // Stejně jako u rolí: ID token/profil při prvním přihlášení často
        // neobsahuje given_name/family_name. Dohledáme je stejným admin API,
        // které používá i vyhledávání uživatelů při importu.
        if (!givenName && !familyName && claimedEmail) {
          try {
            const nameSnapshot = await fetchOAuthUserNameByEmail(claimedEmail);
            if (nameSnapshot) {
              givenName = nameSnapshot.givenName;
              familyName = nameSnapshot.familyName;
              logger.info(
                "[Auth] Name claims not in profile, fetched via admin API fallback",
                { userId, givenName, familyName },
              );
            }
          } catch (nameError) {
            logger.error(
              "[Auth] Failed to fetch name snapshot fallback from identity server (keeping name unresolved for this login)",
              {
                userId,
                error:
                  nameError instanceof Error ? nameError.message : String(nameError),
              },
            );
          }
        }

        // Aktualizuj osobní údaje - jen když se skutečně podařilo něco
        // zjistit. Když claimy v ID tokenu chybí A ZÁROVEŇ selže i admin API
        // fallback výše, nesmíme tím přepsat už uloženou správnou hodnotu
        // v DB prázdnou - to by při jednom neúspěšném přihlášení smazalo
        // dřív správně vyplněné jméno/příjmení.
        if (givenName) updateData.givenName = givenName;
        if (middleName) updateData.middleName = middleName;
        if (familyName) updateData.familyName = familyName;

        let resolvedRoles = resolveUserRoles(p);
        let roleFallbackFailed = false;
        let stillCurrent: boolean | undefined;

        if (claimedSub && resolvedRoles.length === 0) {
          try {
            const snapshot = await fetchOAuthRoleSnapshot(claimedSub);
            resolvedRoles = snapshot.roles;
            stillCurrent = snapshot.stillCurrent;
            logger.info(
              "[Auth] Role claims not in profile, fetched via admin API fallback",
              { userId, roles: resolvedRoles },
            );
          } catch (snapshotError) {
            // Ani claimy, ani fallback nic nevrátily - nejde poznat, jestli
            // uživatel opravdu nemá žádnou roli, nebo jen selhalo API. V
            // žádném případě nesmíme rizikovat přepsání existujících rolí
            // (třeba jediného admina) na prázdný seznam - role necháme,
            // jaké jsou v DB.
            roleFallbackFailed = true;
            logger.error(
              "[Auth] Failed to fetch role snapshot fallback from identity server (keeping existing roles in DB unchanged for this login)",
              {
                userId,
                error:
                  snapshotError instanceof Error
                    ? snapshotError.message
                    : String(snapshotError),
              },
            );
          }
        }

        if (!roleFallbackFailed) {
          updateData.roles = resolvedRoles;
        }

        // Jen směr "deaktivovat" (potvrzená bývalá role Exstudent/ExUčitel) -
        // reaktivaci neřešíme, to dělá admin ručně v /dashboard/users.
        if (stillCurrent === false) {
          updateData.active = false;
        }

        // Sestavit celé jméno
        const fullName =
          [givenName, middleName, familyName].filter(Boolean).join(" ") || null;
        const displayName =
          p.name ??
          p.display_name ??
          p.displayName ??
          fullName ??
          p.preferred_username ??
          p.preferredUsername ??
          claimedEmail ??
          null;
        updateData.name = displayName;

        // Zkontroluj, zda je potřeba aktualizovat avatar
        const avatarUrl = p.picture;
        if (
          avatarUrl &&
          shouldUpdateAvatar(
            avatarUrl,
            currentUser?.image || null,
            currentUser?.updatedAt || null,
            currentUser?.avatarData ? Buffer.from(currentUser.avatarData) : null,
          )
        ) {
          logger.info("[Auth] Downloading new avatar for user", { userId });
          const avatarBuffer = await downloadAvatar(avatarUrl);

          if (avatarBuffer) {
            updateData.avatarData = new Uint8Array(avatarBuffer.buffer as ArrayBuffer);
            updateData.image = avatarUrl;
            logger.info("[Auth] Avatar updated for user", {
              userId,
              size: avatarBuffer.length,
            });
          }
        }
      } catch (enrichError) {
        logger.error(
          "[Auth] Failed to enrich user data on sign in (lastLoginAt/sub will still be saved)",
          {
            userId,
            error:
              enrichError instanceof Error ? enrichError.message : String(enrichError),
            stack: enrichError instanceof Error ? enrichError.stack : undefined,
          },
        );
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData as Parameters<typeof prisma.user.update>[0]["data"],
    });

    logger.info("[Auth] User updated on login", {
      userId,
      allowAutoUpdate: currentUser?.allowAutoUpdate ?? true,
    });
  } catch (error) {
    logger.error("[Auth] Error updating user on sign in", {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
