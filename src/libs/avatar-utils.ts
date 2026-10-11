/**
 * Utility funkce pro správu avatarů uživatelů
 *
 * Tyto funkce jsou malé čisté utility používané v serverové logice
 * pro stažení a zpracování avatarů. Jsou navrženy tak, aby byly
 * snadno testovatelné a bez vedlejších efektů mimo I/O operací.
 */

export async function downloadAvatar(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "NextJS-App-Core/1.0",
      },
      // Timeout 10 sekund
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`Failed to download avatar from ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      console.warn(`Invalid content type for avatar: ${contentType}`);
      return null;
    }

    // Limit velikosti na 5MB
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      console.warn(`Avatar too large: ${contentLength} bytes`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer as ArrayBuffer);
  } catch (error) {
    console.error("Error downloading avatar:", error);
    return null;
  }
}

/**
 * Kontroluje, zda je potřeba aktualizovat avatar.
 *
 * - Pokud není žádná currentImageUrl, neprovádíme update (vrací false).
 * - Pokud chybí uložená binární data, požadujeme stažení (true).
 * - Pokud se URL změnila, požadujeme stažení (true).
 * - Pokud poslední update je starší než 24h, požadujeme aktualizaci.
 */
export function shouldUpdateAvatar(
  currentImageUrl: string | null,
  storedImageUrl: string | null,
  lastUpdate: Date | null,
  avatarData: Buffer | null,
): boolean {
  if (!currentImageUrl) return false;
  if (!avatarData) return true;
  if (currentImageUrl !== storedImageUrl) return true;

  if (lastUpdate) {
    const hoursSinceUpdate =
      (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate > 24;
  }

  return true;
}

/**
 * Vytvoří data URL z binárních dat avatara pro zobrazení.
 */
export function createAvatarDataUrl(
  avatarData: Buffer,
  mimeType: string = "image/png",
): string {
  const base64 = avatarData.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Detekuje MIME type z binárních dat (magic numbers).
 */
export function detectImageMimeType(buffer: Buffer): string {
  const firstBytes = buffer.subarray(0, 4);

  // PNG signature
  if (
    firstBytes[0] === 0x89 &&
    firstBytes[1] === 0x50 &&
    firstBytes[2] === 0x4e &&
    firstBytes[3] === 0x47
  ) {
    return "image/png";
  }

  // JPEG signature
  if (firstBytes[0] === 0xff && firstBytes[1] === 0xd8) {
    return "image/jpeg";
  }

  // GIF signature
  if (
    firstBytes[0] === 0x47 &&
    firstBytes[1] === 0x49 &&
    firstBytes[2] === 0x46
  ) {
    return "image/gif";
  }

  // WebP signature
  if (buffer.length >= 12) {
    const webpSignature = buffer.subarray(8, 12);
    if (webpSignature.toString() === "WEBP") {
      return "image/webp";
    }
  }

  // Default fallback
  return "image/png";
}
