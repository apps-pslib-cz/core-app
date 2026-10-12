# CoreApp — Management Skripty

Sada skriptů pro spouštění a správu Windows Service na serveru. **Šablona**
— appka postavená na `core-app` přejmenuje `CoreApp`/port `3100` podle
sebe na třech místech: `tools/<Name>.xml`, `scripts/service.ps1` (proměnné
`$serviceName`/`$port`) a `scripts/install-service.ps1`/`update.ps1`
(`$serviceName`).

## Instalace

```powershell
# Jako Administrator
cd C:\inetpub\core-app
.\scripts\install-service.ps1
```

- Stáhne WinSW z GitHub (pokud chybí)
- Zaregistruje Windows Service podle `$serviceName` (výchozí `CoreApp`)
- Opraví práva ACL pro Node proces
- Spustí službu

## Správa Služby

```powershell
.\service.ps1 -Action <akce>
```

### Dostupné akce:

| Akce | Popis |
|------|-------|
| `status` | Zobrazí stav služby a proces na portu šablony |
| `start` | Spustí službu |
| `stop` | Zastaví službu |
| `restart` | Restartuje službu |
| `logs` | Zobrazí logy (poslední 50 řádků) |
| `logs -Follow` | Sleduje logy v reálném čase |

## Update Aplikace

```powershell
# Jako Administrator
.\update.ps1
```

Automaticky:
1. Zastaví službu
2. `git pull origin` — stáhne nové změny
3. `npm install` — aktualizuje dependencies
4. `npx prisma generate` — vygeneruje Prisma klienta
5. `npx prisma migrate deploy` — spustí migrace
6. `npm run build` — přebuilduje aplikaci
7. Restartuje službu

### Volby:

- `-SkipDeps` — přeskočí `npm install`
- `-SkipMigrations` — přeskočí Prisma operace

## PowerShell Cmdlety (přímé)

```powershell
Get-Service CoreApp
Start-Service CoreApp
Stop-Service CoreApp
Restart-Service CoreApp

# Port (viz $port v service.ps1)
netstat -ano | findstr :3100
```

## Troubleshooting

### Služba se nespustí

```powershell
.\service.ps1 -Action logs -Follow

# Manuální spuštění (uvidíte chyby)
cd C:\inetpub\core-app
node server.js
```

### ACL Problémy

```powershell
.\install-service.ps1 -Uninstall
.\install-service.ps1
```

Nebo manuálně:

```powershell
icacls "C:\inetpub\core-app" /grant "BUILTIN\Users:(OI)(CI)M" /T
```

### Vlastnictví tabulek v DB po prvním `prisma migrate deploy`

Pokud `prisma migrate deploy` hlásí `must be owner of table X`, spusť
jednou `scripts/fix-table-ownership.sql` (viz komentář v souboru pro
vysvětlení a jak ho rozšířit o vlastní tabulky appky).

## Záloha a obnovení databáze

```powershell
# Záloha podle .env (lokální dev DB)
.\scripts\backup-database.ps1

# Záloha produkční DB podle .env.production, do vlastní složky
.\scripts\backup-database.ps1 -EnvFile .env.production -OutDir D:\Backups\core-app

# Obnovení ze zálohy - vyžaduje vypsat přesný název cílové DB jako potvrzení
.\scripts\restore-database.ps1 -BackupFile backups\core-app_core_20261012_120000.dump
```

Oba skripty čtou `DATABASE_URL` přímo ze zadaného `.env` souboru (`-EnvFile`,
výchozí `.env`), ne z prostředí procesu — lze tak zálohovat/obnovit jiné
prostředí, než se kterým právě běží dev server. `backup-database.ps1`
vytvoří `pg_dump` zálohu v custom formátu (`-Fc`) do `backups/`
(gitignored — zálohy obsahují reálná data, nikdy se nekomitují).
`restore-database.ps1` je **destruktivní** (`pg_restore --clean
--if-exists` smaže existující objekty v cílové databázi před jejich
obnovením) — bez `-Force` vyžaduje interaktivní potvrzení přesným
názvem cílové databáze.

Vyžadují `pg_dump`/`pg_restore` na PATH (součást PostgreSQL instalace).

---

**Více informací:** [docs/deployment.md](../docs/deployment.md)
