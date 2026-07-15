# PlanTim - Instalacijska Uputstva

## 📋 Sistemski Zahtjevi

### Software
- **PHP**: 8.1 ili novije (8.2+ preporučeno)
- **MySQL**: 8.0 ili novije
- **Node.js**: 18.x ili novije
- **NPM**: 9.x ili novije

### XAMPP Zahtjevi
- XAMPP 8.2+ instaliran na `C:\xampp`
- PHP extensions omogućene:
  - OpenSSL, PDO, Mbstring, Tokenizer, XML
  - Ctype, JSON, BCMath, Fileinfo
  - **GD**, **ZIP** (obavezno!)

---

## ⚡ BRZA INSTALACIJA (Preporučeno)

### Korak 1: Provjera XAMPP

1. Pokreni **XAMPP Control Panel**
2. Klikni **Start** pored **MySQL**
3. Proveri da MySQL radi (zeleno)

### Korak 2: Automatska Instalacija

**Duplim klikom** pokreni:
```
SETUP_AUTO.bat
```

✅ Ova skripta automatski:
- Kreira `.env` fajlove (backend + frontend)
- Instalira sve PHP pakete (Composer)
- Instalira Node.js pakete (NPM)
- Kreira bazu podataka `plantim`
- Pokreće migracije (kreira tabele)
- Kreira admin korisnike
- Čisti cache

**Trajanje:** 3-5 minuta (prvi put)

### Korak 3: Pokretanje

**Duplim klikom:**
```
START_ALL_AUTO.bat
```

### Korak 4: Pristup

Otvori browser:
```
http://localhost:5173
```

**Login:**
```
Email:    admin@plantim.com
Password: password
```

---

## 🔧 RUČNA INSTALACIJA (Napredna)

Ako želiš ručnu kontrolu nad instalacijom:

### 1. Backend Setup

```bash
cd C:\xampp\htdocs\PlanTim

# Instalacija PHP paketa
C:\xampp\php\php.exe C:\xampp\php\composer.phar install

# Kreiranje .env fajla
copy .env.example .env

# Generisanje APP_KEY
C:\xampp\php\php.exe artisan key:generate

# Kreiranje baze podataka
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS plantim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Pokretanje migracija
C:\xampp\php\php.exe artisan migrate --force

# Dodavanje inicijalnih podataka
C:\xampp\php\php.exe artisan db:seed --force

# Čišćenje cache-a
C:\xampp\php\php.exe artisan config:clear
C:\xampp\php\php.exe artisan cache:clear
```

### 2. Frontend Setup

```bash
cd C:\xampp\htdocs\PlanTim\frontend

# Kreiranje .env fajla
echo VITE_API_URL=http://localhost:8000/api > .env
echo VITE_APP_NAME=PlanTim >> .env

# Instalacija NPM paketa
npm install
```

### 3. Pokretanje Servera

**Backend** (Command Prompt 1):
```bash
cd C:\xampp\htdocs\PlanTim
C:\xampp\php\php.exe artisan serve
```

**Frontend** (Command Prompt 2):
```bash
cd C:\xampp\htdocs\PlanTim\frontend
npm run dev
```

---

## 📱 MREŽNI PRISTUP (Mobilni/Drugi Računari)

Za pristup aplikaciji sa mobilnog ili drugih računara:

### Korak 1: Network Setup

**Desni klik** → **Run as Administrator**:
```
COMPLETE_NETWORK_FIX.bat
```

✅ Ova skripta automatski:
- Detektuje IP adresu
- Dodaje Windows Firewall pravila
- Ažurira konfiguraciju
- Čisti cache

### Korak 2: Pokretanje

```
START_NETWORK.bat
```

### Korak 3: Pristup

Sa mobilnog/drugog računara (ista WiFi mreža):
```
http://TVOJA_IP:5173
```

📖 **Detaljno:** `NETWORK_SETUP.md`

---

## 🔑 Korisnici i Pristup

### Admin Nalozi (kreirani automatski):

| Uloga | Email | Password | Opis |
|-------|-------|----------|------|
| Super Admin | `superadmin@plantim.com` | `password` | Puni pristup |
| Admin | `admin@plantim.com` | `password` | Administrativni pristup |
| Manager | `manager@plantim.com` | `password` | Menadžerski pristup |
| Employee | `employee@plantim.com` | `password` | Zaposleni pristup |

### Prvi Pristup:

1. Otvori: `http://localhost:5173`
2. Unesi: `admin@plantim.com` / `password`
3. **Obavezno promijeni lozinku!**

---

## 🗄️ Struktura Baze Podataka

### Glavni Moduli:

- **Users & Permissions** - Korisnici i RBAC
- **CRM** - Kontakti, kompanije, deal-ovi
- **Projects** - Projekti, taskovi, timovi
- **DMS** - Dokumenti, folderi, verzije
- **LMS** - Kursevi, lekcije, testovi
- **HRM** - Zaposlenici, odjeli, odsustva
- **Chat** - Konversacije, poruke
- **Notifications** - Obavijesti, postavke
- **GDPR** - Consenti, audit log
- **Office365** - Email, kalendar sync
- **AI** - AI chat, dokumenti
- **Planika** - Specijalni moduli

**Total:** 40+ tabela

📖 **Detaljno:** `docs/DATABASE_SCHEMA.md`

---

## ⚙️ Konfiguracija

### Backend (.env):

```env
APP_NAME=PlanTim
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=plantim
DB_USERNAME=root
DB_PASSWORD=

# Za network pristup koristite IP umesto localhost
# APP_URL=http://192.168.1.204:8000
```

### Frontend (.env):

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=PlanTim

# Za network pristup koristite IP umesto localhost
# VITE_API_URL=http://192.168.1.204:8000/api
```

---

## 🔧 Troubleshooting

### Problem: "PHP nije pronađen"

**Rješenje:** Koristi `SETUP_AUTO.bat` koji automatski koristi `C:\xampp\php\php.exe`

---

### Problem: "MySQL nije aktivan"

**Rješenje:**
1. XAMPP Control Panel
2. Start → MySQL
3. Ponovi instalaciju

---

### Problem: "Composer nije instaliran"

**Rješenje:** `SETUP_AUTO.bat` automatski instalira Composer ako ne postoji!

---

### Problem: "npm nije prepoznato"

**Rješenje:**
1. Instaliraj Node.js: https://nodejs.org/
2. Izaberi LTS verziju (18.x ili 20.x)
3. Restartuj Command Prompt
4. Ponovi `SETUP_AUTO.bat`

---

### Problem: "GD extension missing"

**Rješenje:**
1. Otvori: `C:\xampp\php\php.ini`
2. Nađi: `;extension=gd`
3. Promijeni u: `extension=gd` (ukloni `;`)
4. Sačuvaj i restartuj Apache

Ili automatski: `COMPLETE_NETWORK_FIX.bat` provjerava i omogućava ekstenzije

---

### Problem: "Invalid credentials"

**Tačni podaci:**
```
Email:    admin@plantim.com
Password: password
```

**Ako ne radi:** Ponovi `SETUP_AUTO.bat`

---

## 📊 Testiranje Instalacije

### Test 1: Backend Health

```
http://localhost:8000/api/health
```

**Očekivano:**
```json
{"status":"ok","timestamp":"..."}
```

### Test 2: Frontend

```
http://localhost:5173
```

**Očekivano:** Login forma

### Test 3: Baza Podataka

phpMyAdmin → Baza `plantim` → Tabele (40+)

---

## 🚀 Produkciono Deploy-ovanje

Za produkciju koristite Docker:

📖 **Detaljno:** `DOCKER_DEPLOYMENT.md`

```bash
docker-compose up -d
```

---

## 📚 Dodatna Dokumentacija

- **Brzo pokretanje:** `POKRETANJE.md`
- **Detaljno uputstvo:** `KAKO_POKRENUTI.md`
- **Mrežni pristup:** `NETWORK_SETUP.md`
- **Korisnički manual:** `docs/USER_MANUAL.md`
- **Admin manual:** `docs/ADMIN_MANUAL.md`
- **Quick start:** `docs/QUICK_START_GUIDE.md`
- **Database schema:** `docs/DATABASE_SCHEMA.md`

---

## 🆘 Dodatna Pomoć

Ako imaš problema:

1. Proveri `KAKO_POKRENUTI.md` - Problem solving sekcija
2. Pokreni `TEST_NETWORK.bat` za dijagnostiku
3. Proveri Laravel logove: `storage/logs/laravel.log`
4. Proveri browser Console za frontend greške

---

**Verzija:** 1.0.0  
**Datum:** 2025-11-18  
**PHP:** 8.2.12  
**Laravel:** 10  
**React:** 18
