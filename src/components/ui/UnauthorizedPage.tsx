"use client";

import React from "react";
import { IconUserX } from "@tabler/icons-react";
import { useDictionary } from "@/hooks/useDictionary";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ErrorPage } from "./ErrorPage";

export function UnauthorizedPage() {
  const { dictionary } = useDictionary();

  // Set page title
  usePageTitle(dictionary?.errors?.unauthorized?.title || "Vyžaduje se přihlášení");

  return (
    <ErrorPage
      statusCode="401"
      icon={<IconUserX />}
      title={dictionary?.errors?.unauthorized?.title || "Vyžaduje se přihlášení"}
      message={
        dictionary?.errors?.unauthorized?.message ||
        "Pro přístup k této stránce se musíte nejprve přihlásit."
      }
      description={
        dictionary?.errors?.unauthorized?.description ||
        "Vaše relace možná vypršela nebo ještě nejste přihlášeni. Klikněte na tlačítko níže pro návrat na hlavní stránku."
      }
      homeLabel={dictionary?.errors?.unauthorized?.backHome || "Přihlásit se"}
    />
  );
}
