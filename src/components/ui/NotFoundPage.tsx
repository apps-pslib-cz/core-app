"use client";

import React from "react";
import { IconFileX } from "@tabler/icons-react";
import { useDictionary } from "@/hooks/useDictionary";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ErrorPage } from "./ErrorPage";

export function NotFoundPage() {
  const { dictionary } = useDictionary();

  // Set page title
  usePageTitle(dictionary?.errors?.notFound?.title || "Stránka nenalezena");

  return (
    <ErrorPage
      statusCode="404"
      icon={<IconFileX />}
      title={dictionary?.errors?.notFound?.title || "Stránka nenalezena"}
      message={
        dictionary?.errors?.notFound?.message ||
        "Požadovaná stránka nebyla nalezena nebo již neexistuje."
      }
      description={
        dictionary?.errors?.notFound?.description ||
        "Možná jste zadali nesprávnou adresu, nebo se stránka přesunula na jiné místo."
      }
      homeLabel={
        dictionary?.errors?.notFound?.backHome ||
        dictionary?.common?.home ||
        "Zpět domů"
      }
    />
  );
}
