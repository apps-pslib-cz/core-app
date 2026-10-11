"use client";

import { CreateUserForm } from "@/components/forms/CreateUserForm";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { useDictionary } from "@/hooks/useDictionary";
import { usePageTitle } from "@/hooks/usePageTitle";

const CreateUserPage = () => {
  const { dictionary } = useDictionary();

  // Set page title
  usePageTitle(dictionary?.pages?.users?.create || "Vytvořit uživatele");

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
    { title: "New User", translationKey: "users.breadcrumbs.create" },
  ];

  return (
    <>
      {/* Breadcrumbs mimo formulář */}
      <AppBreadcrumbs items={breadcrumbItems} />

      <CreateUserForm />
    </>
  );
};

export default CreateUserPage;
