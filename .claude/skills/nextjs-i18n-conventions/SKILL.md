---
name: nextjs-i18n-conventions
description: Use when adding or changing any user-visible text in this app, or when touching src/assets/dictionaries/{cs,en}.json. Covers the dictionary pattern, the Client vs. Server Component split, and how the [lang] URL segment is the actual source of truth for locale.
version: 1.0.0
---

# Adding user-visible text in this app

This app is bilingual (cs/en). New text always goes through the
dictionary — never hardcode a string directly in a component, even for a
quick placeholder.

## The two ways to read the dictionary

**Client Components** (`"use client"`, the vast majority of pages):

```tsx
import { useDictionary } from "@/hooks/useDictionary"; // or "@/hooks" barrel

const { dictionary } = useDictionary();

<Title>{dictionary?.pages?.users?.list || "Uživatelé"}</Title>
```

**Server Components** (no `"use client"`):

```tsx
import { getDictionary, type Locale } from "@/app/[lang]/dictionaries";
import { getLanguageFromParams } from "@/libs/metadata";

const language = await getLanguageFromParams(params);
const dictionary = await getDictionary(language as Locale);
```

Don't reach for `getDictionary` in a Client Component or `useDictionary` in
a Server Component — they're not interchangeable (one is async and reads
the `[lang]` route param, the other reads the client-side locale from
`SettingsProvider`/URL via `usePathname`).

## Always chain with a fallback

```tsx
dictionary?.users?.detail?.title || "Detail uživatele"
```

Two independent reasons both `?.` and `|| "fallback"` matter here, not just
one:
- `useDictionary()`'s `dictionary` value itself is never `null` (it falls
  back to the Czech dictionary object if the locale cache misses) — but a
  **specific nested key** can still be missing, e.g. because
  `cs.json`/`en.json` briefly drift out of sync while you're editing one
  and not the other.
- The fallback string is always the **Czech** text, even in the `en`
  branch — it's what a user sees if the key is missing at all, so it should
  never be blank or in English-only pseudo-code.

## Adding a new key: touch both files, same path

`Dictionary`'s TypeScript type is inferred straight from the JSON files
(`src/app/[lang]/dictionaries.ts`), not hand-maintained — so the type
system already nudges you toward keeping the two files' shapes in sync,
but there is **no automated check that `cs.json` and `en.json` have the
same keys**. Add the key to both files, at the same nested path, in the
same edit:

```jsonc
// cs.json
"users": { "actions": { "syncAvatars": "Synchronizovat avatary" } }

// en.json
"users": { "actions": { "syncAvatars": "Sync avatars" } }
```

If you only add it to `cs.json`, the `en` locale silently falls back to
whatever string you hardcoded as the `||` fallback (Czech) instead of
showing an English string.

## Locale comes from the URL, not just preference

The `[lang]` URL segment (`/cs/...`, `/en/...`) is the source of truth for
what a page renders — `src/proxy.ts` resolves it, and the language switcher
navigates to it. A remembered preference (`SettingsProvider`/localStorage)
only matters for *future* visits to an unprefixed URL. Don't build a
component that picks its language from a stored preference while ignoring
the current URL — a fresh browser opening a shared `/en/...` link must still
render English even if that browser has never set a preference.

## What NOT to do

- Don't add a new hardcoded Czech string to a file that's already been
  converted to use the dictionary elsewhere in the same file.
- Don't invent a `getDictionaryValue(dictionary, "a.b.c", fallback)` helper
  per-file — plain `?.` chaining is the project convention.
- Don't skip the fallback string "because the key definitely exists" — it's
  cheap insurance against the no-automated-check gap above, and it's what
  every other call site does.

## Where to look for real examples

`src/app/[lang]/dashboard/users/page.tsx` and
`src/components/forms/EditUserForm.tsx` are fully-converted, dictionary-driven
pages — good templates for a new page.
