"use client";

import { AppShell, Burger, Drawer } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { AppHeader } from "./AppHeader";
import { ResponsiveUserSection } from "./UserSection";
import AppLogo from "./AppLogo";
import AppFooter from "./AppFooter";
import { FC, PropsWithChildren, ReactNode } from "react";
import styles from "./BaseLayout.module.css";

export type NavigationType = "horizontal" | "sidebar" | "none";

interface BaseLayoutProps extends PropsWithChildren {
  navigationType?: NavigationType;
  navigationContent?: ReactNode;
  mobileNavigationContent?:
    | ReactNode
    | ((closeMobileNav: () => void) => ReactNode);
  sidebarWidth?: number;
  headerHeight?: number;
  headerStyle?: React.CSSProperties;
  drawerTitle?: string;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  showFooter?: boolean;
  footerContent?: ReactNode;
}

export const BaseLayout: FC<BaseLayoutProps> = ({
  children,
  navigationType = "none",
  navigationContent,
  mobileNavigationContent,
  sidebarWidth = 250,
  headerHeight = 60,
  headerStyle,
  drawerTitle = "Menu",
  leftSection,
  rightSection,
  showFooter = true,
  footerContent,
}) => {
  const [mobileNavOpened, { toggle: toggleMobileNav, close: closeMobileNav }] =
    useDisclosure();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const defaultLeftSection = leftSection || <AppLogo height={32} width={150} />;
  const defaultRightSection = rightSection || <ResponsiveUserSection />;

  const hasSidebar = navigationType === "sidebar" && !isMobile;
  const hasNavigation = navigationType !== "none";
  const headerNavigation =
    navigationType === "horizontal" && !isMobile
      ? navigationContent
      : undefined;

  const headerRightSection =
    hasNavigation && isMobile ? (
      <div className={styles.headerRight}>
        {defaultRightSection}
        <Burger opened={mobileNavOpened} onClick={toggleMobileNav} size="sm" />
      </div>
    ) : (
      defaultRightSection
    );

  return (
    <AppShell
      header={{ height: headerHeight, offset: true }}
      navbar={
        hasSidebar
          ? {
              width: sidebarWidth,
              breakpoint: "md",
              collapsed: { mobile: true },
            }
          : undefined
      }
      footer={showFooter ? { height: isMobile ? 88 : 48 } : undefined}
      padding="md"
    >
      <AppHeader
        height={headerHeight}
        leftSection={defaultLeftSection}
        navigationItems={headerNavigation}
        rightSection={headerRightSection}
        style={headerStyle}
      />

      {hasSidebar && (
        // Mantine Navbar má výšku omezenou na 100dvh - header - footer
        // (AppShell.css), ale sama o sobě neoříznuté/nescrollované - delší
        // menu než zbyde místa přeteče přes okraj a zápatí ho vizuálně
        // překryje. overflowY: auto drží menu uvnitř vlastního boxu.
        <AppShell.Navbar p={0} style={{ overflowY: "auto" }}>
          {navigationContent}
        </AppShell.Navbar>
      )}

      {hasNavigation && isMobile && (
        <Drawer
          opened={mobileNavOpened}
          onClose={closeMobileNav}
          position="left"
          size="xs"
          title={drawerTitle}
          overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        >
          {typeof mobileNavigationContent === "function"
            ? mobileNavigationContent(closeMobileNav)
            : mobileNavigationContent || navigationContent}
        </Drawer>
      )}

      <AppShell.Main>{children}</AppShell.Main>

      {showFooter && (
        <AppShell.Footer>{footerContent || <AppFooter />}</AppShell.Footer>
      )}
    </AppShell>
  );
};

export default BaseLayout;
