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

## D-6 Bezpečnostní HTTP hlavičky a CSP s nonce (2026-10-18)

Rozhodnutí: `next.config.ts` vypíná `X-Powered-By` a všem routám posílá
`Referrer-Policy`, `Permissions-Policy` a `X-Content-Type-Options`.
`src/proxy.ts` posílá na stránky `Content-Security-Policy` s nonce
vygenerovaným pro každý request (`src/libs/csp.ts`). `script-src` je bez
`'unsafe-inline'`, `style-src` ho mít musí kvůli Mantine. Nonce jde do
layoutu přes `x-nonce` a dostávají ho `<Script>` tagy analytiky. Domény
Umami/GA/Clarity se do `connect-src`/`img-src` přidávají, jen když je daná
analytika v `.env` zapnutá. `public/.well-known/security.txt` (RFC 9116)
a matcher proxy vyjímá `.well-known`, jinak by ho přesměroval pod `/cs`.

Důvod: pentest školních systémů (2026-09, nálezy 6.3.3, 6.4.1–6.4.8,
6.5.3; `evaluation-v1-app` `SISTER-REPOS.md` S-13, S-14). Oprava je
převzatá z `projects-v1-app` se dvěma rozdíly. CSP je i v request hlavičce,
jak to popisuje návod Next.js. `upgrade-insecure-requests` se posílá jen pro
request, který přišel přes HTTPS (přímo nebo podle `x-forwarded-proto`).
Na HTTP serveru totiž přepíše i interní navigaci a prefetch na
`https://` a přechody mezi stránkami selžou (`ERR_SSL_PROTOCOL_ERROR`,
ověřeno v prohlížeči proti `next start`).

Důsledek: nonce funguje jen na dynamicky renderovaných stránkách. Root
layout čte `headers()`, takže to v šabloně platí pro všechny. Nová
externí služba (obrázky, API volané z prohlížeče, vložené skripty) musí
přidat svou doménu do `buildCsp`, jinak ji prohlížeč zablokuje. Appka na
šabloně si v `security.txt` nastaví svůj kontakt a jednou ročně obnoví
`Expires`.

## D-7 PWA jen jako instalovatelnost, bez service workeru (2026-10-19)

Rozhodnutí: šablona má Web App Manifest (`src/app/manifest.ts`, z
`appConfig`), ikony v `public/icons` (generuje
`scripts/generate-pwa-icons.mjs`) a `appleWebApp` meta tagy pro iOS.
Service worker, offline cache ani push notifikace nemá. Proxy vynechává
`manifest.webmanifest` z jazykového přesměrování.

Důvod: zadání uživatele - stačí instalovatelnost, notifikace ne
(`projects-v1-app` má navíc Web Push, commit `ce2e34c`). Chrome ani
Safari service worker pro instalaci nevyžadují, takže odpadne i výjimka
`worker-src` v CSP. Proti `projects-v1-app` jsou maskable ikony
samostatné soubory s bezpečným okrajem, protože Android maskable ikonu
ořízne do kruhu.

Důsledek: appka, která bude chtít push notifikace nebo offline režim,
převezme `public/sw.js` a navazující kód z `projects-v1-app`. Musí pak
přidat `sw.js` do výjimek matcheru v `src/proxy.ts` a `worker-src 'self'`
do `buildCsp`. Instalovatelnost hlídá `tests/unit/manifest.test.ts`
(ikony z manifestu musí existovat a mít deklarovanou velikost).

## D-8 Společný layout s hlavním menu a hlavička zhušťovaná podle šířky (2026-10-26)

Rozhodnutí: veřejná část i administrace používají `AppLayout`
(`src/components/AppLayout.tsx`). Hlavní menu (`MainNavigation`) je vždy
v hlavičce a položky se ukazují podle role. Administrace k němu přidá
postranní menu podsekcí (`DashboardNavigation`), skupina „Domů“ z něj
odpadla. Hlavička se zhušťuje podle naměřené šířky obsahu
(`src/libs/headerFit.ts`: plná → kompaktní uživatelská sekce → šuplík), ne
podle pevného breakpointu. Šuplík obsahuje hlavní menu a pod ním podsekce,
pokud postranní menu není vidět. Postranní menu se ukazuje od 48em
(Mantine `sm`), stejně jako končí mobil. Odkazy v obou menu nesou jazyk
aktuální stránky (`localizedHref`).

Důvod: převzato z `evaluation-v1-app` (`SISTER-REPOS.md` S-24, S-25,
S-27). Šablona dřív neměla hlavní menu a mezi 768 a 992 px byly podsekce
administrace nedostupné (postranní menu skryté od `md`, šuplík až pod
768 px). Při ověření se našly dvě další chyby (S-28, S-29). S krátkým menu
šablony zůstávala hlavička pod 768 px bez burgeru, takže podsekce zase
nebyly dostupné. Odkazy menu bez jazyka přepínaly anglicky prohlížejícího
uživatele zpět do češtiny.

Důsledek: appka postavená na šabloně přidá své sekce do `ITEMS`
v `MainNavigation.tsx` (popisky do `nav` ve slovnících) a podsekce do
`dashboardMenuStructure`. Vlastní sekce s podstránkami použije
`<AppLayout sidebar={...}>`. Na hlavičce nic dalšího nastavovat nemusí,
zhuštění se přizpůsobí délce menu i jménu uživatele.
