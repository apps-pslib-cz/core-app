import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

/** Šířka a výška PNG z hlavičky IHDR (bajty 16-23). */
function pngSize(publicPath: string): string {
  const file = readFileSync(resolve(__dirname, "../../public", `.${publicPath}`));
  return `${file.readUInt32BE(16)}x${file.readUInt32BE(20)}`;
}

describe("manifest – podmínky instalovatelnosti PWA", () => {
  const m = manifest();

  it("má název, start_url a samostatné okno", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("má ikony 192 a 512 px ve variantě any i maskable", () => {
    for (const purpose of ["any", "maskable"] as const) {
      const sizes = (m.icons ?? []).filter((i) => i.purpose === purpose).map((i) => i.sizes);
      expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    }
  });

  it("každá ikona existuje v public/ a má deklarovanou velikost", () => {
    for (const icon of m.icons ?? []) {
      expect(pngSize(icon.src), icon.src).toBe(icon.sizes);
    }
  });
});
