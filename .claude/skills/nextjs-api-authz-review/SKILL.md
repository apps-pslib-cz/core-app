---
name: nextjs-api-authz-review
description: Use when the user wants a review/audit of a Next.js app's API — who (which role) can call which endpoint and under what constraints. Produces a role-based reverse use-case diagram plus a matrix and security findings.
---

# Next.js API Authorization Review

Audit a Next.js application's API surface (App Router route handlers, Pages Router API routes, Server Actions, and tRPC routers if present) to determine, for every endpoint or action: which roles can call it, what authentication/authorization check actually gates it in code, and what additional constraints apply (ownership, scoping, rate limiting, input validation). Produce a "reverse use-case diagram" grouped by role — what each role can actually do — plus a detailed matrix, and flag gaps and inconsistencies. This is a review, not just documentation: don't just describe what's there, evaluate whether it's correct and consistent.

## Workflow

### 1. Discover the surface
- App Router route handlers: `app/**/route.{ts,js}`
- Pages Router API routes: `pages/api/**/*.{ts,js}`
- Server Actions: files/functions with `'use server'`, action files (e.g. `actions.ts`), inline actions inside components
- Middleware: `middleware.ts`/`.js` at the project root — note its `matcher` config carefully, it silently gates (or fails to gate) whole route groups
- tRPC routers if present (`server/api/routers/**`, `appRouter`) — procedures are API surface too
- Use Glob/Grep to enumerate first; don't try to read the whole tree blindly on a large codebase

### 2. Identify the authorization pattern(s) in use
- Auth library: NextAuth/Auth.js (`getServerSession`, `auth()`), Clerk, Supabase Auth, Lucia, custom JWT/cookie session parsing — grep for the actual import, don't assume from `package.json` alone
- Where roles/permissions live: `session.user.role`, a permissions/ACL table, a `can()`/`ability()` helper, role checks inside middleware
- Authorization helper functions (`requireRole`, `assertPermission`, `withAuth` wrapper/HOF) — grep every call site, not just the definition, since usage is what actually enforces it

### 3. For every endpoint/action, extract from the code (never infer from naming alone)
- Path (or action name) + HTTP method
- Whether an auth check runs before business logic, and where: middleware, in-handler, both, or neither
- Required role(s)/permission(s), read directly from the check
- Additional constraints: ownership check (e.g. resource's `userId` matched against session user), tenant/org scoping, rate limiting, input validation schema (zod/yup/etc.)
- If nothing gates it, say so explicitly — "public / unprotected"

### 4. Cross-check for issues
- Mutating endpoints (POST/PUT/PATCH/DELETE) or admin-looking paths with no auth check
- Near-identical endpoints (same resource, different route, e.g. REST + Server Action) with different role requirements
- Role/permission checks that exist only client-side and are never re-verified server-side
- Middleware matcher gaps — a route not covered by the matcher, or a matcher pattern with a hole
- Authorization logic duplicated ad hoc per-handler instead of going through a shared helper (drift risk)
- Endpoints taking a resource ID with no ownership/tenant check (IDOR risk)
- Roles broader than necessary (e.g. any authenticated user where only a specific role should qualify)

### 5. Produce the report (single Markdown document)
1. **Auth architecture summary** — library/pattern used, where enforcement happens (middleware vs. handler-level vs. mixed)
2. **Role → capability diagram ("reverse use-case diagram")** — a Mermaid flowchart with one subgraph per role, each role node connected to the endpoints/actions it can reach; label edges with key constraints (e.g. "own records only"). Build the role list only from roles actually found in code — never invent a role taxonomy that isn't there. If the app only has `isAuthenticated` with no real roles, say so plainly instead of forcing one.
3. **Full matrix table** — columns: Endpoint | Method | Auth required? | Role(s) | Constraints | Enforced where | Notes
4. **Findings** — issues from step 4, ranked most-severe first, each with a `file:line` reference and a concrete failure scenario (who could do what they shouldn't)
5. Write the report in the same language the user is using in the conversation (this team typically writes in Czech).

### 6. Verify before finalizing
- Re-read the actual file/lines behind each flagged finding — don't report "missing auth check" without confirming no wrapper or middleware covers it elsewhere in the request path
- Confirm every role name in the diagram/matrix actually appears in the code

## Notes
- Read-only analysis — never modify the reviewed application's code.
- Deliver the finished report as a file/document following the current session's normal delivery conventions (e.g. write it to the outputs location and share it, or hand it back inline if that's how the session works).
- If the codebase mixes multiple auth patterns (e.g. legacy Pages Router + new App Router with different mechanisms), call that out explicitly as its own finding — mixed patterns are a common source of the very gaps this review looks for.
