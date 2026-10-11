import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { appConfig, type Language } from "@/config/app";

// Parse Accept-Language header and return array of lang tags ordered by q
function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [range, q] = part.trim().split(";q=");
      return { range: range.toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .filter((r) => !!r.range)
    .sort((a, b) => b.q - a.q)
    .map((r) => r.range);
}

// Picks best supported language from Accept-Language; falls back to default
function pickLanguageFromHeader(header: string | null | undefined): Language {
  const supported = appConfig.supportedLanguages as readonly string[];
  const prefs = parseAcceptLanguage(header);
  for (const p of prefs) {
    // match exact or prefix (e.g. 'cs' matches 'cs-CZ')
    const found = supported.find((s) => p === s || p.startsWith(s + "-"));
    if (found) return found as Language;
  }
  return appConfig.defaultLanguage;
}

export default async function Forbidden() {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  const lang = pickLanguageFromHeader(acceptLanguage);
  return redirect(`/${lang}/forbidden`);
}
