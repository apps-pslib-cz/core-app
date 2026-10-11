/**
 * Central application configuration
 * Contains app-wide settings like app name, default language, etc.
 */

export const appConfig = {
  // App name used in page titles
  name: {
    cs: "core-app", // Změňte podle konkrétní aplikace
    en: "core-app", // Změňte podle konkrétní aplikace
  },

  // Default settings
  defaultLanguage: "cs" as const,
  supportedLanguages: ["cs", "en"] as const,

  // Page title separator
  titleSeparator: " | ",

  // Default title for pages without specific title
  defaultPageTitle: {
    cs: "Úvodní stránka",
    en: "Home",
  },

  // App description for metadata
  description: {
    cs: "Šablonová appka s přihlašováním přes školní OAuth server",
    en: "Template app with school OAuth login",
  },

  // SEO Configuration
  seo: {
    // Default keywords for all pages
    defaultKeywords: {
      cs: ["next.js", "aplikace", "přihlašování", "uživatelé", "pslib"],
      en: ["next.js", "application", "authentication", "users", "pslib"],
    },

    // Site information
    site: {
      url: process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:3000",
      name: {
        cs: "PSLIB Aplikace",
        en: "PSLIB Applications",
      },
      author: {
        name: "PSLIB",
        url: "https://www.pslib.cz",
      },
    },

    // Default Open Graph images
    defaultImages: {
      openGraph: "/images/og-default.jpg",
      twitter: "/images/twitter-default.jpg",
      favicon: "/favicon.ico",
    },

    // Robots configuration
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  },
} as const;

export type Language = (typeof appConfig.supportedLanguages)[number];
export type AppConfig = typeof appConfig;
