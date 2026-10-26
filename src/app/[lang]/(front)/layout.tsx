"use client";

import { FC, PropsWithChildren } from "react";
import { AppLayout } from "@/components/AppLayout";

/**
 * Společný layout veřejných stránek (domovská stránka, /about, /help,
 * /contact, /privacy, ...) - hlavička s hlavním menu, patička. Položky
 * hlavního menu jsou v src/components/MainNavigation.tsx.
 */
const PublicLayout: FC<PropsWithChildren> = ({ children }) => <AppLayout>{children}</AppLayout>;

export default PublicLayout;
