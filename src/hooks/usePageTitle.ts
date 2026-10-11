"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  createPageTitle,
  getAppName,
  getDefaultPageTitle,
} from "@/libs/metadata";
import { type Language } from "@/config/app";

/**
 * Hook for managing page titles in client components
 * Automatically updates document.title with the proper format
 */
export function usePageTitle(pageTitle?: string) {
  const params = useParams();
  const language = (params?.lang as Language) || "cs";

  useEffect(() => {
    const titleToUse = pageTitle || getDefaultPageTitle(language);
    const formattedTitle = createPageTitle(titleToUse, language);
    document.title = formattedTitle;
  }, [pageTitle, language]);

  return {
    language,
    appName: getAppName(language),
    createTitle: (title: string) => createPageTitle(title, language),
    setTitle: (title: string) => {
      document.title = createPageTitle(title, language);
    },
  };
}
