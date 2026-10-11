# DataTable - server-side tabulka s URL synchronizací

Jediná table komponenta appky (`DataTable`), postavená na TanStack Table v9.
Celá je server-side (`manualSorting`/`manualFiltering`/`manualPagination`) -
řazení/filtrování/stránkování se vždy posílá na server přes `dataFetcher` a
stav se zároveň ukládá do URL (`?table_sortBy=...&table_filter_x=...`), takže
jde odkaz na konkrétní pohled sdílet/bookmarkovat.

## Rychlý start

```tsx
import { DataTable, createColumnHelper, type ColumnDef } from "@/components/table";

interface UserRow {
  id: string;
  name: string;
  email: string;
}

const columnHelper = createColumnHelper<UserRow>();

const columns: ColumnDef<UserRow>[] = [
  columnHelper.accessor("name", {
    header: "Jméno",
    meta: { filterConfig: { type: "text" } },
  }),
  columnHelper.accessor("email", {
    header: "E-mail",
    meta: { filterConfig: { type: "text" } },
    cell: (info) => <a href={`mailto:${info.getValue()}`}>{info.getValue()}</a>,
  }),
];

async function dataFetcher(request) {
  const params = new URLSearchParams();
  applyListQueryParams(params, request); // sortBy/sortDir/page/size
  const res = await fetch(`/api/v1/users?${params}`);
  const json = await res.json();
  return { data: json.items, meta: { totalCount: json.total, pageCount: json.pages } };
}

<DataTable columns={columns} dataFetcher={dataFetcher} config={{ urlStateKey: "users" }} />
```

## Filtry (`meta.filterConfig`)

Typ filtru se zapíná přes `meta.filterConfig` na sloupci, ne přes samostatnou
konfigurační vrstvu - appka ho pak sama vykreslí jako `TextInput`/`Select`
v hlavičce tabulky:

```tsx
columnHelper.accessor("active", {
  header: "Aktivní",
  meta: { filterConfig: { type: "boolean" } },
});

columnHelper.accessor("role", {
  header: "Role",
  meta: {
    filterConfig: {
      type: "select",
      options: [{ value: "admin", label: "Administrátor" }],
    },
  },
});
```

`type: "none"` sloupec filtr nemá (typicky akční sloupec). Pomocné
`FilterConfigs.text()/boolean()/select()/none()` z `./helpers.ts` dělají
totéž bez nutnosti psát objekt ručně.

## Klikatelné buňky

Žádná speciální "cell actions" vrstva - `cell` je běžný React, takže stačí
vrátit `<Link>`/`<Anchor>`/`onClick` jako v jakékoli jiné komponentě:

```tsx
cell: ({ row }) => (
  <Link href={`/users/${row.original.id}`}>{row.original.name}</Link>
)
```

## Po mutaci dat: `onMountRefresh`

Stránka, která k tabulce přidává vlastní create/update/delete akci, si
uloží refresh funkci a zavolá ji po úspěšné mutaci, aby se tabulka
přenačetla bez plného reloadu stránky:

```tsx
const refreshRef = useRef<() => void>();

<DataTable
  columns={columns}
  dataFetcher={dataFetcher}
  onMountRefresh={(refresh) => { refreshRef.current = refresh; }}
/>

// po POST/PATCH/DELETE:
refreshRef.current?.();
```

Víc v `.claude/skills/nextjs-datatable-conventions` (pokud je v appce
nainstalovaný).
