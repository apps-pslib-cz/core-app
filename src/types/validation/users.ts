import { z } from "zod";
import { sortQuerySchemaShape } from "./listQuery";
import { APP_ROLES, RoleChecker, type UserRole } from "@/types/roles";

/**
 * Zod schema pro validaci emailu
 */
const EmailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format");

/**
 * Zod schema pro validaci OAuth Subject ID
 */
const SubSchema = z.string().min(1, "OAuth Subject ID is required").trim();

/**
 * Zod schema pro validaci jména
 */
const NameSchema = z.string().min(1, "Name is required").trim();

/**
 * Optional identifier schema that converts blank form inputs to null so they
 * do not collide on unique nullable columns.
 */
const OptionalNullableIdentifierSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}, z.string().nullable().optional());

/**
 * Role appky (viz src/types/roles.ts APP_ROLES) - validováno jako seznam
 * znakových hodnot, ne enum s pevnými hodnotami, aby přidání nové role do
 * APP_ROLES nevyžadovalo úpravu schématu.
 */
const RolesSchema = z.array(z.string()).default([]);

/**
 * Zod schema pro vytvoření uživatele
 */
export const CreateUserSchema = z.object({
  email: EmailSchema,
  sub: SubSchema,
  name: z.string().optional(),
  givenName: NameSchema,
  middleName: z.string().optional(),
  familyName: NameSchema,
  roles: RolesSchema,
  allowAutoUpdate: z.boolean().default(true),
  notifyByEmail: z.boolean().default(true),
  notifyByTeams: z.boolean().default(false),
  sendActionNotifications: z.boolean().default(true),
  isTestAccount: z.boolean().default(false),
  active: z.boolean().default(true),
  entraId: OptionalNullableIdentifierSchema,
  teamsUserId: OptionalNullableIdentifierSchema,
});

/**
 * Zod schema pro aktualizaci uživatele
 */
export const UpdateUserSchema = z
  .object({
    email: EmailSchema.optional(),
    // Unlike creation, sub is legitimately blank until the person first logs
    // in via OAuth (syncUserProfile fills it in then) - editing other fields
    // must not force it, and a blank value must become null, not "", so it
    // doesn't collide with every other not-yet-logged-in user on the unique
    // constraint.
    sub: OptionalNullableIdentifierSchema,
    name: z.string().optional(),
    givenName: NameSchema.optional(),
    middleName: z.string().optional(),
    familyName: NameSchema.optional(),
    roles: z.array(z.string()).optional(),
    allowAutoUpdate: z.boolean().optional(),
    notifyByEmail: z.boolean().optional(),
    notifyByTeams: z.boolean().optional(),
    sendActionNotifications: z.boolean().optional(),
    isTestAccount: z.boolean().optional(),
    active: z.boolean().optional(),
    entraId: OptionalNullableIdentifierSchema,
    teamsUserId: OptionalNullableIdentifierSchema,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update",
  );

/**
 * Zod schema pro query parametry v GET /users - jedno volitelné
 * true/false pole za každou roli appky (viz APP_ROLES), generované
 * programaticky, aby přidání role do APP_ROLES automaticky rozšířilo i
 * filtr v seznamu.
 */
export const UsersQuerySchema = z.object({
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  ...Object.fromEntries(
    APP_ROLES.map((role) => [role, z.enum(["true", "false"]).optional()]),
  ),
  isTestAccount: z.enum(["true", "false"]).optional(),
  active: z.enum(["true", "false"]).optional(),
  // Volitelné, výchozí vypnuto - vrátí i avatarDataUrl (base64 data URI),
  // aby seznam/dropdown uživatelů nemusel dělat samostatný GET
  // /api/v1/users/{id}/avatar pro každou položku zvlášť.
  includeAvatars: z.enum(["true", "false"]).optional(),
  ...sortQuerySchemaShape([
    "name",
    "givenName",
    "familyName",
    "email",
    "createdAt",
    "updatedAt",
  ]),
  page: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().min(0))
    .optional(),
  size: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().min(1).max(100))
    .optional(),
});

/**
 * Type inferované ze schémat
 */
export type ValidatedCreateUser = z.infer<typeof CreateUserSchema>;
export type ValidatedUpdateUser = z.infer<typeof UpdateUserSchema>;
export type ValidatedUsersQuery = z.infer<typeof UsersQuerySchema>;

/**
 * Funkce pro validaci permission hierarchy při vytváření/úpravě uživatele.
 *
 * - Admin může vše.
 * - Roli "admin" smí přidělit jen admin (nikdo jiný, bez ohledu na vlastní role).
 * - Kdokoli jiný s alespoň jednou rolí appky (dashboard-level přístup) může
 *   vytvářet/upravovat běžné uživatele, jen nikdy nesmí přidělit "admin".
 */
export function validateUserPermissions(
  currentUser: { roles?: string[] },
  userData: ValidatedCreateUser | ValidatedUpdateUser,
): { success: true } | { success: false; error: string } {
  const currentRoles = { roles: currentUser.roles ?? [] };
  const requestedRoles = (userData.roles ?? []) as UserRole[];

  if (RoleChecker.hasRole(currentRoles, "admin")) {
    return { success: true };
  }

  if (requestedRoles.includes("admin")) {
    return {
      success: false,
      error: "Only admins can assign the admin role",
    };
  }

  if (currentRoles.roles.length > 0) {
    return { success: true };
  }

  return {
    success: false,
    error: "Insufficient permissions to create or modify users",
  };
}
