"use client";

import { FC, PropsWithChildren } from "react";
import { BaseLayout } from "@/components/BaseLayout";
import { DashboardNavigation } from "@/components/DashboardNavigation";

const DashboardLayoutClient: FC<PropsWithChildren> = ({ children }) => {
  return (
    <BaseLayout
      navigationType="sidebar"
      navigationContent={<DashboardNavigation />}
      mobileNavigationContent={(closeMobileNav) => (
        <DashboardNavigation onNavigate={closeMobileNav} />
      )}
      sidebarWidth={250}
      drawerTitle="Dashboard Menu"
    >
      {children}
    </BaseLayout>
  );
};

export default DashboardLayoutClient;
