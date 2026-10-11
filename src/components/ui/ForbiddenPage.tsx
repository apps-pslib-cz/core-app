"use client";

import React from "react";
import { IconLock } from "@tabler/icons-react";
import { useDictionary } from "@/hooks/useDictionary";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ErrorPage } from "./ErrorPage";

export function ForbiddenPage() {
  const { dictionary } = useDictionary();

  // Set page title
  usePageTitle(dictionary?.errors?.forbidden?.title || "Přístup odepřen");

  return (
    <ErrorPage
      statusCode="403"
      icon={<IconLock />}
      title={dictionary?.errors?.forbidden?.title || "Přístup odepřen"}
      message={
        dictionary?.errors?.forbidden?.message ||
        "Nemáte oprávnění pro zobrazení této stránky. Kontaktujte administrátora, pokud byste měli mít přístup."
      }
      description={
        dictionary?.errors?.forbidden?.description ||
        "Pro přístup k této části aplikace je potřeba speciální oprávnění. Pokud si myslíte, že by vám měl být přístup udělen, obraťte se na správce systému."
      }
      homeLabel={dictionary?.common?.home || "Domů"}
    />
  );
}
