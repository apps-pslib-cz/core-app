"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Group, NavLink, Stack } from "@mantine/core";
import { useDictionary } from "@/hooks/useDictionary";
import { RoleChecker, type UserRole } from "@/types/roles";
import { localizedHref, withoutLocale } from "@/types/ui";

interface MainNavItem {
  /** Klíč popisku v sekci `nav` slovníku. */
  key: string;
  fallback: string;
  href: string;
  /** Cesty (bez jazyka), na kterých je položka aktivní. */
  match: (path: string) => boolean;
  /** Bez role = všichni včetně nepřihlášených; "signedIn" = kdokoli přihlášený. */
  role?: UserRole | "signedIn";
}

const under = (prefix: string) => (path: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

// Hlavní menu appky - appka postavená na šabloně sem doplní své sekce
// (popisek do `nav` ve slovnících). "Administrace" odpovídá kontrole
// v src/app/[lang]/dashboard/layout.tsx (role member a výš).
const ITEMS: MainNavItem[] = [
  { key: "home", fallback: "Domů", href: "/", match: (p) => p === "/" },
  {
    key: "administration",
    fallback: "Administrace",
    href: "/dashboard",
    match: under("/dashboard"),
    role: "member",
  },
];

/**
 * Hlavní menu: vodorovně v hlavičce, svisle v šuplíku (mobil, úzké okno).
 * Aktivní položka se pozná podle cesty bez jazyka, i na podstránkách.
 */
export function MainNavigation({
  variant,
  onNavigate,
}: {
  variant: "horizontal" | "vertical";
  onNavigate?: () => void;
}) {
  const pathname = withoutLocale(usePathname() ?? "/");
  const lang = useParams()?.lang as string | undefined;
  const { data: session } = useSession();
  const { dictionary } = useDictionary();
  const roles = session?.user?.roles ?? [];

  const visible = ITEMS.filter((item) => {
    if (!item.role) return true;
    if (!session?.user) return false;
    return item.role === "signedIn" || RoleChecker.hasRoleOrHigher({ roles }, item.role);
  });
  const label = (item: MainNavItem) =>
    (dictionary?.nav as Record<string, string> | undefined)?.[item.key] || item.fallback;
  const ariaLabel = dictionary?.nav?.main || "Hlavní menu";

  if (variant === "vertical") {
    return (
      <Stack gap={4} component="nav" aria-label={ariaLabel}>
        {visible.map((item) => (
          <NavLink
            key={item.key}
            component={Link}
            href={localizedHref(item.href, lang)}
            label={label(item)}
            active={item.match(pathname)}
            onClick={onNavigate}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Group gap="xs" component="nav" aria-label={ariaLabel} wrap="nowrap">
      {visible.map((item) => {
        const active = item.match(pathname);
        return (
          <Button
            key={item.key}
            component={Link}
            href={localizedHref(item.href, lang)}
            size="sm"
            variant={active ? "light" : "subtle"}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            {label(item)}
          </Button>
        );
      })}
    </Group>
  );
}

export default MainNavigation;
