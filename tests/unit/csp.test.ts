import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce } from "@/libs/csp";

function directive(csp: string, name: string): string | undefined {
  return csp
    .split("; ")
    .find((part) => part === name || part.startsWith(`${name} `));
}

describe("buildCsp", () => {
  it("povolí skripty jen s nonce, bez 'unsafe-inline' a v produkci bez 'unsafe-eval'", () => {
    const scriptSrc = directive(buildCsp("abc"), "script-src");
    expect(scriptSrc).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
  });

  it("v dev přidá 'unsafe-eval'", () => {
    expect(directive(buildCsp("abc", { isDev: true }), "script-src")).toContain("'unsafe-eval'");
  });

  it("upgrade-insecure-requests jen pro HTTPS request (na HTTP by rozbil navigaci)", () => {
    expect(directive(buildCsp("abc"), "upgrade-insecure-requests")).toBeUndefined();
    expect(
      directive(buildCsp("abc", { isHttps: true }), "upgrade-insecure-requests"),
    ).toBeDefined();
  });

  it("zakáže vložení do rámu a pluginy", () => {
    const csp = buildCsp("abc");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
  });

  it("img-src bez blob: (avatar jde přímo z /api/v1/me/avatar)", () => {
    expect(directive(buildCsp("abc"), "img-src")).not.toContain("blob:");
  });

  it("bez analytiky povolí spojení jen na vlastní origin", () => {
    expect(directive(buildCsp("abc"), "connect-src")).toBe("connect-src 'self'");
  });

  it("doplní domény zapnuté analytiky", () => {
    const csp = buildCsp("abc", {
      env: {
        UMAMI_SCRIPT_URL: "https://umami.example.cz/script.js",
        UMAMI_WEBSITE_ID: "x",
        GOOGLE_ANALYTICS_ID: "G-1",
        CLARITY_PROJECT_ID: "c1",
      },
    });
    const connect = directive(csp, "connect-src");
    expect(connect).toContain("https://umami.example.cz");
    expect(connect).toContain("https://*.google-analytics.com");
    expect(connect).toContain("https://*.clarity.ms");
    expect(directive(csp, "img-src")).toContain("https://*.googletagmanager.com");
  });

  it("Umami bez ID nebo s neplatnou URL nic nepřidá", () => {
    expect(
      directive(buildCsp("abc", { env: { UMAMI_SCRIPT_URL: "https://u.example.cz/s.js" } }), "connect-src"),
    ).toBe("connect-src 'self'");
    expect(
      directive(
        buildCsp("abc", { env: { UMAMI_SCRIPT_URL: "javascript:alert(1)", UMAMI_WEBSITE_ID: "x" } }),
        "connect-src",
      ),
    ).toBe("connect-src 'self'");
  });
});

describe("generateNonce", () => {
  it("vrací pokaždé jiný base64 řetězec", () => {
    const a = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(generateNonce()).not.toBe(a);
  });
});
