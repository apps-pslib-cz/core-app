"use client";

import { usePathname } from "next/navigation";
import { useSettings } from "@/providers/SettingsProvider";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Language } from "@/providers/SettingsProvider";

// Pre-load dictionaries synchronously at module level
import csDict from "@/assets/dictionaries/cs.json";
import enDict from "@/assets/dictionaries/en.json";

const dictionaryCache: Record<string, Dictionary> = {
  cs: csDict as Dictionary,
  en: enDict as Dictionary,
};

function localeFromPathname(pathname: string | null): Language | null {
  const segment = pathname?.split("/")[1];
  return segment === "cs" || segment === "en" ? segment : null;
}

/**
 * The URL's [lang] segment is the actual source of truth for what a page
 * renders (src/proxy.ts resolves it, and the language switcher navigates to
 * it) - `settings.language` only matters as a remembered preference for
 * *future* visits to an unprefixed URL, never for the current page. Reading
 * it here instead of the path was the bug: a fresh browser opening a shared
 * /en/... link would still render Czech, since a new profile's localStorage
 * defaults to "cs" regardless of the URL.
 */
export function useDictionary() {
  const pathname = usePathname();
  const { settings } = useSettings();

  const locale = localeFromPathname(pathname) ?? settings.language;
  const dictionary = dictionaryCache[locale] || csDict;

  return { dictionary, loading: false };
}
