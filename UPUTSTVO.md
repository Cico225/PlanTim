# 📖 PlanTim - Kompletno Uputstvo

## 🎯 Brze Reference

### 💻 Samo na Ovom Računaru
```
1. SETUP_AUTO.bat         (samo prvi put)
2. START_ALL_AUTO.bat     (svaki put)
3. http://localhost:5173
```

### 📱 Sa Mobilnog i Drugih Računara
```
1. COMPLETE_NETWORK_FIX.bat (kao Administrator - samo prvi put)
2. START_NETWORK.bat         (svaki put)
3. http://TVOJA_IP:5173      (sa mobilnog/drugog računara)
```

### 🔑 Login Podaci
```
Email:    admin@plantim.com
Password: password
```

🔒 **GDPR:** Pri prijavi potrebno je prihvatiti Uslove korištenja i Politiku privatnosti.

---

## 📂 Dostupne Skripte

### Lokalni Pristup:
- `SETUP_AUTO.bat` - **Instalacija** (samo prvi put)
- `START_ALL_AUTO.bat` - **Pokreni sve** (backend + frontend)
- `START_BACKEND_AUTO.bat` - Samo backend
- `START_FRONTEND.bat` - Samo frontend

### Mrežni Pristup:
- `COMPLETE_NETWORK_FIX.bat` - **Setup za mrežu** (kao Administrator, prvi put)
- `START_NETWORK.bat` - **Pokreni servere** za mrežni pristup
- `TEST_NETWORK.bat` - **Testiraj** mrežni pristup

---

## 📚 Dokumentacija

### Osnovna Uputstva:
- **`POKRETANJE.md`** - 📄 Brzo i jednostavno uputstvo
- **`KAKO_POKRENUTI.md`** - 📘 Detaljno uputstvo sa troubleshooting
- **`NETWORK_SETUP.md`** - 🌐 Mrežni pristup (mobilni/drugi računari)
- **`POCNI_OVDJE.txt`** - ⚡ Quick start fajl

### Tehnička Dokumentacija:
- **`docs/INSTALLATION.md`** - 🔧 Kompletan instalacijski vodič
- **`docs/QUICK_START_GUIDE.md`** - ⚡ 5-minutni brzi start
- **`docs/USER_MANUAL.md`** - 👤 Korisnički manual
- **`docs/ADMIN_MANUAL.md`** - 🛡️ Admin manual
- **`docs/DATABASE_SCHEMA.md`** - 🗄️ Database struktura
- **`docs/GDPR_IMPLEMENTATION.md`** - 🔒 GDPR usklađenost i privatnost

### Troubleshooting:
- **`RJESENJE_GRESKE_PRIJAVE.md`** - Problem sa prijavom
- **`SIGURNOSNO_UPOZORENJE.md`** - PHP verzija upozorenja

---

## 🚀 Prvi Koraci

### 1. Instalacija (Prvi Put)

**Windows sa XAMPP:**
1. Pokreni **MySQL** u XAMPP Control Panel
2. Duplim klikom: `SETUP_AUTO.bat`
3. Sačekaj 3-5 minuta
4. Gotovo! ✅

### 2. Pokretanje (Svaki Put)

**Lokalni rad:**
```
START_ALL_AUTO.bat
```

**Sa mobilnim pristupom:**
```
START_NETWORK.bat
```

### 3. Pristup

**Browser:**
```
http://localhost:5173
```

**Login:**
```
Email:    admin@plantim.com
Password: password
```

---

## 🎯 Korisnici

### Dostupni Nalozi:

| Uloga | Email | Password |
|-------|-------|----------|
| Super Admin | `superadmin@plantim.com` | `password` |
| Admin | `admin@plantim.com` | `password` |
| Manager | `manager@plantim.com` | `password` |
| Employee | `employee@plantim.com` | `password` |

⚠️ **OBAVEZNO promijeni lozinku nakon prve prijave!**

---

## 🌐 Pristup sa Mobilnog

### Setup (Samo Prvi Put):

1. **Desni klik** na `COMPLETE_NETWORK_FIX.bat`
2. Izaberi **"Run as administrator"**
3. Sačekaj da završi
4. **Zatvori sve servere** (Ctrl+C)

### Pokretanje (Svaki Put):

1. Duplim klikom: `START_NETWORK.bat`
2. Sa mobilnog: `http://TVOJA_IP:5173`

⚠️ **Mobilni i računar moraju biti na istoj WiFi mreži!**

---

## 🔧 Troubleshooting

### Problem: "Nema odgovora od servera"

**Provjeri:**
1. ✅ Da li je MySQL pokrenut u XAMPP?
2. ✅ Da li su serveri pokrenuti? (`START_ALL_AUTO.bat`)
3. ✅ Da li koristiš tačnu adresu? (`localhost:5173`)

---

### Problem: "Invalid credentials"

**Tačni podaci:**
```
Email:    admin@plantim.com
Password: password
```

(NE `admin@plantim.local`, NE `password123`)

---

### Problem: Mobilni ne može pristupiti

**Rješenje:**
1. Pokreni: `COMPLETE_NETWORK_FIX.bat` (kao Administrator)
2. Zatvori servere
3. Pokreni: `START_NETWORK.bat`
4. Testiraj: `TEST_NETWORK.bat`

---

### Problem: Greška pri instalaciji

**Rješenje:**
1. Provjeri da je **MySQL pokrenut**
2. Provjeri **PHP verziju**: `C:\xampp\php\php.exe --version`
   - Treba biti 8.1 ili novije
   - Preporučeno: 8.2+
3. Omogući **GD i ZIP** ekstenzije
4. Ponovi: `SETUP_AUTO.bat`

---

## 📊 URL-ovi

### Aplikacija:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api
- **Health check:** http://localhost:8000/api/health

### Alati:
- **phpMyAdmin:** http://localhost/phpmyadmin
- **XAMPP Control:** C:\xampp\xampp-control.exe

---

## 🗄️ Baza Podataka

### Pristup:
- **Host:** localhost
- **Port:** 3306
- **Database:** plantim
- **User:** root
- **Password:** (prazno)

### phpMyAdmin:
```
http://localhost/phpmyadmin
```

### Struktura:
- **40+ tabela**
- **16 glavnih modula**
- UTF8MB4 encoding

---

## 📱 Moduli

1. 📊 **Dashboard** - Početna stranica, statistike
2. 👥 **CRM** - Kontakti, kompanije, deal-ovi
3. 📁 **Projects** - Projekti, taskovi, timovi
4. 📄 **DMS** - Dokumenti, folderi, verzije
5. 🎓 **LMS** - Kursevi, lekcije, testovi
6. 👔 **HRM** - Zaposlenici, odsustva, evidencija
7. 💬 **Chat** - Direktne poruke, grupe
8. 🔔 **Notifications** - Obavještenja
9. 🛡️ **GDPR** - Consent, data export/deletion
10. 📧 **Office365** - Email, kalendar sync
11. 🏢 **Planika** - Specijalni moduli
12. 🤖 **AI** - AI asistent, chat, dokument generisanje
13. ⚙️ **Admin** - Korisnici, uloge, permisije
14. 🌙 **Themes** - Light, Dark, Black mode
15. 🌐 **Multi-language** - Bosanski, English
16. 📊 **Analytics** - Izvještaji, statistike

---

## 🔐 Sigurnost

### Lozinke:
- ⚠️ Default lozinka je `password`
- ✅ **OBAVEZNO promijeni** nakon prve prijave!
- Koristi jaku lozinku (8+ znakova, brojevi, specijalni znaci)

### Firewall:
- Automatski postavljen putem `COMPLETE_NETWORK_FIX.bat`
- Omogućava portove 8000 i 5173
- Samo za lokalnu mrežu (ne izlaže na internet)

### RBAC:
- Role-Based Access Control
- Detaljne permisije po modulu
- Admin može kontrolisati pristup

---

## 🚀 Produkcija

Za produkciono postavljanje koristite Docker:

📖 **Detaljno:** `DOCKER_DEPLOYMENT.md`

```bash
docker-compose up -d
```

---

## 📞 Dodatne Informacije

### Sistemski Zahtjevi:
- **OS:** Windows 10/11
- **XAMPP:** 8.2+ (PHP 8.2+)
- **Node.js:** 18.x ili 20.x LTS
- **RAM:** 4GB minimum, 8GB preporučeno
- **Disk:** 2GB slobodnog prostora

### Tehnologije:
- **Backend:** Laravel 10 (PHP 8.2)
- **Frontend:** React 18 + TypeScript
- **Database:** MySQL 8.0
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Routing:** React Router
- **i18n:** i18next
- **Auth:** Laravel Sanctum

---

## 🎓 Edukacija

### Za Korisnike:
1. Pročitaj `docs/USER_MANUAL.md`
2. Prati `docs/QUICK_START_GUIDE.md`
3. Eksperimentiraj sa demo podacima

### Za Administratore:
1. Pročitaj `docs/ADMIN_MANUAL.md`
2. Prati `docs/INSTALLATION.md`
3. Konfiguriši sistem prema potrebama

### Za Developere:
1. Pročitaj `docs/DATABASE_SCHEMA.md`
2. Prati `DOCKER_DEPLOYMENT.md`
3. Pročitaj Laravel i React dokumentaciju

---

## ✅ Checklist - Kompletan Setup

- [ ] XAMPP instaliran (8.2+)
- [ ] MySQL pokrenut
- [ ] Node.js instaliran (18.x+)
- [ ] `SETUP_AUTO.bat` pokrenut uspješno
- [ ] Serveri pokrenuti (`START_ALL_AUTO.bat`)
- [ ] Login radi (`admin@plantim.com` / `password`)
- [ ] Lozinka promijenjena
- [ ] Kreirani novi korisnici
- [ ] Testiran prvi projekat
- [ ] Testirani svi moduli
- [ ] (Opcionalno) Mrežni pristup postavljen
- [ ] (Opcionalno) Mobilni pristup testiran

---

## 🎉 Završna Riječ

**Čestitamo!** Uspješno si postavio PlanTim aplikaciju!

Sada možeš:
- ✅ Upravljati projektima i zadacima
- ✅ Organizovati kontakte i klijente
- ✅ Dijeliti dokumente sa timom
- ✅ Pratiti napredak zaposlenika
- ✅ Koristiti AI asistenta
- ✅ ... i još mnogo toga!

**Uživaj u radu!** 🚀

---

**Verzija:** 1.0.0  
**Datum:** 2025-11-18  
**Podrška:** Pročitaj dokumentaciju ili testiraj `TEST_NETWORK.bat`

