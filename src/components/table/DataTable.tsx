"use client";

import * as React from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import {
  useTable,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { tableFeaturesConfig, type AppRowData, type ColumnDef, type AppTable } from "./features";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  Stack,
  Table,
  Paper,
  Text,
  Box,
  Center,
  ScrollArea,
  TextInput,
  Select,
} from "@mantine/core";
import {
  type ServerTableConfig,
  defaultTableConfig,
  TableTopControls,
  TablePagination,
  TableEmptyState,
} from "./TableComponents";

interface DataTableRequest {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
}

interface DataTableResponse<TData> {
  data: TData[];
  meta: {
    totalCount: number;
    pageCount: number;
  };
}

type DataFetcher<TData> = (
  request: DataTableRequest,
) => Promise<DataTableResponse<TData>>;

interface DataTableProps<TData extends AppRowData> {
  columns: ColumnDef<TData>[];
  dataFetcher: DataFetcher<TData>;
  config?: ServerTableConfig;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  onTableReady?: (table: AppTable<TData>) => void;
  onRowSelectionChange?: (rowSelection: RowSelectionState) => void;
  clearSelection?: boolean;
  onClearSelectionReset?: () => void;
  onMountRefresh?: (refresh: () => void) => void;
}

// Čistá funkce bez vedlejších efektů - bezpečná k volání z `useState(() =>
// ...)` lazy initializeru (ten se zavolá jen jednou, při prvním renderu).
function parseInitialTableState(
  searchParams: ReadonlyURLSearchParams,
  urlKey: string,
  defaultPageSize: number,
  defaultFilters: ColumnFiltersState,
): {
  sorting: SortingState;
  filters: ColumnFiltersState;
  pagination: PaginationState;
} {
  const params = new URLSearchParams(searchParams.toString());

  // Sorting
  const sortBy = params.get(`${urlKey}_sortBy`);
  const sortDir = params.get(`${urlKey}_sortDir`);
  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortDir === "desc" }]
    : [];

  // Pagination - use global setting as default
  const pageIndex = parseInt(params.get(`${urlKey}_page`) ?? "0", 10) || 0;
  const pageSize = parseInt(params.get(`${urlKey}_pageSize`) ?? "", 10);
  const pagination: PaginationState = {
    pageIndex,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0 ? pageSize : defaultPageSize,
  };

  // Filters: look for keys like `${urlKey}_filter_{id}`
  const urlFilterIds = new Set<string>();
  const filters: ColumnFiltersState = [];
  params.forEach((value, key) => {
    if (key.startsWith(`${urlKey}_filter_`)) {
      const id = key.replace(`${urlKey}_filter_`, "");
      urlFilterIds.add(id);
      filters.push({ id, value });
    }
  });

  // Config-level defaults fill in only for columns the URL doesn't
  // already specify - a deep link/bookmark always wins over the default.
  for (const defaultFilter of defaultFilters) {
    if (!urlFilterIds.has(defaultFilter.id)) {
      filters.push(defaultFilter);
    }
  }

  return { sorting, filters, pagination };
}

/**
 * DataTable - Unified server-side table with URL synchronization and state management
 */
export function DataTable<TData extends AppRowData>({
  columns,
  dataFetcher,
  config = {},
  isLoading: externalLoading = false,
  error: externalError = null,
  className,
  onTableReady,
  onRowSelectionChange,
  clearSelection,
  onClearSelectionReset,
  onMountRefresh,
}: DataTableProps<TData>) {
  const searchParams = useSearchParams();
  const urlKey = config.urlStateKey || "table";
  const { tableRowsPerPage } = useAppSettings();
  const finalConfig = { ...defaultTableConfig, ...config };

  // Component state
  const [data, setData] = React.useState<TData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // Start with true to show loading on mount
  const [error, setError] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState({
    totalCount: 0,
    pageCount: 0,
  });

  // Table state - lazy-initialized z URL jen při prvním renderu (lazy
  // initializer funkce se zavolá jen jednou, React ji nikdy nespustí
  // znovu) - nahrazuje dřívější `useRef` + `if (!ref.current)` vzor,
  // který nová verze `eslint-plugin-react-hooks` (react-hooks/refs)
  // odmítá jako čtení ref hodnoty během renderu.
  //
  // Výchozí pageSize bez URL override: globální `tableRowsPerPage`
  // (profilové nastavení) vítězí nad `config.initialPageSize` dané
  // tabulky - dřívější `useEffect` toto pořadí stejně vždycky obracel
  // hned po mountu, `config.initialPageSize` byl tak fakticky jen
  // krátký záblesk před prvním přepsáním. Zachováno zde napřímo, ne přes
  // dodatečný sync efekt po mountu.
  // Jedna sdílená počáteční hodnota - všechny stavy níž berou stejné
  // reference (hlavně `columnFilters` a `debouncedFilters`). Samostatné
  // lazy initializery by vytvořily shodná, ale různá pole, a debounce
  // efekt by pak při prvním přepsání způsobil zbytečné druhé načtení dat.
  const [initialState] = React.useState(() =>
    parseInitialTableState(
      searchParams,
      urlKey,
      tableRowsPerPage || finalConfig.initialPageSize || 10,
      config.defaultFilters || [],
    ),
  );
  const [sorting, setSorting] = React.useState<SortingState>(
    initialState.sorting,
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialState.filters,
  );
  const [pagination, setPagination] = React.useState<PaginationState>(
    initialState.pagination,
  );
  const [rowSelection, setRowSelection] =
    React.useState<RowSelectionState>({});

  // Sync page size s globálním nastavením appky: na prvním mountu URL
  // deep link/bookmark vyhrává (to řeší lazy initializer výš, podívá se
  // do URL než na cokoli jiného) - tenhle efekt se proto na mountu
  // přeskočí (`didMountRef` guard). Jakákoli POZDĘJŠÍ živá změna
  // `tableRowsPerPage` (uživatel klikne v Nastavení appky na jiný počet
  // řádků, zatímco má tabulku otevřenou) je ale jasně vyjádřený nový
  // záměr právě teď - má se uplatnit na právě otevřené tabulce vždycky,
  // i když už má v URL vlastní pageSize z dřívějška.
  const didMountRef = React.useRef(false);
  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setPagination(() => ({
      pageIndex: 0,
      pageSize: tableRowsPerPage,
    }));
  }, [tableRowsPerPage]);

  // Debounced filters
  const [debouncedFilters, setDebouncedFilters] =
    React.useState<ColumnFiltersState>(initialState.filters);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(columnFilters);
    }, finalConfig.filterDebounce || 300);
    return () => clearTimeout(timer);
  }, [columnFilters, finalConfig.filterDebounce]);

  // Track if first fetch completed to avoid URL update race
  const canPushRef = React.useRef(false);
  const prevRequestRef = React.useRef<string>("");
  const [refreshCounter, setRefreshCounter] = React.useState(0);

  // Provide refresh function to parent
  React.useEffect(() => {
    if (onMountRefresh) {
      onMountRefresh(() => {
        setRefreshCounter((c) => c + 1);
      });
    }
  }, [onMountRefresh]);

  // Data fetching with URL synchronization
  React.useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const request = {
          sorting,
          columnFilters: debouncedFilters,
          pagination,
        };

        const response = await dataFetcher(request);

        if (abortController.signal.aborted) {
          return;
        }

        setData(response.data);
        setMeta(response.meta);

        // Update URL after successful fetch
        const requestKey = JSON.stringify({
          sorting: request.sorting,
          filters: request.columnFilters,
          page: request.pagination.pageIndex,
          size: request.pagination.pageSize,
        });

        const requestChanged = prevRequestRef.current !== requestKey;

        if (requestChanged && canPushRef.current) {
          const newParams = new URLSearchParams();

          // Sorting
          if (request.sorting.length > 0) {
            const sort = request.sorting[0];
            newParams.set(`${urlKey}_sortBy`, sort.id);
            newParams.set(`${urlKey}_sortDir`, sort.desc ? "desc" : "asc");
          }

          // Pagination
          newParams.set(`${urlKey}_page`, String(request.pagination.pageIndex));
          newParams.set(
            `${urlKey}_pageSize`,
            String(request.pagination.pageSize),
          );

          // Filters
          request.columnFilters.forEach((filter) => {
            newParams.set(
              `${urlKey}_filter_${filter.id}`,
              String(filter.value),
            );
          });

          // Raw history API, ne router.replace(): next/navigation nemá
          // shallow routing, takže i replace() jen s query stringem
          // vynutí nové RSC vykreslení - klientské komponenty (včetně
          // rozepsaného filtru) se strhnou a postaví znovu, což vypadá
          // jako přenačtení stránky a shodí focus z rozepsaného inputu.
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}?${newParams.toString()}`,
          );
        }

        prevRequestRef.current = requestKey;
        canPushRef.current = true;
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Error fetching table data:", err);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [dataFetcher, sorting, debouncedFilters, pagination, urlKey, refreshCounter]);

  // TanStack Table setup (v9 - row modely jsou registrované staticky v
  // tableFeaturesConfig, viz ./features.ts; enableSorting/enableColumnFilters
  // tady jen řídí, jestli appka tu featuru pro tuhle instanci skutečně
  // povoluje - na manual* chování to nemá vliv, appka je celá server-side)
  const table = useTable({
    features: tableFeaturesConfig,
    data,
    columns,
    enableSorting: finalConfig.enableSorting,
    enableColumnFilters: finalConfig.enableFiltering,
    manualSorting: true, // Server-side
    manualFiltering: true, // Server-side
    manualPagination: true, // Server-side
    enableRowSelection: true,
    getRowId: (row: TData) => {
      const typedRow = row as TData & { id?: string | number };
      return String(typedRow.id || "");
    },
    pageCount: meta.pageCount,
    state: {
      sorting,
      columnFilters,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
  });

  // Notify parent when table is ready
  React.useEffect(() => {
    if (onTableReady) {
      onTableReady(table);
    }
  }, [table, onTableReady]);

  // Notify parent when row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      onRowSelectionChange(rowSelection);
    }
  }, [rowSelection, onRowSelectionChange]);

  // Handle clear selection request from parent: reset selection state
  // during render when `clearSelection` flips (stejný "adjusting state
  // when a prop changes" vzor jako u tableRowsPerPage výš) - zavolání
  // `onClearSelectionReset` zůstává v efektu, protože vyvolání
  // rodičovského callbacku je samo o sobě vedlejší efekt, ne setState,
  // na který `react-hooks/set-state-in-effect` cílí.
  const [prevClearSelection, setPrevClearSelection] =
    React.useState(clearSelection);
  if (clearSelection !== prevClearSelection) {
    setPrevClearSelection(clearSelection);
    if (clearSelection) {
      setRowSelection({});
    }
  }

  React.useEffect(() => {
    if (clearSelection && onClearSelectionReset) {
      onClearSelectionReset();
    }
  }, [clearSelection, onClearSelectionReset]);

  // Render column filter based on configuration
  const renderColumnFilter = (column: { id: string }) => {
    if (!finalConfig.enableFiltering) return null;

    const tableColumn = table.getColumn(column.id);
    const filterValue = tableColumn?.getFilterValue() as string | undefined;

    // Get filter config from meta
    const filterConfig = tableColumn?.columnDef.meta?.filterConfig;

    if (!filterConfig || filterConfig.type === "none") {
      return null;
    }

    switch (filterConfig.type) {
      case "boolean":
        return (
          <Select
            size="xs"
            placeholder="Všechny"
            value={filterValue || null}
            onChange={(value) =>
              tableColumn?.setFilterValue(value || undefined)
            }
            data={[
              { value: "true", label: "Ano" },
              { value: "false", label: "Ne" },
            ]}
            clearable
            style={{ minWidth: "80px" }}
          />
        );

      case "select":
        return (
          <Select
            size="xs"
            placeholder={filterConfig.placeholder || "Vyberte..."}
            value={filterValue || null}
            onChange={(value) =>
              tableColumn?.setFilterValue(value || undefined)
            }
            data={filterConfig.options || []}
            clearable
            style={{ minWidth: "120px" }}
          />
        );

      case "text":
      default:
        return (
          <TextInput
            size="xs"
            placeholder={filterConfig.placeholder || `Filter ${column.id}...`}
            value={filterValue || ""}
            onChange={(e) =>
              tableColumn?.setFilterValue(e.target.value || undefined)
            }
            style={{ minWidth: "120px" }}
          />
        );
    }
  };

  const finalError = error || externalError;
  const finalLoading = isLoading || externalLoading;

  return (
    <Paper shadow="xs" p="md" className={className}>
      <Stack gap="md">
        {/* Top controls */}
        {finalConfig.enablePagination && (
          <TableTopControls
            totalRows={meta.totalCount}
            table={table}
            config={finalConfig}
          />
        )}

        {/* Error state */}
        {finalError && (
          <Box p="md">
            <Text c="red" size="sm">
              {finalError}
            </Text>
          </Box>
        )}

        {/* Table */}
        <ScrollArea>
          <Table
            striped={finalConfig.striped}
            highlightOnHover={finalConfig.highlightOnHover}
            withTableBorder
            withColumnBorders
          >
            <Table.Thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    // Special handling for selection column
                    if (header.id === "select") {
                      return (
                        <Table.Th key={header.id} style={{ width: "50px" }}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </Table.Th>
                      );
                    }

                    const filterComponent = renderColumnFilter(header.column);

                    return (
                      <Table.Th key={header.id}>
                        <Stack gap="xs">
                          {/* Header with sorting */}
                          {header.isPlaceholder ? null : (
                            <Box
                              style={{
                                cursor:
                                  header.column.getCanSort() &&
                                  finalConfig.enableSorting
                                    ? "pointer"
                                    : "default",
                              }}
                              onClick={
                                finalConfig.enableSorting
                                  ? header.column.getToggleSortingHandler()
                                  : undefined
                              }
                            >
                              <Text
                                component="span"
                                fw={500}
                                size="sm"
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  alignItems: "center",
                                }}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                                {finalConfig.enableSorting &&
                                  header.column.getCanSort() && (
                                    <Text
                                      size="sm"
                                      c={
                                        header.column.getIsSorted()
                                          ? "blue"
                                          : "dimmed"
                                      }
                                      fw={
                                        header.column.getIsSorted() ? 700 : 400
                                      }
                                      style={{
                                        minWidth: "16px",
                                        textAlign: "center",
                                        opacity: header.column.getIsSorted()
                                          ? 1
                                          : 0.5,
                                      }}
                                    >
                                      {header.column.getIsSorted() === "asc" &&
                                        "↑"}
                                      {header.column.getIsSorted() === "desc" &&
                                        "↓"}
                                      {!header.column.getIsSorted() && "⇅"}
                                    </Text>
                                  )}
                              </Text>
                            </Box>
                          )}

                          {/* Filter component */}
                          {filterComponent}
                        </Stack>
                      </Table.Th>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Thead>

            <Table.Tbody>
              {finalLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={columns.length}>
                    <Center p="xl">
                      <Text c="dimmed">Načítání...</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={columns.length}>
                    <TableEmptyState />
                  </Table.Td>
                </Table.Tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <Table.Tr key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <Table.Td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {finalConfig.enablePagination && (
          <TablePagination
            table={table}
            totalRows={meta.totalCount}
            isLoading={finalLoading}
          />
        )}
      </Stack>
    </Paper>
  );
}
