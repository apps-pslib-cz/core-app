// Table komponenty
export { DataTable } from "./DataTable";

// TanStack Table v9 - featury appky, createColumnHelper/ColumnDef svázané
// s nimi - stránky importují odtud, ne přímo z @tanstack/react-table.
export {
  tableFeaturesConfig,
  createColumnHelper,
  type AppTableFeatures,
  type AppRowData,
  type ColumnDef,
  type AppTable,
} from "./features";

// Společné komponenty a typy
export {
  TableTopControls,
  TablePagination,
  TableEmptyState,
  type BaseTableConfig,
  type ServerTableConfig,
  defaultTableConfig,
} from "./TableComponents";

// Typy a interface
export type {
  TableDataRequest,
  TableDataResponse,
  TableDataFetcher,
  TableState,
  FilterType,
  SelectOption,
  ColumnFilterConfig,
} from "./types";

// Utilities
export {
  parseSorting,
  stringifySorting,
  parseFilters,
  stringifyFilters,
  applyListQueryParams,
} from "./utils";
export { createColumnWithFilter, FilterConfigs } from "./helpers";
