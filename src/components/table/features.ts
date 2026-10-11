import {
  tableFeatures,
  rowSortingFeature,
  columnFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  createSortedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createColumnHelper as tanstackCreateColumnHelper,
  metaHelper,
  filterFn_equals,
  filterFn_includesString,
  sortFn_datetime,
  type ColumnDef as TanStackColumnDef,
  type ReactTable,
} from "@tanstack/react-table";
import type { ColumnFilterConfig } from "./types";

/**
 * Stejná definice jako `RowData` v `@tanstack/table-core` (ten typ ale
 * balíček veřejně nereexportuje) - `Record<string, any>`, ne
 * `Record<string, unknown>`. Rozdíl je důležitý: appkové DTO typy jsou
 * `interface`, ne `type`, a bez explicitní index signatury nesplňují
 * constraint s `unknown` (TS to vyžaduje striktně), zatímco s `any` ano -
 * stejně jako to řeší TanStack samo.
 */
export type AppRowData = Record<string, any> | Array<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Jediné místo, kde appka rozhoduje, které TanStack Table v9 "features"
 * používá. Appka je celá server-side (manualSorting/manualFiltering/
 * manualPagination v DataTable.tsx), takže row modely nikdy reálně
 * nepočítají - jejich registrace jen zpřístupňuje column API (getCanSort,
 * setFilterValue, ...), kterou appka používá. Žádné pinnování/resizing/
 * grouping appka nikde nepoužívá - proto tu nejsou; přidejte je sem, až
 * je nějaká stránka opravdu potřebuje.
 *
 * `columnMeta` nahrazuje starší globální `declare module` augmentaci -
 * v9 ji doporučuje nahradit přes `metaHelper()` registrovaný tady.
 */
export const tableFeaturesConfig = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { datetime: sortFn_datetime },
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: {
    equals: filterFn_equals,
    includesString: filterFn_includesString,
  },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
  columnMeta: metaHelper<{ filterConfig?: ColumnFilterConfig }>(),
});

export type AppTableFeatures = typeof tableFeaturesConfig;

/** `createColumnHelper` appky, už svázaný s `tableFeaturesConfig` - stránky ho volají jen s `<TData>`, ne s featurami navíc. */
export function createColumnHelper<TData extends AppRowData>() {
  return tanstackCreateColumnHelper<AppTableFeatures, TData>();
}

/** `ColumnDef` appky, už svázaný s `tableFeaturesConfig` - stránky ho importují odtud, ne z `@tanstack/react-table`. */
export type ColumnDef<
  TData extends AppRowData,
  TValue = unknown,
> = TanStackColumnDef<AppTableFeatures, TData, TValue>;

/**
 * Instance tabulky appky (co vrací `useTable()`), ne surový `Table` z
 * table-core - ten nemá `.state`/`.Subscribe`/`.FlexRender`, to je
 * react-table rozšíření (`ReactTable`).
 */
export type AppTable<TData extends AppRowData> = ReactTable<AppTableFeatures, TData>;
