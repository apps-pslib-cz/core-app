import { type NextRequest } from "next/server";
import { requireAuthentication } from "@/libs/apiAuth";
import { prisma } from "@/libs/prisma";
import { Prisma } from "@/generated/prisma/client";
import { type ListResult } from "@/types/data";
import type { UserListDto } from "@/types/dtos/users";
import {
  withErrorHandling,
  Forbidden,
  BadRequest,
  Conflict,
} from "@/libs/errors";
import { APP_ROLES, RoleChecker, type UserRole } from "@/types/roles";
import {
  UsersQuerySchema,
  CreateUserSchema,
  validateUserPermissions,
  type ValidatedUsersQuery,
  type ValidatedCreateUser,
} from "@/types/validation/users";

// Backwards compatibility - UserListItem is now UserListDto
type UserListItem = UserListDto;

function getUniqueUserFieldMessage(error: Prisma.PrismaClientKnownRequestError) {
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target[0]
    : undefined;

  switch (target) {
    case "email":
      return "Uživatel s touto e-mailovou adresou už existuje.";
    case "sub":
      return "Uživatel s tímto OAuth identifikátorem už existuje.";
    case "entra_id":
    case "entraId":
      return "Uživatel s tímto Entra ID už existuje.";
    case "teams_user_id":
    case "teamsUserId":
      return "Uživatel s tímto Teams ID už existuje.";
    default:
      return "Zadaná hodnota už existuje u jiného uživatele.";
  }
}

async function GET_impl(request: NextRequest) {
  // Validate query parameters with Zod
  const searchParams = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  );

  const queryValidation = UsersQuerySchema.safeParse(searchParams);
  if (!queryValidation.success) {
    const errorMessage = queryValidation.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");

    throw BadRequest(`Invalid query parameters: ${errorMessage}`);
  }

  const query: ValidatedUsersQuery = queryValidation.data;
  const queryAsRecord = query as unknown as Record<string, "true" | "false" | undefined>;

  // Authentication using apiAuth (supports both session and JWT)
  const { user: currentUser } = await requireAuthentication(request);

  // Check if user is admin (can see sensitive data like emails)
  const isAdmin = RoleChecker.hasRole(currentUser, "admin");

  // Role filtering - one optional true/false filter per role in APP_ROLES,
  // translated to a Postgres array "has"/"not has" check on User.roles.
  const roleWhere: Prisma.UserWhereInput[] = [];
  for (const role of APP_ROLES) {
    const value = queryAsRecord[role];
    if (value === "true") {
      roleWhere.push({ roles: { has: role } });
    } else if (value === "false") {
      roleWhere.push({ NOT: { roles: { has: role } } });
    }
  }

  const otherWhere: Prisma.UserWhereInput = {};
  if (query.isTestAccount === "true") otherWhere.isTestAccount = true;
  else if (query.isTestAccount === "false") otherWhere.isTestAccount = false;
  if (query.active === "true") otherWhere.active = true;
  else if (query.active === "false") otherWhere.active = false;

  // Build where clause
  const whereClause: Prisma.UserWhereInput = {
    givenName: {
      contains: query.givenName || undefined,
      mode: "insensitive" as const,
    },
    familyName: {
      contains: query.familyName || undefined,
      mode: "insensitive" as const,
    },
    name: {
      contains: query.name || undefined,
      mode: "insensitive" as const,
    },
    email: {
      contains: query.email || undefined,
      mode: "insensitive" as const,
    },
    ...otherWhere,
    ...(roleWhere.length > 0 ? { AND: roleWhere } : {}),
  };

  // Get total count
  const summary = await prisma.user.aggregate({
    _count: true,
    where: whereClause,
  });

  // Build orderBy clause
  let orderByClause: Record<string, string> | Record<string, string>[] = {};
  switch (query.sortBy) {
    case "name":
      orderByClause = { name: query.sortDir };
      break;
    case "givenName":
      orderByClause = { givenName: query.sortDir };
      break;
    case "familyName":
      orderByClause = { familyName: query.sortDir };
      break;
    case "email":
      orderByClause = { email: query.sortDir };
      break;
    case "createdAt":
      orderByClause = { createdAt: query.sortDir };
      break;
    case "updatedAt":
      orderByClause = { updatedAt: query.sortDir };
      break;
    default:
      orderByClause = [{ familyName: "asc" }, { givenName: "asc" }];
  }

  // includeAvatars=true lets callers (e.g. UserSelect dropdowns) get
  // everything needed to render an <Avatar> in this one response, instead of
  // one extra GET /api/v1/users/{id}/avatar per rendered row.
  const includeAvatars = query.includeAvatars === "true";

  // Fetch users with appropriate fields based on role
  const users = await prisma.user.findMany({
    select: {
      id: true,
      sub: true,
      name: true,
      givenName: true,
      middleName: true,
      familyName: true,
      image: true,
      roles: true,
      isTestAccount: true,
      active: true,
      // Include email only for admins
      email: isAdmin,
      avatarData: includeAvatars,
    },
    where: whereClause,
    orderBy: orderByClause,
    skip:
      query.page !== undefined && query.size !== undefined
        ? query.page * query.size
        : undefined,
    take: query.size || undefined,
  });

  // Filter data based on permissions
  const filteredUsers: UserListItem[] = users.map((user) => ({
    id: user.id,
    sub: user.sub,
    name: user.name,
    givenName: user.givenName,
    middleName: user.middleName,
    familyName: user.familyName,
    image: user.image,
    roles: user.roles,
    isTestAccount: user.isTestAccount,
    active: user.active,
    // Email only for admins
    email: isAdmin ? user.email : null,
    // Only present when includeAvatars=true was requested
    avatarDataUrl: includeAvatars
      ? user.avatarData
        ? `data:image/jpeg;base64,${Buffer.from(user.avatarData).toString("base64")}`
        : null
      : undefined,
  }));

  // Build filters array for response
  const activeFilters: string[] = [];
  if (query.givenName) activeFilters.push(`givenName=${query.givenName}`);
  if (query.familyName) activeFilters.push(`familyName=${query.familyName}`);
  if (query.name) activeFilters.push(`name=${query.name}`);
  if (query.email) activeFilters.push(`email=${query.email}`);
  for (const role of APP_ROLES) {
    if (queryAsRecord[role]) activeFilters.push(`${role}=${queryAsRecord[role]}`);
  }
  if (query.active) activeFilters.push(`active=${query.active}`);

  const result: ListResult<UserListItem> = {
    data: filteredUsers,
    count: filteredUsers.length,
    total: summary._count || 0,
    page: query.page ?? null,
    size: query.size ?? null,
    cursor: null,
    filters: activeFilters,
    order: query.sortBy ? `${query.sortBy}_${query.sortDir}` : null,
  };

  return Response.json(result);
}

export const GET = withErrorHandling(
  GET_impl as unknown as (req: Request) => Promise<Response>,
);

/**
 * Create new user with role-based permissions:
 * - Admin: can assign any role, including "admin"
 * - Any other user with at least one app role: can create users, but never
 *   assign "admin"
 */
async function POST_impl(request: NextRequest) {
  // Authentication using apiAuth
  const { user: currentUser } = await requireAuthentication(request);

  if (currentUser.roles.length === 0) {
    throw Forbidden("Insufficient permissions to create users");
  }

  let requestData: unknown;
  try {
    requestData = await request.json();
  } catch {
    throw BadRequest("Invalid JSON in request body");
  }

  // Zod validation
  const validationResult = CreateUserSchema.safeParse(requestData);
  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");

    throw BadRequest(`Validation failed: ${errorMessage}`);
  }

  const userData: ValidatedCreateUser = validationResult.data;

  // Validate user permissions for role assignment
  const permissionCheck = validateUserPermissions(currentUser, userData);
  if (!permissionCheck.success) {
    throw Forbidden(permissionCheck.error);
  }

  const isAdmin = RoleChecker.hasRole(currentUser, "admin");

  // Create user with validated data
  try {
    const user = await prisma.user.create({
      data: {
        sub: userData.sub,
        name:
          userData.name ||
          `${userData.givenName || ""} ${userData.middleName || ""} ${userData.familyName || ""}`
            .replace(/\s+/g, " ")
            .trim() ||
          null,
        givenName: userData.givenName || null,
        middleName: userData.middleName || null,
        familyName: userData.familyName || null,
        email: userData.email,
        emailVerified: null,
        roles: (userData.roles || []) as UserRole[],
        allowAutoUpdate: userData.allowAutoUpdate ?? true,
        notifyByEmail: userData.notifyByEmail ?? true,
        notifyByTeams: userData.notifyByTeams ?? false,
        isTestAccount: userData.isTestAccount ?? false,
        active: userData.active ?? true,
        entraId: isAdmin ? userData.entraId : undefined,
        teamsUserId: isAdmin ? userData.teamsUserId : undefined,
      },
    });

    return new Response(JSON.stringify(user), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw Conflict(getUniqueUserFieldMessage(error));
    }

    throw error;
  }
}

export const POST = withErrorHandling(
  POST_impl as unknown as (req: Request) => Promise<Response>,
);
