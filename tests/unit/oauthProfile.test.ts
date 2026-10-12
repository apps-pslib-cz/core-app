import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  normalizeOAuthProfile,
  profileDataFromProviderUser,
  sessionUserFields,
  toAdapterUser,
} from "@/libs/oauthProfile";

/** Skalární sloupce modelu User z prisma/schema.prisma (bez relací). */
function userColumns(): Set<string> {
  const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
  const block = schema.match(/^model User \{([\s\S]*?)^\}/m)?.[1];
  if (!block) throw new Error("Model User ve schématu chybí");
  const models = new Set([...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]));
  return new Set(
    block
      .split(/\r?\n/)
      .map((line) => line.replace(/\/\/.*$/, "").trim().split(/\s+/))
      .filter(([name, type]) => name && type && !name.startsWith("@@"))
      .filter(([, type]) => !models.has(type.replace(/[[\]?]/g, "")))
      .map(([name]) => name),
  );
}

// Názvy standardních claimů odpovídají skutečné odpovědi /connect/userinfo
// z oauth.pslib.cz (ověřeno v evaluation-v1-app), hodnoty jsou smyšlené.
// Role-claimy podle ROLE_CLAIMS šablony; claim jiné appky se ignoruje.
const userinfo = {
  sub: "d9d5bba1-0000-0000-0000-000000000000",
  preferred_username: "jan.novak@example.cz",
  given_name: "Jan",
  family_name: "Novák",
  name: "Jan Novák",
  email: "jan.novak@example.cz",
  picture: "https://oauth.example.cz/avatar/jan.png",
  department: "PZAM",
  "core.admin": "true",
  "core.member": "true",
  "projects.admin": "true",
};

describe("normalizeOAuthProfile – claimy z userinfo → data uživatele", () => {
  it("převede typickou odpověď userinfo včetně rolí", () => {
    expect(normalizeOAuthProfile(userinfo)).toEqual({
      sub: userinfo.sub,
      email: "jan.novak@example.cz",
      name: "Jan Novák",
      image: "https://oauth.example.cz/avatar/jan.png",
      givenName: "Jan",
      middleName: null,
      familyName: "Novák",
      roles: ["admin", "member"],
    });
  });

  it("bere alternativní názvy jmen a sestaví zobrazované jméno", () => {
    const data = normalizeOAuthProfile({
      sub: "abc",
      firstName: "  Eva ",
      middleName: "Marie",
      lastName: "Dvořáková",
    });
    expect(data.givenName).toBe("Eva");
    expect(data.familyName).toBe("Dvořáková");
    expect(data.name).toBe("Eva Marie Dvořáková");
  });

  it("bez jména použije preferred_username, pak e-mail", () => {
    expect(normalizeOAuthProfile({ sub: "a", preferred_username: "login" }).name).toBe("login");
    expect(normalizeOAuthProfile({ sub: "a", email: "x@example.cz" }).name).toBe("x@example.cz");
  });

  it("chybějící e-mail a role vrátí null a prázdný seznam", () => {
    const data = normalizeOAuthProfile({ sub: "a" });
    expect(data.email).toBeNull();
    expect(data.name).toBeNull();
    expect(data.roles).toEqual([]);
  });

  it("propustí jako avatar jen http(s) URL", () => {
    expect(normalizeOAuthProfile({ sub: "a", picture: "file:///etc/passwd" }).image).toBeNull();
    expect(normalizeOAuthProfile({ sub: "a", picture: "not a url" }).image).toBeNull();
    expect(normalizeOAuthProfile({ sub: "a", picture: 42 }).image).toBeNull();
  });

  it("ignoruje jiné než řetězcové hodnoty", () => {
    const data = normalizeOAuthProfile({ sub: "a", given_name: 5, email: ["x"] });
    expect(data.givenName).toBeNull();
    expect(data.email).toBeNull();
  });

  it("bez platného sub vyhodí chybu", () => {
    expect(() => normalizeOAuthProfile({ email: "x@example.cz" })).toThrow();
    expect(() => normalizeOAuthProfile({ sub: "   " })).toThrow();
    expect(() => normalizeOAuthProfile(null)).toThrow();
  });
});

describe("toAdapterUser – výstup provider.profile() pro Prisma adaptér (S-4)", () => {
  it("obsahuje jen sloupce modelu User (adaptér ho předá do user.create)", () => {
    const columns = userColumns();
    const keys = Object.keys(toAdapterUser(normalizeOAuthProfile(userinfo)));
    expect(keys.filter((key) => !columns.has(key))).toEqual([]);
  });

  it("nese role a jméno už pro založení nového uživatele", () => {
    const user = toAdapterUser(normalizeOAuthProfile(userinfo));
    expect(user).toMatchObject({
      id: userinfo.sub,
      sub: userinfo.sub,
      roles: ["admin", "member"],
      givenName: "Jan",
      familyName: "Novák",
      emailVerified: null,
    });
  });
});

describe("profileDataFromProviderUser – výstup provider.profile() v linkAccount", () => {
  it("vrátí stejná data, jaká normalizace uložila (S-4)", () => {
    const data = normalizeOAuthProfile(userinfo);
    // provider.profile() vrací { id, ...data } se sloupci modelu User.
    expect(profileDataFromProviderUser({ id: data.sub, ...data, emailVerified: null })).toEqual(
      data,
    );
  });

  it("odmítne neznámou roli", () => {
    expect(() => profileDataFromProviderUser({ sub: "a", roles: ["superuser"] })).toThrow();
  });
});

describe("sessionUserFields – session z řádku uživatele v DB (S-3)", () => {
  it("vezme role a jméno z DB uživatele i bez e-mailu", () => {
    expect(
      sessionUserFields({
        id: "u1",
        sub: "s1",
        givenName: "Jan",
        middleName: null,
        familyName: "Novák",
        roles: ["admin", "member"],
      }),
    ).toEqual({
      id: "u1",
      sub: "s1",
      given_name: "Jan",
      middle_name: null,
      family_name: "Novák",
      roles: ["admin", "member"],
    });
  });

  it("chybějící role nahradí prázdným seznamem", () => {
    expect(sessionUserFields({ id: "u1" }).roles).toEqual([]);
  });
});
