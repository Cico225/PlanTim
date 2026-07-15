# PlanTim - Enterprise Kolaboracijski Alat

## 📋 O Projektu

PlanTim je kompletan enterprise kolaboracijski alat sa 16 glavnih modula dizajniran za upravljanje projektima, klijentima, dokumentima, učenjem, ljudskim resursima i još mnogo toga.

## 🛠️ Tech Stack

### Backend
- **PHP 8.1+**
- **Laravel 10**
- **MySQL** (glavna baza podataka)
- **Redis** (cache, queue, sessions)

### Frontend
- **React 18** (with TypeScript)
- **Tailwind CSS** (styling)
- **React Router** (routing)
- **React Query** (data fetching)
- **Zustand** (state management)
- **i18next** (multi-language)
- **Framer Motion** (animations)

### DevOps
- **XAMPP** (development environment)
- **Docker** (production deployment)
- **Git** (version control)

## 📦 Struktura Modula

### 1. DASHBOARD
- Pregled zadataka
- Pregled obavijesti
- Kalendar
- Nedavni dokumenti
- Statističke kartice
- Prečice ka modulima

### 2. CRM (Customer Relationship Management)
- Kontakti
- Kompanije
- Deal-ovi (pipeline)
- Aktivnosti (pozivi, sastanci, email)

### 3. PROJECT MANAGEMENT
- Projekti
- Taskovi / Podtaskovi
- Kanban board
- Gantt Chart
- Activity log

### 4. DMS (Document Management System)
- Upload / download dokumenata
- Verzije dokumenta
- Folderi
- Permissioni
- Share linkovi
- Pretraga
- Office 365 integracija

### 5. LMS (Learning Management System)
- Kursevi
- Lekcije (video, dokumenti, tekst)
- Testovi
- Sertifikati

### 6. HRM (Human Resource Management)
- Zaposlenici
- Odjeli
- Odsustva
- Evidencija rada
- Evaluacije zaposlenika

### 7. CHAT / MESSENGER
- Privatni chat (1:1)
- Grupni chat
- Projektni kanali
- Upload fajlova / dokumenata

### 8. NOTIFIKACIJE
- Interni inbox
- Email notifikacije
- Desktop push
- Pravila personalizacije

### 9. RBAC (Role Based Access Control)
- Kreiranje rola
- Dodjela permissiona po modulu
- Restrikcija UI i API poziva
- Posebni pristupi za HR, GDPR, CRM

### 10. GDPR MODUL
- Consent Management
- Right to Export
- Right to Delete / Pseudonimizacija
- Audit log
- Data retention

### 11. OFFICE 365 INTEGRACIJA
- Outlook email sync
- Kalendar sync
- OneDrive / SharePoint
- Teams (opcionalno)

### 12. PLANIKA
Podmoduli:
1. Komercijala
2. Finansije i računovodstvo
3. Maloprodaja
4. Marketing
5. Ljudski resursi
6. Planika Club

### 13. AI MODUL
- Interni AI model
- OpenAI integracija
- Chat AI asistenta
- Automatsko generisanje dokumenata
- Predikcija i analitika
- Semantic search
- Prepoznavanje PDF/slika

### 14. ADMINISTRACIJA
- Upravljanje korisnicima
- Upravljanje ulogama i RBAC
- Upravljanje modulima
- Sistemske postavke
- GDPR i sigurnost
- Monitoring logova

### 15. UI / UX MODA
- Light mode
- Dark mode
- Black mode (OLED friendly)
- Responsive dizajn

### 16. MULTI-LANGUAGE PODRŠKA
- Bosanski (default)
- Engleski
- Dinamička promjena jezika

## 🚀 Instalacija i Pokretanje

### ⚡ BRZO POKRETANJE

#### 🎯 Prvi Put - Instalacija:

1. ✅ Pokreni **MySQL** u XAMPP Control Panel-u
2. ✅ Duplim klikom: `SETUP_AUTO.bat` (sačekaj 3-5 minuta)
3. ✅ Duplim klikom: `START_ALL_AUTO.bat`
4. 🌐 Otvori: http://localhost:5173

#### 🔄 Svaki Sledeći Put:

1. ✅ `START_ALL_AUTO.bat`
2. 🌐 http://localhost:5173

### 🌐 Pristup sa Mobilnog/Drugog Računara:

1. ✅ Desni klik → `COMPLETE_NETWORK_FIX.bat` → Run as Administrator (samo prvi put)
2. ✅ `START_NETWORK.bat`
3. 🌐 Sa mobilnog: http://TVOJA_IP:5173

### 🔑 Login:

```
Email:    admin@plantim.com
Password: password
```

🔒 **GDPR**: Pri prijavi potrebno je prihvatiti Uslove korištenja i Politiku privatnosti.

📖 **Kompletno uputstvo:** `POKRETANJE.md`

---

### 📋 Zahtjevi

- ✅ **XAMPP 8.2+** sa PHP 8.2+ i MySQL 8.0+
- ✅ **Node.js 18.x+** & npm (https://nodejs.org/)
- ✅ **Composer** - automatski se instalira ako ne postoji
- ✅ **GD i ZIP** PHP ekstenzije - automatski se omogućuju

**💡 Napomena:** PHP ne mora biti u PATH-u! Naše skripte automatski koriste punu putanju.

---

### 🛠️ Ručna Instalacija (Alternativa)

Ako preferirate ručnu instalaciju, slijedite korake u `KAKO_POKRENUTI.md` ili:

1. **Backend Setup:**
```bash
cd C:\xampp\htdocs\PlanTim
composer install
# Kreirajte .env fajl (vidjeti SETUP_INSTRUCTIONS.txt)
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

2. **Frontend Setup:**
```bash
cd frontend
# Kreirajte .env fajl sa: VITE_API_URL=http://localhost:8000/api
npm install
npm run dev
```

---

### 🌐 Pristup Aplikaciji

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api
- **phpMyAdmin:** http://localhost/phpmyadmin

---

### 📦 Dostupne Batch Skripte

| Skripta | Funkcija |
|---------|----------|
| `SETUP_AUTO.bat` | 🟢 Automatska instalacija (prvi put) |
| `START_ALL_AUTO.bat` | 🟢 Pokreće Backend + Frontend |
| `START_BACKEND_AUTO.bat` | Pokreće samo Backend server |
| `START_FRONTEND.bat` | Pokreće samo Frontend server |
| `CREATE_ENV_AND_SETUP.bat` | Instalacija (zahtijeva PHP u PATH) |

---

### 🆘 Pomoć i Rješavanje Problema

- ⚡ **Quick start:** `POCNI_OVDJE.txt`
- 📄 **Brzo uputstvo:** `POKRETANJE.md`
- 📖 **Kompletno uputstvo:** `UPUTSTVO.md`
- 📘 **Detaljno:** `KAKO_POKRENUTI.md`
- 🌐 **Mrežni pristup:** `NETWORK_SETUP.md`
- 🔧 **Troubleshooting:** `RJESENJE_GRESKE_PRIJAVE.md`

## 📚 Dokumentacija

### Uputstva za Korisnike

- 📖 **[User Manual](docs/USER_MANUAL.md)** - Kompletno korisničko uputstvo
  - Prijava i registracija
  - Upotreba svih 16 modula
  - Dashboard, CRM, Projects, DMS, LMS, HRM
  - Chat, Notifikacije, GDPR, AI
  - Podešavanja profila, teme i jezika
  - FAQ i troubleshooting

- 🛡️ **[Admin Manual](docs/ADMIN_MANUAL.md)** - Administratorsko uputstvo
  - Upravljanje korisnicima i rolama
  - RBAC sistem (permissioni)
  - Sistemske postavke
  - GDPR administracija
  - Backup i restore
  - Monitoring i logovi
  - Sigurnost i optimizacija

- ⚡ **[Quick Start Guide](docs/QUICK_START_GUIDE.md)** - 5-minutni brzi start
  - Za nove korisnike
  - Za administratore
  - Od instalacije do prvog projekta

### Tehnička Dokumentacija

- 🗄️ **[Database Schema](docs/DATABASE_SCHEMA.md)** - Kompletna database struktura
- 🚀 **[Setup Guide](SETUP_GUIDE.md)** - Detaljna instalacija korak-po-korak
- 🐳 **[Docker Deployment](DOCKER_DEPLOYMENT.md)** - Production deployment sa Docker-om
- 📊 **[Project Summary](PROJECT_SUMMARY.md)** - Pregled cijelog projekta
- 🔒 **[GDPR Implementation](docs/GDPR_IMPLEMENTATION.md)** - GDPR usklađenost i privatnost

## 🔒 Sigurnost

- Laravel Sanctum za API autentifikaciju
- RBAC sistem za kontrolu pristupa
- GDPR compliance
- XSS i CSRF zaštita
- SQL injection zaštita (Eloquent ORM)

## 👥 Tim

Razvoj modularno sa više fokusnih oblasti:
- Backend programiranje (PHP/Laravel)
- Frontend programiranje (React/TypeScript)
- Database dizajn (MySQL)
- UI/UX dizajn (Tailwind CSS)
- Testing i QA

## 📄 Licenca

Vlasništvo: [Vaša kompanija]

---

**Verzija:** 1.0.0  
**Datum:** 2025-11-17
