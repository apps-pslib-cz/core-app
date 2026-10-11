// User DTOs for API endpoints

/**
 * Response DTO for user list endpoint
 * Used in GET /api/v1/users
 */
export interface UserListDto {
  id: string;
  sub: string | null; // OAuth subject ID
  email: string | null; // Only visible to admins
  image: string | null;
  name: string | null;
  givenName: string | null;
  middleName: string | null;
  familyName: string | null;
  roles: string[];
  isTestAccount: boolean;
  active: boolean;
  /** Only present when the request included includeAvatars=true - a
   *  data: URI ready to use directly as an <Avatar src>, or null if the
   *  user has no cached avatar. Absent (not null) when not requested. */
  avatarDataUrl?: string | null;
}

/**
 * Request DTO for creating new user
 * Used in POST /api/v1/users
 */
export interface CreateUserDto {
  email: string;
  sub: string; // Required OAuth subject ID - user cannot login without it
  name?: string;
  givenName: string;
  middleName?: string;
  familyName: string;
  roles: string[];
  allowAutoUpdate?: boolean;
  notifyByEmail?: boolean;
  notifyByTeams?: boolean;
  sendActionNotifications?: boolean;
  isTestAccount?: boolean;
  active?: boolean;
  entraId?: string; // Admin only - Azure AD object ID
  teamsUserId?: string; // Admin only - Teams user ID
}

/**
 * Response DTO for user detail endpoint
 * Used in GET /api/v1/users/[id]
 */
export interface UserDetailDto {
  id: string;
  sub?: string | null; // OAuth subject ID - visible to admin or own profile
  name: string | null;
  email?: string | null; // Only for admin or own profile
  emailVerified?: Date | null; // Only for admin or own profile
  image: string | null;
  givenName: string | null;
  middleName: string | null;
  familyName: string | null;
  roles: string[];
  allowAutoUpdate?: boolean; // Only for admin or own profile
  notifyByEmail: boolean;
  notifyByTeams: boolean;
  sendActionNotifications: boolean;
  isTestAccount: boolean;
  active: boolean;
  entraId?: string | null; // Azure AD object ID - admin or own profile
  teamsUserId?: string | null; // Teams user ID - admin or own profile
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request DTO for updating user
 * Used in PUT /api/v1/users/[id]
 */
export interface UpdateUserDto {
  name?: string;
  email?: string;
  sub?: string; // Admin only - OAuth subject ID
  givenName?: string;
  middleName?: string;
  familyName?: string;
  roles?: string[]; // Admin only
  allowAutoUpdate?: boolean; // Admin only
  notifyByEmail?: boolean;
  notifyByTeams?: boolean;
  sendActionNotifications?: boolean;
  isTestAccount?: boolean; // Admin only
  active?: boolean; // Admin only
  entraId?: string; // Admin only - Azure AD object ID
  teamsUserId?: string; // Admin only - Teams user ID
}

/**
 * Request DTO for updating own profile
 * Used in PUT /api/v1/me
 */
export interface MeDto {
  id: string;
  sub: string; // OAuth subject ID
  givenName: string;
  familyName: string;
  middleName: string | null;
  email: string;
}
