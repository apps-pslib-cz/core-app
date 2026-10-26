/**
 * Úroveň zhuštění hlavičky podle skutečné šířky obsahu, ne podle pevného
 * breakpointu - potřebná šířka závisí na roli (počet položek menu), jazyce,
 * jménu a e-mailu uživatele i na aplikaci (DECISIONS D-8).
 *
 * - `full`: logo, menu a plná uživatelská sekce (jméno, e-mail, tlačítko)
 * - `compact`: uživatelská sekce jen avatar a ikonové tlačítko
 * - `drawer`: menu v šuplíku za burgerem (jako na mobilu)
 */
export type HeaderLevel = "full" | "compact" | "drawer";

export interface HeaderWidths {
  /** Vnitřní šířka řádku hlavičky (bez paddingu). */
  available: number;
  left: number;
  /** Přirozená šířka menu; 0 = hlavička bez menu. */
  nav: number;
  rightFull: number;
  rightCompact: number;
  /** Mezera mezi částmi řádku. */
  gap: number;
}

/** Rezerva proti přetečení o pár px (zaokrouhlení, focus ring, scrollbar). */
export const HEADER_FIT_SLACK = 8;

export function pickHeaderLevel({ available, left, nav, rightFull, rightCompact, gap }: HeaderWidths): HeaderLevel {
  const parts = nav > 0 ? 3 : 2;
  const fits = (right: number) =>
    left + nav + right + gap * (parts - 1) + HEADER_FIT_SLACK <= available;
  if (fits(rightFull)) return "full";
  if (fits(rightCompact)) return "compact";
  return "drawer";
}
