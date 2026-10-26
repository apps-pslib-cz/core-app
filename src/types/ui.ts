import { ReactNode } from "react";
import type { UserRole } from "@/types/roles";

// Základní typ pro menu položku
export type MenuItem = {
  id: string; // Jedinečný identifikátor
  textKey: string; // Klíč pro lokalizaci (např. "navigation.home")
  icon?: ReactNode;
  href?: string; // Pro navigační odkazy
  requiredRole?: UserRole; // Zobrazit jen uživatelům s touto rolí (nebo vyšší v hierarchii)
  action?: () => void; // Pro akce (např. logout)
  condition?: () => boolean; // Podmínka pro zobrazení
  target?: "_blank" | "_self"; // Pro externí odkazy
  badge?: {
    textKey?: string; // Lokalizovaný text badge
    color?: string;
    variant?: "filled" | "outline" | "light";
  };
  children?: MenuItem[]; // Pro hierarchické menu
};

// Typ pro skupinu menu položek
export type MenuGroup = {
  id: string;
  titleKey?: string; // Klíč pro lokalizaci názvu skupiny (volitelný)
  items: MenuItem[];
  condition?: () => boolean; // Podmínka pro zobrazení celé skupiny
  divider?: boolean; // Zobrazit oddělovač pod skupinou
};

// Kompletní struktura menu - flexibilní definice
export type MenuStructure =
  | MenuGroup[] // Pole skupin (nejkomplexnější)
  | MenuGroup // Jedna skupina
  | MenuItem[]; // Jednoduché pole položek (bez skupin)

// Helper funkce pro normalizaci menu struktury
export function normalizeMenuStructure(structure: MenuStructure): MenuGroup[] {
  // Pokud je to už pole skupin, vrátíme jak je
  if (
    Array.isArray(structure) &&
    structure.length > 0 &&
    "items" in structure[0]
  ) {
    return structure as MenuGroup[];
  }

  // Pokud je to jedna skupina
  if (!Array.isArray(structure) && "items" in structure) {
    return [structure as MenuGroup];
  }

  // Pokud je to pole MenuItem, zabalíme do defaultní skupiny
  if (Array.isArray(structure)) {
    return [
      {
        id: "default",
        items: structure as MenuItem[],
      },
    ];
  }

  return [];
}

// usePathname() vrací cestu i s jazykovým prefixem (/cs/dashboard/users),
// href položek menu ho nemají - bez odříznutí by se aktivní položka nikdy
// nezvýraznila. Jazyky odpovídají `locales` v src/proxy.ts.
export function withoutLocale(pathname: string): string {
  return pathname.replace(/^\/(cs|en)(?=\/|$)/, "") || "/";
}

// Odkazy v menu jsou bez jazyka ("/dashboard/users"). Bez prefixu by je
// proxy přesměrovala podle cookie/Accept-Language - anglicky prohlížející
// uživatel by po kliknutí skončil v češtině. Externí a relativní odkazy
// nechává beze změny.
export function localizedHref(href: string, lang: string | undefined): string {
  if (!lang || !href.startsWith("/") || href.startsWith("//")) return href;
  return href === "/" ? `/${lang}` : `/${lang}${href}`;
}

// Aktivní je nejkonkrétnější položka, jejíž href odpovídá cestě nebo je
// jejím prefixem (/dashboard/users/abc → "Uživatelé"). "/" se jako prefix
// nepočítá, jinak by domovská položka svítila všude.
export function findActiveHref(
  structure: MenuStructure,
  pathname: string,
): string | undefined {
  const path = withoutLocale(pathname);
  const matches = (href?: string): href is string =>
    !!href && (href === path || (href !== "/" && path.startsWith(`${href}/`)));
  return normalizeMenuStructure(structure)
    .flatMap((group) => group.items.map((item) => item.href))
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];
}

// Helper typy pro různé varianty menu
export type FlatMenuItem = Omit<MenuItem, "children">; // Bez hierarchie
export type NavigationMenuItem = Required<
  Pick<MenuItem, "id" | "textKey" | "href">
> &
  Partial<MenuItem>; // Musí mít href pro navigaci
