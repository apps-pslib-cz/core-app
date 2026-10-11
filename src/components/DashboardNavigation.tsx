"use client";

import { NavLink, Divider, Text } from "@mantine/core";
import { FC } from "react";
import { IconHome, IconUsers, IconFileAnalytics } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./DashboardNavigation.module.css";
import { useSession } from "next-auth/react";
import { useDictionary } from "@/hooks/useDictionary";
import { normalizeMenuStructure, type MenuStructure, type MenuItem } from "@/types/ui";
import { RoleChecker } from "@/types/roles";

// Výchozí dashboard menu - appka postavená na téhle šabloně si ho doplní o
// vlastní položky (zkopírujte vzor items/group níž, `requiredRole` je
// nepovinné - bez něj je položka vidět každému, kdo se do /dashboard dostane).
export const dashboardMenuStructure: MenuStructure = [
  {
    id: "home",
    items: [
      {
        id: "home",
        textKey: "dashboard.menu.home",
        icon: <IconHome size={16} />,
        href: "/",
      },
    ],
    divider: true,
  },
  {
    id: "main",
    items: [
      {
        id: "users",
        textKey: "dashboard.menu.users",
        icon: <IconUsers size={16} />,
        href: "/dashboard/users",
      },
    ],
    divider: true,
  },
  {
    id: "external",
    items: [
      {
        id: "logs",
        textKey: "dashboard.menu.logs",
        icon: <IconFileAnalytics size={16} />,
        href: "/dashboard/logs",
        requiredRole: "admin",
      },
    ],
  },
];

interface DashboardNavigationProps {
  onNavigate?: () => void; // Pro zavření mobile drawer
}

export const DashboardNavigation: FC<DashboardNavigationProps> = ({
  onNavigate,
}) => {
  const pathname = usePathname();
  const { dictionary, loading } = useDictionary();
  const { data: session } = useSession();
  const userRoles = session?.user?.roles ?? [];

  // Helper funkce pro získání textu z lokalizačního klíče
  const getLocalizedText = (textKey: string): string => {
    if (loading || !dictionary) return textKey;

    // Navigujeme objektem podle tečkové notace (např. "dashboard.menu.home")
    const keys = textKey.split(".");
    let result: unknown = dictionary;

    for (const key of keys) {
      result = (result as Record<string, unknown>)?.[key];
      if (result === undefined) return textKey; // Fallback na klíč
    }

    return typeof result === "string" ? result : textKey;
  };

  // Renderování jednotlivé menu položky (plain funkce, ne komponenta — nesmí se
  // volat jako JSX tag, jinak by React strom při každém renderu remountoval)
  const renderMenuItem = (item: MenuItem) => {
    const isActive = pathname === item.href;
    const isExternal = item.target === "_blank";

    const handleClick = () => {
      if (onNavigate) onNavigate();
      if (item.action) item.action();
    };

    // Pro externí odkazy
    if (item.href && isExternal) {
      return (
        <NavLink
          key={item.id}
          href={item.href}
          label={getLocalizedText(item.textKey)}
          leftSection={item.icon}
          rightSection="↗"
          active={isActive}
          onClick={handleClick}
          target={item.target}
          rel="noopener noreferrer"
          component="a"
        />
      );
    }

    // Pro interní odkazy
    if (item.href) {
      return (
        <NavLink
          key={item.id}
          href={item.href}
          label={getLocalizedText(item.textKey)}
          leftSection={item.icon}
          active={isActive}
          onClick={handleClick}
          component={Link}
        />
      );
    }

    // Pro akce bez href
    return (
      <NavLink
        key={item.id}
        label={getLocalizedText(item.textKey)}
        leftSection={item.icon}
        active={isActive}
        onClick={handleClick}
      />
    );
  };

  // Renderování menu (plain funkce, ne komponenta — viz renderMenuItem)
  const renderMenu = (structure: MenuStructure) => {
    const groups = normalizeMenuStructure(structure);

    return (
      <nav className={styles.nav}>
        {groups.map((group, groupIndex) => (
          <div key={group.id}>
            {group.titleKey && (
              <Text
                size="xs"
                fw={600}
                c="dimmed"
                tt="uppercase"
                mb="xs"
                px="sm"
              >
                {getLocalizedText(group.titleKey)}
              </Text>
            )}

            <div>
              {group.items.map((item) => {
                if (
                  item.requiredRole &&
                  !RoleChecker.hasRoleOrHigher({ roles: userRoles }, item.requiredRole)
                ) {
                  return null;
                }
                return renderMenuItem(item);
              })}
            </div>

            {group.divider && groupIndex < groups.length - 1 && (
              <Divider my="md" />
            )}
          </div>
        ))}
      </nav>
    );
  };

  return (
    <div className={styles.container}>
      {renderMenu(dashboardMenuStructure)}
    </div>
  );
};

export default DashboardNavigation;
