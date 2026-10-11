"use client";

import * as React from "react";
import { Group, Text, Pagination } from "@mantine/core";
import { useDictionary } from "@/hooks";
import type { AppTable, AppRowData } from "./features";

// Společné typy pro všechny table komponenty
export interface BaseTableConfig {
  initialPageSize?: number;
  pageSizeOptions?: number[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  striped?: boolean;
  highlightOnHover?: boolean;
  filterDebounce?: number;
  urlStateKey?: string; // For URL state synchronization in DataTable
  // Filters applied on first load unless the URL already specifies a value
  // for the same column (URL always wins, so deep links/bookmarks still work).
  defaultFilters?: { id: string; value: string }[];
}

export type ServerTableConfig = BaseTableConfig;

export const defaultTableConfig: BaseTableConfig = {
  initialPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
  enableSorting: true,
  enableFiltering: true,
  enablePagination: true,
  striped: true,
  highlightOnHover: true,
  filterDebounce: 300,
};

// Společné komponenty

interface TableTopControlsProps<TData extends AppRowData = AppRowData> {
  totalRows: number;
  table: AppTable<TData>;
  config: BaseTableConfig;
}

export function TableTopControls<TData extends AppRowData>({
  totalRows,
}: TableTopControlsProps<TData>) {
  const { dictionary } = useDictionary();

  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {dictionary?.table?.pagination?.total || "Total"}: {totalRows}{" "}
        {dictionary?.table?.pagination?.rows || "rows"}
      </Text>
    </Group>
  );
}

interface TablePaginationProps<TData extends AppRowData = AppRowData> {
  table: AppTable<TData>;
  totalRows: number;
  isLoading?: boolean;
}

export function TablePagination<TData extends AppRowData>({
  table,
  totalRows,
  isLoading,
}: TablePaginationProps<TData>) {
  const { dictionary } = useDictionary();

  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {dictionary?.table?.pagination?.showing || "Showing"}{" "}
        {table.getRowModel().rows.length}{" "}
        {dictionary?.table?.pagination?.of || "of"} {totalRows}{" "}
        {dictionary?.table?.pagination?.rows || "rows"}
      </Text>

      <Pagination
        value={table.state.pagination.pageIndex + 1}
        total={table.getPageCount()}
        onChange={(page) => table.setPageIndex(page - 1)}
        disabled={isLoading}
        size="sm"
      />
    </Group>
  );
}

interface TableEmptyStateProps {
  message?: string;
}

export function TableEmptyState({ message }: TableEmptyStateProps) {
  const { dictionary } = useDictionary();

  return (
    <Group justify="center" p="xl">
      <Text c="dimmed">
        {message || dictionary?.table?.states?.noData || "No data available"}
      </Text>
    </Group>
  );
}
