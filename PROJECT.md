# Stav projektu (PROJECT)

Fáze projektu, aktivní přírůstek a otevřené otázky. Stav úkolů je jen v
`TASKS.md`, znění kritérií jen ve `SPEC.md`, rozhodnutí jen v
`DECISIONS.md` - sem se nekopírují, jen se na ně odkazuje. **Bod
pokračování** (kde práce skončila) patří do záznamu úkolu v `TASKS.md`, ne
sem: tenhle soubor by jinak přepisovala každá větev úkolu a merge by
konfliktoval.

Tohle je šablona. Appka postavená na ní začíná vlastním `PROJECT.md` s fází
`priprava`; `/discover-project` ji přepne na `discovery`.

## Fáze

- Fáze: `sablona`
- Od: 2026-11-05

Fáze jsou navigace, ne oprávnění ani důkaz splnění:

| Fáze | Co se děje | Další krok |
| --- | --- | --- |
| `priprava` | Šablona zkopírována, nic se nespecifikovalo. | Člověk spustí `/discover-project`. |
| `discovery` | Rozhovor o potřebě, zápis do `SPEC.md`. | Člověk schválí rozsah přírůstku (`D-N`). |
| `navrh` | Technická rozhodnutí přírůstku. | Člověk schválí rozhodnutí třídy C/D. |
| `planovani` | Rozpad na úkoly `T-N`. | `/work-task T-N`. |
| `realizace` | Práce na úkolech ve větvích. | Merge po souhlasu člověka. |
| `akceptace` | Člověk přijímá výsledek přírůstku. | Další přírůstek nebo uzavření. |

## Aktivní přírůstek

Žádný (šablona).

## Otevřené otázky

Formát (nadpis jen s ID, aby byla kotva stabilní):

```markdown
### Q-N
- Otázka: konkrétní nejasnost.
- Blokuje: co nelze bez odpovědi správně udělat (AC-N, T-N, nebo „nic“).
- Rozhodne: osoba nebo role.
- Stav: otevřeno | vyřešeno | odloženo
- Výsledek: po vyřešení odkaz na D-N / AC-N, ne kopie.
```

Odložená otázka neruší svůj blokující dopad. Číslo `Q-N` se nepřiděluje znovu.

_Žádné otevřené otázky._
