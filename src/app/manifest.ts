import type { MetadataRoute } from "next";
import { appConfig } from "@/config/app";

// Web App Manifest (/manifest.webmanifest) - díky němu jde appku nainstalovat
// na plochu/do systému. Chrome ani Safari k tomu service worker nepotřebují,
// proto tu žádný není. Next.js odkaz <link rel="manifest"> přidá sám;
// src/proxy.ts ho musí vynechat z jazykového přesměrování.
export default function manifest(): MetadataRoute.Manifest {
  const lang = appConfig.defaultLanguage;

  return {
    id: "/",
    name: appConfig.name[lang],
    short_name: appConfig.pwa.shortName,
    description: appConfig.description[lang],
    lang,
    // "/" přesměruje proxy podle cookie/Accept-Language na /cs nebo /en.
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: appConfig.pwa.themeColor,
    background_color: appConfig.pwa.backgroundColor,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
