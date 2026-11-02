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

## T-2
Hotovo (2026-11-03): IDEA-002, AC-9–AC-11, D-11. Ve větvi
`task/T-2-vetve-a-sister-repos`; odvozené repozitáře
(`projects-v1-app` T-53, `internship-v5-app` T-19, `evaluation-v1-app`
T-53) ve vlastních větvích téhož jména. AC-9: unit testy logu v gitu
(přepnutí větve/merge bez zápisu, necommitnutý přechod jednou,
`merge=union` bez konfliktu; ručně ověřeno, že bez `merge=union` merge
konfliktuje). AC-10: `AGENTS.md`, metodika 4.1, skill, `CONVENTIONS.md`.
AC-11: `SISTER-REPOS.md` + test, že názvy odvozených repozitářů jinde
nejsou (ručně ověřeno, že vložený odkaz test shodí). `npx tsc`,
`npx vitest run` (49 testů), `npm run lint`, `npm run agent:skills:check`;
v odvozených repech tsc a vitest. Neověřeno: Codex/Copilot hooky po
změně skriptu.
Stav: [x] hotovo
