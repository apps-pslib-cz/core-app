/**
 * Content-Security-Policy s per-request nonce (postup podle Next.js návodu
 * "Content Security Policy", node_modules/next/dist/docs). Volá ji
 * src/proxy.ts. Next.js nonce z hlavičky sám přidá na své skripty, vlastní
 * <Script> tagy (src/components/Analytics.tsx) ho dostanou přes `x-nonce`.
 *
 * `script-src` bez 'unsafe-inline' je zároveň druhá linie obrany proti
 * uloženému XSS přes `dangerouslySetInnerHTML` - injektovaný <script> se
 * bez nonce nespustí, i kdyby sanitizace obsahu měla mezeru.
 */

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

interface CspOptions {
  isDev?: boolean;
  /**
   * Request přišel přes HTTPS. Jen pak se posílá upgrade-insecure-requests -
   * na HTTP serveru (dev, `next start` lokálně, intranet bez TLS) by
   * přepsal i interní navigaci a prefetch na https:// a appka by se
   * rozbila (ERR_SSL_PROTOCOL_ERROR).
   */
  isHttps?: boolean;
  /**
   * Proměnné prostředí (typicky process.env) - čte se jen konfigurace
   * analytiky z Analytics.tsx.
   */
  env?: Record<string, string | undefined>;
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol, origin } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? origin : null;
  } catch {
    return null;
  }
}

// Zapnutá analytika posílá data na vlastní domény - bez nich v connect-src/
// img-src by ji CSP tiše zablokovala. Skripty samotné povoluje nonce
// + 'strict-dynamic' (seznam domén se u script-src pak ignoruje).
function analyticsSources(env: NonNullable<CspOptions["env"]>) {
  const connect: string[] = [];
  const img: string[] = [];

  const umami = env.UMAMI_WEBSITE_ID ? originOf(env.UMAMI_SCRIPT_URL) : null;
  if (umami) connect.push(umami);

  if (env.GOOGLE_ANALYTICS_ID) {
    const google = [
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com",
    ];
    connect.push(...google);
    img.push(...google);
  }

  if (env.CLARITY_PROJECT_ID) {
    const clarity = ["https://*.clarity.ms", "https://c.bing.com"];
    connect.push(...clarity);
    img.push(...clarity);
  }

  return { connect, img };
}

export function buildCsp(
  nonce: string,
  { isDev = false, isHttps = false, env = {} }: CspOptions = {},
): string {
  const analytics = analyticsSources(env);

  return [
    "default-src 'self'",
    // 'unsafe-eval' jen v dev - React ho tam používá pro ladicí výpisy,
    // v produkci ne.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Mantine nastavuje theming přes inline `style` atributy a <style> tagy
    // (CSS proměnné) - bez 'unsafe-inline' by se UI rozbilo. style-src sám
    // JS spustit nemůže.
    "style-src 'self' 'unsafe-inline'",
    // data: - base64 avatary (avatarDataUrl z GET /api/v1/users). Domény
    // odpovídají images.remotePatterns v next.config.ts. `blob:` záměrně
    // ne - vlastní avatar jde přímo z /api/v1/me/avatar (UserAvatar.tsx).
    ["img-src 'self' data: https://oauth.pslib.cz https://*.gravatar.com", ...analytics.img].join(" "),
    "font-src 'self' data:",
    ["connect-src 'self'", ...analytics.connect].join(" "),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
