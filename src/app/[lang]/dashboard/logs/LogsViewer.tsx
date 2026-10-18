"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle, IconReload, IconSearch } from "@tabler/icons-react";
import { useDictionary } from "@/hooks/useDictionary";
import { useLogs, type LogLevel } from "@/hooks/queries/logs";

export default function LogsViewer() {
  const { dictionary } = useDictionary();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [level, setLevel] = useState<LogLevel>("all");
  const [search, setSearch] = useState("");
  const [hasAutoSelectedFile, setHasAutoSelectedFile] = useState(false);

  const { data, isFetching, error, refetch } = useLogs({
    file: selectedFile,
    level,
    search,
  });

  // Server zvolí výchozí soubor při prvním dotazu bez `file` parametru a
  // vrátí ho v odpovědi - jednou ho převezmeme do lokálního stavu, aby
  // další dotazy (změna úrovně/filtru) cílily na stejný soubor. Nastavení
  // stavu během renderu (ne v useEffect) je tu záměrné - React tenhle
  // vzor pro "přizpůsob stav při změně dat" podporuje a vyhne se
  // synchronnímu setState v těle efektu.
  if (!hasAutoSelectedFile && data?.selectedFile) {
    setHasAutoSelectedFile(true);
    setSelectedFile(data.selectedFile);
  }

  const levelOptions = useMemo(
    () => [
      {
        value: "all",
        label: dictionary?.logs?.levels?.all || "Všechny",
      },
      {
        value: "debug",
        label: dictionary?.logs?.levels?.debug || "Debug",
      },
      {
        value: "info",
        label: dictionary?.logs?.levels?.info || "Info",
      },
      {
        value: "warn",
        label: dictionary?.logs?.levels?.warn || "Warn",
      },
      {
        value: "error",
        label: dictionary?.logs?.levels?.error || "Error",
      },
    ],
    [dictionary],
  );

  const fileOptions = useMemo(
    () => (data?.files ?? []).map((file) => ({ value: file, label: file })),
    [data?.files],
  );

  const lines = data?.lines ?? [];
  const totalMatched = data?.totalMatched ?? 0;
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : dictionary?.logs?.messages?.loadError || "Nepodařilo se načíst logy"
    : null;

  return (
    <Stack gap="md">
      <Group align="end" wrap="wrap">
        <Select
          label={dictionary?.logs?.fields?.file || "Soubor"}
          placeholder={
            dictionary?.logs?.fields?.filePlaceholder || "Vyberte log soubor"
          }
          data={fileOptions}
          value={selectedFile}
          onChange={setSelectedFile}
          w={320}
          searchable
          nothingFoundMessage={
            dictionary?.logs?.messages?.fileNotFound || "Soubor nebyl nalezen"
          }
        />

        <Select
          label={dictionary?.logs?.fields?.level || "Úroveň"}
          data={levelOptions}
          value={level}
          onChange={(value) => setLevel((value as LogLevel) || "all")}
          w={140}
        />

        <TextInput
          label={dictionary?.logs?.fields?.filter || "Filtr"}
          placeholder={
            dictionary?.logs?.fields?.filterPlaceholder || "Text v logu"
          }
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          leftSection={<IconSearch size={14} />}
          w={260}
        />

        <Button
          variant="default"
          leftSection={<IconReload size={14} />}
          onClick={() => refetch()}
          loading={isFetching}
        >
          {dictionary?.logs?.actions?.refresh || "Obnovit"}
        </Button>
      </Group>

      {errorMessage && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {errorMessage}
        </Alert>
      )}

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {dictionary?.logs?.stats?.loadedLines || "Načteno řádků"}: {lines.length}
        </Text>
        <Badge variant="light">
          {dictionary?.logs?.stats?.matched || "Shoda"}: {totalMatched}
        </Badge>
      </Group>

      <Paper withBorder p="sm" style={{ minHeight: 420, maxHeight: 620, overflow: "auto" }}>
        {isFetching ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : lines.length === 0 ? (
          <Text size="sm" c="dimmed">
            {dictionary?.logs?.messages?.noMatches ||
              "Žádný záznam neodpovídá filtru."}
          </Text>
        ) : (
          <Stack gap={4}>
            {lines.map((line, index) => (
              <Text key={`${index}-${line.slice(0, 16)}`} ff="monospace" size="xs">
                {line}
              </Text>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
