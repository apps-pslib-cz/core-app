# Nápady (IDEAS)

Nápady si ponechávají neměnná ID i po převedení na úkol, aby šlo dohledat,
proč práce vznikla. Každý záznam má právě čtyři pole: `Nazev`, `Navrh`,
`Stav` a `Vazby`. Rozsah implementace ani souhlas člověka se z nápadu
neodvozují.

## IDEA-001
- Nazev: Společná agentní podpora a dohledatelné poznámky
- Navrh: Rodičovský projekt má poskytovat obecnou metodiku a sdílenou podporu pro Claude Code, GitHub Copilot a Codex. Jednotný zdroj instrukcí a skills má umožnit navázat na práci jiného agenta; stručný automatický záznam změn stavů úkolů má zlepšit předání bez ukládání konverzací.
- Stav: hotovo
- Vazby: [T-1](TASKS.md#t-1)

## IDEA-002
- Nazev: Větev pro každý úkol a šablona jako centrum odvozených repozitářů
- Navrh: Agent při samostatné práci na úkolu založí větev, po ověření a kontrole uživatelem ji sloučí (nebo k tomu uživatele vyzve). Šablona slouží jako odrazový můstek: evidence chyb sdílených s odvozenými repozitáři (`SISTER-REPOS.md`) se přesune sem a metodika se zbaví odkazů na dřívější projekty. Součástí je oponentura agentní infrastruktury z T-1.
- Stav: hotovo
- Vazby: [T-2](TASKS.md#t-2)

## IDEA-003
- Nazev: Vynucení hranic agenta a testy autorizace
- Navrh: Pravidla, která mají platit bezvýjimečně (zákaz commitu do hlavní větve, čtení `.env*`, ruční zásahy do generovaného klienta a migrací, push a přepis historie bez potvrzení), nesmí zůstat jen v textu `AGENTS.md`. Třídy rizika A-D patří do `AGENTS.md`, který se načítá vždy. Kritéria AC-2 a AC-3 potřebují důkaz v testech.
- Stav: hotovo
- Vazby: [T-3](TASKS.md#t-3)

## IDEA-004
- Nazev: Vynucení hranic i pro Copilot a Codex
- Navrh: Zákaz commitu do hlavní větve a potvrzování rizikových git příkazů dnes drží jen Claude Code. Zvážit nástrojově neutrální git hook (`pre-commit`) nebo nativní hooky Copilotu a Codexu po ověření jejich formátu a chování v cílovém runtime.
- Stav: nový
- Vazby: [T-3](TASKS.md#t-3)

## IDEA-005
- Nazev: Převzetí osvědčených postupů z agentic-starter-kit
- Navrh: Z revize kolegova kitu převzít vstupní příkazy, soubor se stavem projektu, rozlišení druhů souhlasu a stavů implementováno / ověřeno / akceptováno, dělbu práce mezi silný a levnější model a anglické poznámky agentů, vše přizpůsobené větvím úkolů, stavům `[ ] [~] [!] [x]` a vynucení z T-3.
- Stav: hotovo
- Vazby: [T-5](TASKS.md#t-5)

## IDEA-006
- Nazev: Anglický AGENTS.md a měření spotřeby tokenů
- Navrh: Přeložit načítaný `AGENTS.md` do angličtiny (D-15); dokumenty hodnocené učitelem zůstanou česky. Přeloženo, názvy sekcí jsou anglicky a odkazy na ně přejmenované.
- Stav: hotovo
- Vazby: [T-7](TASKS.md#t-7)

## IDEA-007
- Nazev: Příkazy a dělba modelů i pro Copilot a Codex
- Navrh: Copilot: tenké obaly `.github/prompts` nad Claude příkazy (D-14), hotovo. Codex zatím zůstává bez příkazů; ověřit, jak nabízí vstupní postupy a volbu modelu, a doplnit ekvivalent.
- Stav: rozpracováno
- Vazby: [T-6](TASKS.md#t-6)

## IDEA-008
- Nazev: Změřit skutečnou úsporu tokenů po překladu AGENTS.md
- Navrh: Na větvi před a po překladu porovnat velikost načtených paměťových souborů v Claude Code (`/context`) a případně i spotřebu typické relace. Teprve podle toho rozhodnout, zda přeložit i `CONVENTIONS.md` a skills.
- Stav: nový
- Vazby: žádné
