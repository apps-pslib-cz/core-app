import type { CellContext, AccessorFn } from "@tanstack/react-table";
import type { ColumnFilterConfig } from "./types";
import type { createColumnHelper, AppTableFeatures, AppRowData } from "./features";

/**
 * Helper funkce pro vytváření sloupců s filtry
 */
export function createColumnWithFilter<TData extends AppRowData>(
  columnHelper: ReturnType<typeof createColumnHelper<TData>>,
  accessor: AccessorFn<TData> | keyof TData | string,
  options: {
    header: string;
    filterConfig: ColumnFilterConfig;
    enableSorting?: boolean;
    cell?: (context: CellContext<AppTableFeatures, TData, unknown>) => React.ReactNode;
  },
) {
  if (typeof accessor === "string" && accessor.includes(".")) {
    // Display column pro komplexní případy
    return columnHelper.display({
      id: accessor,
      header: options.header,
      meta: {
        filterConfig: options.filterConfig,
      },
      cell: options.cell,
      enableSorting: options.enableSorting ?? false,
    });
  }

  // Accessor column pro jednoduché případy
  // @ts-expect-error - TanStack Table má komplikované typy pro accessor
  return columnHelper.accessor(accessor, {
    header: options.header,
    meta: {
      filterConfig: options.filterConfig,
    },
    cell: options.cell,
    enableSorting: options.enableSorting ?? true,
  });
}

/**
 * Předpřipravené konfigurace filtrů
 */
export const FilterConfigs = {
  text: (placeholder?: string): ColumnFilterConfig => ({
    type: "text",
    placeholder,
  }),

  boolean: (): ColumnFilterConfig => ({
    type: "boolean",
  }),

  select: (
    options: Array<{ value: string; label: string }>,
    placeholder?: string,
  ): ColumnFilterConfig => ({
    type: "select",
    options,
    placeholder,
  }),

  none: (): ColumnFilterConfig => ({
    type: "none",
  }),
};

/**
 * Příklady použití:
 *
 * // Textový filtr
 * createColumnWithFilter(columnHelper, 'name', {
 *   header: 'Name',
 *   filterConfig: FilterConfigs.text('Search name...'),
 * })
 *
 * // Boolean filtr
 * createColumnWithFilter(columnHelper, 'isActive', {
 *   header: 'Active',
 *   filterConfig: FilterConfigs.boolean(),
 *   cell: (info) => info.getValue() ? 'Yes' : 'No', // v9: volat na instanci, ne destrukturovat
 * })
 *
 * // Select filtr
 * createColumnWithFilter(columnHelper, 'status', {
 *   header: 'Status',
 *   filterConfig: FilterConfigs.select([
 *     { value: 'active', label: 'Active' },
 *     { value: 'inactive', label: 'Inactive' },
 *   ], 'All statuses'),
 * })
 *
 * // Žádný filtr
 * createColumnWithFilter(columnHelper, 'actions', {
 *   header: 'Actions',
 *   filterConfig: FilterConfigs.none(),
 *   enableSorting: false,
 *   cell: (info) => <ActionButtons user={info.row.original} />, // v9: volat na instanci, ne destrukturovat
 * })
 */
