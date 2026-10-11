import { z } from "zod";

/**
 * Sdílený tvar stránkování napříč všemi list endpointy: page (0-based), size.
 */
export const PageQuerySchemaShape = {
  page: z.coerce.number().int().min(0).optional().default(0),
  size: z.coerce.number().int().min(1).max(100).optional().default(20),
};

/**
 * Sdílený tvar řazení: sortBy (jedno z povolených polí daného endpointu) + sortDir.
 * Používat jako `...sortQuerySchemaShape(["name", "status", ...])` uvnitř
 * `z.object({...})` konkrétního endpointu.
 */
export function sortQuerySchemaShape<T extends [string, ...string[]]>(fields: T) {
  return {
    sortBy: z.enum(fields).optional(),
    sortDir: z.enum(["asc", "desc"]).optional().default("asc"),
  };
}
