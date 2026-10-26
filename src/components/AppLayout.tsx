"use client";

import { FC, PropsWithChildren, ReactNode } from "react";
import { Container, Divider } from "@mantine/core";
import { BaseLayout } from "./BaseLayout";
import { MainNavigation } from "./MainNavigation";
import { useDictionary } from "@/hooks/useDictionary";

/**
 * Layout appky pro veřejnou část i administraci: hlavní menu vodorovně
 * v hlavičce, na mobilu (nebo když se do hlavičky nevejde) v šuplíku.
 * Sekce s vlastními podstránkami (Administrace) předá `sidebar` - na
 * desktopu je vlevo, jinak v šuplíku pod hlavním menu. Obsah je ve
 * vymezeném `Container`, ať se na širokém displeji nerozlévá;
 * `contained={false}` pro sekce, kde si šířku řídí stránky samy (tabulky).
 */
export const AppLayout: FC<
  PropsWithChildren<{
    sidebar?: (onNavigate?: () => void) => ReactNode;
    contained?: boolean;
  }>
> = ({ children, sidebar, contained = true }) => {
  const { dictionary } = useDictionary();
  return (
    <BaseLayout
      navigationType={sidebar ? "sidebar" : "horizontal"}
      headerNavigationContent={<MainNavigation variant="horizontal" />}
      navigationContent={sidebar ? sidebar() : undefined}
      mobileNavigationContent={(close, { sidebarVisible }) => (
        <>
          <MainNavigation variant="vertical" onNavigate={close} />
          {/* Podsekce jen když postranní menu vedle obsahu není. */}
          {sidebar && !sidebarVisible && (
            <>
              <Divider my="sm" />
              {sidebar(close)}
            </>
          )}
        </>
      )}
      sidebarWidth={250}
      drawerTitle={dictionary?.nav?.drawerTitle || "Menu"}
    >
      {contained ? (
        <Container size="xl" px={0}>
          {children}
        </Container>
      ) : (
        children
      )}
    </BaseLayout>
  );
};

export default AppLayout;
