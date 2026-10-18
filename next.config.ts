import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { join } from "path";

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // Bez "X-Powered-By: Next.js" - hlavička prozrazuje použitou technologii
  // (pentest pslib 2026-09, nález 6.4.3).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Pentest nálezy 6.4.4/6.4.5/6.5.3. Content-Security-Policy
          // (6.3.3) nastavuje src/proxy.ts, protože potřebuje nonce
          // vygenerovaný pro každý request.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=(), clipboard-read=(), clipboard-write=(), gamepad=(), speaker-selection=()",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oauth.pslib.cz",
        port: "",
        pathname: "/api/users/**",
      },
      // Přidejte další domény podle potřeby
      {
        protocol: "https",
        hostname: "*.gravatar.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Disabled to prevent double-rendering flicker in dev mode
  // (Production is unaffected - this only changes dev behavior)
  reactStrictMode: false,
};

export default nextConfig;
