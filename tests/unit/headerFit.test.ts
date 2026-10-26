import { describe, expect, it } from "vitest";
import { HEADER_FIT_SLACK, pickHeaderLevel } from "@/libs/headerFit";

// Zhuštění hlavičky podle šířky obsahu (DECISIONS D-8).

const base = { left: 160, nav: 580, rightFull: 360, rightCompact: 120, gap: 16 };
const full = base.left + base.nav + base.rightFull + 2 * base.gap + HEADER_FIT_SLACK;
const compact = base.left + base.nav + base.rightCompact + 2 * base.gap + HEADER_FIT_SLACK;

describe("pickHeaderLevel", () => {
  it("plná, když se vejde všechno - na hraně včetně rezervy", () => {
    expect(pickHeaderLevel({ ...base, available: full })).toBe("full");
    expect(pickHeaderLevel({ ...base, available: full - 1 })).toBe("compact");
  });

  it("kompaktní uživatelská sekce, pak šuplík", () => {
    expect(pickHeaderLevel({ ...base, available: compact })).toBe("compact");
    expect(pickHeaderLevel({ ...base, available: compact - 1 })).toBe("drawer");
    expect(pickHeaderLevel({ ...base, available: 300 })).toBe("drawer");
  });

  it("bez menu jen jedna mezera, šuplík jen když se nevejde ani kompaktní", () => {
    const noNav = { ...base, nav: 0 };
    expect(pickHeaderLevel({ ...noNav, available: 160 + 360 + 16 + HEADER_FIT_SLACK })).toBe("full");
    expect(pickHeaderLevel({ ...noNav, available: 160 + 120 + 16 + HEADER_FIT_SLACK })).toBe("compact");
  });
});
