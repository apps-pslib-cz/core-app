# Úkoly (TASKS)

Rozpad práce na kroky podle metodiky v `dev_notes/agentic-engineering.md`
(kapitola 4.5). Nadpis úkolu obsahuje pouze neměnné `T-N` ID; první pole
`nazev` nese jeho popisný název. Úkoly odkazují na kritéria ve `SPEC.md` i
související nápady v `IDEAS.md`. Stavy: `[ ]` připraveno · `[~]`
rozpracováno · `[!]` blokováno · `[x]` hotovo.

**Hotové úkoly se nemažou, ale zkracují** na `Hotovo (datum): ...` +
`Stav` — bez `Cíl`/`Splňuje`/`Závisí na`/`Riziko`, ty mají smysl jen
dokud se úkol plánuje a dělá. Důvod/souvislosti větších věcí mají trvalý
domov v `DECISIONS.md`, `TASKS.md` tu historii neopakuje podruhé.
Přechody stavů se automaticky zapisují do `LOGS.md`; záznam logu není
schválením ani důkazem splnění kritéria.

Appka postavená na téhle šabloně začíná vlastním `TASKS.md`.

## T-1
Hotovo (2026-11-02): IDEA-001, AC-5–AC-8; `npx vitest run` (44 testů),
`npx tsc --noEmit -p .`, `npm run lint`, `npm run agent:skills:check` a
`node --check` obou Node skriptů prošly.
Stav: [x] hotovo
