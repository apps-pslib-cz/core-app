"use client";

import React from "react";
import Link from "next/link";
import {
  Badge,
  Group,
  ActionIcon,
  Tooltip,
  Anchor,
  Avatar,
} from "@mantine/core";
import { IconEdit, IconTrash, IconEye } from "@tabler/icons-react";
import { DataTable, applyListQueryParams, createColumnHelper } from "@/components/table";
import type { UserListDto } from "@/types/dtos/users";
import type { ListResult } from "@/types/data";
import { useDictionary } from "@/hooks";
import { APP_ROLES } from "@/types/roles";

interface UserTableProps {
  onEdit?: (user: UserListDto) => void;
  onDelete?: (user: UserListDto) => void;
  onView?: (user: UserListDto) => void;
  onMountRefresh?: (refresh: () => void) => void;
}

const columnHelper = createColumnHelper<UserListDto>();

// Barvy pro badge jednotlivých rolí appky, podle pořadí v APP_ROLES -
// pokud appka přidá víc rolí, než má paleta barev, zbylé dostanou "gray".
const ROLE_BADGE_COLORS = ["red", "blue", "teal", "violet", "orange"];

export function UserTable({
  onEdit,
  onDelete,
  onView,
  onMountRefresh,
}: UserTableProps) {
  const { dictionary } = useDictionary();

  // Definice sloupců
  const columns = React.useMemo(
    () =>
      columnHelper.columns([
      columnHelper.display({
        id: "avatar",
        header: "",
        meta: {
          filterConfig: { type: "none" },
        },
        cell: (info) => {
          const user = info.row.original;
          return (
            <Avatar
              src={`/api/v1/users/${user.id}/avatar`}
              alt={`${user.givenName} ${user.familyName}`}
              size="sm"
              radius="xl"
            >
              {`${user.givenName?.[0] || ""}${user.familyName?.[0] || ""}`}
            </Avatar>
          );
        },
        enableSorting: false,
      }),
      columnHelper.accessor("givenName", {
        header: dictionary?.users?.fields?.givenName || "Given Name",
        meta: {
          filterConfig: {
            type: "text",
            placeholder: "Křestní jméno...",
          },
        },
        cell: (info) => <>{info.getValue()}</>,
        enableSorting: true,
      }),
      columnHelper.accessor("familyName", {
        header: dictionary?.users?.fields?.familyName || "Family Name",
        meta: {
          filterConfig: {
            type: "text",
            placeholder: "Příjmení...",
          },
        },
        cell: (info) => {
          const user = info.row.original;
          const fullFamilyName = [user.middleName, user.familyName]
            .filter(Boolean)
            .join(" ");
          return (
            <Anchor
              href={`/dashboard/users/${info.row.original.id}`}
              component={Link}
            >
              {fullFamilyName}
            </Anchor>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor("email", {
        header: dictionary?.users?.fields?.email || "Email",
        meta: {
          filterConfig: {
            type: "text",
            placeholder: "Email...",
          },
        },
        cell: (info) => (
          <Anchor href={`mailto:${info.getValue()}`}>{info.getValue()}</Anchor>
        ),
        enableSorting: true,
      }),
      // Jedna boolean-filtrovaná buňka za každou roli appky (APP_ROLES) -
      // nahrazuje dřívější pevné sloupce author/evaluator/admin.
      ...APP_ROLES.map((role, index) =>
        columnHelper.display({
          id: role,
          header:
            (dictionary?.users?.fields as Record<string, string> | undefined)?.[
              role
            ] || role,
          meta: {
            filterConfig: { type: "boolean" },
          },
          cell: (info) => {
            const hasRole = info.row.original.roles.includes(role);
            return (
              <Badge
                color={hasRole ? ROLE_BADGE_COLORS[index % ROLE_BADGE_COLORS.length] : "gray"}
                size="sm"
              >
                {hasRole ? "Ano" : "Ne"}
              </Badge>
            );
          },
          enableSorting: false,
          filterFn: "equals",
        }),
      ),
      columnHelper.accessor("isTestAccount", {
        header: "Testovací",
        meta: {
          filterConfig: { type: "boolean" },
        },
        cell: (info) =>
          info.getValue() ? (
            <Badge color="orange" size="sm">
              Testovací
            </Badge>
          ) : null,
        enableSorting: false,
        filterFn: "equals",
      }),
      columnHelper.accessor("active", {
        header: "Aktivní",
        meta: {
          filterConfig: { type: "boolean" },
        },
        cell: (info) =>
          info.getValue() ? null : (
            <Badge color="gray" size="sm">
              Neaktivní
            </Badge>
          ),
        enableSorting: false,
        filterFn: "equals",
      }),
      columnHelper.display({
        id: "actions",
        header: "Akce",
        meta: {
          filterConfig: { type: "none" },
        },
        cell: (info) => {
          const user = info.row.original;

          return (
            <Group gap="xs">
              {onView && (
                <Tooltip label="Zobrazit">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    size="sm"
                    onClick={() => onView(user)}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              {onEdit && (
                <Tooltip label={dictionary?.common?.edit || "Edit"}>
                  <ActionIcon
                    variant="subtle"
                    color="orange"
                    size="sm"
                    onClick={() => onEdit(user)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip label={dictionary?.common?.delete || "Delete"}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => onDelete(user)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          );
        },
        enableSorting: false,
      }),
      ]),
    [dictionary, onEdit, onDelete, onView],
  );

  // Zjednodušený data fetcher
  const dataFetcher = React.useCallback(
    async (request: {
      sorting: { id: string; desc: boolean }[];
      columnFilters: { id: string; value: unknown }[];
      pagination: { pageIndex: number; pageSize: number };
    }) => {
      const params = new URLSearchParams();
      applyListQueryParams(params, request);

      const booleanFilterIds = new Set<string>([
        ...APP_ROLES,
        "isTestAccount",
        "active",
      ]);

      // Filtrování
      request.columnFilters.forEach((filter) => {
        if (filter.value && String(filter.value).trim()) {
          const filterValue = String(filter.value);

          if (booleanFilterIds.has(filter.id)) {
            params.set(filter.id, filterValue === "true" ? "true" : "false");
          } else {
            // Textové filtry
            params.set(filter.id, filterValue);
          }
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
          pageCount: Math.ceil(
            (result.total || 0) / request.pagination.pageSize,
          ),
        },
      };
    },
    [],
  );

  const tableConfig = React.useMemo(
    () => ({
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 20, 50],
    }),
    [],
  );

  return (
    <DataTable<UserListDto>
      columns={columns}
      dataFetcher={dataFetcher}
      config={tableConfig}
      onMountRefresh={onMountRefresh}
    />
  );
}
