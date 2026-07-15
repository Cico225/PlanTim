# 🚀 Kako Pokrenuti PlanTim Projekat

## ⚡ BRZO POKRETANJE (3 Koraka)

### 1️⃣ Instalirajte Sve (Prvi Put)

Duplim klikom pokrenite:

```
SETUP_AUTO.bat
```

**Što radi:**
- ✅ Kreira `.env` fajlove (backend + frontend)
- ✅ Instalira sve PHP i Node.js zavisnosti
- ✅ Kreira bazu podataka i tabele
- ✅ Kreira admin korisnika
- ✅ Priprema projekat za rad

**Trajanje:** 3-5 minuta

**Napomena:** Ova skripta **NE ZAHTIJEVA** da PHP bude u PATH-u! 🎉

---

### 2️⃣ Pokrenite Aplikaciju

Duplim klikom pokrenite:

```
START_ALL_AUTO.bat
```

**Što radi:**
- ✅ Pokreće Backend server (Laravel) - http://localhost:8000
- ✅ Pokreće Frontend server (React) - http://localhost:5173
- ✅ Otvara 2 odvojena prozora (možete ih minimizovati)

---

### 3️⃣ Otvorite u Browseru

```
http://localhost:5173
```

**Prijavite se sa:**
```
Email:    admin@plantim.com
Password: password
```

🔒 **GDPR Napomena:** 
- Pri prvoj prijavi, potrebno je prihvatiti **Uslove korištenja** i **Politiku privatnosti**
- Stranice dostupne na: `/terms` i `/privacy`
- Više informacija: `docs/GDPR_IMPLEMENTATION.md`

---

## 📂 Dostupne Skripte

### Instalacija (Jednom)

| Skripta | Opis |
|---------|------|
| **SETUP_AUTO.bat** | 🟢 **Preporučeno** - Automatska instalacija (NE treba PATH) |
| CREATE_ENV_AND_SETUP.bat | Instalacija (zahtijeva PHP u PATH-u) |

---

### Pokretanje Servera

| Skripta | Opis |
|---------|------|
| **START_ALL_AUTO.bat** | 🟢 **Preporučeno** - Pokreće Backend + Frontend odjednom |
| START_BACKEND_AUTO.bat | Pokreće samo Backend server |
| START_FRONTEND.bat | Pokreće samo Frontend server |

---

## 🔧 Ako Nešto Ne Radi

### Problem 1: "PHP nije pronadjen"

**Rješenje:** Koristite **SETUP_AUTO.bat** umjesto drugih skripti.

---

### Problem 2: "MySQL nije aktivan"

**Rješenje:**
1. Otvorite **XAMPP Control Panel**
2. Pokrenite **MySQL** (Start dugme)
3. Pokrenite ponovo `SETUP_AUTO.bat`

---

### Problem 3: "Composer nije pronadjen"

**Rješenje:** `SETUP_AUTO.bat` će **automatski instalirati Composer** za vas!

---

### Problem 4: "npm nije prepoznato"

**Rješenje:**
1. Instalirajte **Node.js**: https://nodejs.org/
2. Preporučena verzija: **LTS (18.x ili 20.x)**
3. Restartujte Command Prompt
4. Pokrenite ponovo `SETUP_AUTO.bat`

---

### Problem 5: "Nema odgovora od servera"

**Provjera 1 - Da li su serveri pokrenuti?**

Provjerite u browseru:
- Backend: http://localhost:8000 → Trebate vidjeti Laravel stranicu
- Frontend: http://localhost:5173 → Trebate vidjeti login formu

**Provjera 2 - Da li je backend aktivan?**

Otvorite novi Command Prompt:
```cmd
curl http://localhost:8000/api/health
```

**Očekivani rezultat:** `{"status":"ok"}`

Ako dobijete grešku, pokrenite ponovo:
```
START_BACKEND_AUTO.bat
```

---

### Problem 6: "Invalid credentials" pri prijavi

**Uzrok:** Pogrešni login podaci.

**Tačni podaci:**
```
Email:    admin@plantim.com
Password: password
```

**Ako ne radi:**
1. Pokrenite `SETUP_AUTO.bat` ponovo
2. Ili ručno:
   ```cmd
   cd C:\xampp\htdocs\PlanTim
   C:\xampp\php\php.exe artisan db:seed --force
   ```

---

### Problem 7: Tabele nisu kreirane u bazi

**Rješenje:** Uvezite SQL ručno:

1. Otvorite **phpMyAdmin**: http://localhost/phpmyadmin
2. Kreirajte bazu `plantim` (ako ne postoji)
3. Izaberite bazu `plantim`
4. Kliknite na **Import**
5. Odaberite fajl: `create_all_tables.sql`
6. Kliknite **Go**

---

## ✅ Provjera Da Li Sve Radi

### 1. Provjera Baze Podataka

Otvorite **phpMyAdmin**: http://localhost/phpmyadmin

- Baza `plantim` postoji? ✅
- Vidite 40+ tabela? ✅
- U tabeli `users` postoji admin korisnik? ✅

---

### 2. Provjera Backend Servera

Otvorite: http://localhost:8000

**Očekivano:** Laravel welcome stranica ili JSON odgovor

---

### 3. Provjera Frontend Servera

Otvorite: http://localhost:5173

**Očekivano:** Login forma PlanTim aplikacije

---

## 🎯 Normalan Radni Tok

### Prvi Put (Instalacija):

```
1. SETUP_AUTO.bat          ← Instalacija (jednom)
2. START_ALL_AUTO.bat      ← Pokretanje servera
3. http://localhost:5173   ← Otvorite u browseru
```

### Svaki Sljedeći Put:

```
1. START_ALL_AUTO.bat      ← Pokrenite servere
2. http://localhost:5173   ← Otvorite u browseru
```

---

## 🛑 Zaustavljanje Servera

- **Zatvorite prozore** servera (Backend i Frontend)
- Ili pritisnite **Ctrl+C** u svakom prozoru

---

## 📚 Dokumentacija

- **Korisnički Manual:** `docs/USER_MANUAL.md`
- **Admin Manual:** `docs/ADMIN_MANUAL.md`
- **Brzi Start:** `docs/QUICK_START_GUIDE.md`
- **Rješavanje Problema:** `RJESENJE_GRESKE_PRIJAVE.md`

---

## 🆘 Pomoć

Ako imate problema:

1. Provjerite da li je **XAMPP MySQL** pokrenut
2. Provjerite da li su **oba servera** aktivna
3. Pogledajte **Command Prompt prozore** za greške
4. Pročitajte `RJESENJE_GRESKE_PRIJAVE.md`

---

## 🎉 Uspješna Prijava - Šta Dalje?

Nakon uspješne prijave:

1. ✅ **Promijenite lozinku** (Settings → Security)
2. ✅ **Kreirajte nove korisnike** (Admin → Users)
3. ✅ **Istražite module:**
   - 📊 Dashboard - Pregled sistema
   - 👥 CRM - Upravljanje kontaktima
   - 📁 Projects - Projektni menadžment
   - 📄 DMS - Upravljanje dokumentima
   - 🎓 LMS - E-learning sistem
   - 👔 HRM - Ljudski resursi
   - 💬 Chat - Interna komunikacija
   - 🤖 AI - AI asistent i alati

---

## 📱 Pristup Sa Mobilnog i Drugih Računara

Za pristup aplikaciji sa mobilnog telefona ili drugih računara na istoj mreži:

**Prvi put (setup):**
1. Desni klik → `COMPLETE_NETWORK_FIX.bat` → **Run as Administrator**
2. Sačekaj da završi

**Svaki put:**
1. `START_NETWORK.bat`
2. Sa mobilnog/drugog računara: `http://TVOJA_IP:5173`

📖 **Detaljno:** `NETWORK_SETUP.md`

---

**Napomena:** Prvi put će instalacija potrajati duže zbog download-a zavisnosti. Sljedeći put će se pokretati odmah! ⚡

