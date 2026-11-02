"use client";

import { AppShell, Group } from "@mantine/core";
import { ReactNode, CSSProperties, Ref } from "react";

interface AppHeaderProps {
  height?: number;
  leftSection?: ReactNode;
  navigationItems?: ReactNode;
  rightSection?: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** Řádek hlavičky - BaseLayout z něj měří dostupnou šířku (headerFit). */
  rowRef?: Ref<HTMLDivElement>;
}

export function AppHeader({
  height = 60,
  leftSection,
  navigationItems,
  rightSection,
  style,
  className,
  rowRef,
}: AppHeaderProps) {
  return (
    <AppShell.Header h={height} style={style} className={className}>
      {/* Větší okraj než obsah - logo dál od hrany. */}
      <Group ref={rowRef} justify="space-between" h="100%" px={{ base: "md", sm: "xl" }} wrap="nowrap">
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
