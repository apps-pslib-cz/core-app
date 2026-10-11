import { SortingState, ColumnFiltersState } from "@tanstack/react-table";

export function parseSorting(param: string | null): SortingState {
  if (!param) return [];
  return param.split(",").map((item) => {
    const [id, desc] = item.split(":");
    return { id, desc: desc === "desc" };
  });
}

export function stringifySorting(s: SortingState): string | null {
  if (!s?.length) return null;
  return s.map((x) => `${x.id}:${x.desc ? "desc" : "asc"}`).join(",");
}

export function parseFilters(param: string | null): ColumnFiltersState {
  if (!param) return [];
  return param.split(",").map((item) => {
    const [id, value] = item.split(":");
    return { id, value };
  });
}

export function stringifyFilters(filters: ColumnFiltersState): string | null {
  if (!filters?.length) return null;
  return filters.map((f) => `${f.id}:${f.value}`).join(",");
}

/**
 * Sjednocený tvar dotazu napříč všemi list API endpointy: sortBy/sortDir pro
 * řazení, page/size pro stránkování. Volat na začátku dataFetcheru, pak do
 * stejného `params` doplnit filtry specifické pro daný endpoint.
 *
 * `sortIdMap` umožní přemapovat id sloupce z tabulky na jiný název sort pole
 * na backendu (např. sloupec "manager" -> sortBy=manager, pokud by se pole
 * jmenovalo jinak).
 */
export function applyListQueryParams(
  params: URLSearchParams,
  request: {
    sorting: { id: string; desc: boolean }[];
    pagination: { pageIndex: number; pageSize: number };
  },
  sortIdMap?: Record<string, string>,
): void {
  if (request.sorting.length > 0) {
    const sort = request.sorting[0];
    params.set("sortBy", sortIdMap?.[sort.id] ?? sort.id);
    params.set("sortDir", sort.desc ? "desc" : "asc");
  }

  params.set("page", String(request.pagination.pageIndex));
  params.set("size", String(request.pagination.pageSize));
}
