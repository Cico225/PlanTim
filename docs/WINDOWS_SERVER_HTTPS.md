# PlanTim — HTTPS na Windows Serveru (samo IP adresa)

Vodič za produkciju na `https://VAŠA_IP` bez domene.

## Automatski (na serveru)

1. **Desni klik** na `SETUP_WINDOWS_HTTPS.bat` → **Run as administrator**
2. Skripta radi:
   - `BUILD_PRODUCTION_FRONTEND.bat` (korak 1)
   - SSL certifikat (self-signed)
   - Apache vhost za HTTPS
   - Firewall (80, 443 otvoreni; 5173 blokiran)
3. **Ručno** nakon skripte (vidi ispod)

## Ručno — šta skripta NE može uraditi umjesto vas

### A) `.env` na serveru

```powershell
cd C:\xampp\htdocs\PlanTim
copy deploy\env.production.ip.example .env
notepad .env
```

Obavezno promijenite:

- `APP_KEY` → pokrenite: `C:\xampp\php\php.exe artisan key:generate`
- `DB_PASSWORD` → lozinka MySQL-a na serveru
- `77.77.210.70` → vaša stvarna IP (ili kreirajte `TRENUTNA_IP_ADRESA.txt` sa IP u jednom redu prije setupa)

### B) Restart Apache

XAMPP Control Panel → **Stop** Apache → **Start** Apache

Ako Apache ne startuje, provjerite:

- `C:\xampp\apache\logs\error.log`
- Da li port 443 već koristi drugi program (`netstat -ano | findstr :443`)

### C) Prihvatanje certifikata u browseru

Self-signed certifikat → browser prikazuje upozorenje.

- **Firefox:** Advanced → Accept the Risk and Continue
- **Chrome:** Advanced → Proceed to …

Za sve zaposlenike: jednom prihvate certifikat po browseru/računaru.

### D) Zaustavite dev server

```powershell
taskkill /F /IM node.exe
```

**Ne pokretajte** `npm run dev` na produkciji. Koristite samo build:

```bat
BUILD_PRODUCTION_FRONTEND.bat
```

### E) Google reCAPTCHA (pravi ključevi)

1. [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Nova stranica, tip v2
3. Domene: `77.77.210.70` (vaša IP)
4. U `.env`:

```env
RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET_KEY=...
```

### F) Router / hosting firewall

Ako server nije dostupan iz interneta, na **routeru ili cloud panelu** proslijedite:

| Port | Protokol | Namjena        |
|------|----------|----------------|
| 80   | TCP      | HTTP → HTTPS   |
| 443  | TCP      | HTTPS aplikacija |

Port **5173** ne otvarajte javno.

### G) Svaki deploy

```bat
PULL_FROM_GITHUB.bat
```

ili:

```bat
BUILD_PRODUCTION_FRONTEND.bat
```

zatim restart Apache ako je potrebno.

## Pristup aplikaciji

| Ispravno | Pogrešno |
|----------|----------|
| `https://77.77.210.70/login` | `http://77.77.210.70:5173/login` |

## Katanac bez upozorenja (opcionalno)

Self-signed uvijek daje upozorenje. Za katanac bez upozorenja na IP:

- [win-acme](https://www.win-acme.com/) (Let's Encrypt za IP) — port 80 mora biti dostupan s interneta

## Struktura fajlova

```
deploy/apache/plantim-https-ip.conf   → Apache HTTPS vhost
deploy/env.production.ip.example    → primjer .env za produkciju
BUILD_PRODUCTION_FRONTEND.bat       → korak 1 (build)
SETUP_WINDOWS_HTTPS.bat             → koraci 2–6 (SSL + Apache)
scripts/setup-windows-firewall.ps1  → firewall pravila
frontend/public/.htaccess           → SPA routing u dist/
```

## Provjera

```powershell
curl -k https://77.77.210.70/api/health
```

Očekivano: `{"status":"ok",...}`
