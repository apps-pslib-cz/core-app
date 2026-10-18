import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { buildCsp, generateNonce } from "@/libs/csp";

// i18n konfigurace
const locales = ["cs", "en"] as const;
export type Locale = (typeof locales)[number];
const defaultLocale = "cs" as const;

// Jméno cookie, do které SettingsProvider ukládá explicitní volbu jazyka
// (stejný vzor jako "mantine-color-scheme-value" pro barevné schéma) - middleware
// ji respektuje přednostně před Accept-Language, aby se návštěvníkovi, který si
// jazyk už jednou vybral v appce, znovu nepřepisoval podle hlavičky prohlížeče.
const LOCALE_COOKIE = "preferred-locale";

function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

function applyClientHintHeaders(response: NextResponse): NextResponse {
  response.headers.set("Accept-CH", "Sec-CH-Prefers-Color-Scheme");
  response.headers.append("Vary", "Sec-CH-Prefers-Color-Scheme");

  return response;
}

function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function getLocale(request: NextRequest): string {
  // Explicitní volba uložená z appky má přednost před hádáním z hlaviček.
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  // Pro českou aplikaci - preferuj češtinu pokud není specificky požadována angličtina
  const acceptLanguageHeader = request.headers.get("accept-language") || "";

  // Pokud není Accept-Language header, použij český default
  if (!acceptLanguageHeader) {
    return defaultLocale;
  }

  const acceptedLanguages = new Negotiator({
    headers: { "accept-language": acceptLanguageHeader },
  }).languages();

  // Kontrola, zda uživatel explicitně preferuje českou variantu
  const hasExplicitCzech = acceptedLanguages.some(
    (lang) =>
      lang.toLowerCase().startsWith("cs") ||
      lang.toLowerCase().startsWith("cz"),
  );

  if (hasExplicitCzech) {
    return "cs";
  }

  // Pokud není explicitní čeština a je to jen en-US bez dalších preferencí,
  // použij český default pro českou aplikaci
  if (
    acceptedLanguages.length === 1 &&
    acceptedLanguages[0].toLowerCase().startsWith("en")
  ) {
    return defaultLocale;
  }

  // Jinak použij standardní matching
  try {
    const selectedLocale = matchLocale(
      acceptedLanguages,
      locales,
      defaultLocale,
    );
    return selectedLocale;
  } catch {
    return defaultLocale;
  }
}

export default function proxy(request: NextRequest) {
  const startTime = Date.now();

  const pathname = request.nextUrl.pathname;
  const nonce = generateNonce();
  const csp = buildCsp(nonce, {
    isDev: process.env.NODE_ENV === "development",
    // Za reverse proxy (IIS) vidí Node jen HTTP, skutečný protokol nese
    // x-forwarded-proto.
    isHttps:
      (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol)
        .split(",")[0]
        .trim()
        .replace(/:$/, "") === "https",
    env: process.env,
  });

  // Přesměrování root cesty na výchozí lokale
  if (pathname === "/") {
    const locale = getLocale(request);
    const response = applySecurityHeaders(
      applyClientHintHeaders(
        NextResponse.redirect(new URL(`/${locale}`, request.url)),
      ),
      csp,
    );

    // Log redirect
    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[MIDDLEWARE] ${request.method} ${pathname} -> /${locale} (${duration}ms)`,
      );
    }

    return response;
  }

  // Kontrola, zda URL už obsahuje podporované locale
  const matchedLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  // Pokud URL nemá locale, přidejte ho
  if (!matchedLocale) {
    const locale = getLocale(request);

    const newUrl = new URL(`/${locale}${pathname}`, request.url);
    newUrl.search = request.nextUrl.search;

    const response = applySecurityHeaders(
      applyClientHintHeaders(NextResponse.redirect(newUrl)),
      csp,
    );

    // Log redirect
    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[MIDDLEWARE] ${request.method} ${pathname} -> /${locale}${pathname} (${duration}ms)`,
      );
    }

    return response;
  }

  // Log normal request pass-through
  const duration = Date.now() - startTime;
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[MIDDLEWARE] ${request.method} ${pathname} passed through (${duration}ms)`,
    );
  }

  // Forward the resolved locale as a request header so server components
  // above the [lang] segment (the root layout, which can't read route
  // params) can still set <html lang> correctly instead of hardcoding it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", matchedLocale);
  // CSP i v request hlavičce - Next.js z ní při renderu vytáhne nonce a dá
  // ho na své skripty; `x-nonce` čte root layout pro vlastní <Script> tagy.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  return applySecurityHeaders(
    applyClientHintHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
    ),
    csp,
  );
}

export const config = {
  matcher: [
    // Match all paths except API routes, static files, images, Next.js
    // internals and .well-known - security.txt musí být dostupný přesně na
    // /.well-known/security.txt (RFC 9116), přesměrování na
    // /cs/.well-known/... by skončilo 404.
    "/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|images|icons|\\.well-known).*)",
  ],
};
