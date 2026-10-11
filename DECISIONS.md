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
