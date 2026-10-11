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
