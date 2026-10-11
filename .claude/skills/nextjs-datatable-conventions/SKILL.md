---
name: nextjs-datatable-conventions
description: Use when adding a new list/table page in this app, or adding a create/update/delete action next to an existing DataTable. Covers wiring columns, the server-side dataFetcher contract, and the onMountRefresh pattern that keeps the table in sync after a mutation.
version: 1.0.0
---

# Wiring a new list page with DataTable

`src/components/table/DataTable.tsx` is this app's shared server-side table
(sorting/filtering/pagination all happen on the server, URL-synced, built on
`@tanstack/react-table` v9). Every list page follows the same three-piece
shape: **columns**, a **dataFetcher**, and — if the page also lets the user
create/edit/delete rows — a **refresh wiring**. Get the third piece wrong
and mutations silently leave a stale table on screen.

**This is independent of `@tanstack/react-query`** (see
`nextjs-tanstack-query-conventions`). `DataTable` fetches its own list data
client-side and never enters the React Query cache — the two mechanisms
coexist on the same page, they don't replace each other.

## 1. Columns

Use this app's own `createColumnHelper<TData>()` from `@/components/table`
(not `@tanstack/react-table` directly — it's pre-bound to this app's
registered table features, see `src/components/table/features.ts`), one
module-level instance per file. Each column that should be filterable
carries its filter type in `meta.filterConfig` — `DataTable` reads this to
decide what filter control to render, you never build the filter UI
yourself:

```tsx
const columnHelper = createColumnHelper<UserListDto>();

const columns = useMemo(
  () =>
    columnHelper.columns([
      columnHelper.accessor("email", {
        header: dictionary?.users?.fields?.email || "E-mail",
        meta: {
          filterConfig: { type: "text", placeholder: "Hledat e-mail..." },
        },
        cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Akce",
        meta: { filterConfig: { type: "none" } }, // display columns still need this
        cell: ({ row }) => (
          <ActionIcon onClick={() => onEdit(row.original)}>
            <IconEdit size={16} />
          </ActionIcon>
        ),
        enableSorting: false,
      }),
    ]),
  [dictionary, onEdit],
);
```

`meta.filterConfig` is required on every column (including display columns)
— omit it and the column silently gets a default text filter, which is
wrong for a display-only "actions" column.

**A `display` column has no accessor, so it's hard-unsortable regardless of
`enableSorting: true`** — `@tanstack/table-core`'s `column_getCanSort()`
requires an `accessorFn`. If a column needs to be sortable, use
`columnHelper.accessor(...)` even if the cell renderer ignores the raw
value (`manualSorting: true` means the accessor's return value is never
actually used for sorting — it only exists to satisfy this check).

## 2. dataFetcher

`DataTable`'s `dataFetcher` prop is a `useCallback` that takes the table's
current sorting/filters/pagination, builds a query string, hits your API
route, and returns `{ data, meta: { totalCount, pageCount } }`. Use
`applyListQueryParams` (from `@/components/table`) to serialize
sorting/pagination consistently — don't hand-roll that part:

```tsx
const dataFetcher = useCallback(
  async (request: {
    sorting: { id: string; desc: boolean }[];
    columnFilters: { id: string; value: unknown }[];
    pagination: { pageIndex: number; pageSize: number };
  }) => {
    const params = new URLSearchParams();
    applyListQueryParams(params, request);

    request.columnFilters.forEach((filter) => {
      if (filter.value && String(filter.value).trim()) {
        params.set(filter.id, String(filter.value));
      }
    });

    const response = await fetch(`/api/v1/users?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const result: ListResult<UserListDto> = await response.json();
    return {
      data: result.data || [],
      meta: {
        totalCount: result.total || 0,
        pageCount: Math.ceil((result.total || 0) / request.pagination.pageSize),
      },
    };
  },
  [], // add real dependencies (e.g. `dictionary`) if the fetcher closes over them
);
```

The backing API route needs to actually support `page`/`size`/sort/filter
query params and return a `ListResult<T>` shape (`{ data, total, ... }`) —
check `src/app/api/v1/users/route.ts` for the server side of this contract,
and see the `nextjs-api-route-conventions` skill for how that route itself
should be authored.

## 3. Refresh after mutation — the part that's easy to get wrong

`DataTable` fetches its own data client-side. **`router.refresh()` alone
does not refresh it** — that only re-runs Server Component data fetching,
and this table isn't one. It is also independent of React Query's
`invalidateQueries` — a mutation hook invalidating a query key does not
touch this table's own fetch. Wire the escape hatch instead:

```tsx
// In the page component (not the table component itself):
const tableRefreshRef = useRef<(() => void) | null>(null);

// ...pass it down to <DataTable onMountRefresh={...}>:
<DataTable
  columns={columns}
  dataFetcher={dataFetcher}
  onMountRefresh={(refresh) => {
    tableRefreshRef.current = refresh;
  }}
/>

// After a create/update/delete that affects a visible row:
deleteUser.mutate(selectedUser.id, {
  onSuccess: () => {
    tableRefreshRef.current?.(); // re-fetches the table's own data
  },
});
```

`onMountRefresh` is called once on mount with a `refresh` function; store it
in a ref (not state — you don't want a re-render just from storing it) and
call `tableRefreshRef.current?.()` from every mutation handler on the page,
whether that mutation goes through a plain `fetch` or a React Query
`useMutation`.

## Reference implementation

`src/app/[lang]/dashboard/users/page.tsx` + `UserTable.tsx` is the cleanest
full example (columns, dataFetcher, delete/sync-avatars/sync-active mutations
via React Query with `tableRefreshRef.current?.()` called from each
`onSuccess`). Start from there rather than from a blank page if you're
adding a new list.
