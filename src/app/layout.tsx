import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import type { Metadata, Viewport } from "next";
import { SessionProvider } from "@/providers/SessionProvider";
import { SettingsProvider } from "@/providers/SettingsProvider";
import { SettingsDrawerProvider } from "@/components/SettingsDrawer";
import { QueryProvider } from "@/providers/QueryProvider";
import { Analytics } from "@/components/Analytics";
import { auth } from "@/libs/auth";
import { Notifications } from "@mantine/notifications";
import { appConfig } from "@/config/app";
import { cookies, headers } from "next/headers";

function parseClientHintColorScheme(
  value: string | null,
): "dark" | "light" | null {
  if (!value) {
    return null;
  }

  const normalized = value.replaceAll('"', "").trim().toLowerCase();
  if (normalized === "dark" || normalized === "light") {
    return normalized;
  }

  return null;
}

async function getRequestLocale(): Promise<"cs" | "en"> {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-locale");
  return locale === "en" ? "en" : "cs";
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();

  return {
    title: {
      template: `%s${appConfig.titleSeparator}${appConfig.name[locale]}`,
      default: appConfig.name[locale],
    },
    description: appConfig.description[locale],
    icons: {
      icon: [
        { url: "/icons/favicon.svg", type: "image/svg+xml" },
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    // Safari na iOS nečte z manifestu všechno - název a režim "na plochu"
    // potřebuje i jako meta tagy.
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: appConfig.pwa.shortName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const locale = await getRequestLocale();
  const cookieColorScheme = cookieStore.get("mantine-color-scheme-value")?.value;
  const headerColorScheme = parseClientHintColorScheme(
    requestHeaders.get("sec-ch-prefers-color-scheme"),
  );
  const initialColorScheme =
    cookieColorScheme === "dark" || cookieColorScheme === "light"
      ? cookieColorScheme
      : headerColorScheme || "light";
  // Nonce z proxy.ts (Content-Security-Policy) - bez něj CSP zablokuje
  // vlastní <Script> tagy analytiky.
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-mantine-color-scheme={initialColorScheme}
    >
      <head />
      <body>
        <Analytics nonce={nonce} />
        <QueryProvider>
          <SessionProvider session={session}>
            <SettingsProvider>
              <SettingsDrawerProvider>
                <Notifications position="top-center" zIndex={1000} />
                {children}
              </SettingsDrawerProvider>
            </SettingsProvider>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
