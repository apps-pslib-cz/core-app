/**
 * Environment configuration utilities for UI settings.
 *
 * These helpers wrap access to NEXT_PUBLIC_* environment variables and
 * provide sane defaults and parsing. They are pure functions (no side effects)
 * and therefore easy to unit test.
 */

// Table/Page size configuration
export function getTableRowsOptions(): number[] {
  const options =
    process.env.NEXT_PUBLIC_TABLE_ROWS_OPTIONS || "10,20,50,100,200";
  return options
    .split(",")
    .map((num) => parseInt(num.trim(), 10))
    .filter((num) => !isNaN(num));
}

export function getDefaultTableRows(): number {
  const defaultRows = process.env.NEXT_PUBLIC_TABLE_ROWS_DEFAULT || "20";
  const parsed = parseInt(defaultRows, 10);
  return isNaN(parsed) ? 20 : parsed;
}

// Language configuration
export function getAvailableLanguages(): string[] {
  const languages = process.env.NEXT_PUBLIC_AVAILABLE_LANGUAGES || "cs,en";
  return languages.split(",").map((lang) => lang.trim());
}

export function getDefaultLanguage(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "cs";
}

// Validation functions
export function isValidTableRowsCount(count: number): boolean {
  const options = getTableRowsOptions();
  return options.includes(count);
}

export function isValidLanguage(lang: string): boolean {
  const available = getAvailableLanguages();
  return available.includes(lang);
}

// Configuration object for easy access
export const uiConfig = {
  tableRows: {
    options: getTableRowsOptions(),
    default: getDefaultTableRows(),
  },
  languages: {
    available: getAvailableLanguages(),
    default: getDefaultLanguage(),
  },
} as const;

// Type exports
export type AvailableLanguage = (typeof uiConfig.languages.available)[number];
export type AvailableTableRows = (typeof uiConfig.tableRows.options)[number];
