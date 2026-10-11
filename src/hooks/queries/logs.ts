"use client";

import { useQuery } from "@tanstack/react-query";

export type LogLevel = "all" | "debug" | "info" | "warn" | "error";

export interface LogsResponse {
  files: string[];
  selectedFile: string | null;
  level?: LogLevel;
  lines: string[];
  totalMatched?: number;
}

export const logsKeys = {
  all: ["logs"] as const,
  list: (file: string | null, level: LogLevel, search: string) =>
    ["logs", "list", file, level, search] as const,
};

async function fetchLogs(params: {
  file: string | null;
  level: LogLevel;
  search: string;
}): Promise<LogsResponse> {
  const query = new URLSearchParams();
  if (params.file) query.set("file", params.file);
  query.set("level", params.level);
  query.set("lines", "300");
  if (params.search.trim()) query.set("search", params.search.trim());

  const res = await fetch(`/api/admin/logs?${query.toString()}`);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export function useLogs(params: {
  file: string | null;
  level: LogLevel;
  search: string;
}) {
  return useQuery({
    queryKey: logsKeys.list(params.file, params.level, params.search),
    queryFn: () => fetchLogs(params),
  });
}
