"use client";

import { Stack, Title } from "@mantine/core";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { useDictionary } from "@/hooks/useDictionary";
import { usePageTitle } from "@/hooks/usePageTitle";
import LogsViewer from "./LogsViewer";

export default function LogsPage() {
  const { dictionary } = useDictionary();

  const pageTitle = dictionary?.logs?.title || "Systémové logy";
  usePageTitle(pageTitle);

  return (
    <Stack>
      <AppBreadcrumbs
        items={[
          {
            title: dictionary?.pages?.dashboard || "Administrace",
            href: "/dashboard",
          },
          {
            title: dictionary?.logs?.breadcrumbs?.logs || "Logy",
            href: "/dashboard/logs",
          },
        ]}
      />
      <Title order={2}>{pageTitle}</Title>
      <LogsViewer />
    </Stack>
  );
}
