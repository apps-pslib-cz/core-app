---
name: nextjs-rsc-pitfalls
description: Use when writing or reviewing Server Components in this app (files under src/app/[lang]/(front) or src/app/[lang]/dashboard without a "use client" directive), when a page returns an unexplained 500 in dev, or when verifying a fix locally end-to-end (starting the dev server, hitting a route, checking the database). Covers RSC/Mantine gotchas and the local verification workflow.
version: 1.0.0
---

# Next.js RSC pitfalls in this app

Server Components (RSC) have constraints that don't show up in a
client-only mental model. Two concrete bugs hit `projects-v1-app` (the
project this template was extracted from) for exactly this reason — check
for both whenever you touch a file that has no `"use client"` directive.

## 1. Never pass a function as a prop from a Server Component into a Client Component

Mantine components (`Button`, `Anchor`, `Card`, ...) are Client Components.
Passing `next/link`'s `Link` as their `component` prop means passing a
**function reference** across the Server → Client boundary, which React
forbids outside of `"use server"` actions:

```
Error: Functions cannot be passed directly to Client Components unless you
explicitly expose it by marking it with "use server".
```

This only breaks when the surrounding file/branch is a Server Component
(no `"use client"`) — the exact same code is fine inside a client component.

**Bad** (in a Server Component):
```tsx
<Button variant="light" component={Link} href={`/${lang}/articles/${id}`}>
  {label}
</Button>
```

**Good** — make `Link` the parent, not a prop:
```tsx
<Link href={`/${lang}/articles/${id}`} style={{ textDecoration: "none" }}>
  <Button variant="light" component="span">
    {label}
  </Button>
</Link>
```

Grep for `component={Link}` before assuming a page is safe — it's only a
problem in files without `"use client"`.

## 2. Mantine `List` / `List.Item` breaks in Server Components

Rendering `<List>`/`<List.Item>` from `@mantine/core` inside a Server
Component throws:

```
Error: Element type is invalid: expected a string (for built-in components)
or a class/function (for composite components) but got: undefined.
```

`List` has no RSC-safe export in the Mantine version this project uses,
unlike `Text`, `Title`, `Paper`, `ThemeIcon`, `Group`, `Stack`, `Badge`,
`Anchor`, `Button`, `Card`, which all render fine server-side. If a bulleted
list is needed in a Server Component, build it from `Stack`/`Group` + `Text`
(or a `ThemeIcon` bullet) instead of reaching for `List`. Treat any other
Mantine component as suspect if it throws the same "Element type is
invalid" error in a page that has no `"use client"` — check whether it
also lacks an RSC-safe export before assuming the bug is in your own code.

## Local verification workflow (Windows / this repo)

When you need to actually exercise a fix rather than trust a typecheck:

1. **Start the dev server in the background** and poll until it responds
   (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/cs`), rather
   than sleeping a fixed amount — Turbopack's first compile can take a few
   seconds.
2. **Check for a stale/foreign server first.** If port 3000 is already in
   use (e.g. by a different app on the same machine), `next dev` silently
   falls back to 3001 while your curl still hits the old process on 3000 —
   you'll debug the wrong server. Check which process actually owns the
   port before starting a new one (e.g.
   `Get-NetTCPConnection -LocalPort 3000 -State Listen` → `Get-CimInstance
   Win32_Process` on the PID, to confirm it's *this* app's `next dev`, not
   another Node project).
3. **`DATABASE_URL` lives in `.env`**, wrapped in double quotes
   (`DATABASE_URL="postgresql://..."`). If you connect with a plain `pg`
   client for a one-off check, strip the surrounding quotes yourself — `pg`
   does not do it for you and will fail with a confusing
   `ENOENT`/`ENOTFOUND` on a nonsense host.
4. **The generated Prisma client (`src/generated/prisma`) is TS/ESM-only** —
   there is no compiled JS entry point, so a bare `node script.mjs` importing
   `@/generated/prisma` (or even `@prisma/client`) fails to resolve. For an
   ad-hoc DB check, either query with the `pg` package directly (it's already
   a dependency, via `@prisma/adapter-pg`), or add a temporary route under
   `src/app/api/<name>/route.ts` that imports `prisma` from `@/libs/prisma`
   and hits it through the running Next server — then delete the route.
5. **Folders starting with `_` under `src/app` are Next.js "private
   folders"** and are never routable (404), including under `src/app/api`.
   Don't name a temporary debug route `_scratch-debug` — it will 404 and
   look like the route doesn't exist.
6. **Clean up after verifying**: delete any temporary DB rows, scratch
   scripts, and debug routes, then kill the dev server process before
   handing back control.
