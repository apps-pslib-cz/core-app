import { describe, expect, it } from "vitest";
import { findActiveHref, withoutLocale, type MenuStructure } from "@/types/ui";

describe("withoutLocale", () => {
  it("odřízne jazykový prefix", () => {
    expect(withoutLocale("/cs/dashboard/users")).toBe("/dashboard/users");
    expect(withoutLocale("/en/dashboard")).toBe("/dashboard");
    expect(withoutLocale("/cs")).toBe("/");
  });

  it("nechá cestu bez prefixu i segment, co jen začíná na kód jazyka", () => {
    expect(withoutLocale("/dashboard")).toBe("/dashboard");
    expect(withoutLocale("/csv/export")).toBe("/csv/export");
  });
});

describe("findActiveHref", () => {
  const menu: MenuStructure = [
    { id: "home", items: [{ id: "home", textKey: "h", href: "/" }] },
    {
      id: "main",
      items: [
        { id: "overview", textKey: "o", href: "/dashboard" },
        { id: "users", textKey: "u", href: "/dashboard/users" },
        { id: "action", textKey: "a" },
      ],
    },
  ];

  it("najde položku i s jazykovým prefixem v cestě", () => {
    expect(findActiveHref(menu, "/cs/dashboard/users")).toBe("/dashboard/users");
  });

  it("na podstránce vybere nejkonkrétnější položku", () => {
    expect(findActiveHref(menu, "/cs/dashboard/users/abc/edit")).toBe("/dashboard/users");
    expect(findActiveHref(menu, "/en/dashboard")).toBe("/dashboard");
  });

  it("domovská položka svítí jen na domovské stránce", () => {
    expect(findActiveHref(menu, "/cs")).toBe("/");
    expect(findActiveHref(menu, "/cs/about")).toBeUndefined();
  });

  it("nezaměňuje položku za prefix jiného slova", () => {
    expect(findActiveHref(menu, "/cs/dashboard/usersettings")).toBe("/dashboard");
  });
});
