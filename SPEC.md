# core-app — SPEC (šablona)

Popis **aktuálního pozorovaného chování** toho, co tahle šablonová appka
dnes skutečně obsahuje — ne cílový design konkrétní budoucí appky. Vznikl
podle metodiky v `dev_notes/agentic-engineering.md`.

> **Appka postavená na téhle šabloně nahradí celý tento soubor vlastním
> `SPEC.md`** popisujícím svou vlastní doménu (jako `projects-v1-app`, ze
> kterého je šablona vytěžená, má svůj vlastní `SPEC.md` pro dlouhodobé
> práce). Co zůstává z šablony nezměněné (auth, role, správa uživatelů),
> stačí v novém `SPEC.md` jen odkazem zmínit, ne znovu popisovat.

## 1. Účel

Univerzální základ pro appky SPŠSE a VOŠ Liberec se společným
přihlašováním přes školní OAuth server (`oauth.pslib.cz`, Duende Identity
Server) a konzistentním UI (Mantine). Řeší to, co by jinak každá nová
appka stavěla znovu: přihlášení, obecný model rolí, administraci
uživatelů, nastavení appky per uživatel, chybové stránky, i18n (cs/en).
Nejde o produkt pro koncového uživatele samotný — je to startovní bod pro
další appky (první reálné použití: migrace `evaluation-v1`).

## 2. Uživatelé a scénáře

Jedna vrstva rolí, obecná (`User.roles: string[]`, `src/types/roles.ts`),
výchozí `admin`/`member` s hierarchií `admin ⊇ member`:

1. **Přihlášení** — uživatel se přihlásí přes `oauth.pslib.cz`
   (`/api/auth/callback/duende-identity-server6`). Appka ho najde/založí
   podle `sub`/e-mailu a přidělí roli podle OAuth claimů (`ROLE_CLAIMS`).
2. **Veřejná část** (`(front)`) — stránky dostupné bez role (konkrétní
   appka si doplní vlastní obsah; šablona má jen kostru layoutu).
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
  kontrola je jen pohodlí.
- [ ] AC-3: Uživatel bez role `admin` smí upravit jen vlastní profil, ne
  cizí, ani přímým voláním API.
- [ ] AC-4: Nepřihlášený návštěvník na chráněné stránce dostane
  přihlašovací/chybovou stránku, ne prázdný výpis nebo pád.

## 6. Mimo rozsah

- Přesný tvar API (request/response, chybové kódy, autorizační vzor) —
  `.claude/skills/nextjs-api-route-conventions` a `CONVENTIONS.md`.
- Nasazení a provoz (IIS, Windows Service, proměnné prostředí) —
  `docs/deployment.md`.
- Doménová funkcionalita konkrétní appky postavené na šabloně — vlastní
  `SPEC.md` té appky.
- Pokrytí internacionalizace textů — `.claude/skills/nextjs-i18n-conventions`.

## 7. Ověření od začátku do konce

Přihlásit se přes `oauth.pslib.cz` → ověřit vznik/aktualizaci `User`
záznamu a přidělenou roli → jako `admin` otevřít `/dashboard/users`,
vytvořit/upravit/smazat testovacího uživatele → odhlásit se a zkusit
otevřít `/dashboard` bez přihlášení (čeká se `<UnauthorizedPage />`) →
přihlásit se jako uživatel bez role `admin` a zkusit upravit cizí profil
přímým voláním API (čeká se `403`).
