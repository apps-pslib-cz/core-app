import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import DuendeIdentityServer6, {
  type DuendeISUser,
} from "next-auth/providers/duende-identity-server6";
import type { OAuthConfig, OIDCConfig } from "next-auth/providers";
import { prisma } from "./prisma";
import { downloadAvatar, shouldUpdateAvatar } from "./avatar-utils";
import { OAUTH_SCOPE } from "./oauthUserRoles";
import {
  normalizeOAuthProfile,
  profileDataFromProviderUser,
  sessionUserFields,
  toAdapterUser,
  type OAuthProfileData,
} from "./oauthProfile";
import { logger } from "./logger";

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    withUserinfoProfile(DuendeIdentityServer6({
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
      // Výstup se při prvním přihlášení uloží adaptérem jako nový User -
      // proto vrací i role a jméno, ne jen id/name/email/image. Jinak by
      // nový uživatel dostal role až při druhém přihlášení (DECISIONS D-4).
      profile(raw) {
        return toAdapterUser(normalizeOAuthProfile(raw));
      },
    })),
  ],
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Při každém přihlášení aktualizujeme uživatele v databázi. `profile`
      // jsou tady surové claimy z userinfo (na rozdíl od events.linkAccount).
      if (account && profile && user) {
        const data = normalizeOAuthProfile(profile);
        const claimedEmail = data.email ?? user.email ?? null;

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

        if (!resolvedUserId) {
          // Case-insensitive: data přenesená ze staré DB mají GUID uložené
          // velkými písmeny, OAuth server je ale posílá malými - přesná
          // shoda (findUnique) by je nikdy nenašla.
          const userBySub = await prisma.user.findFirst({
            where: { sub: { equals: data.sub, mode: "insensitive" } },
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
          // ho za chvíli založí z výstupu provider.profile() už i s rolemi
          // a jménem; avatar a lastLoginAt doplní events.linkAccount.
          logger.info("[Auth] New user, will be created by adapter", {
            provider: account.provider,
            sub: data.sub,
          });
          return true;
        }

        await syncUserProfile(resolvedUserId, { ...data, email: claimedEmail });
      }
      return true;
    },
    async session({ session, user }) {
      // Database session: `user` je řádek z DB (adaptér), bez dalšího dotazu.
      if (session.user && user) {
        Object.assign(session.user, sessionUserFields(user));
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
    // běh; pro úplně nové účty doplní avatar a lastLoginAt. `profile` je
    // tady výstup provider.profile(), ne surové claimy.
    async linkAccount({ user, profile }) {
      if (!user.id || !profile) return;
      try {
        await syncUserProfile(user.id, profileDataFromProviderUser(profile));
      } catch (error) {
        logger.error("[Auth] Failed to sync profile on linkAccount", {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
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

// Duende ve výchozím nastavení klienta nedává do ID tokenu e-mail, jméno
// ani vlastní role-claimy (ROLE_CLAIMS) - v ID tokenu je jen sub. S idToken:
// false Auth.js ID token dál vyžaduje a ověří, ale profil načte
// z /connect/userinfo a ověří, že userinfo.sub odpovídá ID tokenu. Appka
// tak pro přihlášení nepotřebuje admin API OAuth serveru (DECISIONS D-4).
// Nastavuje se na configu providera, ne v jeho options -
// OAuthUserConfig `idToken` v typech nemá; DuendeIdentityServer6 je vždy
// typu "oidc", proto je cast bezpečný.
function withUserinfoProfile<P extends DuendeISUser>(
  provider: OAuthConfig<P>,
): OIDCConfig<P> {
  return { ...(provider as OIDCConfig<P>), idToken: false };
}

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
async function syncUserProfile(userId: string, data: OAuthProfileData): Promise<void> {
  try {
    // Načteme aktuální stav uživatele
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        allowAutoUpdate: true,
        avatarData: true,
        updatedAt: true,
        image: true,
        email: true,
      },
    });

    // lastLoginAt a sub (pro budoucí dohledání) se aktualizují vždy, i kdyby
    // dál něco selhalo.
    const updateData: {
      sub: string;
      email?: string;
      givenName?: string;
      middleName?: string;
      familyName?: string;
      roles?: string[];
      lastLoginAt: Date;
      avatarData?: Uint8Array<ArrayBuffer>;
      image?: string;
      name?: string;
    } = {
      lastLoginAt: new Date(),
      sub: data.sub,
    };

    // Pokud má uživatel povolenou auto-aktualizaci, aktualizuj všechny údaje.
    // Vlastní try/catch: selhání obohacení (stažení avataru) nesmí zabránit
    // uložení lastLoginAt/sub výše.
    if (!currentUser || currentUser.allowAutoUpdate) {
      try {
        // E-mail se jen doplňuje, když chybí (DECISIONS D-4) - přepsání
        // existujícího by změnilo klíč, podle kterého se páruje
        // pre-provisioned účet (allowDangerousEmailAccountLinking).
        if (data.email && !currentUser?.email) {
          const emailTaken = await prisma.user.findUnique({
            where: { email: data.email },
            select: { id: true },
          });
          if (!emailTaken) updateData.email = data.email;
        }

        // Prázdnou hodnotou nepřepisujeme už uložené jméno.
        if (data.givenName) updateData.givenName = data.givenName;
        if (data.middleName) updateData.middleName = data.middleName;
        if (data.familyName) updateData.familyName = data.familyName;
        if (data.name) updateData.name = data.name;

        // Role jsou jen z claimů userinfo (D-4). Selhání userinfo shodí
        // celé přihlášení dřív, než se sem dojde, takže prázdný seznam tu
        // znamená "uživatel opravdu nemá žádný role-claim z ROLE_CLAIMS"
        // (nebo appka nemá nastavený AUTH_DUENDE_IDENTITY_SERVER6_SCOPE).
        updateData.roles = data.roles;

        // Zkontroluj, zda je potřeba aktualizovat avatar
        const avatarUrl = data.image;
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
      data: updateData,
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
