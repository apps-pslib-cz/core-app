// Vygeneruje ikony pro instalovatelnou PWA a záložku prohlížeče do
// public/icons z jednoho SVG loga. Appka postavená na šabloně ho spustí
// znovu se svým logem:
//
//   node scripts/generate-pwa-icons.mjs [cesta/k/logu.svg] [barva-pozadí]
//
// Výchozí logo je public/images/logos/app2-light.svg, pozadí #ffffff.
// Výstup se commituje - za běhu appky se nic negeneruje. `sharp` je
// závislost Next.js, vlastní závislost kvůli tomuhle skriptu není potřeba.

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Chybí balíček sharp (instaluje ho Next.js) - spusť nejdřív npm install.");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(process.argv[2] ?? join(root, "public/images/logos/app2-light.svg"));
const background = process.argv[3] ?? "#ffffff";
const outDir = join(root, "public/icons");

const svg = await readFile(source);
await mkdir(outDir, { recursive: true });

// scale = podíl strany ikony, který logo zabere. Maskable ikony Android
// ořízne do kruhu/squircle - logo musí zůstat v bezpečné zóně (kruh o
// průměru 80 % strany), proto menší logo a plné pozadí. Apple ikony iOS
// podloží černou, pokud jsou průhledné, proto taky s pozadím.
const icons = [
  { file: "icon-192.png", size: 192, scale: 1, fill: false },
  { file: "icon-512.png", size: 512, scale: 1, fill: false },
  { file: "maskable-192.png", size: 192, scale: 0.6, fill: true },
  { file: "maskable-512.png", size: 512, scale: 0.6, fill: true },
  { file: "apple-touch-icon.png", size: 180, scale: 0.75, fill: true },
  { file: "favicon-32.png", size: 32, scale: 1, fill: false },
];

for (const { file, size, scale, fill } of icons) {
  const inner = Math.round(size * scale);
  const logo = await sharp(svg, { density: 384 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: fill ? background : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(join(outDir, file));
  console.log(`public/icons/${file}`);
}

await copyFile(source, join(outDir, "favicon.svg"));
console.log("public/icons/favicon.svg");
