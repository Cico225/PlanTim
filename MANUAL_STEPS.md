# 🔧 PlanTim - Manuelni Koraci za Setup

## ✅ SIGURAN NAČIN - Korak po Korak

### 1️⃣ Provjerite da li su .env fajlovi kreirani

#### Backend .env
**Lokacija**: `C:\xampp\htdocs\PlanTim\.env`

**Provjerite da postoji i ima ovaj sadržaj**:
```env
APP_NAME=PlanTim
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=plantim
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173
FRONTEND_URL=http://localhost:5173
```

#### Frontend .env
**Lokacija**: `C:\xampp\htdocs\PlanTim\frontend\.env`

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=PlanTim
VITE_APP_ENV=development
```

---

### 2️⃣ Kreirajte Bazu "plantim"

**Otvorite phpMyAdmin**: http://localhost/phpmyadmin

1. Kliknite **"New"** (lijevo gore)
2. **Database name**: `plantim`
3. **Collation**: `utf8mb4_unicode_ci`
4. Kliknite **"Create"**

---

### 3️⃣ Pokrenite RUN_MIGRATIONS.bat

**Jednostavno dvostruki klik** na:
```
RUN_MIGRATIONS.bat
```

Ova skripta će:
- ✅ Generisati APP_KEY
- ✅ Kreirati **SVE TABELE** (40+ tabela)
- ✅ Dodati početne podatke (admin user, role, permissioni)

**Trajanje**: ~30 sekundi

---

### 4️⃣ Provjerite da li su tabele kreirane

1. Otvorite phpMyAdmin
2. Kliknite na bazu **"plantim"** (lijevo)
3. Trebate vidjeti **40+ tabela**:
   - users
   - roles
   - permissions
   - crm_contacts
   - crm_companies
   - projects
   - tasks
   - documents
   - lms_courses
   - hrm_employees
   - chat_conversations
   - ... i još 30+ tabela

---

### 5️⃣ Pokrenite Backend Server

**Dvostruki klik** na:
```
START_BACKEND.bat
```

Trebate vidjeti:
```
Laravel development server started: http://127.0.0.1:8000
```

**Ostavite ovaj prozor OTVOREN!**

---

### 6️⃣ Pokrenite Frontend Server

**Otvorite NOVI Command Prompt**:

1. Pritisnite `Windows + R`
2. Unesite: `cmd`
3. Enter
4. Kopirajte ove komande:

```bash
cd C:\xampp\htdocs\PlanTim\frontend
npm run dev
```

Trebate vidjeti:
```
VITE ready in XXX ms
Local: http://localhost:5173/
```

**Ostavite i ovaj prozor OTVOREN!**

---

### 7️⃣ Otvorite Browser

**URL**: http://localhost:5173

**Login**:
```
Email: admin@plantim.local
Password: password
```

---

## 🔍 ALTERNATIVNO - Ako .bat fajlovi ne rade

### Manuelno pokretanje komandi

**Otvorite Command Prompt** (ne PowerShell):

```bash
# Navigirajte do projekta
cd C:\xampp\htdocs\PlanTim

# Generišite APP_KEY
C:\xampp\php\php.exe artisan key:generate

# Pokrenite migracije
C:\xampp\php\php.exe artisan migrate

# Seedujte podatke
C:\xampp\php\php.exe artisan db:seed

# Pokrenite backend
C:\xampp\php\php.exe artisan serve
```

**U drugom Command Prompt prozoru**:

```bash
cd C:\xampp\htdocs\PlanTim\frontend
npm run dev
```

---

## ❓ Troubleshooting

### "APP_KEY not set"
Pokrenite:
```bash
C:\xampp\php\php.exe artisan key:generate
```

### "SQLSTATE[HY000] [1049] Unknown database"
Baza `plantim` nije kreirana. Idite na korak 2.

### "Table 'plantim.users' doesn't exist"
Migracije nisu pokrenute. Idite na korak 3.

### "Connection refused [tcp://127.0.0.1:8000]"
Backend server nije pokrenut. Idite na korak 5.

### Frontend pokazuje "Cannot connect to server"
- Provjerite da li backend radi (korak 5)
- Provjerite `frontend\.env` fajl (korak 1)

---

## 📞 Status Check

Prije nego otvorite browser, provjerite:

✅ MySQL radi u XAMPP-u (zeleni)  
✅ Baza `plantim` postoji u phpMyAdmin  
✅ 40+ tabela u bazi `plantim`  
✅ Backend terminal pokazuje: `http://127.0.0.1:8000`  
✅ Frontend terminal pokazuje: `http://localhost:5173`  

Ako je SVE ✅ - **Otvorite browser!**

---

**Sretno! 🚀**

