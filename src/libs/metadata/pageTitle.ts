import { appConfig, type Language } from "@/config/app";

// Re-export Language type for convenience
export type { Language } from "@/config/app";

/**
 * Utility functions for managing page titles and app metadata strings.
 *
 * These are thin wrappers around `appConfig` that make tests simpler and
 * centralize formatting rules (for example the title separator).
 */

/**
 * Creates a formatted page title following the pattern: "Page Name | App Name".
 */
export function createPageTitle(
  pageTitle: string,
  language: Language,
  appName?: string,
): string {
  const appNameToUse = appName || appConfig.name[language];
  return `${pageTitle}${appConfig.titleSeparator}${appNameToUse}`;
}

/**
 * Gets the app name for the current language.
 */
export function getAppName(language: Language): string {
  return appConfig.name[language];
}

/**
 * Gets the default page title for the current language.
 */
export function getDefaultPageTitle(language: Language): string {
  return appConfig.defaultPageTitle[language];
}

/**
 * Gets the app description for the current language.
 */
export function getAppDescription(language: Language): string {
  return appConfig.description[language];
}
