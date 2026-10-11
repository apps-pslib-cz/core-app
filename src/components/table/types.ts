import {
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";

// Typy filtrů pro sloupce
export type FilterType = "text" | "select" | "boolean" | "none";

export interface SelectOption {
  value: string;
  label: string;
}

export interface ColumnFilterConfig {
  type: FilterType;
  options?: SelectOption[]; // Pro type: 'select'
  placeholder?: string; // Pro všechny kromě 'none'
}

// V9: ColumnMeta se typuje přes `metaHelper()` registrovaný v
// src/components/table/features.ts, ne přes globální declare module (to
// bylo v8 jediný způsob, v9 ho dokumentace přímo označuje jako nevhodný
// vzor - meta typy mají zůstat svázané s konkrétní tableFeatures()
// instancí, ne globální).

export interface TableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
}

export interface TableDataRequest {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
}

export interface TableDataResponse<TData> {
  data: TData[];
  meta: {
    totalCount: number;
    pageCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type TableDataFetcher<TData> = (
  request: TableDataRequest,
) => Promise<TableDataResponse<TData>> | TableDataResponse<TData>;
