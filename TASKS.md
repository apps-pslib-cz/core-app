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

## T-3
Hotovo (2026-11-04): IDEA-003, AC-12, AC-14, D-12 a podklady k AC-2/AC-3; AC-13 čeká na ruční ověření v Claude Code. Ve větvi `task/T-3-vynuceni-a-rizika`. `permissions` a hook `scripts/guard-main-branch.mjs` v `.claude/settings.json` (`tests/unit/guardMainBranch.test.ts`, 6 testů); sekce „Třída rizika“ v `AGENTS.md` a ve skillu (test v `agentDocs.test.ts`); `tests/unit/apiAuthorization.test.ts` (24 testů). Ověřeno na Linuxové kopii zdrojů: `npx vitest run` (80 testů), `npx tsc --noEmit -p .`, `npm run lint`, `npm run agent:skills:check`; mutacemi (odstranění kontroly vlastního profilu, role u DELETE, `requireRole`, zákazu přidělení `admin`, ochrany `main`, třídy D v `AGENTS.md`) ověřeno, že testy selžou. Neověřeno: `permissions` a hook v běžícím Claude Code (AC-13), živé volání API (`curl`), běh na Windows; Copilot a Codex zůstávají bez vynucení (IDEA-004). Nález mimo úkol: `npm ci` selže s npm 10 (S-36).
Stav: [x] hotovo

## T-5
Hotovo (2026-11-05): IDEA-005, AC-15 až AC-18, D-13. Ve větvi `task/T-5-prevzeti-z-starter-kitu`. Příkazy `/discover-project`, `/plan-increment`, `/work-task` (`.claude/commands/`), subagent `task-executor`, `PROJECT.md`, `AGENT-NOTES.md` (`merge=union`), sekce „Vstupní postupy“, „Souhlas a důkaz“ a „Úrovně modelů a jazyk“ v `AGENTS.md` (195 řádků), věta ve skillu (zrcadlo přes `npm run agent:skills:sync`), metodika 4.2, 5 nových testů v `agentDocs.test.ts`. Ověřeno na Linuxové kopii (čistý klon z `main`, `npm install`, ignorovaný `src/generated` zkopírován z pracovní kopie): `npx vitest run` (86 testů), `npx tsc --noEmit -p .`, `npm run lint`, `npm run agent:skills:check`; mutacemi (model discover na `sonnet`, `Agent` v nástrojích executoru, zmizelý zákaz `TASKS.md` u executoru, chybějící `merge=union`, chybějící „ověřeno“ v `AGENTS.md`, neplatné `Model:`, překlep v `subagent_type`) ověřeno, že testy selžou. Neověřeno: AC-19 (příkazy a delegace v běžícím Claude Code), skutečná úspora tokenů, Copilot a Codex (IDEA-007); `AGENTS.md` zůstává česky (IDEA-006). `package-lock.json` beze změny (`npm ci` s npm 10 dál selhává, S-36).
Stav: [x] hotovo
