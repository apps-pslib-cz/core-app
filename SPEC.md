# core-app — SPEC (šablona)

Popis **aktuálního pozorovaného chování** toho, co tahle šablonová appka
dnes skutečně obsahuje — ne cílový design konkrétní budoucí appky. Vznikl
podle metodiky v `dev_notes/agentic-engineering.md`.

> **Appka postavená na téhle šabloně nahradí celý tento soubor vlastním
> `SPEC.md`** popisujícím svou vlastní doménu. Co zůstává z šablony nezměněné (auth, role, správa uživatelů),
> stačí v novém `SPEC.md` jen odkazem zmínit, ne znovu popisovat.

## 1. Účel

Univerzální základ pro appky SPŠSE a VOŠ Liberec se společným
přihlašováním přes školní OAuth server (`oauth.pslib.cz`, Duende Identity
Server) a konzistentním UI (Mantine). Řeší to, co by jinak každá nová
appka stavěla znovu: přihlášení, obecný model rolí, administraci
uživatelů, nastavení appky per uživatel, chybové stránky, i18n (cs/en).
Nejde o produkt pro koncového uživatele samotný — je to startovní bod pro
další appky (seznam v `SISTER-REPOS.md`).
Rodičovský projekt současně poskytuje obecnou metodiku a verzovanou agentní
infrastrukturu pro Claude Code, GitHub Copilot a Codex.

## 2. Uživatelé a scénáře

Jedna vrstva rolí, obecná (`User.roles: string[]`, `src/types/roles.ts`),
výchozí `admin`/`member` s hierarchií `admin ⊇ member`:

1. **Přihlášení** — uživatel se přihlásí přes `oauth.pslib.cz`
   (`/api/auth/callback/duende-identity-server6`). Appka ho najde/založí
   podle `sub`/e-mailu a přidělí roli podle OAuth claimů (`ROLE_CLAIMS`).
2. **Veřejná část** (`(front)`) — stránky dostupné bez role (konkrétní
   appka si doplní vlastní obsah; šablona má jen kostru layoutu). Hlavní
   menu v hlavičce (`MainNavigation`) je společné s administrací, položky
   se ukazují podle role.
3. **Administrace** (`/dashboard`, role `admin`) — správa uživatelů
   (seznam/detail/vytvoření/úprava/smazání, hromadná synchronizace
   avatarů a aktivity z OAuth serveru), nastavení appky (jazyk, barevné
   schéma, počet řádků v tabulkách).
4. **Vlastní profil** — uživatel bez role `admin` smí upravit jen svůj
   vlastní záznam (`isOwnProfile`), ne cizí.

## 3. Data (hlavní entity)

| Entita | Popis |
|---|---|
| `User` | Osoba z OAuth (Duende) + `roles: string[]`, notifikační preference, `active`/`isTestAccount`. Jediná doménová entita, kterou šablona sama definuje. |

Appka postavená na šabloně přidá vlastní entity vedle `User` — ty už
nejsou součástí tohoto souboru, patří do nového `SPEC.md`.

## 4. Pravidla a chybové stavy

- Role appky: požadavek na nižší roli splní i vyšší (`ROLE_HIERARCHY`,
  `RoleChecker.hasRoleOrHigher`) — požadavek na `admin` splní jen `admin`.
- Nepřihlášený návštěvník na stránce vyžadující přihlášení dostane
  `<UnauthorizedPage />`, přihlášený bez dostatečné role `<ForbiddenPage />`
  — nikdy tichý redirect nebo prázdný výpis.
- Frontendová kontrola role je jen UX — skutečné vynucení je vždy na API
  route (`requireAuthentication` + `requireRole`).
- Synchronizace `active`/avatarů z OAuth serveru je jednosměrná
  (deaktivace podle role na serveru) — reaktivace je vždy ruční úprava
  adminem.

## 5. Akceptační kritéria (na úrovni celku)

- [ ] AC-1: Přihlášení přes `oauth.pslib.cz` vytvoří/aktualizuje `User`
  záznam a přidělí roli podle OAuth claimů.
- [ ] AC-2: Akce vyžadující roli `admin` není proveditelná ani přímým
  voláním API bez této role — autorizace je vynucena na API route, UI
  kontrola je jen pohodlí. Server-side vynucení pokrývají jednotkové testy
  `tests/unit/apiAuthorization.test.ts` (T-3); živé ověření `curl` proti
  běžícímu serveru zbývá.
- [ ] AC-3: Uživatel bez role `admin` smí upravit jen vlastní profil, ne
  cizí, ani přímým voláním API. Server-side vynucení pokrývají jednotkové
  testy `tests/unit/apiAuthorization.test.ts` (T-3); živé ověření zbývá.
- [ ] AC-4: Nepřihlášený návštěvník na chráněné stránce dostane
  přihlašovací/chybovou stránku, ne prázdný výpis nebo pád.
- [x] AC-5: Společné instrukce mají jediný zdroj v `AGENTS.md`; `CLAUDE.md`
  je pouze Claude Code vstupní bod a pravidla pro ostatní nástroje se
  neduplikují.
- [x] AC-6: Skills mají validní standardní metadata v `.agents/skills` a
  Claude zrcadlo je obsahově shodné; `npm run agent:skills:check` ověřuje
  metadata i shodu.
- [x] AC-7: Sdílený logovací skript zaznamená nový stav a další skutečný
  přechod nejvýše jednou; jednotkové testy pokrývají opakované spuštění i
  chybně zadané stavy.
- [x] AC-8: Nativní hook konfigurace všech tří nástrojů volají stejný
  skript; logovací formát neukládá prompty ani výstupy nástrojů.
- [x] AC-9: Přepnutí větve, `pull` ani `merge` nezapíše do `LOGS.md`
  falešný přechod stavu; předchozí stav úkolu se bere z posledního commitu
  větve. Souběžné zápisy do `LOGS.md` ve dvou větvích jdou sloučit bez
  konfliktu.
- [x] AC-10: Metodika (`AGENTS.md`, `dev_notes/agentic-engineering.md`,
  skill `agentic-engineering`) popisuje práci ve větvi úkolu: agent
  commituje jen do ní, do hlavní větve slučuje až po testech a souhlasu
  uživatele; žádný dokument tomu neodporuje.
- [x] AC-11: Chyby sdílené s odvozenými repozitáři se evidují na jednom
  místě (`SISTER-REPOS.md` v tomto repu); živé dokumenty, skills a kód
  šablony neodkazují na konkrétní dřívější projekty.

- [x] AC-12: `git commit` na hlavní větvi (`main`/`master`) zablokuje hook
  `scripts/guard-main-branch.mjs` (Claude Code); commit na větvi úkolu a
  `git switch -c ... && git commit` povolí a při vlastní chybě nikdy
  nezablokuje práci (`tests/unit/guardMainBranch.test.ts`, D-12).
- [ ] AC-13: Pravidla `permissions` v `.claude/settings.json` fungují v
  běžícím Claude Code: čtení `.env` a úprava `src/generated` a
  `prisma/migrations` jsou odepřeny, `git push`, `merge`, `reset`, `rebase`
  a `commit --amend` vyžadují potvrzení. Ověřit ručně (`/permissions` a
  pokus o zakázanou akci).
- [x] AC-14: Třídy rizika A-D jsou v `AGENTS.md` (načítá se vždy) i v
  kanonickém skillu `agentic-engineering`; hlídá je
  `tests/unit/agentDocs.test.ts`.
- [x] AC-15: Vstupní příkazy `/discover-project`, `/plan-increment` a
  `/work-task` existují v `.claude/commands/` s popisem; pole `model` je jen
  `opus`, `sonnet` nebo `haiku` a příkazy analýzy (discover, plan) jsou na
  `opus` (`tests/unit/agentDocs.test.ts`, D-13).
- [x] AC-16: Subagent `task-executor` má omezené nástroje bez `Agent`, zakazuje
  si měnit evidenci a git a vrací zprávu jako tvrzení; `AGENTS.md` mapuje
  úrovně `silny`/`stredni`/`lehky` na modely a zůstává pod 200 řádky
  (`tests/unit/agentDocs.test.ts`).
- [x] AC-17: `AGENTS.md` rozlišuje druhy souhlasu a stavy implementováno /
  ověřeno / akceptováno a říká, že `SPEC.md` se nepřepisuje podle
  implementace; `PROJECT.md` existuje s fází, aktivním přírůstkem a otázkami.
- [x] AC-18: `AGENT-NOTES.md` je anglicky, přidávaný a v `.gitattributes`
  má `merge=union`; příkazy a agent jsou anglicky (`tests/unit/agentDocs.test.ts`).
- [ ] AC-19: Příkazy a `task-executor` fungují v běžícím Claude Code: příkazy
  se nabízejí v `/`, `/work-task` předá úkol agentovi na zvoleném modelu a
  po něm sám ověří diff i testy. Ověřit ručně na úkolu třídy A.
- [x] AC-20: Copilot má pro každý ze tří Claude příkazů obal v
  `.github/prompts/*.prompt.md` se stejným popisem, `agent: agent`, odkazem na
  existující zdroj a bez kopie postupu; analytické obaly nemají nástroj
  `execute`, `work-task` má `agent` (`tests/unit/agentDocs.test.ts`, D-14).
- [ ] AC-21: Obaly fungují ve VS Code s Copilotem: příkazy se nabízejí po `/`,
  `tools` jsou přijaty a `/work-task` zavolá `task-executor` přes `runSubagent`.
  Ověřit ručně na úkolu třídy A.

## 6. Mimo rozsah

- Přesný tvar API (request/response, chybové kódy, autorizační vzor) —
  `.agents/skills/nextjs-api-route-conventions` a `CONVENTIONS.md`.
- Nasazení a provoz (IIS, Windows Service, proměnné prostředí) —
  `docs/deployment.md`.
- Doménová funkcionalita konkrétní appky postavené na šabloně — vlastní
  `SPEC.md` té appky.
- Pokrytí internacionalizace textů — `.agents/skills/nextjs-i18n-conventions`.

## 7. Ověření od začátku do konce

Přihlásit se přes `oauth.pslib.cz` → ověřit vznik/aktualizaci `User`
záznamu a přidělenou roli → jako `admin` otevřít `/dashboard/users`,
vytvořit/upravit/smazat testovacího uživatele → odhlásit se a zkusit
otevřít `/dashboard` bez přihlášení (čeká se `<UnauthorizedPage />`) →
přihlásit se jako uživatel bez role `admin` a zkusit upravit cizí profil
přímým voláním API (čeká se `403`).

## 8. Agentní workflow

Společná pravidla spolupráce jsou v kořenovém `AGENTS.md`; `CLAUDE.md` je
Claude Code vstupní bod, který jej importuje. Skills mají jediný kanonický
zdroj v `.agents/skills`; zrcadlo `.claude/skills` se generuje a kontroluje
skriptem. Copilot a Codex používají své nativní hook konfigurace, které
spouštějí společný `scripts/log-task-status.mjs`.

`LOGS.md` zaznamenává pouze pozorované přechody stavu úkolu: čas, ID úkolu,
předchozí a nový stav a nástroj, který změnu zjistil. Neobsahuje prompty,
výstupy nástrojů ani osobní údaje a nenahrazuje rozhodnutí člověka ani důkaz
akceptačního kritéria.

Hranice, které mají platit bezvýjimečně, vynucuje v Claude Code
`.claude/settings.json` (oprávnění) a `scripts/guard-main-branch.mjs`
(zákaz commitu do hlavní větve), viz D-12. Copilot a Codex jsou zatím
kryty jen textem v `AGENTS.md` (IDEA-004).

Vstupní příkazy, úrovně modelů a poznámky agentů (`AGENT-NOTES.md`) jsou
popsány v `AGENTS.md` a odůvodněny v D-13 a D-14; příkazy mají Claude Code a Copilot, Codex ne (IDEA-007).
