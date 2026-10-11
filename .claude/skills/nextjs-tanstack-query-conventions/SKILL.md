---
name: nextjs-tanstack-query-conventions
description: Use when fetching or mutating a single entity (detail view, edit form, create form, delete/sync action) from a Client Component in this app. Covers query-key conventions, the useQuery/useMutation + invalidateQueries pattern, and how this deliberately does NOT replace DataTable's own list-fetching — a reviewer checking this app's data-fetching should expect this pattern outside DataTable and the dataFetcher/onMountRefresh pattern inside it.
version: 1.0.0
---

# TanStack Query for entity fetch/mutate (not for DataTable lists)

`@tanstack/react-query` is this app's standard for fetching/mutating a
*single* entity from a Client Component — a detail page, an edit form, a
create form, a delete button, a sync/bulk action. It replaces the old
`useState(data/loading/error)` + manual `fetch` in a `useEffect` pattern.
`QueryProvider` (`src/providers/QueryProvider.tsx`) wraps the whole app in
`src/app/layout.tsx`, so `useQuery`/`useMutation` work in any Client
Component without further setup.

**It does not replace `DataTable`'s own fetching.** `DataTable` manages its
own server-side sort/filter/pagination state and fetches through its
`dataFetcher` prop — that data never enters the React Query cache, so
`invalidateQueries` can't refresh a table. After a mutation that affects a
visible row, you still call the table's own `onMountRefresh` ref, exactly as
before (see `nextjs-datatable-conventions`). The two mechanisms coexist on
the same page: list stays on `dataFetcher`/`onMountRefresh`, the delete
button's own loading state and the single-row detail/edit views use React
Query.

## 1. Query keys

Keep hooks and keys together in `src/hooks/queries/<entity>.ts`, one object
per entity, most-general key first so a broad invalidate also drops
narrower cached entries:

```ts
export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};
```

`queryClient.invalidateQueries({ queryKey: userKeys.all })` matches both
`["users"]` and `["users", "detail", "abc"]` — React Query matches by key
*prefix*, not exact equality.

## 2. Fetching one entity — `useQuery`

```ts
async function fetchUser(id: string): Promise<UserDetailDto> {
  const res = await fetch(`/api/v1/users/${id}`);
  if (!res.ok) throw new Error(await parseErrorMessage(res, "Nepodařilo se načíst uživatele"));
  return res.json();
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => fetchUser(id as string),
    enabled: !!id, // id can be undefined on first render (e.g. from useParams)
  });
}
```

Consume it with `data`/`isPending`/`error` — not custom state:

```tsx
const { data: user, isPending, error } = useUser(userId);
if (isPending) return <LoadingOverlay visible />;
if (error || !user) return <Alert color="red">{error instanceof Error ? error.message : "..."}</Alert>;
```

Two different pages needing the same entity (e.g. a detail page and its
edit form) share one cache entry under `userKeys.detail(id)` — navigating
between them reuses the cached data (stale-while-revalidate) instead of two
independent fetches.

## 3. Mutating — `useMutation` + invalidate, never manual `setLoading`

```ts
export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateUserDto) => {
      const res = await fetch(`/api/v1/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res, "Nepodařilo se uložit uživatele"));
      return res.json() as Promise<UserDetailDto>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
```

Call it from the component with `onSuccess`/`onError`/`onSettled` passed to
`.mutate()`, not to the hook itself — that way the same mutation hook can
show a notification and navigate differently from different call sites:

```tsx
const updateUser = useUpdateUser(userId);

updateUser.mutate(payload, {
  onSuccess: () => { notifications.show({ color: "green", ... }); router.back(); },
  onError: (err) => { notifications.show({ color: "red", message: err instanceof Error ? err.message : "..." }); },
});

// buttons:
<Button loading={updateUser.isPending} disabled={updateUser.isPending} type="submit">
```

`isPending` on the mutation object replaces the old local `loading` state
— there is no separate `useState` for it.

## 4. Populating a Mantine form from query data — guard against refetch clobbering an in-progress edit

`staleTime: 30_000` on the shared `QueryClient` (see `QueryProvider.tsx`)
means a background refetch can land while the user is mid-edit. Populate
the form only once per entity id, with a ref keyed on the id — not in the
form's `initialValues` (data isn't there yet on first render) and not on
every `data` change (that would overwrite unsaved edits):

```tsx
const { data: user } = useUser(userId);
const formPopulatedRef = useRef<string | null>(null);

useEffect(() => {
  if (!user || formPopulatedRef.current === userId) return;
  formPopulatedRef.current = userId;
  form.setValues({ email: user.email, /* ... */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- form je stabilní z useForm, nepatří do deps
}, [user, userId]);
```

## 5. Mutations with no input (sync/bulk actions)

A mutation that takes no payload (e.g. "sync avatars from OAuth server")
still goes through `useMutation` — call `.mutate(undefined, {...})`:

```ts
export function useSyncAvatars() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<AvatarSyncSummary> => {
      const res = await fetch("/api/v1/users/sync-avatars", { method: "POST" });
      if (!res.ok) throw new Error("Aktualizaci avatarů se nepodařilo spustit");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: userKeys.all }); },
  });
}
```

If the page also has a `DataTable` showing the affected rows, the
`onSuccess` handler on the *page* (not the hook) still needs to call
`tableRefreshRef.current?.()` after `.mutate()` succeeds — the
`invalidateQueries` call above only refreshes other React Query consumers
(e.g. a detail page open in another tab), not the table.

## Reference implementation

`src/hooks/queries/users.ts` + `src/app/[lang]/dashboard/users/[id]/page.tsx`
(detail) + `src/components/forms/EditUserForm.tsx` (form populated from
query data) + `src/app/[lang]/dashboard/users/page.tsx` (list page mixing
`DataTable` with React Query mutations for delete/sync-avatars/sync-active)
— start from these rather than from a blank page.
