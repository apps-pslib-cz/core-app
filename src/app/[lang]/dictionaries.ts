import "server-only";

export type Locale = "cs" | "en";

const dictionaries = {
  cs: () =>
    import("../../assets/dictionaries/cs.json").then(
      (module) => module.default,
    ),
  en: () =>
    import("../../assets/dictionaries/en.json").then(
      (module) => module.default,
    ),
};

export const getDictionary = async (locale: Locale) => {
  if (!dictionaries[locale]) {
    return dictionaries.cs(); // fallback to Czech
  }
  return dictionaries[locale]();
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
