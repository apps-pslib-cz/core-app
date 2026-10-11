---
name: nextjs-api-route-conventions
description: Use when writing a new API route handler (src/app/api/**/route.ts) or a new authorization helper in this codebase, or when touching an existing handler's auth/error-handling logic. Covers the canonical requireAuthentication + handleError pattern, the role hierarchy, and the error envelope frontend code must parse. Complements nextjs-app-reviewer (which reviews after the fact) and nextjs-api-authz-review (which audits an existing surface) — this one is for writing it right the first time.
version: 1.0.0
---

# API route conventions in this app

Every route handler in this app follows one pattern. Write every new
handler to it from the start; don't invent a variant.

## The pattern

```ts
import { type NextRequest } from "next/server";
import { requireAuthentication } from "@/libs/apiAuth";
import { BadRequest, NotFound, handleError } from "@/libs/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthentication(request, {
      requireRole: "admin",
      forbiddenMessage: "Only administrators can ...",
    });

    const { id } = await params;
    // ... validate, load, mutate ...
    if (!thing) throw NotFound("Thing not found");

    return Response.json(result);
  } catch (err) {
    return handleError(err);
  }
}
```

Every piece here is load-bearing:

1. **`requireAuthentication(request, options?)`** (`src/libs/apiAuth.ts`) is
   the single entry point for both session-cookie and JWT-Bearer auth
   (mobile clients use the latter). It either returns `{ user }` or throws —
   it never returns a `Response`. Don't write
   `if (authResult instanceof Response) return authResult;`.
2. **`requireRole`** takes a role string (one of `APP_ROLES` in
   `src/types/roles.ts`) and checks "this role or higher" via
   `RoleChecker.hasRoleOrHigher`, which respects `ROLE_HIERARCHY`
   (default template config: `admin ⊇ member`). So:
   - Mutation, admin-only → `requireRole: "admin"`.
   - No role restriction beyond being logged in → omit `requireRole`
     entirely.
   - **"Admin OR the resource's own user" is not a hierarchy relationship**
     — `requireRole` can't express it. Call `requireAuthentication(request)`
     with no role option, then check manually:
     `if (!isAdmin && !isOwnProfile) throw Forbidden("...");` (see
     `src/app/api/v1/users/[id]/route.ts` PUT for the reference
     implementation).
   - If this app adds roles beyond the template's `admin`/`member`
     default, `ROLE_HIERARCHY` in `src/types/roles.ts` is the one place to
     update — `requireRole` keeps working unchanged.
3. **`forbiddenMessage`** overrides the generic "Insufficient permissions" —
   use it whenever the caller (frontend or API consumer) benefits from a
   specific reason. Some of these strings are shown to users verbatim via
   `errorData.error?.message`, so write them as you would any other
   user-facing Czech/English string in this app.
4. **`try { ... } catch (err) { return handleError(err); }` wraps the whole
   handler body, no exceptions.** Without one, any `throw
   Forbidden/Unauthorized/BadRequest(...)` — including the one inside
   `requireAuthentication` itself — produces a bare, bodyless `500` instead
   of the intended status code. This is easy to miss because it only
   manifests for the unhappy path; the happy path looks identical either
   way. If a route legitimately has no dynamic route params,
   `withErrorHandling()` (also in `src/libs/errors.ts`) can wrap the whole
   exported function instead of an inner try/catch — but its signature only
   accepts `(req: Request)`, so it does **not** work for `[id]`-style
   dynamic segments needing a second `{ params }` argument. For those, use
   the inline try/catch.
5. **Throw, don't construct a `Response` by hand**, for every error case:
   `BadRequest`, `NotFound`, `Conflict`, `Forbidden`, `Unauthorized` (all in
   `src/libs/errors.ts`). `handleError()` turns any of these into the one
   canonical JSON body:
   ```json
   { "error": { "message": "...", "code": "...", "details": ..., "traceId": "..." } }
   ```
   Don't hand-roll `Response.json({message: "..."}, {status})`,
   `Response.json({error: "..."}, {status})` (string, not object), or
   `new Response(text, {status})` — all three break the generic frontend
   error-parsing convention below.

## Matching frontend convention

Any `fetch()` call reading an error body from this API must read
`errorData.error?.message` (the nested field), never a top-level
`errorData.message` or `errorData.error` string:

```ts
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error?.message || "Fallback Czech/English text");
}
```

The `src/hooks/queries/*.ts` React Query hooks already follow this via a
shared `parseErrorMessage()` helper — reuse that pattern for any new
`mutationFn`/`queryFn` rather than writing the body-parsing inline again.

## Checklist for a new route.ts

- [ ] `requireAuthentication(request, { requireRole, forbiddenMessage })` as
      the first line of business logic in every exported handler.
- [ ] Whole handler body wrapped in `try { ... } catch (err) { return
      handleError(err); }` (or `withErrorHandling()` if there are no dynamic
      params).
- [ ] Every error path is a `throw BadRequest/NotFound/Conflict/Forbidden(...)`,
      never a hand-built `Response.json(...)`.
- [ ] If the endpoint is deliberately public (no auth), say so in a comment —
      otherwise a future reviewer (human or agent) will flag it as a gap.
- [ ] Any new frontend `fetch()` against this route reads
      `errorData.error?.message`.
