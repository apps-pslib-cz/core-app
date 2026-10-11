import { type NextRequest } from "next/server";
import { requireAuthentication } from "@/libs/apiAuth";
import { prisma } from "@/libs/prisma";
import { withErrorHandling, Forbidden } from "@/libs/errors";
import {
  fetchOAuthRoleSnapshot,
  getOAuthServiceCredentials,
} from "@/libs/oauthUserRoles";
import { logger } from "@/libs/logger";
import { RoleChecker } from "@/types/roles";

// Stejná dávka jako sync-avatars - drží zátěž na OAuth serveru v mezích.
const BATCH_SIZE = 5;

interface SyncUser {
  id: string;
  sub: string;
  email: string | null;
}

type UserOutcome = "deactivated" | "unchanged" | { error: string };

async function syncOneUser(
  user: SyncUser,
  credentials: Awaited<ReturnType<typeof getOAuthServiceCredentials>>,
): Promise<UserOutcome> {
  const snapshot = await fetchOAuthRoleSnapshot(user.sub, credentials);

  if (snapshot.stillCurrent !== false) {
    // true (Student/Učitel) nebo undefined (Externista/Administrátor/
    // neznámá role) - v obou případech nesahat, jen potvrzená bývalá role
    // (Exstudent/ExUčitel) vede k deaktivaci.
    return "unchanged";
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { active: false },
  });

  return "deactivated";
}

/**
 * POST /api/v1/users/sync-active
 * Hromadně zkontroluje aktuálně aktivní uživatele proti rolím na OAuth
 * serveru a ty s potvrzeně jen bývalou rolí (Exstudent/ExUčitel) označí
 * jako neaktivní. Reaktivace se neřeší - admin ji dělá ručně.
 * Dostupné jen pro administrátory.
 */
async function POST_impl(request: NextRequest) {
  const { user: currentUser } = await requireAuthentication(request);
  if (!RoleChecker.hasRole(currentUser, "admin")) {
    throw Forbidden("Jen administrátoři mohou spustit hromadnou kontrolu aktivity");
  }

  const users = (
    await prisma.user.findMany({
      where: { sub: { not: null }, active: true },
      select: { id: true, sub: true, email: true },
    })
  ).filter((u): u is typeof u & { sub: string } => u.sub !== null) as SyncUser[];

  const credentials = await getOAuthServiceCredentials();

  const deactivated: string[] = [];
  const unchanged: string[] = [];
  const failed: Array<{ id: string; email: string | null; error: string }> = [];

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const outcomes = await Promise.all(
      batch.map(async (user) => {
        try {
          return { user, outcome: await syncOneUser(user, credentials) };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Neznámá chyba";
          return { user, outcome: { error: message } as const };
        }
      }),
    );

    for (const { user, outcome } of outcomes) {
      if (outcome === "deactivated") deactivated.push(user.id);
      else if (outcome === "unchanged") unchanged.push(user.id);
      else failed.push({ id: user.id, email: user.email, error: outcome.error });
    }
  }

  logger.info("[ActiveSync] Bulk active-status sync finished", {
    total: users.length,
    deactivated: deactivated.length,
    unchanged: unchanged.length,
    failed: failed.length,
  });

  return Response.json({
    total: users.length,
    deactivated: deactivated.length,
    unchanged: unchanged.length,
    failed,
  });
}

export const POST = withErrorHandling(
  POST_impl as unknown as (req: Request) => Promise<Response>,
);
