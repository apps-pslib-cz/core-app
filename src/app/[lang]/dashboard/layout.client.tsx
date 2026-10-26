"use client";

import { FC, PropsWithChildren } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DashboardNavigation } from "@/components/DashboardNavigation";

/** Administrace: hlavní menu v hlavičce + postranní menu podsekcí. */
const DashboardLayoutClient: FC<PropsWithChildren> = ({ children }) => (
  // Na celou šířku (tabulky, logy) - bez zužujícího kontejneru.
  <AppLayout
    contained={false}
    sidebar={(onNavigate) => <DashboardNavigation onNavigate={onNavigate} />}
  >
    {children}
  </AppLayout>
);

export default DashboardLayoutClient;
