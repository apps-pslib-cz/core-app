"use client";

import { Suspense } from "react";
import { Container, Title, Loader, Stack } from "@mantine/core";
import { EditUserForm } from "@/components/forms/EditUserForm";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { useParams } from "next/navigation";
import { useDictionary } from "@/hooks/useDictionary";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function EditUserPage() {
  const { id } = useParams();
  const { dictionary } = useDictionary();

  // Set page title
  usePageTitle(dictionary?.pages?.users?.edit || "Upravit uživatele");

  const userId = Array.isArray(id) ? id[0] : (id as string);

  const breadcrumbItems = [
    {
      title: "Administration",
      href: "/dashboard",
      translationKey: "users.breadcrumbs.administration",
    },
    {
      title: "Users",
      href: "/dashboard/users",
      translationKey: "users.breadcrumbs.users",
    },
    { title: "Edit User", translationKey: "users.breadcrumbs.edit" },
  ];

  return (
    <>
      {/* Breadcrumbs mimo Container */}
      <AppBreadcrumbs items={breadcrumbItems} />

      <Container size="md" py="xl">
        <Stack gap="lg">
          <div>
            <Title order={2}>{dictionary?.users?.edit || "Edit User"}</Title>
          </div>

          <Suspense fallback={<Loader size="lg" />}>
            <EditUserForm userId={userId} />
          </Suspense>
        </Stack>
      </Container>
    </>
  );
}
