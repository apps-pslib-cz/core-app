"use client";

import { AppShell, Burger, Drawer } from "@mantine/core";
import { useDisclosure, useElementSize, useMediaQuery, useResizeObserver } from "@mantine/hooks";
import { pickHeaderLevel, type HeaderLevel } from "@/libs/headerFit";
import { AppHeader } from "./AppHeader";
import { ResponsiveUserSection } from "./UserSection";
import AppLogo from "./AppLogo";
import AppFooter from "./AppFooter";
import { FC, PropsWithChildren, ReactNode } from "react";
import styles from "./BaseLayout.module.css";

export type NavigationType = "horizontal" | "sidebar" | "none";

interface BaseLayoutProps extends PropsWithChildren {
  navigationType?: NavigationType;
  /**
   * Hlavní menu v hlavičce na desktopu - nezávisle na `navigationType`,
   * takže sekce s postranním menu (Administrace) má obojí. Na mobilu
   * ho volající předá v `mobileNavigationContent`.
   */
  headerNavigationContent?: ReactNode;
  navigationContent?: ReactNode;
  /**
   * Obsah šuplíku. Funkce dostane i `sidebarVisible` - podsekce (postranní
   * menu) do šuplíku patří jen tehdy, když postranní menu vedle obsahu není.
   */
  mobileNavigationContent?:
    | ReactNode
    | ((closeMobileNav: () => void, state: { sidebarVisible: boolean }) => ReactNode);
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
  headerNavigationContent,
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
  // Stejná hranice jako Mantine `sm` (48em) - pod ní mobil: patička, a dokud
  // není změřeno, i hlavička. Postranní menu se ukazuje od stejné hranice
  // (navbar breakpoint "sm"), jinak by mezi 768 a 992 px nebylo dostupné
  // vůbec (Mantine ho pod "md" schoval, šuplík ještě nebyl).
  const isMobile = useMediaQuery("(max-width: 47.99em)");

  const defaultLeftSection = leftSection || <AppLogo height={32} width={150} />;

  const hasSidebar = navigationType === "sidebar" && !isMobile;
  const hasNavigation = navigationType !== "none" || !!headerNavigationContent;
  const navigationForHeader =
    headerNavigationContent ?? (navigationType === "horizontal" ? navigationContent : undefined);

  // Zhuštění hlavičky podle skutečné šířky obsahu, ne pevného breakpointu
  // (DECISIONS D-8): neviditelný měřicí řádek níž změří přirozenou
  // šířku loga, menu a obou variant uživatelské sekce.
  // Řádek má padding - useElementSize měří border box, potřebujeme obsah
  // (contentRect: right - left).
  const [rowRef, { left: rowLeft, right: rowRight }] = useResizeObserver();
  const available = Math.max(0, rowRight - rowLeft);
  const { ref: leftRef, width: leftWidth } = useElementSize();
  const { ref: navRef, width: navWidth } = useElementSize();
  const { ref: rightFullRef, width: rightFullWidth } = useElementSize();
  const { ref: rightCompactRef, width: rightCompactWidth } = useElementSize();
  const measured = available > 0 && leftWidth > 0 && rightCompactWidth > 0;
  const level: HeaderLevel = !measured
    ? isMobile
      ? "drawer"
      : "full"
    : pickHeaderLevel({
        available,
        left: leftWidth,
        nav: navigationForHeader ? navWidth : 0,
        rightFull: rightSection ? rightCompactWidth : rightFullWidth,
        rightCompact: rightCompactWidth,
        gap: 16, // Group gap "md" v AppHeader
      });
  // Šuplík i tehdy, když se menu nevejde vedle loga (dlouhé menu, úzké okno).
  // A vždy, když sekce má podsekce, ale postranní menu není vidět (mobil) -
  // jinak by s krátkým hlavním menu, které se do hlavičky vejde, nebyly
  // podsekce dostupné nikde.
  const sidebarHidden = navigationType === "sidebar" && !hasSidebar;
  const useDrawer =
    hasNavigation && (level === "drawer" || sidebarHidden || (isMobile && !measured));

  const userSection = (variant: "desktop" | "mobile") =>
    rightSection || <ResponsiveUserSection variant={variant} />;
  const defaultRightSection = userSection(level === "full" ? "desktop" : "mobile");
  const headerNavigation = useDrawer ? undefined : navigationForHeader;

  const headerRightSection =
    useDrawer ? (
      <div className={styles.headerRight}>
        {defaultRightSection}
        <Burger opened={mobileNavOpened} onClick={toggleMobileNav} size="sm" aria-label={drawerTitle} />
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
              breakpoint: "sm",
              collapsed: { mobile: true },
            }
          : undefined
      }
      footer={showFooter ? { height: isMobile ? 88 : 48 } : undefined}
      padding="md"
      // Úroveň zhuštění hlavičky - pro styly a testy (headerFit).
      data-header-level={level}
      data-header-fit={measured ? `${available}:${leftWidth}+${navWidth}+${rightFullWidth}/${rightCompactWidth}` : "unmeasured"}
    >
      <AppHeader
        rowRef={rowRef}
        height={headerHeight}
        leftSection={defaultLeftSection}
        navigationItems={headerNavigation}
        rightSection={headerRightSection}
        // Poloprůhledná s rozostřením; barva
        // z tématu, takže funguje i v tmavém režimu.
        style={
          headerStyle ?? {
            background: "color-mix(in srgb, var(--mantine-color-body) 80%, transparent)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }
        }
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

      {/* Měřicí řádek - mimo obrazovku, neviditelný, mimo strom přístupnosti
          i ovládání (inert); jen šířky pro pickHeaderLevel. */}
      <div
        aria-hidden
        inert
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
          display: "flex",
          gap: 16,
          whiteSpace: "nowrap",
        }}
      >
        <div ref={leftRef} style={{ display: "flex", width: "max-content" }}>
          {defaultLeftSection}
        </div>
        {navigationForHeader && (
          <div ref={navRef} style={{ display: "flex", width: "max-content" }}>
            {navigationForHeader}
          </div>
        )}
        <div ref={rightFullRef} style={{ display: "flex", gap: 12, width: "max-content" }}>
          {userSection("desktop")}
        </div>
        <div ref={rightCompactRef} style={{ display: "flex", gap: 12, width: "max-content" }}>
          {userSection("mobile")}
        </div>
      </div>

      {useDrawer && (
        <Drawer
          opened={mobileNavOpened}
          onClose={closeMobileNav}
          position="left"
          size="xs"
          title={drawerTitle}
          overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        >
          {typeof mobileNavigationContent === "function"
            ? mobileNavigationContent(closeMobileNav, { sidebarVisible: hasSidebar })
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
