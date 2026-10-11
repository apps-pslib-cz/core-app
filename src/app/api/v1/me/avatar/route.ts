import { NextRequest, NextResponse } from "next/server";
import { requireAuthentication } from "@/libs/apiAuth";
import { prisma } from "@/libs/prisma";
import { BadRequest, NotFound, handleError } from "@/libs/errors";
import {
  detectImageMimeType,
  downloadAvatar,
  shouldUpdateAvatar,
} from "@/libs/avatar-utils";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthentication(req);

    if (!user.avatarData) {
      throw NotFound("Avatar not found");
    }

    // Převeď Uint8Array na Buffer
    const avatarBuffer = Buffer.from(user.avatarData);

    // Detekuj MIME type z binárních dat
    const mimeType = detectImageMimeType(avatarBuffer);

    // Vrať binární data s příslušným content-type
    return new NextResponse(avatarBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600", // Cache na 1 hodinu
        "Content-Length": avatarBuffer.length.toString(),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireAuthentication(req);
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      throw BadRequest("Avatar URL is required");
    }

    // Zkontroluj, zda je potřeba aktualizovat avatar
    if (
      shouldUpdateAvatar(
        url,
        user.image || null,
        new Date(), // Use current time for comparison since we have fresh user data
        user.avatarData,
      )
    ) {
      console.log(`📥 Downloading new avatar for user ${user.id}`);
      const avatarBuffer = await downloadAvatar(url);

      if (!avatarBuffer) {
        throw BadRequest("Failed to download avatar");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          avatarData: new Uint8Array(avatarBuffer),
          image: url,
        },
      });

      console.log(
        `✅ Avatar updated for user ${user.id}, size: ${avatarBuffer.length} bytes`,
      );

      return NextResponse.json({
        message: "Avatar updated successfully",
        size: avatarBuffer.length,
        mimeType: detectImageMimeType(avatarBuffer),
      });
    } else {
      return NextResponse.json({
        message: "Avatar is up to date",
        skipped: true,
      });
    }
  } catch (err) {
    return handleError(err);
  }
}
