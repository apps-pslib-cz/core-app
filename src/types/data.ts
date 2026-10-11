export type ListResult<T> = {
  data: T[];
  count: number;
  total: number;
  page: number | null;
  size: number | null;
  cursor: string | null;
  filters: string[];
  order: string | null;
};

export type SelectItem = { value: string; label: string };
