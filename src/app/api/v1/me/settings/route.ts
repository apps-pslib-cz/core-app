import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/hocs/withAuth";

/**
 * GET /api/v1/me/settings
 * Get current user's settings
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    return NextResponse.json({
      allowAutoUpdate: user.allowAutoUpdate,
      notifyByEmail: user.notifyByEmail,
      notifyByTeams: user.notifyByTeams,
      sendActionNotifications: user.sendActionNotifications,
      lastLogin: user.lastLoginAt,
    });
  } catch (error) {
    console.error("Error getting user settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});

/**
 * PATCH /api/v1/me/settings
 * Update one or more of the current user's own settings. Every field is
 * optional - only the ones present in the body are changed.
 */
export const PATCH = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const {
      allowAutoUpdate,
      notifyByEmail,
      notifyByTeams,
      sendActionNotifications,
    } = body;

    const data: Record<string, boolean> = {};
    for (const [key, value] of Object.entries({
      allowAutoUpdate,
      notifyByEmail,
      notifyByTeams,
      sendActionNotifications,
    })) {
      if (value === undefined) continue;
      if (typeof value !== "boolean") {
        return NextResponse.json(
          { error: `Invalid ${key} value. Must be boolean.` },
          { status: 400 },
        );
      }
      data[key] = value;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Use our existing prisma instance through the auth system
    const { prisma } = await import("@/libs/prisma");

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        allowAutoUpdate: true,
        notifyByEmail: true,
        notifyByTeams: true,
        sendActionNotifications: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      allowAutoUpdate: updatedUser.allowAutoUpdate,
      notifyByEmail: updatedUser.notifyByEmail,
      notifyByTeams: updatedUser.notifyByTeams,
      sendActionNotifications: updatedUser.sendActionNotifications,
      lastUpdate: updatedUser.updatedAt,
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});
