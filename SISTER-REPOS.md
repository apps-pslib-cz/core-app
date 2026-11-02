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
číslo o jedna vyšší než nejvyšší dosud použité (zatím S-31).

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
Stav: core-app [ ] · projects-v1-app [ ] · internship-v5-app [?] · evaluation-v1-app [x]

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
