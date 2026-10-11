import { type Metadata } from "next";
import {
  createPageTitle,
  getAppDescription,
  type Language,
} from "@/libs/metadata/pageTitle";
import { appConfig } from "@/config/app";

/**
 * Extended metadata utility for comprehensive SEO support
 * Supports Open Graph, Twitter Cards, structured data, and more
 */

interface CreateMetadataOptions {
  title: string;
  description?: string;
  language: Language;

  // SEO Basics
  keywords?: string[];
  author?: string;
  canonical?: string;
  noIndex?: boolean;
  noFollow?: boolean;

  // Open Graph
  openGraph?: {
    title?: string;
    description?: string;
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    }>;
    type?: "website" | "article" | "profile";
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    section?: string;
    tags?: string[];
  };

  // Twitter
  twitter?: {
    card?: "summary" | "summary_large_image" | "app" | "player";
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    images?: string[];
  };

  // Additional metadata
  alternates?: {
    canonical?: string;
    languages?: Record<string, string>;
  };

  // For dynamic content
  dynamic?: {
    userInfo?: {
      name?: string;
      role?: string;
    };
    entityInfo?: {
      name?: string;
      type?: string;
      id?: string;
    };
  };
}

/**
 * Creates comprehensive metadata for Next.js pages with SEO optimization
 * @param options - Extended metadata options
 * @returns Next.js Metadata object with full SEO support
 */
export function createMetadata(options: CreateMetadataOptions): Metadata {
  const {
    title,
    description,
    language,
    keywords,
    author,
    canonical,
    noIndex = false,
    noFollow = false,
    openGraph,
    twitter,
    alternates,
    dynamic,
  } = options;

  // Build formatted title with dynamic content
  let formattedTitle = title;
  if (dynamic?.userInfo?.name) {
    formattedTitle = `${title} - ${dynamic.userInfo.name}`;
  } else if (dynamic?.entityInfo?.name) {
    formattedTitle = `${title}: ${dynamic.entityInfo.name}`;
  }

  const finalTitle = createPageTitle(formattedTitle, language);
  const defaultDescription = description || getAppDescription(language);

  // Combine default and custom keywords
  const allKeywords = [
    ...(appConfig.seo.defaultKeywords[language] || []),
    ...(keywords || []),
  ];

  // Build robots directives
  const robotsDirectives = [];
  if (noIndex) robotsDirectives.push("noindex");
  else if (appConfig.seo.robots.index) robotsDirectives.push("index");

  if (noFollow) robotsDirectives.push("nofollow");
  else if (appConfig.seo.robots.follow) robotsDirectives.push("follow");

  // Default images
  const defaultOgImage = `${appConfig.seo.site.url}${appConfig.seo.defaultImages.openGraph}`;
  const defaultTwitterImage = `${appConfig.seo.site.url}${appConfig.seo.defaultImages.twitter}`;

  return {
    title: finalTitle,
    description: defaultDescription,
    keywords: allKeywords.join(", "),
    authors: [
      {
        name: author || appConfig.seo.site.author.name,
        url: appConfig.seo.site.author.url,
      },
    ],
    creator: author || appConfig.seo.site.author.name,
    publisher: appConfig.seo.site.name[language],

    // Robots
    robots: {
      index: !noIndex && appConfig.seo.robots.index,
      follow: !noFollow && appConfig.seo.robots.follow,
      googleBot: appConfig.seo.robots.googleBot,
    },

    // Open Graph
    openGraph: {
      title: openGraph?.title || finalTitle,
      description: openGraph?.description || defaultDescription,
      url: canonical || appConfig.seo.site.url,
      siteName: appConfig.seo.site.name[language],
      locale: language === "cs" ? "cs_CZ" : "en_US",
      type: openGraph?.type || "website",
      publishedTime: openGraph?.publishedTime,
      modifiedTime: openGraph?.modifiedTime,
      authors: openGraph?.authors,
      section: openGraph?.section,
      tags: openGraph?.tags,
      images: openGraph?.images?.map((img) => ({
        url: img.url.startsWith("http")
          ? img.url
          : `${appConfig.seo.site.url}${img.url}`,
        width: img.width,
        height: img.height,
        alt: img.alt || finalTitle,
      })) || [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: finalTitle,
        },
      ],
    },

    // Twitter
    twitter: {
      card: twitter?.card || "summary_large_image",
      site: twitter?.site,
      creator: twitter?.creator,
      title: twitter?.title || finalTitle,
      description: twitter?.description || defaultDescription,
      images: twitter?.images || [defaultTwitterImage],
    },

    // Alternates
    alternates: {
      canonical: canonical || alternates?.canonical,
      languages: alternates?.languages || {
        cs: `${appConfig.seo.site.url}/cs`,
        en: `${appConfig.seo.site.url}/en`,
      },
    },

    // Additional metadata
    category: dynamic?.entityInfo?.type,
    other: {
      "application-name": appConfig.name[language],
    },
  };
}

/**
 * Type for metadata generation parameters
 */
export type MetadataParams = {
  params: Promise<{
    lang?: string;
    [key: string]: string | string[] | undefined;
  }>;
};

/**
 * Helper to extract language from Next.js params
 */
export async function getLanguageFromParams(
  params: Promise<{ lang?: string }>,
): Promise<Language> {
  const resolvedParams = await params;
  return (resolvedParams?.lang as Language) || "cs";
}

/**
 * Creates metadata for user-related pages (profile, edit user, etc.)
 */
export function createUserMetadata(options: {
  baseTitle: string;
  userName: string;
  userRole?: string;
  language: Language;
  description?: string;
  canonical?: string;
}): Metadata {
  return createMetadata({
    title: options.baseTitle,
    description: options.description,
    language: options.language,
    canonical: options.canonical,
    dynamic: {
      userInfo: {
        name: options.userName,
        role: options.userRole,
      },
    },
    openGraph: {
      type: "profile",
    },
  });
}

/**
 * Creates metadata for listing pages (users list, products list, etc.)
 */
export function createListingMetadata(options: {
  baseTitle: string;
  itemCount?: number;
  language: Language;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
}): Metadata {
  let title = options.baseTitle;
  if (options.itemCount !== undefined) {
    title = `${options.baseTitle} (${options.itemCount})`;
  }

  return createMetadata({
    title,
    description: options.description,
    language: options.language,
    canonical: options.canonical,
    noIndex: options.noIndex,
    openGraph: {
      type: "website",
    },
  });
}
