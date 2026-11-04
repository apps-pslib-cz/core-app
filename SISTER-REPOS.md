# Odvozené repozitáře (SISTER-REPOS)

Tahle šablona (`core-app`) je výchozím bodem appek níže. Sdílejí s ní
autentizaci, role, správu uživatelů, `DataTable`, i18n, layout, skills
a metodiku, takže chyba nalezená v jednom repozitáři se často vyskytuje
i v ostatních. Tenhle soubor je **jediné místo**, kde se takové chyby
evidují - zapisuje sem práce v kterémkoli z repozitářů. Opravu v daném
repozitáři dělá práce v tom repozitáři (ve vlastní větvi úkolu), ne
odsud; po opravě tam se tady jen odškrtne stav.

| Repo | Role |
|---|---|
| `core-app` (tady) | šablona: auth, role, uživatelé, DataTable, i18n, layout, skills, metodika |
| `../projects-v1-app` | správa dlouhodobých (maturitních) prací |
| `../internship-v5-app` | správa odborných praxí |
| `../evaluation-v1-app` | hodnoticí průzkumy a rozvrh |

Nová appka postavená na šabloně přidá do tabulky řádek a do pole `Stav`
všech otevřených záznamů svůj sloupec.

## Formát záznamu

```
### S-N Krátký název (YYYY-MM-DD)
Popis: co je špatně a jak se to projeví.
Místo: soubor:řádek v repozitáři, kde se to našlo / odpovídající místa jinde.
Oprava: jak se to opravilo (repo, T-N, commit), případně návrh.
Stav: core-app [ ] · projects-v1-app [ ] · internship-v5-app [ ] · evaluation-v1-app [ ]
```

`[ ]` čeká na opravu · `[?]` neověřeno, jestli se repozitáře týká ·
`[x]` opraveno · `[-]` netýká se. Pod `Stav` se připisuje krátká
poznámka k opravě v každém repozitáři (datum, jak, čím ověřeno).
Záznam se smaže, až jsou všechna políčka `[x]` nebo `[-]` - historie
zůstane v gitu. Čísla `S-N` se nepřidělují znovu; nový záznam dostane
číslo o jedna vyšší než nejvyšší dosud použité (zatím S-36).

Záznamy uzavřené před přesunem evidence sem (S-1 až S-29, na které
odkazují komentáře v kódu odvozených appek) jsou v historii gitu
`../evaluation-v1-app`: `git log -p -- SISTER-REPOS.md`.

## Otevřené záznamy

### S-30 Hlášky 409 u uživatelů s Prisma 7 adaptérem vždy obecné (2026-10-27)
Popis: `getUniqueUserFieldMessage` čte `error.meta.target`. Prisma 7
s driver adaptérem (`@prisma/adapter-pg`) ho neposílá - P2002 má
`meta.driverAdapterError.cause.constraint.index` (`users_email_key`)
nebo `.fields`. Duplicitní e-mail nebo OAuth ID tak vrátí jen „Zadaná
hodnota už existuje u jiného uživatele.“ místo konkrétní hlášky.
Místo: `src/app/api/v1/users/route.ts`, `src/app/api/v1/users/[id]/route.ts`
(`getUniqueUserFieldMessage`) - `core-app`, `projects-v1-app` (tam
i `src/app/api/v1/articles/route.ts` a `articles/[id]/route.ts`).
Oprava (`evaluation-v1-app`, 2026-10-27): sdílené `uniqueConstraintField`
/ `uniqueUserFieldMessage` (`src/libs/userErrors.ts`) čtou oba tvary,
název indexu `<tabulka>_<sloupec>_key` převedou na sloupec. Unit
`tests/unit/userErrors.test.ts`, e2e `tests/e2e/user-teacher.spec.ts`.
**Pozor (zjištěno z `projects-v1-app`, 2026-11-03):** `src/libs/userErrors.ts`
se v `evaluation-v1-app` nenašel v žádné větvi ani historii (`git log
--all -- "*userErrors*"` prázdné) - oprava tam byla pravděpodobně
necommitnutá a ztracená před týmhle zápisem. `evaluation-v1-app [x]`
níž stojí za přímé ověření, než se na něj někdo spolehne jako na zdroj
k opsání.
**Vyvráceno (`evaluation-v1-app`, 2026-11-03):** oprava ztracená není -
`src/libs/userErrors.ts` i oba testy jsou v commitu `325e85a` na
`origin/main`. Lokální klon jen nebyl stažený (`main` 9 commitů za
`origin/main`), proto je `git log --all` neviděl. Před závěrem „ztraceno“
nejdřív `git fetch` a hledat i v `origin/*`.
Stav: core-app [ ] · projects-v1-app [x] · internship-v5-app [?] · evaluation-v1-app [x]
Opraveno v `projects-v1-app` (T-54, 2026-11-03): referenční `userErrors.ts`
nedostupný (viz pozor výš), implementováno znovu od nuly jako
`src/libs/prismaErrors.ts` - `getUniqueConstraintField(error,
tableName)`/`isUniqueConstraintViolationOn(error, tableName, fieldName)`,
`tableName` jako parametr (ne auto-detekce prefixu z indexu - tabulky
s podtržítkem v názvu, např. `article_translations`, by jinak šlo
rozpojit víc způsoby). Postihovalo i `articles/route.ts`/
`articles/[id]/route.ts` (vlastní, novější kontrola na duplicitní
`slug`, co se díky týhle chybě nikdy nespustila - vracela 500 místo
409). Ověřeno `tsc`/`vitest` (476/476, nový `tests/unit/prismaErrors.test.ts`)
a živě proti **skutečně vyhozené** P2002 (ne mocku) pro oba případy
(`users`/email, `article_translations`/slug).

### S-31 Odkazy bez jazyka mimo menu přepínají do češtiny (2026-10-28)
Popis: stejná třída jako oprava menu (`localizedHref`), ale mimo hlavní
a postranní menu - přímé `<Link href="/...">`, `router.push("/...")`,
odkazy na detail v tabulkách, tlačítka „Domů“. Proxy cestu bez jazyka
přesměruje podle cookie / `Accept-Language` a `getLocale` pro samotné
`en-US` vrací češtinu - uživatel na `/en` po kliknutí skončí na `/cs`.
Místo: všude, kde se importuje `next/link` nebo volá `router.push` /
`replace` s cestou bez jazyka. Hrubý odhad (2026-10-28): `core-app`
7 míst (9 souborů s `next/link`), `projects-v1-app` 72 míst (48 souborů)
- část mohou být drobečky, které si jazyk doplní samy (`AppBreadcrumbs`).
Oprava (`evaluation-v1-app`, 2026-10-28): `localizedHref` je
idempotentní (cesta s jazykem zůstane; `/api/` a relativní beze změny;
`/?x` → `/cs?x`), `src/components/LocalizedLink.tsx` (obal `next/link`)
nahradil `next/link` ve všech souborech, ESLint `no-restricted-imports`
zakáže `next/link` jinde, `src/hooks/useLocalizedRouter.ts` pro `push` /
`replace`. Unit `tests/unit/localizedHref.test.ts`, e2e
`tests/e2e/localized-links.spec.ts` - bez opravy selže.
Stav: core-app [ ] · projects-v1-app [ ] · internship-v5-app [?] · evaluation-v1-app [x]

### S-32 Log stavů úkolů nepozná úkoly pod nadpisem 3. úrovně ani `T-6a` (2026-11-03)
Popis: `scripts/log-task-status.mjs` bral jako úkol jen `## T-<číslo>`.
`TASKS.md` členěný do etap (`## Etapa 1` → `### T-6a Název`) nebo s ID
s písmenem skript tiše přeskočil - hook běžel, `LOGS.md` zůstal prázdný,
žádná chyba. Kdo převzal skript 1:1 do appky s jiným formátem `TASKS.md`,
log stavů ve skutečnosti nemá.
Místo: `scripts/log-task-status.mjs` (`parseTaskStatuses`,
`readLatestStatuses`) - `core-app`, převzato 1:1 v `projects-v1-app`
(tam formát `## T-N Název` vyhovuje, chyba se neprojeví).
Oprava (`core-app`, 2026-11-03, z `evaluation-v1-app`): úkol je nadpis
2. nebo 3. úrovně `T-<číslo>[písmeno]`, končí dalším nadpisem stejné nebo
vyšší úrovně (etapa úkol uzavře, `####` uvnitř úkolu ne); totéž ID
v řádcích `LOGS.md`. Zpětně kompatibilní. Test `reads tasks under stage
headings and IDs with a letter suffix` v `tests/unit/taskStatusLog.test.ts`,
s původním skriptem selže. `npx vitest run` 50/50, tsc, skript na vlastním
`TASKS.md` bez zápisu.
Stav: core-app [x] · projects-v1-app [ ] · internship-v5-app [?] · evaluation-v1-app [x]
`projects-v1-app`: převzít nový skript a test 1:1 (formát `TASKS.md` tam
funguje i se starým, jde jen o shodu se šablonou).

### S-33 Pravidla agenta bez vynucení (2026-11-04)
Popis: `AGENTS.md` zakazuje commit do hlavní větve, čtení `.env` a ruční
zásahy do generovaného klienta a migrací, ale `.claude/settings.json` měl
jen logovací hooky. Pravidlo drželo pouze text, který agent v dlouhé relaci
může přehlédnout; `git push`, `reset` ani `rebase` nevyžadovaly potvrzení.
Místo: `.claude/settings.json`, `AGENTS.md` (sekce Omezení) - `core-app`;
odvozené repozitáře dědí stejnou kostru (neověřeno).
Oprava (`core-app`, T-3, 2026-11-04): `permissions` (deny/ask) a hook
`scripts/guard-main-branch.mjs` v `.claude/settings.json`, test
`tests/unit/guardMainBranch.test.ts` (ověřeno mutací), D-12. Jen Claude Code;
Copilot a Codex viz IDEA-004. Pravidla `permissions` ještě nejsou ověřena
v běžícím Claude Code (AC-13).
Stav: core-app [x] · projects-v1-app [?] · internship-v5-app [?] · evaluation-v1-app [?]

### S-34 Třídy rizika chybí v `AGENTS.md` (2026-11-04)
Popis: Třídy A-D (metodika, kapitola 6) byly jen v `CONVENTIONS.md` a
v metodice. `AGENTS.md` ani skill je nezmiňovaly, takže je agent v praxi
nepoužil. `CONVENTIONS.md` navíc odkazoval na `AGENTS.md`, sekci Omezení,
kde plán ke schválení pro třídy C a D nebyl.
Místo: `AGENTS.md`, `.agents/skills/agentic-engineering/SKILL.md`,
`CONVENTIONS.md` (Třída rizika) - `core-app`; odvozené repozitáře s vlastním
`AGENTS.md`.
Oprava (`core-app`, T-3, 2026-11-04): sekce „Třída rizika“ v `AGENTS.md`,
věta ve skillu (zrcadlo přes `npm run agent:skills:sync`), opravený odkaz
v `CONVENTIONS.md`, test v `tests/unit/agentDocs.test.ts` (ověřeno mutací).
Stav: core-app [x] · projects-v1-app [?] · internship-v5-app [?] · evaluation-v1-app [?]

### S-35 Autorizace API bez testů (2026-11-04)
Popis: V `tests/unit` nebyl žádný test `RoleChecker`, `requireAuthentication`
ani autorizace route handlerů uživatelů. Kritéria AC-2 a AC-3 ve `SPEC.md`
tak neměla žádný důkaz a regrese (např. odstranění kontroly vlastního profilu
v `PUT /api/v1/users/[id]`) by prošla `tsc` i `vitest`.
Místo: `tests/unit/` - `core-app`; odvozené repozitáře s vlastními API route.
Oprava (`core-app`, T-3, 2026-11-04): `tests/unit/apiAuthorization.test.ts`
(24 testů; mutacemi ověřeno odstranění kontroly vlastního profilu, role u
DELETE, `requireRole` i zákazu přidělení `admin`). Je to vzor: odvozený
repozitář přidá stejné případy pro vlastní routy. Živé ověření `curl` zbývá.
Stav: core-app [x] · projects-v1-app [?] · internship-v5-app [?] · evaluation-v1-app [?]

### S-36 `npm ci` selže s npm 10 (2026-11-04)
Popis: `package-lock.json` (lockfileVersion 3) projde `npm ci` s npm 11, ale
s npm 10.9.9 končí `EUSAGE ... Missing: typescript@5.9.3 from lock file`.
`docs/deployment.md` (krok „Instalace závislostí“) instaluje přes `npm ci`,
takže server s npm 10 instalaci nedokončí. `npm install` s npm 10 projde.
Verzi npm na produkčním serveru jsem neověřoval.
Místo: `package-lock.json`, `docs/deployment.md` - `core-app`; odvozené
repozitáře ze stejné šablony (neověřeno).
Oprava: neopraveno. Návrh: v `docs/deployment.md` uvést minimální verzi npm
(11), nebo lockfile znovu vygenerovat s npm 10 a ověřit `npm ci` v obou verzích.
Stav: core-app [ ] · projects-v1-app [?] · internship-v5-app [?] · evaluation-v1-app [?]
