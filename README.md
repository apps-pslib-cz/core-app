# core-app

Univerzální šablonová appka (Next.js App Router, Prisma/PostgreSQL, Mantine UI, NextAuth v5 + Duende Identity Server OAuth) vytěžená z `projects-v1-app` - základ pro další appky SPŠSE a VOŠ Liberec se sdíleným přihlašováním přes `oauth.pslib.cz` a konzistentním UI.

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

## Role appky

`src/types/roles.ts` definuje role appky (výchozí `admin`/`member`) a mapování OAuth claimů na role (`ROLE_CLAIMS`). Role appky nejsou pevně zadrátované do databáze - `User.roles` je `string[]`, takže přidání/odebrání role je jen úprava `roles.ts`, ne migrace schématu.

## Stav

Hotovo: auth/role vrstva, `BaseLayout`/`SettingsDrawer`, `DataTable`,
administrace uživatelů (seznam/detail/vytvoření/úprava/smazání,
synchronizace avatarů a aktivity z OAuth serveru) přepsaná na
`@tanstack/react-query`, chybové stránky, admin logy, footer stránky,
agentická infrastruktura (`CONVENTIONS.md`, `SPEC.md`/`TASKS.md`/
`DECISIONS.md`/`IDEAS.md`, `.claude/skills`, `.claude/agents`),
deployment skripty a návod (`scripts/`, `docs/deployment.md`).

Zbývá (mimo rozsah dosavadní práce, viz `DECISIONS.md`): skutečné první
použití šablony — migrace `evaluation-v1` na tenhle základ.

## Další dokumentace

- [`CONVENTIONS.md`](CONVENTIONS.md) — jak je appka postavená a jak se do ní píše kód.
- [`SPEC.md`](SPEC.md) — co appka (jako šablona) dělá a jak to ověřit.
- [`docs/deployment.md`](docs/deployment.md) — nasazení na IIS/Windows Service.
- [`dev_notes/agentic-engineering.md`](dev_notes/agentic-engineering.md) — metodika agentního vývoje, ze které `CONVENTIONS.md`/`SPEC.md`/`TASKS.md`/`DECISIONS.md` vycházejí.
