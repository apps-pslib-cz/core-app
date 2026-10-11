"use client";

import { FC, PropsWithChildren } from "react";
import { BaseLayout } from "@/components/BaseLayout";

/**
 * Společný layout pro všechny veřejné/přední stránky appky (domovská
 * stránka, /about, /help, /contact, /privacy, ...) - dává jim appshell
 * s hlavičkou/patičkou (BaseLayout), takže je nemusí řešit každá stránka
 * samostatně. Admin sekce má vlastní layout
 * (src/app/[lang]/dashboard/layout.tsx) s postranním menu místo tohoto.
 *
 * Appka postavená na téhle šabloně sem obvykle doplní horizontální
 * navigaci (navigationType="horizontal" + navigationContent) - zatím je
 * prázdná, žádné front-end sekce kromě /dashboard v šabloně nejsou.
 */
const PublicLayout: FC<PropsWithChildren> = ({ children }) => {
  return <BaseLayout>{children}</BaseLayout>;
};

export default PublicLayout;
