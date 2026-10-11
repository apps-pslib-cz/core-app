import { type NextRequest } from "next/server";
import { requireAuthentication } from "@/libs/apiAuth";
import { prisma } from "@/libs/prisma";
import { handleError } from "@/libs/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Authentication - any authenticated user can access avatars
    await requireAuthentication(request);

    // Find user with avatar data
    const user = await prisma.user.findFirst({
      where: {
        id: id,
      },
      select: {
        id: true,
        avatarData: true,
      },
    });

    if (!user) {
      return new Response("User not found", {
        status: 404,
      });
    }

    // If user has binary avatar data, return it
    if (user.avatarData) {
      return new Response(Buffer.from(user.avatarData), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg", // Assuming JPEG, could be made more flexible
          "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
          ETag: `"avatar-${user.id}"`,
        },
      });
    }

    // No binary data cached locally - never call out to an external URL here;
    // avatars are fetched/cached on login and on import (see downloadAvatar()).
    return new Response("No avatar available", {
      status: 404,
    });
  } catch (err) {
    return handleError(err);
  }
}
