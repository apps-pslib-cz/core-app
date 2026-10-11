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

// Helper typy pro různé varianty menu
export type FlatMenuItem = Omit<MenuItem, "children">; // Bez hierarchie
export type NavigationMenuItem = Required<
  Pick<MenuItem, "id" | "textKey" | "href">
> &
  Partial<MenuItem>; // Musí mít href pro navigaci
