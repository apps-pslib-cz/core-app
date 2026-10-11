"use client";

import React from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useDictionary } from "@/hooks/useDictionary";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ErrorPage } from "./ErrorPage";

interface ServerErrorPageProps {
  error?: Error;
  reset?: () => void;
}

export function ServerErrorPage({ error, reset }: ServerErrorPageProps) {
  const { dictionary } = useDictionary();

  // Set page title
  usePageTitle(dictionary?.errors?.serverError?.title || "Něco se pokazilo");

  return (
    <ErrorPage
      statusCode="500"
      icon={<IconAlertTriangle />}
      title={dictionary?.errors?.serverError?.title || "Něco se pokazilo"}
      message={
        error?.message ||
        dictionary?.errors?.serverError?.message ||
        "Vyskytla se neočekávaná chyba. Zkuste to prosím znovu."
      }
      description={
        dictionary?.errors?.serverError?.reportError ||
        "Pokud problém přetrvává, pošlete prosím chybový report administrátorovi. Chyba byla automaticky zaznamenána pro další analýzu."
      }
      showRetry={!!reset}
      onRetry={reset}
      homeLabel={dictionary?.common?.home || "Domů"}
      retryLabel={dictionary?.errors?.serverError?.tryAgain || "Zkusit znovu"}
    />
  );
}
