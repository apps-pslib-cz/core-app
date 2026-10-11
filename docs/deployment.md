# Deployment na IIS (Windows Server)

Tento návod popisuje postup nasazení Next.js aplikace na IIS server s
PostgreSQL databází. **Šablona** — vytěžená z `projects-v1-app`'s
deployment návodu; appka postavená na `core-app` nahradí placeholdery
níže (`core-app`, `CoreApp`, `3100`, `core.pslib.cz`) svými vlastními
hodnotami.

- **Testovací/produkční prostředí (placeholder):** `C:\inetpub\core-app`
  → `core.pslib.cz`
- **Repozitář (placeholder):** vlastní GitHub repo appky

> Architektura: Next.js (`next start`) běží jako Windows Service (WinSW)
> na vlastním portu, IIS funguje jako reverzní proxy přes Application
> Request Routing (ARR).

---

## Prerekvizity na serveru

### 1. Software k instalaci

| Software | URL |
|---|---|
| Node.js LTS (v20+) | https://nodejs.org/ |
| IIS URL Rewrite Module | https://www.iis.net/downloads/microsoft/url-rewrite |
| IIS Application Request Routing (ARR) | https://www.iis.net/downloads/microsoft/application-request-routing |
| Git for Windows | https://git-scm.com/download/win |
| PostgreSQL (pokud ještě není) | https://www.postgresql.org/download/windows/ |

> **Poznámka:** WinSW se automaticky stahuje během instalace služby, není potřeba stahovat ručně.

### 2. Ověření instalace

```powershell
# PowerShell jako Administrator
node --version    # v20+
npm --version
git --version
psql --version
```

---

## Nastavení IIS

### 1. Povolení ARR proxy

```powershell
# PowerShell jako Administrator — povolení reverse proxy v ARR
Import-Module WebAdministration
Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' `
  -filter "system.webServer/proxy" -name "enabled" -value "True"
```

### 2. Vytvoření Application Pool

```powershell
Import-Module WebAdministration

New-WebAppPool -Name "CoreAppPool"

# Node.js nepotřebuje managed runtime
Set-ItemProperty IIS:\AppPools\CoreAppPool -Name "managedRuntimeVersion" -Value ""
Set-ItemProperty IIS:\AppPools\CoreAppPool -Name "enable32BitAppOnWin64" -Value $false
Set-ItemProperty IIS:\AppPools\CoreAppPool -Name "processModel.identityType" -Value "ApplicationPoolIdentity"
```

### 3. Vytvoření Web Application

```powershell
New-Item -ItemType Directory -Force -Path "C:\inetpub\core-app"

New-WebApplication -Name "core-app" `
  -Site "Default Web Site" `
  -PhysicalPath "C:\inetpub\core-app" `
  -ApplicationPool "CoreAppPool"
```

> Pro produkci použijte vlastní site s vazbou na doménu appky místo Default Web Site.

### 4. Nastavení práv

```powershell
icacls "C:\inetpub\core-app" /grant "IIS AppPool\CoreAppPool:(OI)(CI)F" /T
```

### 5. Konfigurace web.config (ARR proxy)

Vytvořte soubor `C:\inetpub\core-app\web.config` (port musí odpovídat
`$port` v `scripts/service.ps1` a `<env name="PORT">` v `tools/CoreApp.xml`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3100/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## Nastavení databáze

### 1. Vytvoření produkční databáze

```sql
-- Připojte se k PostgreSQL
psql -U postgres

CREATE DATABASE core_app_prod;
CREATE USER core_app WITH PASSWORD 'silne-heslo-zde';
GRANT ALL PRIVILEGES ON DATABASE core_app_prod TO core_app;

-- V PostgreSQL 15+ je potřeba i toto:
\c core_app_prod
GRANT ALL ON SCHEMA public TO core_app;

\q
```

Pokud `prisma migrate deploy` i přesto hlásí `must be owner of table X`
(typicky když tabulky vznikly přes superuser spojení), spusťte jednou
`scripts/fix-table-ownership.sql`.

### 2. Konfigurace prostředí

Vytvořte soubor `.env.production` v root složce aplikace na serveru
(`C:\inetpub\core-app\.env.production`) — vycházející z `.env.example`
v repozitáři, se skutečnými hodnotami:

```dotenv
NODE_ENV="production"

DATABASE_URL="postgresql://core_app:silne-heslo-zde@localhost:5432/core_app_prod?schema=public"

# Next Auth (Auth.js v5) - čte AUTH_SECRET/AUTH_URL, ne starší
# NEXTAUTH_SECRET/NEXTAUTH_URL jména.
AUTH_SECRET="vygenerujte-viz-níže"
AUTH_URL="https://core.pslib.cz"
# Nutné při provozu za reverse proxy (IIS ARR) — Auth.js v5 jinak odmítá localhost jako nedůvěryhodný host
AUTH_TRUST_HOST=true

# Duende Identity Server (OAuth provider, oauth.pslib.cz) - vlastní
# OAuth client registrovaný pro tuhle appku, ne sdílený s jinými appkami
# na stejném IdP
AUTH_DUENDE_IDENTITY_SERVER6_ISSUER=https://oauth.pslib.cz
AUTH_DUENDE_IDENTITY_SERVER6_ID=your-client-id
AUTH_DUENDE_IDENTITY_SERVER6_SECRET=your-client-secret

# UI konfigurace
NEXT_PUBLIC_TABLE_ROWS_OPTIONS=5,10,15,25,50,100
NEXT_PUBLIC_TABLE_ROWS_DEFAULT=10
NEXT_PUBLIC_AVAILABLE_LANGUAGES=cs,en
NEXT_PUBLIC_DEFAULT_LANGUAGE=cs

# Analytics (volitelné, nechte prázdné pro vypnutí)
UMAMI_SCRIPT_URL=
UMAMI_WEBSITE_ID=
GOOGLE_ANALYTICS_ID=
CLARITY_PROJECT_ID=

# Logování
LOG_ENABLE_FILE=true
LOG_FILE_PATH=C:\inetpub\core-app\logs
LOG_RETENTION_DAYS=30
LOG_MAX_FILE_SIZE=10
LOG_LEVEL=info
```

Vygenerujte `AUTH_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **Poznámka k OAuth:** `AUTH_DUENDE_IDENTITY_SERVER6_ID` a
> `AUTH_DUENDE_IDENTITY_SERVER6_SECRET` musí odpovídat zaregistrované
> aplikaci na `oauth.pslib.cz` — každá appka na šabloně má svůj vlastní
> client, ne sdílený. Callback URL pro registraci:
> `https://core.pslib.cz/api/auth/callback/duende-identity-server6`

---

## První nasazení

### 1. Naklonování repozitáře

```powershell
cd C:\inetpub\core-app
git clone https://github.com/<org>/<repo>.git .
```

### 2. Instalace závislostí

```powershell
npm ci --omit=dev
```

### 3. Nastavení Prisma a migrace databáze

```powershell
npx prisma generate
npx prisma migrate deploy
```

### 4. Build aplikace

```powershell
npm run build
```

### 5. Instalace Windows Service (WinSW)

```powershell
cd C:\inetpub\core-app
.\scripts\install-service.ps1
```

Skript automaticky:
- Stáhne WinSW z GitHub
- Zaregistruje Windows Service `CoreApp` na portu `3100` (viz
  `tools/CoreApp.xml`)
- Nastaví autostart a restart-on-failure
- Vytvoří `logs` složku pro service logy
- Opraví ACL práva pro Node proces

### 6. Ověření

```powershell
.\scripts\service.ps1 -Action status
Get-Service CoreApp
netstat -ano | findstr :3100
```

Otevřete prohlížeč a jděte na: `https://core.pslib.cz`

```powershell
.\scripts\service.ps1 -Action logs -Follow
```

---

## Aktualizace aplikace (git pull)

```powershell
cd C:\inetpub\core-app
.\scripts\update.ps1
```

Viz `scripts/README.md` pro detailní popis kroků a volby
(`-SkipDeps`, `-SkipMigrations`).

---

## Troubleshooting

### Aplikace neběží

```powershell
.\scripts\service.ps1 -Action status
.\scripts\service.ps1 -Action logs -Follow

# Zkuste spustit Next.js manuálně (uvidíte chyby přímo)
cd C:\inetpub\core-app
node server.js

# ACL problémy
icacls "C:\inetpub\core-app" /grant "BUILTIN\Users:(OI)(CI)M" /T
```

### IIS vrací 502 Bad Gateway

```powershell
netstat -ano | findstr :3100
.\scripts\service.ps1 -Action status

# Zkuste přímý přístup (přes port, bez IIS): http://localhost:3100

Get-Content "C:\inetpub\core-app\web.config"
.\scripts\service.ps1 -Action logs -Follow
```

### Databázové chyby

```powershell
npx prisma db pull
Get-Content C:\inetpub\core-app\.env.production
```

### Port je obsazený

```powershell
netstat -ano | findstr :3100
.\scripts\service.ps1 -Action stop
Stop-Process -Id <PID> -Force
```

---

## HTTPS Setup

V IIS Manager: vyberte site → **Bindings** → přidejte HTTPS binding
(port 443) → vyberte SSL certifikát z úložiště.

Upravte `web.config` — přidejte přesměrování HTTP → HTTPS:

```xml
<rule name="HTTP to HTTPS" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="^OFF$" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

---

## Monitoring a logy

| Typ | Umístění |
|---|---|
| Aplikační logy (winston) | `C:\inetpub\core-app\logs\` |
| IIS access logy | `C:\inetpub\logs\LogFiles\W3SVC1\` |
| Windows Event Log | Aplikace → CoreApp (přes WinSW) |

```powershell
Get-Content "C:\inetpub\core-app\logs\*.log" -Wait -Tail 20
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*.log" -Tail 50
```

---

## Záloha

```powershell
# backup.ps1
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "C:\Backups\core-app\$timestamp"
New-Item -ItemType Directory -Force -Path $backupPath

pg_dump -U core_app -d core_app_prod | Out-File "$backupPath\database.sql"
Copy-Item "C:\inetpub\core-app\.env.production" "$backupPath\"
Copy-Item "C:\inetpub\core-app\web.config" "$backupPath\"

Write-Host "Záloha dokončena: $backupPath"
```

Spouštějte pomocí Windows Task Scheduler.

---

## Další kroky

- [ ] Nastavte pravidelné zálohy databáze (Windows Task Scheduler)
- [ ] Nakonfigurujte monitoring (vlastní alerting)
- [ ] Zaregistrujte appku v `oauth.pslib.cz` se správnými callback URL
- [ ] Nastavte firewall — blokujte přímý přístup na port appky zvenku
- [ ] Nakonfigurujte SSL certifikát
- [ ] Zvažte CDN pro statické assety (`/_next/static/`)
