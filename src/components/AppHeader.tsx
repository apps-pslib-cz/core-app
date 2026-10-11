"use client";

import { AppShell, Group } from "@mantine/core";
import { ReactNode, CSSProperties } from "react";

interface AppHeaderProps {
  height?: number;
  leftSection?: ReactNode;
  navigationItems?: ReactNode;
  rightSection?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function AppHeader({
  height = 60,
  leftSection,
  navigationItems,
  rightSection,
  style,
  className,
}: AppHeaderProps) {
  return (
    <AppShell.Header h={height} style={style} className={className}>
      <Group justify="space-between" h="100%" px="md">
        {leftSection && <Group>{leftSection}</Group>}
        {navigationItems && (
          <Group gap="sm" style={{ flex: 1, justifyContent: "center" }}>
            {navigationItems}
          </Group>
        )}
        {rightSection && <Group gap="sm">{rightSection}</Group>}
      </Group>
    </AppShell.Header>
  );
}

export default AppHeader;
