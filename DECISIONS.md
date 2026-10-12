# Rozhodnutí (DECISIONS)

Důležitá rozhodnutí a jejich důvod — proč je kód takový, jaký je, ne co
dělá (to už říká kód sám). Podle metodiky v
`dev_notes/agentic-engineering.md` (kapitola 4.6) — zápisy níže zachycují
rozhodnutí, která by za měsíc bez záznamu nikdo nedokázal vysvětlit, a
hrozí tak, že je někdo v dobré víře "opraví" zpátky.

Číslováno chronologicky podle data rozhodnutí, ne podle důležitosti.

## D-1 Role appky jsou obecný `string[]`
Rozhodnutí: `User.roles` je Postgres `string[]` a appka si vlastní role
definuje jako konstanty v `src/types/roles.ts` (`APP_ROLES`, výchozí
`admin`/`member`), ne jako pevný `admin`/`evaluator`/`author` enum
zadrátovaný do Prisma schématu, jak to má `projects-v1-app`, ze kterého
je tahle šablona vytěžená.

Důvod: šablona je základ pro appky s různými potřebami rolí (další dvě
plánované appky nemusí potřebovat stejnou trojici jako správa
dlouhodobých prací) — nová role nebo appka s jinými rolemi by jinak
vyžadovala Prisma migraci, ne jen úpravu konstanty.

Důsledek: `ROLE_HIERARCHY`/`ROLE_CLAIMS` v `src/types/roles.ts` jsou
místo, kde konkrétní appka role přejmenuje/rozšíří — ne migrace databáze.
`RoleChecker.hasRoleOrHigher` je jediný správný způsob kontroly hierarchie,
ruční `user.roles.includes(...)` bez ohledu na hierarchii je regrese ke
vzoru, který `projects-v1-app` historicky měl rozbitý (viz jeho
`DECISIONS.md`, D-3).

## D-2 `@tanstack/react-query` je nový standard pro fetch/mutaci jedné entity, DataTable zůstává samostatně (2026-10-11)

Rozhodnutí: appky postavené na šabloně mají k dispozici
`@tanstack/react-query` (`QueryProvider` v root layoutu) jako výchozí
vzor pro detail/editaci/vytvoření/mazání jedné entity, místo ručního
`useState(data/loading/error)` + `fetch` v `useEffect`, jak to dělá
`projects-v1-app` všude (nikdy tam zavedeno, viz jeho `DECISIONS.md`
D-15 — vědomě odloženo jako nová závislost bez zdůvodnění v tamním
kontextu). `DataTable`'s vlastní list-fetching (server-side sort/filter/
pagination přes `dataFetcher`) se React Query **nenahrazuje** — zůstává
na svém vlastním `onMountRefresh`/`tableRefreshRef` mechanismu.

Důvod: DataTable řeší jiný problém (sort/filter/pagination synchronizované
s URL) než jednoduchý fetch jedné entity — React Query by musel buď
duplikovat tenhle stav ve vlastním klíči, nebo by DataTable musela ztratit
svou současnou kontrolu nad URL. Nahrazovat fungující, dobře zavedený
mechanismus novou závislostí bez konkrétního problému, který řeší, by
bylo zbytečné riziko bez přínosu.

Důsledek: nová entita vedle `DataTable` (detail, create/edit formulář,
samostatná mutace) jde přes `src/hooks/queries/<entita>.ts`
(`useQuery`/`useMutation` + `invalidateQueries`), viz skill
`nextjs-tanstack-query-conventions`. Mutace, co se dotýká viditelného
řádku v tabulce, musí stále zavolat `tableRefreshRef.current?.()` —
`invalidateQueries` samo o sobě tabulku nerefreshne.

## D-3 Pozvání/import uživatelů (z `projects-v1-app`) se do šablony nepřenáší (2026-10-11)

Rozhodnutí: `/users/invite`, `/users/import` a podkladové
`/api/v1/users/invite`/`/api/v1/oauth/users` z `projects-v1-app` nejsou
v šabloně vůbec — ani jako neaktivní kostra.

Důvod: obě featury řeší specifický scénář `projects-v1-app` (hromadné
zavedení studentů/hodnotitelů na začátku školního roku, propojené se
SharePoint zjišťováním Entra ID) — výslovné rozhodnutí uživatele
("Odstranit z core-app") při prvním zprovoznění šablony, ne jen dočasné
odložení.

Důsledek: appka postavená na šabloně, která tuhle funkci potřebuje, ji
staví znovu podle vlastních potřeb (ne kopií z `projects-v1-app`, kde je
navíc propletená s SharePointem) — v šabloně po ní nezůstal žádný
odkaz/mrtvý kód k navázání.

## D-4 Profil a role při přihlášení z `/connect/userinfo`, ne z admin API (2026-10-12)

Rozhodnutí: provider `DuendeIdentityServer6` má `idToken: false`
(`withUserinfoProfile` v `src/libs/auth.ts`), takže Auth.js načte profil
z `/connect/userinfo` a ověří shodu `sub` s ID tokenem. Claimy normalizuje
a validuje (Zod) `src/libs/oauthProfile.ts`. `provider.profile()` vrací
i role a jméno, takže je adaptér uloží už při založení nového uživatele.
Callback `session` bere data z parametru `user` (database session),
nedohledává uživatele podle e-mailu. `syncUserProfile` doplní e-mail,
pokud v DB chybí. Přihlášení admin API OAuth serveru (`client_credentials`
+ `IdentityServerApi`) nepoužívá.

Důvod: chyby nalezené v `evaluation-v1-app` (její `SISTER-REPOS.md`,
S-2 až S-4). Duende do ID tokenu standardně nedává e-mail, jméno ani
vlastní claimy. Bez oprávnění na admin API se tak uživatel uložil bez
rolí, e-mailu a jména, nový uživatel dostal role až při druhém
přihlášení a uživatel bez e-mailu je nedostal do session nikdy. Chyba se
jen zalogovala, přihlášení navenek prošlo. Šablona nemá pro samotné
přihlášení vyžadovat oprávnění číst všechny uživatele OAuth serveru.

Důsledek: role se berou jen z claimů userinfo, proto appka musí mít
nastavený `AUTH_DUENDE_IDENTITY_SERVER6_SCOPE` se svým scope (S-1).
Přihlášení už nedeaktivuje bývalé studenty/učitele (to dělala admin-API
záloha). Tuhle práci dělá ruční synchronizace
`/api/v1/users/sync-active`, která admin API dál používá a je volitelná.
Appka, která ji nepotřebuje, ji může odstranit spolu
s `getOAuthServiceCredentials`/`fetchOAuthRoleSnapshot`. Výstup
`profile()` smí obsahovat jen sloupce modelu `User`, jinak adaptér shodí
první přihlášení. Hlídá to `tests/unit/oauthProfile.test.ts`.

## D-5 Schéma se zakládá migracemi, ne `db push` (2026-10-12)

Rozhodnutí: šablona má první migraci `prisma/migrations/20261012000000_init`
se svým schématem. README radí `prisma migrate deploy`, nové změny
schématu jdou přes `prisma migrate dev`.

Důvod: `docs/deployment.md` a `scripts/README.md` při nasazení spouští
`prisma migrate deploy`, který bez migrací nic nevytvoří. Produkční DB
by zůstala bez tabulek (`evaluation-v1-app`, `SISTER-REPOS.md` S-5).

Důsledek: appka postavená na šabloně dostane migraci `init` a na ni
navazuje vlastními migracemi.
