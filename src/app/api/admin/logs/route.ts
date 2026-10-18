import fs from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { requireAuthentication } from "@/libs/apiAuth";
import { withErrorHandling } from "@/libs/errors";

type LogLevelFilter = "all" | "debug" | "info" | "warn" | "error";

function lineMatchesLevel(line: string, level: LogLevelFilter): boolean {
  if (level === "all") return true;

  const normalized = line.toLowerCase();

  if (level === "debug") {
    return normalized.includes(" debug") || normalized.includes('"level":"debug"');
  }

  if (level === "info") {
    return normalized.includes(" info") || normalized.includes('"level":"info"');
  }

  if (level === "warn") {
    return normalized.includes(" warn") || normalized.includes('"level":"warn"');
  }

  return normalized.includes(" error") || normalized.includes('"level":"error"');
}

async function GET_impl(req: NextRequest) {
  await requireAuthentication(req, { requireRole: "admin" });

  const { searchParams } = new URL(req.url);
  const selectedFile = searchParams.get("file") || null;
  const level = (searchParams.get("level") || "all") as LogLevelFilter;
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const requestedLines = Number.parseInt(searchParams.get("lines") || "200", 10);
  const linesLimit = Number.isFinite(requestedLines)
    ? Math.min(Math.max(requestedLines, 20), 1000)
    : 200;

  const logsDir = path.resolve(process.env.LOG_FILE_PATH || "./logs");

  try {
    await fs.mkdir(logsDir, { recursive: true });
  } catch {
    return Response.json({ files: [], selectedFile: null, lines: [] });
  }

  const allEntries = await fs.readdir(logsDir, { withFileTypes: true });
  const files = allEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));

  if (files.length === 0) {
    return Response.json({ files, selectedFile: null, lines: [] });
  }

  const fileToRead = files.includes(selectedFile || "") ? selectedFile! : files[0];
  const filePath = path.join(logsDir, fileToRead);
  const raw = await fs.readFile(filePath, "utf8");

  const filtered = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .filter((line) => lineMatchesLevel(line, level))
    .filter((line) => (search ? line.toLowerCase().includes(search) : true));

  const lines = filtered.slice(-linesLimit);

  return Response.json({
    files,
    selectedFile: fileToRead,
    level,
    lines,
    totalMatched: filtered.length,
  });
}

export const GET = withErrorHandling(
  GET_impl as unknown as (req: Request) => Promise<Response>,
);
