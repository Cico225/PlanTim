# 🔧 Rješenje Greške Pri Prijavi

## Problem Identificiran ✅

Tabele su kreirane, ali **prijava ne radi** zbog sljedećih razloga:

1. ❌ **Nema `.env` fajla** - Laravel ne može da se poveže sa bazom
2. ❌ **Nisu instalirane PHP zavisnosti** - Nema `vendor/` foldera
3. ❌ **Nije kreiran admin korisnik** - Seederi nisu pokrenuti
4. ❌ **Serveri nisu pokrenuti** - Backend i Frontend moraju raditi

---

## 🚀 Brzo Rješenje (Preporučeno)

### Opcija 1: Automatska Instalacija (Najbrže)

Pokrenite ove **dva batch fajla** klikom:

```batch
1. CREATE_ENV_AND_SETUP.bat       ← Kreira backend
2. CREATE_FRONTEND_ENV.bat         ← Kreira frontend .env
```

**Šta ovi fajlovi rade:**
- ✅ Kreiraju `.env` fajlove
- ✅ Instaliraju sve zavisnosti
- ✅ Generišu sigurnosni ključ
- ✅ Kreiraju admin korisnika
- ✅ Spremaju projekat za rad

**Trajanje:** 2-5 minuta (zavisi od brzine interneta)

---

## 📝 Opcija 2: Ručna Instalacija (Korak po Korak)

Ako automatska instalacija ne radi, slijedite ove korake:

### Korak 1: Dodajte PHP i Composer u PATH

**Provjerite da li su dostupni:**
```cmd
php --version
composer --version
```

**Ako dobijete grešku "nije prepoznato":**

1. Otvorite **System Properties** → **Environment Variables**
2. U **System Variables**, pronađite **Path**
3. Dodajte:
   - `C:\xampp\php`
   - `C:\ProgramData\ComposerSetup\bin` (ili gdje je Composer instaliran)
4. **Restartujte Command Prompt**

---

### Korak 2: Kreirajte Backend `.env` Fajl

U `C:\xampp\htdocs\PlanTim\`, kreirajte fajl **`.env`** sa ovim sadržajem:

```env
APP_NAME=PlanTim
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=plantim
DB_USERNAME=root
DB_PASSWORD=

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost
```

---

### Korak 3: Kreirajte Frontend `.env` Fajl

U `C:\xampp\htdocs\PlanTim\frontend\`, kreirajte fajl **`.env`** sa ovim sadržajem:

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=PlanTim
```

---

### Korak 4: Instalirajte PHP Zavisnosti

Otvorite **Command Prompt** u `C:\xampp\htdocs\PlanTim\`:

```cmd
composer install
```

**Očekivano trajanje:** 2-5 minuta

---

### Korak 5: Generišite Sigurnosni Ključ

```cmd
php artisan key:generate
```

Ovaj komanda će automatski dodati `APP_KEY` u `.env` fajl.

---

### Korak 6: Kreirajte Admin Korisnika

```cmd
php artisan db:seed --force
```

**Podaci za prijavu:**
- **Email:** `admin@plantim.local`
- **Password:** `password123`

---

### Korak 7: Pokrenite Servere

**Terminal 1 - Backend (Laravel):**
```cmd
cd C:\xampp\htdocs\PlanTim
php artisan serve
```

**Terminal 2 - Frontend (React):**
```cmd
cd C:\xampp\htdocs\PlanTim\frontend
npm run dev
```

---

## 🌐 Pristupite Aplikaciji

Otvorite browser i idite na:

```
http://localhost:5173
```

**Prijavite se sa:**
- **Email:** `admin@plantim.local`
- **Password:** `password123`

---

## ❓ Česte Greške i Rješenja

### 1. "Nema odgovora od servera"

**Uzrok:** Backend server nije pokrenut.

**Rješenje:**
```cmd
cd C:\xampp\htdocs\PlanTim
php artisan serve
```

Provjerite da li radi: http://localhost:8000

---

### 2. "Invalid credentials" ili "User not found"

**Uzrok:** Admin korisnik nije kreiran.

**Rješenje:**
```cmd
cd C:\xampp\htdocs\PlanTim
php artisan db:seed --force
```

---

### 3. "CORS Error" ili "Blocked by CORS policy"

**Uzrok:** Frontend i Backend nisu povezani.

**Rješenje:**
Provjerite `.env` fajlove:

**Backend `.env`:**
```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:8000/api
```

Zatim restartujte **oba servera**.

---

### 4. "php nije prepoznato"

**Uzrok:** PHP nije u PATH.

**Rješenje:**
Dodajte `C:\xampp\php` u System PATH, ili koristite punu putanju:

```cmd
C:\xampp\php\php.exe artisan serve
```

---

### 5. "composer nije prepoznato"

**Uzrok:** Composer nije instaliran ili nije u PATH.

**Rješenje:**
1. Instalirajte Composer: https://getcomposer.org/download/
2. Restartujte Command Prompt
3. Pokrenite: `composer --version`

---

## 📊 Provjera Da Li Sve Radi

### 1. Provjerite MySQL:
```cmd
mysql -u root -e "USE plantim; SHOW TABLES;"
```

**Očekivani rezultat:** Lista sa 40+ tabela.

---

### 2. Provjerite Backend:
```cmd
curl http://localhost:8000/api/health
```

**Očekivani rezultat:** `{"status":"ok"}`

---

### 3. Provjerite Admin Korisnika:
```cmd
mysql -u root -e "USE plantim; SELECT id, name, email FROM users WHERE email='admin@plantim.local';"
```

**Očekivani rezultat:**
```
+----+------------+---------------------+
| id | name       | email               |
+----+------------+---------------------+
|  1 | Admin User | admin@plantim.local |
+----+------------+---------------------+
```

---

## 🎯 Sljedeći Koraci Nakon Uspješne Prijave

1. ✅ **Promijenite admin lozinku** (Settings → Security)
2. ✅ **Kreirajte nove korisnike** (Admin → Users)
3. ✅ **Dodijelite role i permissione** (Admin → Roles)
4. ✅ **Istražite module** (Dashboard, CRM, Projects, itd.)

---

## 📞 Pomoć

Ako i dalje imate problema:

1. **Provjerite XAMPP Control Panel** - MySQL i Apache moraju biti pokrenuti
2. **Provjerite Windows Firewall** - Možda blokira port 8000 ili 5173
3. **Očistite cache:**
   ```cmd
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   ```

---

**Napomena:** Nakon što rješite problem, možete slobodno obrisati ovaj fajl.

