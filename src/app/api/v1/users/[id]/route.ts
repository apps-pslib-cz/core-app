/**
 * User Detail API Endpoints
 *
 * GET /api/v1/users/[id] - Get user details
 * - Admins: Can view all profiles with full data
 * - Users: Can view own profile with full data, others with limited data
 *
 * PUT /api/v1/users/[id] - Update user
 * - Admins: Can update all fields including roles and allowAutoUpdate
 * - Users: Can only update own basic profile fields (name, givenName, familyName) and their own
 *   notification preferences - not email or sub, both OAuth-managed
 *
 * DELETE /api/v1/users/[id] - Delete user
 * - Admin only: Can delete any user account
 */

import { type NextRequest } from "next/server";
import { requireAuthentication } from "@/libs/apiAuth";
import { prisma } from "@/libs/prisma";
import { Prisma } from "@/generated/prisma/client";
import { BadRequest, Conflict, Forbidden, NotFound, handleError } from "@/libs/errors";
import { RoleChecker, type UserRole } from "@/types/roles";
import {
  UpdateUserSchema,
  validateUserPermissions,
  type ValidatedUpdateUser,
} from "@/types/validation/users";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
  const { id } = await params;

  // Authentication using apiAuth
  const { user: currentUser } = await requireAuthentication(request);

  // Check if user can see sensitive data (admin, or viewing own profile)
  const isAdmin = RoleChecker.hasRole(currentUser, "admin");
  const isOwnProfile = currentUser.id === id;
  const canViewSensitiveData = isAdmin || isOwnProfile;

  const user = await prisma.user.findFirst({
    where: {
      id: id,
    },
    select: {
      id: true,
      sub: canViewSensitiveData,
      name: true,
      email: canViewSensitiveData,
      emailVerified: false,
      image: true,
      givenName: true,
      middleName: true,
      familyName: true,
      roles: true,
      allowAutoUpdate: canViewSensitiveData,
      notifyByEmail: true,
      notifyByTeams: true,
      sendActionNotifications: true,
      isTestAccount: true,
      active: true,
      entraId: canViewSensitiveData,
      teamsUserId: canViewSensitiveData,
      createdAt: canViewSensitiveData,
      updatedAt: canViewSensitiveData,
      lastLoginAt: canViewSensitiveData,
    },
  });

  if (!user) {
    throw NotFound("Uživatel nebyl nalezen.");
  }

  return Response.json(user);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
  const { id } = await params;

  // Authentication using apiAuth, admin only
  const { user: currentUser } = await requireAuthentication(request, {
    requireRole: "admin",
    forbiddenMessage: "Pouze administrátoři mohou mazat uživatele.",
  });

  // Prevent admin from deleting themselves to avoid locking out the system
  if (currentUser.id === id) {
    throw Forbidden("Administrátoři nemohou smazat svůj vlastní účet.");
  }

  // Check if the user to be deleted is an admin
  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: { roles: true },
  });

  if (!userToDelete) {
    throw NotFound("Uživatel nebyl nalezen.");
  }

  // If deleting an admin, ensure there will be at least one admin left
  if (userToDelete.roles.includes("admin" satisfies UserRole)) {
    const adminCount = await prisma.user.count({
      where: { roles: { has: "admin" } },
    });

    if (adminCount <= 1) {
      throw Forbidden("Nelze smazat posledního administrátora.");
    }
  }

  await prisma.user.delete({
    where: {
      id: id,
    },
  });

  return Response.json(
    { message: "Uživatel byl úspěšně smazán." },
    { status: 200 },
  );
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
  const { id } = await params;

  // Authentication using apiAuth
  const { user: currentUser } = await requireAuthentication(request);

  // Check permissions: admin can edit anyone, users can edit themselves
  const isAdmin = RoleChecker.hasRole(currentUser, "admin");
  const isOwnProfile = currentUser.id === id;

  if (!isAdmin && !isOwnProfile) {
    throw Forbidden("Forbidden");
  }

  let requestData: unknown;
  try {
    requestData = await request.json();
  } catch {
    throw BadRequest("Invalid JSON in request body");
  }

  // Zod validation
  const validationResult = UpdateUserSchema.safeParse(requestData);
  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");

    throw BadRequest(`Validation failed: ${errorMessage}`);
  }

  const userData: ValidatedUpdateUser = validationResult.data;

  // Validate role assignment permissions if roles are being updated
  if (userData.roles !== undefined) {
    const permissionCheck = validateUserPermissions(currentUser, userData);
    if (!permissionCheck.success) {
      throw Forbidden(permissionCheck.error);
    }
  }

  // Build update data based on permissions
  const updateData: Prisma.UserUpdateInput = {};

  if (isAdmin) {
    // Admin can update all profile fields + roles + settings
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.sub !== undefined) updateData.sub = userData.sub;
    if (userData.givenName !== undefined)
      updateData.givenName = userData.givenName;
    if (userData.middleName !== undefined)
      updateData.middleName = userData.middleName;
    if (userData.familyName !== undefined)
      updateData.familyName = userData.familyName;
    if (userData.email !== undefined) updateData.email = userData.email;

    // Admin-only field: roles (full replace, ne merge)
    if (userData.roles !== undefined)
      updateData.roles = userData.roles as UserRole[];

    // Admin-only fields: settings
    if (userData.allowAutoUpdate !== undefined)
      updateData.allowAutoUpdate = Boolean(userData.allowAutoUpdate);

    // Notification settings: admin can set them for anyone
    if (userData.notifyByEmail !== undefined)
      updateData.notifyByEmail = Boolean(userData.notifyByEmail);
    if (userData.notifyByTeams !== undefined)
      updateData.notifyByTeams = Boolean(userData.notifyByTeams);
    if (userData.sendActionNotifications !== undefined)
      updateData.sendActionNotifications = Boolean(
        userData.sendActionNotifications,
      );
    if (userData.isTestAccount !== undefined)
      updateData.isTestAccount = Boolean(userData.isTestAccount);
    if (userData.active !== undefined)
      updateData.active = Boolean(userData.active);

    // Admin-only fields: Microsoft 365 IDs
    if (userData.entraId !== undefined) updateData.entraId = userData.entraId;
    if (userData.teamsUserId !== undefined)
      updateData.teamsUserId = userData.teamsUserId;
  } else {
    // Regular users can update their own basic profile fields (not sub or
    // email - both are OAuth-managed; self-service email changes are
    // deliberately not allowed here, since the fallback OAuth-login lookup
    // matches pre-provisioned accounts by email, and changing your own to
    // someone else's not-yet-logged-in address would break their first
    // login) plus their own notification preferences - those are personal
    // settings, not something only an admin should control.
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.givenName !== undefined)
      updateData.givenName = userData.givenName;
    if (userData.middleName !== undefined)
      updateData.middleName = userData.middleName;
    if (userData.familyName !== undefined)
      updateData.familyName = userData.familyName;
    if (userData.notifyByEmail !== undefined)
      updateData.notifyByEmail = Boolean(userData.notifyByEmail);
    if (userData.notifyByTeams !== undefined)
      updateData.notifyByTeams = Boolean(userData.notifyByTeams);
    if (userData.sendActionNotifications !== undefined)
      updateData.sendActionNotifications = Boolean(
        userData.sendActionNotifications,
      );
  }

  // Check if we have anything to update
  if (Object.keys(updateData).length === 0) {
    throw BadRequest("No valid fields to update");
  }

  let user;

  try {
    user = await prisma.user.update({
      where: {
        id: id,
      },
      data: updateData,
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

  if (!user) {
    throw NotFound("User not Found");
  }

  return Response.json(user);
  } catch (err) {
    return handleError(err);
  }
}
