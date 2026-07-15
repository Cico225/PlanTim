# 🚀 PlanTim - Vodič za instalaciju i pokretanje

## 📋 Preduvjeti

Prije nego što počnete, provjerite da li imate instalirano:

- ✅ **XAMPP** (sa PHP 8.1+ i MySQL)
- ✅ **Composer** (za Laravel dependencies)
- ✅ **Node.js** (v18+ i npm)
- ✅ **Git** (za version control)

---

## 🛠️ INSTALACIJA - KORAK PO KORAK

### 1️⃣ XAMPP Setup

1. Pokrenite **XAMPP Control Panel**
2. Start **Apache** i **MySQL** servise
3. Provjerite da li Apache radi na `http://localhost`

---

### 2️⃣ Baza podataka

1. Otvorite **phpMyAdmin**: `http://localhost/phpmyadmin`
2. Kreirajte novu bazu podataka:
   - Ime: `plantim`
   - Collation: `utf8mb4_unicode_ci`

---

### 3️⃣ Backend (Laravel) Setup

```bash
# Navigirajte do projekta
cd C:\xampp\htdocs\PlanTim

# Instalirajte Laravel dependencies
composer install

# Kreirajte .env fajl (kopirajte .env.example)
# Napomena: .env fajl morate kreirati ručno jer je u .gitignore
# Sadržaj .env fajla je dat niže

# Generirajte aplikacijski ključ
php artisan key:generate

# Pokrenite migracije (kreira sve tabele)
php artisan migrate

# Seedujte početne podatke (admin user, role, permissioni)
php artisan db:seed

# Pokrenite Laravel development server
php artisan serve
```

**Laravel server će biti dostupan na:** `http://localhost:8000`

---

### 4️⃣ Frontend (React) Setup

```bash
# Navigirajte do frontend foldera
cd C:\xampp\htdocs\PlanTim\frontend

# Instalirajte npm dependencies
npm install

# Kreirajte .env fajl (kopirajte .env.example)
# Napomena: .env fajl morate kreirati ručno

# Pokrenite React development server
npm run dev
```

**React app će biti dostupan na:** `http://localhost:5173`

---

## 📝 .ENV FAJLOVI

### Backend (.env) - Root projekta

Kreirajte fajl `C:\xampp\htdocs\PlanTim\.env` sa sljedećim sadržajem:

```env
APP_NAME=PlanTim
APP_ENV=local
APP_KEY=base64:GENERISACE_SE_AUTOMATSKI
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=plantim
DB_USERNAME=root
DB_PASSWORD=

CACHE_DRIVER=file
QUEUE_CONNECTION=sync
SESSION_DRIVER=file

SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173,127.0.0.1,127.0.0.1:5173
FRONTEND_URL=http://localhost:5173

# Ostale postavke...
```

### Frontend (.env) - Frontend folder

Kreirajte fajl `C:\xampp\htdocs\PlanTim\frontend\.env` sa sljedećim sadržajem:

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=PlanTim
VITE_APP_ENV=development
VITE_WS_URL=ws://localhost:6001
```

---

## 🔐 Pristupni podaci (nakon seedovanja)

Po završetku seedovanja, možete se prijaviti sa:

- **Email:** `admin@plantim.local`
- **Lozinka:** `password`

---

## 📂 Struktura projekta

```
PlanTim/
├── app/                    # Laravel aplikacija
├── config/                 # Konfiguracije
├── database/               # Migracije i seederi
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── modules/        # Moduli (Dashboard, CRM, Projects...)
│   │   ├── layouts/
│   │   ├── services/       # API servisi
│   │   ├── store/          # Zustand state management
│   │   ├── i18n/           # Multi-language
│   │   └── types/          # TypeScript tipovi
│   └── package.json
├── routes/                 # API i web routes
├── public/                 # Public assets
└── README.md
```

---

## 🎨 Testiranje frontend-a

Nakon pokretanja frontend servera:

1. Otvorite browser: `http://localhost:5173`
2. Trebali biste vidjeti **Login stranicu**
3. Prijavite se sa admin kredencijalima
4. Istražite module: Dashboard, CRM, Projects, itd.

---

## 🐛 Troubleshooting

### Problem: "Target class [AuthController] does not exist"

**Rješenje:**
```bash
composer dump-autoload
```

### Problem: "SQLSTATE[HY000] [1045] Access denied"

**Rješenje:** Provjerite `.env` fajl:
- `DB_DATABASE=plantim`
- `DB_USERNAME=root`
- `DB_PASSWORD=` (ostavi prazno za XAMPP default)

### Problem: "npm ERR! code ENOENT"

**Rješenje:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Problem: CORS greške

**Rješenje:** Dodajte u `config/cors.php`:
```php
'allowed_origins' => ['http://localhost:5173'],
'supports_credentials' => true,
```

---

## 🚀 Pokretanje oba servera odjednom

**Terminal 1 (Laravel Backend):**
```bash
cd C:\xampp\htdocs\PlanTim
php artisan serve
```

**Terminal 2 (React Frontend):**
```bash
cd C:\xampp\htdocs\PlanTim\frontend
npm run dev
```

---

## 📦 Build za produkciju

### Backend:
```bash
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Frontend:
```bash
cd frontend
npm run build
```

Build će biti u `frontend/dist` folderu.

---

## 🎯 Sljedeći koraci

Nakon uspješne instalacije, možete:

1. ✅ Istražiti postojeće module
2. ✅ Kreirati nove korisnike preko Admin panela
3. ✅ Podesiti RBAC permissione
4. ✅ Customizovati teme (Light/Dark/Black)
5. ✅ Promijeniti jezik (Bosanski/Engleski)

---

## 📞 Podrška

Za pitanja i probleme:
- Email: support@plantim.local
- Dokumentacija: `/docs`

---

**Verzija:** 1.0.0  
**Datum:** 2025-11-17  
**Licenca:** Proprietary


