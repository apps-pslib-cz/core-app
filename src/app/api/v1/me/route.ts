import { NextRequest, NextResponse } from "next/server";
import { requireAuthentication } from "@/libs/apiAuth";
import { prisma } from "@/libs/prisma";
import { logRequest } from "@/libs/requestLogger";
import { logger, loggerUtils } from "@/libs/logger";
import type { MeDto } from "@/types/dtos/users";

export const GET = logRequest(async (req: NextRequest) => {
  const { user } = await requireAuthentication(req);

  // Log user data access
  loggerUtils.logUserAction("profile_view", user.id);

  // User is already from DB, so we can return it directly
  return NextResponse.json(user);
});

export const PUT = logRequest(async (req: NextRequest) => {
  const { user } = await requireAuthentication(req);

  try {
    const data: MeDto = await req.json();

    // Log the update attempt
    loggerUtils.logUserAction("profile_update", user.id, undefined, {
      fields: Object.keys(data),
    });

    // email/sub are deliberately not editable here - both are OAuth-managed,
    // and the fallback OAuth-login lookup matches pre-provisioned accounts
    // by email, so a self-service change could break someone else's first
    // login.
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: [data.givenName, data.middleName, data.familyName]
          .filter(Boolean)
          .join(" "),
        givenName: data.givenName,
        familyName: data.familyName,
        middleName: data.middleName,
        updatedAt: new Date(),
      },
    });

    logger.info("User profile updated successfully", {
      type: "profile_updated",
      userId: user.id,
      updatedFields: Object.keys(data),
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    // Use proper logging instead of console.error
    loggerUtils.logError(
      error instanceof Error ? error : new Error(String(error)),
      { operation: "profile_update", userId: user.id },
      user.id,
    );

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
});
