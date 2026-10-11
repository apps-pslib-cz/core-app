"use client";

import { Breadcrumbs, Anchor, Text } from "@mantine/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDictionary } from "@/hooks/useDictionary";

export interface BreadcrumbItem {
  title: string;
  href?: string | null; // pokud není href nebo je null, bude to pouhý text (současná stránka)
  translationKey?: string; // pro automatické překlady
}

interface AppBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function AppBreadcrumbs({ items }: AppBreadcrumbsProps) {
  const params = useParams();
  const lang = (params.lang as string) || "cs"; // fallback na 'cs'
  const { dictionary } = useDictionary();

  const getTranslatedTitle = (item: BreadcrumbItem) => {
    if (!item.translationKey || !dictionary) {
      return item.title;
    }

    // Support nested keys like "users.breadcrumbs.administration"
    const keys = item.translationKey.split(".");
    let value: unknown = dictionary;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return item.title; // fallback to original title
      }
    }

    return typeof value === "string" ? value : item.title;
  };

  return (
    <Breadcrumbs separatorMargin="md" mb="md">
      {items.map((item, index) => {
        // Posledni item je vzdy jen text (současná stránka)
        const isLast = index === items.length - 1;
        const translatedTitle = getTranslatedTitle(item);

        if (isLast || !item.href) {
          return (
            <Text key={index} c="dimmed">
              {translatedTitle}
            </Text>
          );
        }

        // Prefix locale only for app-relative links that do not already include it.
        const hrefWithLang = item.href.startsWith(`/${lang}/`) || item.href === `/${lang}`
          ? item.href
          : item.href.startsWith("/")
            ? `/${lang}${item.href}`
            : item.href;

        return (
          <Anchor component={Link} href={hrefWithLang} key={index}>
            {translatedTitle}
          </Anchor>
        );
      })}
    </Breadcrumbs>
  );
}
