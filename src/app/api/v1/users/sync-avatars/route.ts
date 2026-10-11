import { type NextRequest } from "next/server";
import { requireAuthentication } from "@/libs/apiAuth";
import { prisma } from "@/libs/prisma";
import { withErrorHandling, Forbidden } from "@/libs/errors";
import {
  fetchOAuthRoleSnapshot,
  getOAuthServiceCredentials,
} from "@/libs/oauthUserRoles";
import { downloadAvatar, shouldUpdateAvatar } from "@/libs/avatar-utils";
import { logger } from "@/libs/logger";
import { RoleChecker } from "@/types/roles";

// Kolik uživatelů zpracovat najednou - drží zátěž na OAuth serveru i na
// DB connection poolu v rozumných mezích (podezření na vyčerpání poolu při
// paralelních dotazech na avatary).
const BATCH_SIZE = 5;

interface SyncUser {
  id: string;
  sub: string;
  email: string | null;
  image: string | null;
  avatarData: Buffer | null;
  updatedAt: Date;
}

type UserOutcome = "updated" | "skipped" | { error: string };

async function syncOneUser(
  user: SyncUser,
  credentials: Awaited<ReturnType<typeof getOAuthServiceCredentials>>,
): Promise<UserOutcome> {
  const snapshot = await fetchOAuthRoleSnapshot(user.sub, credentials);
  const pictureUrl =
    snapshot.claims.find((claim) => claim.type === "picture")?.value ?? null;

  if (!pictureUrl) {
    return "skipped";
  }

  if (
    !shouldUpdateAvatar(pictureUrl, user.image, user.updatedAt, user.avatarData)
  ) {
    return "skipped";
  }

  const avatarBuffer = await downloadAvatar(pictureUrl);
  if (!avatarBuffer) {
    return { error: "Nepodařilo se stáhnout avatar z OAuth serveru" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      image: pictureUrl,
      avatarData: new Uint8Array(avatarBuffer),
    },
  });

  return "updated";
}

/**
 * POST /api/v1/users/sync-avatars
 * Hromadně dohledá a uloží avatary pro aktivní uživatele z OAuth serveru.
 * UI komponenty pak čtou jen lokální avatarData
 * (viz src/app/api/v1/users/[id]/avatar/route.ts) - tímto se drží aktuální.
 * Dostupné jen pro administrátory.
 */
async function POST_impl(request: NextRequest) {
  const { user: currentUser } = await requireAuthentication(request);
  if (!RoleChecker.hasRole(currentUser, "admin")) {
    throw Forbidden("Jen administrátoři mohou spustit hromadnou aktualizaci avatarů");
  }

  const users = (
    await prisma.user.findMany({
      where: { sub: { not: null }, active: true },
      select: {
        id: true,
        sub: true,
        email: true,
        image: true,
        avatarData: true,
        updatedAt: true,
      },
    })
  ).filter((u): u is typeof u & { sub: string } => u.sub !== null) as SyncUser[];

  const credentials = await getOAuthServiceCredentials();

  const updated: string[] = [];
  const skipped: string[] = [];
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
      if (outcome === "updated") updated.push(user.id);
      else if (outcome === "skipped") skipped.push(user.id);
      else failed.push({ id: user.id, email: user.email, error: outcome.error });
    }
  }

  logger.info("[AvatarSync] Bulk avatar sync finished", {
    total: users.length,
    updated: updated.length,
    skipped: skipped.length,
    failed: failed.length,
  });

  return Response.json({
    total: users.length,
    updated: updated.length,
    skipped: skipped.length,
    failed,
  });
}

export const POST = withErrorHandling(
  POST_impl as unknown as (req: Request) => Promise<Response>,
);
