# Konvence projektu

Tento soubor popisuje, jak je `core-app` postavená a jak se do ní má psát
nový kód, aby zůstala předvídatelná — pro člověka i pro AI agenta bez
historie konverzace. Vychází z metodiky v
`dev_notes/agentic-engineering.md`.

Pravidla zde jsou **doporučení**, ne vynucení — agent je může v dlouhé
konverzaci přehlédnout. Cokoli, co musí platit bezvýjimečně, patří do hooku,
ne jen sem (viz `AGENTS.md`).

Úzká, situační témata mají vlastní skill místo místa tady:
- psaní/úprava API route handleru → `.claude/skills/nextjs-api-route-conventions`
- Server vs. Client Component chyby → `.claude/skills/nextjs-rsc-pitfalls`
- nový/upravený seznam s `DataTable` → `.claude/skills/nextjs-datatable-conventions`
- entita/mutace přes `@tanstack/react-query` → `.claude/skills/nextjs-tanstack-query-conventions`
- nový/měněný uživatelský text → `.claude/skills/nextjs-i18n-conventions`

Tenhle soubor je mapa celku; skilly jsou podrobnosti k jedné jeho části.

**Tohle je šablonová appka.** Konkrétní appka postavená na tomhle základu
si tenhle soubor převezme a upraví podle svých skutečných potřeb (vlastní
role, vlastní entity v sekci "Struktura projektu", vlastní obsah
`SPEC.md`) — ne jako trvalou kopii beze změny.

## Třída rizika

Metodika (kapitola 6) řadí každou změnu do třídy A–D podle rizika a odvozuje
z ní, co agent může dělat sám a co jen navrhnout. V tomto projektu typicky:

- **A** (nízké riziko) — typo v dokumentaci, přejmenování proměnné beze
  změny chování, úprava komentáře.
- **B** (běžné riziko) — nová/upravená API route, komponenta, validace,
  business pravidlo v `src/libs` — většina běžné práce na appce.
- **C** (vyšší riziko) — nová závislost, změna autorizačního vzoru, Prisma
  migrace, změna veřejného tvaru API, úprava `.env`/OAuth konfigurace.
- **D** (kritické riziko) — zásah do produkčního nasazení, mazání dat,
  force-push, změna oprávnění uživatelů.

Pro C a D vždy nejdřív plán ke schválení, ne přímou implementaci — viz
`AGENTS.md`, sekce Omezení (git operace, migrace, závislosti).

## Obecná pravidla

- Identifikátory v kódu (proměnné, funkce, typy, soubory) jsou anglicky.
- Uživatelsky viditelný text je česky/anglicky přes slovník (viz
  Internacionalizace níže) — ne natvrdo v komponentě.
- Komentáře jen tam, kde kód sám nevysvětlí *proč* (netriviální omezení,
  obcházený bug, neintuitivní chování) — ne *co* kód dělá.
- Cesty se importují přes alias `@/*` → `src/*` (`@/libs/prisma`, ne
  `../../../libs/prisma`).

## Struktura projektu

```
src/
├── app/
│   ├── api/           API route handlery (App Router)
│   └── [lang]/         stránky, rozdělené na:
│       ├── (front)/    veřejná část (vyžaduje přihlášení jen tam, kde to
│       │               dává smysl, viz UnauthorizedPage pattern níže)
│       └── dashboard/  administrace (role admin)
├── components/         sdílené UI komponenty (Mantine)
├── libs/                byznys logika a integrace (Prisma, auth, ...)
├── hooks/
│   └── queries/         React Query hooky (entita/mutace mimo DataTable,
│                         viz nextjs-tanstack-query-conventions)
├── types/
│   ├── dtos/            DTO typy pro API odpovědi
│   └── validation/       Zod schémata pro API vstupy
├── providers/            React context providery (session, nastavení,
│                         QueryClient)
├── config/               statická konfigurace appky (název appky, popis)
├── utils/                čisté pomocné funkce bez závislostí na Next.js/DB
└── generated/prisma/     generovaný Prisma klient (needituje se ručně)
```

Pravidlo pro novou funkcionalitu: **byznys logika a přístup k datům patří do
`src/libs`**, stránky a komponenty ji jen volají. API route handler validuje
vstup, zavolá `libs` funkci a namapuje výsledek na DTO — nemá v sobě
rozsáhlou obchodní logiku sám.

## Pojmenování

- **Komponenty**: PascalCase, soubor stejného jména jako export
  (`UserTable.tsx`, `DataTable.tsx`).
- **Hooky**: `useNazev.ts`, camelCase (`useDictionary.ts`, `usePageTitle.ts`).
  Query/mutation hooky žijí v `src/hooks/queries/<entita>.ts`
  (`useUser`, `useUpdateUser`, viz nextjs-tanstack-query-conventions).
- **Funkce a proměnné**: camelCase. Funkce typu `is...`/`has...`/`can...`
  vrací boolean (`isAdmin`, `canEditX`), `get...` vrací data.
- **API route složky**: kebab-case ve víceslovných segmentech,
  REST-ovská hierarchie s ID v cestě (`/api/v1/users/[id]`).
- **DTO a validační soubory**: `src/types/dtos/<oblast>.ts` a
  `src/types/validation/<oblast>.ts`.

## TypeScript

- Žádné `any` bez komentáře, proč je nezbytné.
- API vstup se vždy validuje Zod schématem ze `src/types/validation` dřív,
  než se použije.
- API výstup má vlastní DTO typ v `src/types/dtos`, ne přímo Prisma model
  (Prisma model obsahuje pole, co nemají opustit server — `avatarData`,
  `sub` pro neoprávněné volající).

## Role appky

`src/types/roles.ts` definuje role appky jako obyčejný seznam řetězců
(`APP_ROLES`, výchozí `admin`/`member`), ne pevný enum — `User.roles` je
Postgres `string[]`, přidání/odebrání role je úprava tohoto souboru, ne
Prisma migrace. `ROLE_HIERARCHY` mapuje požadovanou roli na množinu rolí,
které ji splňují (role sama + vše nad ní v hierarchii); `ROLE_CLAIMS`
mapuje OAuth claim (vlastní scope appky na `oauth.pslib.cz`) na roli, kterou
appka uživateli přidělí. `RoleChecker.hasRoleOrHigher` je kanonický způsob
kontroly, nikdy ruční `user.roles.includes(...)` tam, kde jde o hierarchii.

## Server a Client Components (Next.js App Router)

Viz `.claude/skills/nextjs-rsc-pitfalls` pro konkrétní chyby, co v tomhle
projektu (resp. v `projects-v1-app`, odkud je appka vytěžená) už nastaly
(funkce jako prop ze Server Component, Mantine `List` bez RSC-safe exportu)
a jak se jim vyhnout.

## API route handlery

Viz `.claude/skills/nextjs-api-route-conventions` pro celý vzor
(`requireAuthentication` + `RoleChecker` hierarchie + `try/catch` →
`handleError`). Nepiš autorizaci ručně (`if (!user.roles.includes("admin")) ...`).

## Databáze (Prisma)

- Jediný sdílený klient: `import { prisma } from "@/libs/prisma"`, nikdy
  nová instance `PrismaClient` v jiném souboru.
- Generovaný klient (`src/generated/prisma`) je TS/ESM-only bez
  zkompilovaného JS vstupu — ad-hoc skript spuštěný přes `node script.mjs`
  ho nenačte. Pro jednorázový dotaz mimo běžící aplikaci použij `pg` přímo,
  nebo dočasnou API route.
- Citlivá pole (`sub`, `email`, `entraId`, `avatarData`...) se z
  `select`/`include` řídí podle role volajícího — neposílej je do DTO
  nepodmíněně.

## Data-fetching (TanStack Query)

Entita/mutace mimo `DataTable` (detail, editační formulář, create
formulář, delete/sync akce) jde přes `@tanstack/react-query` — viz
`.claude/skills/nextjs-tanstack-query-conventions`. `DataTable`'s vlastní
list-fetching zůstává na `dataFetcher`/`onMountRefresh` (viz
`.claude/skills/nextjs-datatable-conventions`) — obě žijí na stejné
stránce vedle sebe, nejde o náhradu jedné druhou.

## Internacionalizace (i18n)

Podrobný vzor je ve skillu `.claude/skills/nextjs-i18n-conventions`. Stručně:

- Uživatelský text jde přes `useDictionary()` (`@/hooks`) a
  `src/assets/dictionaries/{cs,en}.json` — vždy s fallbackem:
  `dictionary?.sekce?.klic || "Výchozí český text"`.
- Jazyk appky je součástí URL (`/cs/...`, `/en/...`), řeší `src/proxy.ts` —
  nikdy nespoléhej jen na `Accept-Language` nebo uloženou volbu bez ohledu na
  aktuální URL segment.

## Autorizace na frontendu

Stránky vyžadující přihlášení kontrolují `useSession()`'s `status` a
vykreslí `<UnauthorizedPage />` (ne tichý `router.push("/")`) pro
nepřihlášeného uživatele, `<ForbiddenPage />` pro přihlášeného bez
dostatečné role. Frontendová kontrola je jen UX — skutečné vynucení je
vždy na API route, nikdy jen na klientovi.

## Testy

- Testy žijí v paralelním stromu `tests/unit/**`, ne vedle testovaného
  souboru.
- Spouští se Vitestem (`npx vitest run`), e2e testy Playwrightem
  (`tests/e2e`, OAuth-závislé testy se mimo lokál přeskakují).
- Po každé netriviální změně spusť celou sadu, ne jen soubory, co se zdají
  related — vzájemné závislosti (typy, sdílené utility) bývají nečekané.

## Chyby a logování

- V catch blocích API route handlerů se loguje přes `console.error(...)` s
  kontextovým prefixem (`[NázevModulu]` nebo popis operace); `src/libs/logger.ts`
  existuje pro strukturované logování do souboru.
- Chyba vrácená klientovi vždy prochází `handleError()` z `src/libs/errors.ts`
  (viz skill `nextjs-api-route-conventions`) — nikdy `Response.json({message})`
  ručně.

## Commit zprávy

Formát `typ: krátký popis v angličtině`, malá písmena u typu:

```
feat: add role-based filtering to user list
fix: correct redirect after OAuth callback
chore: update dependencies
```

Nejčastější typy: `feat`, `fix`, `chore`, `refactor`.

## Co preferovat / co nepoužívat

Používej:
```
RoleChecker.hasRoleOrHigher(user, "admin")
requireAuthentication(request, { requireRole: "admin", forbiddenMessage: "..." })
throw BadRequest("Invalid user ID")
```

Nepoužívej:
```
data, doStuff, calc                          // nic neříkající názvy
if (!user.roles.includes("admin")) throw ...  // ruční autorizace místo RoleChecker
Response.json({ message: "..." }, { status }) // ruční tvar chyby místo throw + handleError
new PrismaClient()                            // vlastní instance místo sdíleného src/libs/prisma
```
