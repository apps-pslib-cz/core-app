import { auth } from "@/libs/auth";
import { prisma } from "@/libs/prisma";
import { RoleChecker } from "@/types/roles";
import DashboardLayoutClient from "./layout.client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout(props: unknown) {
  const { children, params } =
    (props as {
      children: React.ReactNode;
      params: Promise<{ lang?: string }>;
    }) || {};
  const resolvedParams = await params;
  const lang = resolvedParams?.lang || "en";

  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}`);

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  // "member" je nejnižší role v APP_ROLES - má ji každý, kdo má jakoukoli
  // roli, takže tahle kontrola pustí do administrace kohokoli s alespoň
  // jednou rolí. Jednotlivé admin-only sekce (viz DashboardNavigation,
  // requiredRole: "admin") se gatují samostatně.
  if (!dbUser || !RoleChecker.hasRoleOrHigher(dbUser, "member")) {
    redirect(`/${lang}/forbidden`);
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
