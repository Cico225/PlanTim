# 🔐 KREDENCIJALI ZA PRIJAVU - PlanTim

## 📊 Tabela sa korisnicima

Korisnici se nalaze u **MySQL bazi podataka** u tabeli: **`users`**

Baza podataka: **`plantim`**

---

## 🔑 Test Korisnici

Svi test korisnici su kreirani kroz `AdminUserSeeder`. Evo kredencijala:

| Uloga | Email | Lozinka | Opis |
|-------|-------|---------|------|
| **Super Admin** | `superadmin@plantim.com` | `password` | Potpuni pristup svim funkcijama |
| **Admin** | `admin@plantim.com` | `password` | Administratorski pristup |
| **Manager** | `manager@plantim.com` | `password` | Menadžerski pristup |
| **Employee** | `employee@plantim.com` | `password` | Pristup zaposlenog |

**NAPOMENA:** Lozinka za SVE korisnike je: **`password`**

---

## 🚀 Kako se prijaviti

### 1. Osigurajte da serveri rade:

**🌟 NOVI - Automatsko Pokretanje (Preporučeno):**
```bash
START_ALL_AUTO_NETWORK.bat
```
- ✅ Automatski detektuje WiFi mrežu
- ✅ Ažurira konfiguraciju
- ✅ Pokreće oba servera
- ✅ Omogućava pristup sa telefona
- ✅ Radi sa bilo kojom WiFi mrežom!

**🔄 Promenili ste WiFi mrežu?**
```bash
UPDATE_NETWORK_CONFIG.bat
```
Zatim pokrenite servere.

**💻 Samo za ovaj računar (Localhost):**
```bash
START_LOCALHOST_ONLY.bat
```

**📱 Ručno Pokretanje:**

Backend (Laravel):
```bash
cd C:\xampp\htdocs\PlanTim
C:\xampp\php\php.exe artisan serve
```
Ili:
```bash
START_BACKEND.bat
```

Frontend (React):
```bash
cd C:\xampp\htdocs\PlanTim\frontend
npm run dev
```
Ili:
```bash
START_FRONTEND.bat
```

### 2. Otvorite aplikaciju:

- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:8000**

### 3. Prijavite se:

1. Otvorite **http://localhost:5173/login**
2. Unesite email (npr: `admin@plantim.com`)
3. Unesite lozinku: `password`
4. Kliknite na "Prijavi se"

---

## 🔍 Provera sistema

### Provjera baze podataka:
```bash
cd C:\xampp\htdocs\PlanTim
C:\xampp\php\php.exe artisan tinker --execute="echo 'Broj korisnika: ' . \App\Models\User::count();"
```

### Provjera da li backend API radi:
Otvorite: **http://localhost:8000/api/health**

Trebali bi vidjeti:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

---

---

## 📱 Pristup sa Mobilnih Uređaja

Nakon pokretanja `START_ALL_AUTO_NETWORK.bat`:

1. U prozoru pročitaj svoju IP adresu (npr: `192.168.0.13`)
2. Na telefonu ili tabletu otvori browser
3. Unesi adresu: `http://192.168.0.13:5173`
4. Prijavi se: `admin@plantim.com` / `password`

**VAŽNO:** Telefon i računar moraju biti na **istoj WiFi mreži**!

---

## 🔄 Promena WiFi Mreže

### ✨ NOVO - Automatsko Rešenje!

Kada promenite WiFi mrežu:

**Jednostavan način:**
```bash
1. Dupli klik na: START_ALL_AUTO_NETWORK.bat
2. Gotovo! ✅
```

**Ili manuelno:**
```bash
1. Dupli klik na: UPDATE_NETWORK_CONFIG.bat
2. Pokreni servere normalno
```

Više informacija u fajlu: **`BRZA_PODRSKA.md`**

---

## ❌ Uobičajeni problemi

### Problem: "Ne mogu se prijaviti"

**Provjera 1:** Da li backend server radi?
- Otvorite: http://localhost:8000/api/health
- Ako ne radi, pokrenite: `START_BACKEND.bat`

**Provjera 2:** Da li frontend ima pravilnu API URL?
- Proverite da li postoji `frontend/.env` fajl
- Ako ne postoji, kopirajte `frontend/env-template.txt` u `frontend/.env`
- Provjerite da `VITE_API_URL=http://localhost:8000/api`

**Provjera 3:** Da li XAMPP MySQL server radi?
- Otvorite XAMPP Control Panel
- Provjerite da li je MySQL pokrenut (zeleno dugme)

**Provjera 4:** Da li postoje korisnici u bazi?
```bash
C:\xampp\php\php.exe artisan db:seed --class=AdminUserSeeder
```

### Problem: "CORS Error"

Backend mora biti pokrenut sa pravilnim CORS podešavanjima. Provjerite `config/cors.php`.

---

## 📝 Napomene

- Svi seederi su već pokrenuti (migracije su izvršene)
- Postoji 10+ test korisnika u bazi
- Sve lozinke su hash-ovane sa bcrypt algoritmom
- API koristi Laravel Sanctum za autentifikaciju (Bearer Token)

---

## 🆘 Pomoć

Ako i dalje imate problema sa prijavom:

1. Provjerite Laravel log fajl: `storage/logs/laravel.log`
2. Otvorite browser Developer Tools (F12) -> Network tab
3. Pogledajte greške pri login POST zahtjevu
4. Provjerite da li server vraća 200 ili error status

---

**Sretno! 🎉**

