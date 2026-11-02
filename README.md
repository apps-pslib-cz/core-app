# core-app

Univerzální šablonová appka (Next.js App Router, Prisma/PostgreSQL, Mantine UI, NextAuth v5 + Duende Identity Server OAuth) - základ pro další appky SPŠSE a VOŠ Liberec se sdíleným přihlašováním přes `oauth.pslib.cz` a konzistentním UI.

## Spuštění

```
npm install
npx prisma generate
npx prisma migrate deploy   # založí/aktualizuje DB z prisma/migrations
npm run dev
```

Potřebný `.env` (zkopírujte `.env.example` a vyplňte):

- `DATABASE_URL` - PostgreSQL připojení.
- `AUTH_URL`/`AUTH_SECRET` - NextAuth v5.
- `AUTH_DUENDE_IDENTITY_SERVER6_ISSUER`/`_ID`/`_SECRET` - OAuth klient zaregistrovaný na `oauth.pslib.cz` (redirect URI `http://localhost:3000/api/auth/callback/duende-identity-server6`).
- `AUTH_DUENDE_IDENTITY_SERVER6_SCOPE` - musí obsahovat vlastní scope appky s role-claimy z `ROLE_CLAIMS` (pro šablonu např. `openid profile email core`). Bez něj OAuth server role-claimy nepošle a nikdo nedostane žádnou roli. Výchozí hodnota je jen `openid profile email`.

Nová migrace při vývoji: `npx prisma migrate dev --name <nazev>`. Potřebuje
shadow databázi, takže DB uživatel musí mít právo `CREATEDB`, nebo musí
být nastavená samostatná shadow DB. Lokální DB založená dřív přes
`prisma db push` se na migrace převede jednou příkazem
`npx prisma migrate resolve --applied 20261012000000_init` (schéma už
odpovídá, migrace se jen označí jako použitá).

## Bezpečnostní hlavičky

Stránky posílají CSP s nonce (`src/libs/csp.ts`, `src/proxy.ts`), ostatní
bezpečnostní hlavičky nastavuje `next.config.ts` (viz `DECISIONS.md` D-6).
Nová externí doména (obrázky, API volané z prohlížeče, skript) se musí
přidat do `buildCsp`. Appka postavená na šabloně si upraví kontakt
v `public/.well-known/security.txt` a před datem `Expires` ho obnoví.

## Instalovatelná appka (PWA)

Appku jde nainstalovat na plochu nebo do systému. Manifest generuje
`src/app/manifest.ts` z `appConfig` (`name`, `description` a sekce `pwa`
v `src/config/app.ts`). Service worker ani notifikace šablona nemá (viz
`DECISIONS.md` D-7). Appka postavená na šabloně si upraví `appConfig.pwa`
a ikony v `public/icons` přegeneruje ze svého loga:

```
node scripts/generate-pwa-icons.mjs cesta/k/logu.svg "#ffffff"
```

## Role appky

`src/types/roles.ts` definuje role appky (výchozí `admin`/`member`) a mapování OAuth claimů na role (`ROLE_CLAIMS`). Role appky nejsou pevně zadrátované do databáze - `User.roles` je `string[]`, takže přidání/odebrání role je jen úprava `roles.ts`, ne migrace schématu.

## Stav

Hotovo: auth/role vrstva, `BaseLayout`/`SettingsDrawer`, `DataTable`,
administrace uživatelů (seznam/detail/vytvoření/úprava/smazání,
synchronizace avatarů a aktivity z OAuth serveru) přepsaná na
`@tanstack/react-query`, chybové stránky, admin logy, footer stránky,
agentická infrastruktura pro Claude Code, GitHub Copilot a Codex
(`AGENTS.md`, `.agents/skills`, nativní hook konfigurace, `LOGS.md` a
projektové záznamy v `SPEC.md`/`TASKS.md`/`DECISIONS.md`/`IDEAS.md`),
deployment skripty a návod (`scripts/`, `docs/deployment.md`).

Appky postavené na šabloně a evidence chyb, které s ní sdílejí, jsou
v [`SISTER-REPOS.md`](SISTER-REPOS.md).

## Další dokumentace

- [`CONVENTIONS.md`](CONVENTIONS.md) — jak je appka postavená a jak se do ní píše kód.
- [`SPEC.md`](SPEC.md) — co appka (jako šablona) dělá a jak to ověřit.
- [`docs/deployment.md`](docs/deployment.md) — nasazení na IIS/Windows Service.
- [`dev_notes/agentic-engineering.md`](dev_notes/agentic-engineering.md) — metodika agentního vývoje, ze které `CONVENTIONS.md`/`SPEC.md`/`TASKS.md`/`DECISIONS.md` vycházejí.
- `npm run agent:skills:sync` / `npm run agent:skills:check` — údržba a kontrola kanonických Agent Skills a Claude zrcadla.
