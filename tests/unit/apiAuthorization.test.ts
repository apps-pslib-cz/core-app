/**
 * Autorizace API: kdo smí co volat (SPEC.md AC-2, AC-3).
 *
 * Testy volají skutečné route handlery a `requireAuthentication`; mockuje se
 * jen session (`auth`), databáze (`prisma`) a logger. Dokazují, že
 * vynucení je na serveru, ne že funguje celá aplikace - živé ověření
 * (`curl` proti běžícímu serveru s OAuth) zůstává samostatný krok.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/libs/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Route handlery importují generovaný Prisma klient jen kvůli třídě chyby.
vi.mock("@/generated/prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));

vi.mock("@/libs/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from "@/libs/auth";
import { prisma } from "@/libs/prisma";
import { requireAuthentication } from "@/libs/apiAuth";
import { HttpError } from "@/libs/errors";
import { RoleChecker, type UserRole } from "@/types/roles";
import { DELETE, GET, PUT } from "@/app/api/v1/users/[id]/route";
import { GET as listUsers } from "@/app/api/v1/users/route";
import { POST as syncActive } from "@/app/api/v1/users/sync-active/route";
import { POST as syncAvatars } from "@/app/api/v1/users/sync-avatars/route";

type DbUser = ReturnType<typeof dbUser>;

const userMock = prisma.user as unknown as Record<
  "findUnique" | "findFirst" | "findMany" | "count" | "update" | "delete",
  ReturnType<typeof vi.fn>
>;

function dbUser(id: string, roles: string[]) {
  return {
    id,
    email: `${id}@example.test`,
    name: id,
    sub: `sub-${id}`,
    givenName: null,
    middleName: null,
    familyName: null,
    image: null,
    avatarData: null,
    roles,
    lastLoginAt: null,
    allowAutoUpdate: true,
    notifyByEmail: true,
    notifyByTeams: false,
    sendActionNotifications: true,
  };
}

const noRole = dbUser("nobody", []);
const member = dbUser("member", ["member"]);
const otherMember = dbUser("other", ["member"]);
const admin = dbUser("admin", ["admin"]);
const otherAdmin = dbUser("admin2", ["admin"]);

let users: DbUser[];

/** Přihlásí uživatele přes session; `null` = nepřihlášený. */
function signInAs(user: DbUser | null) {
  vi.mocked(auth).mockResolvedValue((user ? { user: { id: user.id } } : null) as never);
}

function request(method: string, path: string, body?: unknown): NextRequest {
  const url = `http://localhost${path}`;
  return Object.assign(
    new Request(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { nextUrl: new URL(url) },
  ) as unknown as NextRequest;
}

const withId = (id: string) => ({ params: Promise.resolve({ id }) });

async function errorCode(response: Response): Promise<string | undefined> {
  return (await response.json()).error?.code;
}

beforeEach(() => {
  vi.clearAllMocks();
  // handleError loguje každou HttpError - v testech, které 401/403 čekají, je to šum.
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  users = [noRole, member, otherMember, admin, otherAdmin];
  userMock.findUnique.mockImplementation(
    async ({ where }: { where: { id: string } }) => users.find((u) => u.id === where.id) ?? null,
  );
  userMock.findFirst.mockImplementation(
    async ({ where }: { where: { id: string } }) => users.find((u) => u.id === where.id) ?? null,
  );
  userMock.count.mockImplementation(
    async () => users.filter((u) => u.roles.includes("admin")).length,
  );
  userMock.update.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: object }) => ({
      ...users.find((u) => u.id === where.id),
      ...data,
    }),
  );
  userMock.delete.mockResolvedValue({});
  userMock.findMany.mockResolvedValue([]);
  signInAs(null);
});

describe("role hierarchy", () => {
  it("lets admin satisfy both roles, member only the lower one", () => {
    expect(RoleChecker.hasRoleOrHigher({ roles: ["admin"] }, "admin")).toBe(true);
    expect(RoleChecker.hasRoleOrHigher({ roles: ["admin"] }, "member")).toBe(true);
    expect(RoleChecker.hasRoleOrHigher({ roles: ["member"] }, "member")).toBe(true);
    expect(RoleChecker.hasRoleOrHigher({ roles: ["member"] }, "admin")).toBe(false);
  });

  it("grants nothing to users without a role or with an unknown role", () => {
    for (const roles of [[], ["teacher"], ["ADMIN"]]) {
      expect(RoleChecker.hasRoleOrHigher({ roles }, "member"), roles.join()).toBe(false);
      expect(RoleChecker.hasRoleOrHigher({ roles }, "admin"), roles.join()).toBe(false);
    }
  });
});

describe("requireAuthentication", () => {
  it("rejects an anonymous caller with 401", async () => {
    await expect(requireAuthentication(request("GET", "/api/v1/me"))).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
  });

  it("rejects an invalid bearer token with 401 and does not fall back to the session", async () => {
    signInAs(admin);
    const bearer = new Request("http://localhost/api/v1/me", {
      headers: { authorization: "Bearer not-a-valid-token" },
    }) as unknown as NextRequest;

    const result = requireAuthentication(bearer);
    await expect(result).rejects.toBeInstanceOf(HttpError);
    await expect(result).rejects.toMatchObject({ status: 401 });
  });

  it.each<[string, string[], UserRole, "ok" | 403]>([
    ["no role vs member", [], "member", 403],
    ["no role vs admin", [], "admin", 403],
    ["member vs admin", ["member"], "admin", 403],
    ["member vs member", ["member"], "member", "ok"],
    ["admin vs member", ["admin"], "member", "ok"],
    ["admin vs admin", ["admin"], "admin", "ok"],
  ])("enforces the required role (%s)", async (_label, roles, requireRole, expected) => {
    const caller = dbUser("caller", roles);
    users.push(caller);
    signInAs(caller);

    const result = requireAuthentication(request("GET", "/api/v1/x"), {
      requireRole,
      forbiddenMessage: "Nemáte oprávnění.",
    });

    if (expected === "ok") {
      await expect(result).resolves.toMatchObject({ user: { id: "caller" } });
    } else {
      await expect(result).rejects.toMatchObject({
        status: expected,
        code: "FORBIDDEN",
        message: "Nemáte oprávnění.",
      });
    }
  });
});

describe("AC-2: admin-only actions are enforced on the API", () => {
  it("rejects anonymous callers on user list, delete and bulk sync", async () => {
    expect((await listUsers(request("GET", "/api/v1/users"))).status).toBe(401);
    expect((await DELETE(request("DELETE", "/api/v1/users/other"), withId("other"))).status).toBe(401);
    expect((await syncActive(request("POST", "/api/v1/users/sync-active"))).status).toBe(401);
    expect((await syncAvatars(request("POST", "/api/v1/users/sync-avatars"))).status).toBe(401);
    expect(userMock.delete).not.toHaveBeenCalled();
    expect(userMock.findMany).not.toHaveBeenCalled();
  });

  it("hides the user list from callers without an app role", async () => {
    signInAs(noRole);
    const response = await listUsers(request("GET", "/api/v1/users"));

    expect(response.status).toBe(403);
    expect(userMock.findMany).not.toHaveBeenCalled();
  });

  it("does not let a member delete users or run bulk synchronisation", async () => {
    signInAs(member);

    const deleted = await DELETE(request("DELETE", "/api/v1/users/other"), withId("other"));
    expect(deleted.status).toBe(403);
    expect(userMock.delete).not.toHaveBeenCalled();

    expect((await syncActive(request("POST", "/api/v1/users/sync-active"))).status).toBe(403);
    expect((await syncAvatars(request("POST", "/api/v1/users/sync-avatars"))).status).toBe(403);
    expect(userMock.findMany).not.toHaveBeenCalled();
  });

  it("lets an admin delete another user but never themselves", async () => {
    signInAs(admin);

    const own = await DELETE(request("DELETE", "/api/v1/users/admin"), withId("admin"));
    expect(own.status).toBe(403);
    expect(userMock.delete).not.toHaveBeenCalled();

    const other = await DELETE(request("DELETE", "/api/v1/users/other"), withId("other"));
    expect(other.status).toBe(200);
    expect(userMock.delete).toHaveBeenCalledExactlyOnceWith({ where: { id: "other" } });
  });
});

describe("AC-3: only own profile can be edited without the admin role", () => {
  it("rejects an anonymous update", async () => {
    const response = await PUT(request("PUT", "/api/v1/users/other", { name: "X" }), withId("other"));

    expect(response.status).toBe(401);
    expect(userMock.update).not.toHaveBeenCalled();
  });

  it.each([
    ["a user without a role", noRole],
    ["a member", member],
  ])("does not let %s edit someone else's profile", async (_label, caller) => {
    signInAs(caller);
    const response = await PUT(request("PUT", "/api/v1/users/other", { name: "Cizí" }), withId("other"));

    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe("FORBIDDEN");
    expect(userMock.update).not.toHaveBeenCalled();
  });

  it("lets a user edit only the basic fields of their own profile", async () => {
    signInAs(member);
    const response = await PUT(
      request("PUT", "/api/v1/users/member", {
        name: "Nové jméno",
        email: "jiny@example.test",
        active: false,
        allowAutoUpdate: false,
        isTestAccount: true,
        entraId: "x",
      }),
      withId("member"),
    );

    expect(response.status).toBe(200);
    expect(userMock.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: "member" },
      data: { name: "Nové jméno" },
    });
  });

  it("does not let a member give themselves the admin role", async () => {
    signInAs(member);
    const response = await PUT(
      request("PUT", "/api/v1/users/member", { roles: ["member", "admin"] }),
      withId("member"),
    );

    expect(response.status).toBe(403);
    expect(userMock.update).not.toHaveBeenCalled();
  });

  it("lets an admin change roles of another user", async () => {
    signInAs(admin);
    const response = await PUT(
      request("PUT", "/api/v1/users/other", { roles: ["admin"] }),
      withId("other"),
    );

    expect(response.status).toBe(200);
    expect(userMock.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: "other" },
      data: { roles: ["admin"] },
    });
  });
});

describe("GET /api/v1/users/[id] exposes sensitive fields only to admins and the owner", () => {
  const selected = () => userMock.findFirst.mock.calls[0][0].select as Record<string, unknown>;

  it("rejects an anonymous caller and a role-less caller asking for someone else", async () => {
    expect((await GET(request("GET", "/api/v1/users/other"), withId("other"))).status).toBe(401);

    signInAs(noRole);
    expect((await GET(request("GET", "/api/v1/users/other"), withId("other"))).status).toBe(403);
    expect(userMock.findFirst).not.toHaveBeenCalled();
  });

  it("returns the full own profile even without an app role", async () => {
    signInAs(noRole);
    const response = await GET(request("GET", "/api/v1/users/nobody"), withId("nobody"));

    expect(response.status).toBe(200);
    expect(selected()).toMatchObject({ email: true, sub: true, entraId: true });
  });

  it("limits what a member sees of other people", async () => {
    signInAs(member);
    const response = await GET(request("GET", "/api/v1/users/other"), withId("other"));

    expect(response.status).toBe(200);
    expect(selected()).toMatchObject({ email: false, sub: false, entraId: false, teamsUserId: false });
  });

  it("gives an admin the full profile of anyone", async () => {
    signInAs(admin);
    await GET(request("GET", "/api/v1/users/other"), withId("other"));

    expect(selected()).toMatchObject({ email: true, sub: true, entraId: true });
  });
});
