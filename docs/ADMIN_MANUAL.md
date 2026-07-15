# 🛡️ PlanTim - Administratorsko Uputstvo

**Verzija:** 1.0.0  
**Datum:** 2025-11-17  
**Za:** Sistem administratore i super-admin korisnike

---

## 📑 Sadržaj

1. [Uvod za Administratore](#uvod-za-administratore)
2. [Prvo Podešavanje Sistema](#prvo-podešavanje-sistema)
3. [Upravljanje Korisnicima](#upravljanje-korisnicima)
4. [Role i Permissioni (RBAC)](#role-i-permissioni-rbac)
5. [Upravljanje Modulima](#upravljanje-modulima)
6. [Sistemske Postavke](#sistemske-postavke)
7. [GDPR Administracija](#gdpr-administracija)
8. [Backup i Restore](#backup-i-restore)
9. [Monitoring i Logovi](#monitoring-i-logovi)
10. [Email i Notifikacije](#email-i-notifikacije)
11. [Sigurnost Sistema](#sigurnost-sistema)
12. [Troubleshooting](#troubleshooting)
13. [API i Integracije](#api-i-integracije)
14. [Performance Optimizacija](#performance-optimizacija)
15. [Best Practices](#best-practices)

---

## 🎯 Uvod za Administratore

Kao administrator PlanTim sistema, vaša odgovornost je:

- ✅ Upravljanje korisničkim računima
- ✅ Definisanje rola i permissiona
- ✅ Konfiguracija sistemskih postavki
- ✅ Osiguranje GDPR compliance-a
- ✅ Monitoring sistema i logova
- ✅ Backup i restore podataka
- ✅ Rješavanje problema korisnika

### Admin Panel Pristup

1. Prijavite se sa **admin** ili **super-admin** rolom
2. U sidebaru vidite **⚙️ Administracija** modul
3. Samo korisnici sa admin privilegijama mogu pristupiti

---

## 🚀 Prvo Podešavanje Sistema

### Inicijalna Konfiguracija

#### 1. Kreiranje Prvog Admin Računa

Nakon fresh instalacije:

```bash
php artisan db:seed --class=AdminUserSeeder
```

**Default admin kredencijali:**
- Email: `admin@plantim.local`
- Password: `password`

⚠️ **VAŽNO**: Promijenite default lozinku odmah!

#### 2. Osnovne Sistemske Postavke

1. Idite na **Admin → Settings**
2. Konfigurišite:
   - **App Name**: Naziv vaše organizacije
   - **App URL**: Domen aplikacije
   - **Timezone**: Vremenska zona
   - **Default Language**: Bosanski ili Engleski
   - **Date Format**: dd/mm/yyyy ili mm/dd/yyyy

#### 3. Email Konfiguracija

1. Idite na **Admin → Settings → Email**
2. Postavite SMTP postavke:
   - **SMTP Host**: npr. smtp.gmail.com
   - **SMTP Port**: 587 (TLS) ili 465 (SSL)
   - **SMTP Username**: email@domen.com
   - **SMTP Password**: app password
   - **From Name**: PlanTim
   - **From Email**: noreply@plantim.local

#### 4. Kreiranje Inicijalnih Rola

1. Idite na **Admin → Roles**
2. Kreirajte osnovne role:
   - **Employee**: Osnovni korisnik
   - **Manager**: Menadžer projekata
   - **HR Manager**: HR odeljenje
   - **Admin**: Administrator

---

## 👥 Upravljanje Korisnicima

### Kreiranje Novog Korisnika

#### Manuelno Kreiranje

1. Idite na **Admin → Users**
2. Kliknite **"+ Novi Korisnik"**
3. Popunite podatke:
   - **Ime i Prezime**: Puno ime korisnika
   - **Email**: Jedinstvena email adresa
   - **Lozinka**: Privremena lozinka (korisnik treba promijeniti)
   - **Rola**: Izaberite odgovarajuću rolu
   - **Status**: Active / Inactive
4. Kliknite **"Kreiraj"**

#### Bulk Import Korisnika

1. Pripremite CSV fajl sa kolonama:
   ```
   name,email,password,role
   Ime Prezime,email@example.com,password123,employee
   ```
2. Idite na **Admin → Users → Import**
3. Upload CSV fajl
4. Mapuj te kolone
5. Kliknite **"Import"**

### Uređivanje Korisnika

1. Na listi korisnika, kliknite **✏️ Edit**
2. Možete promijeniti:
   - Lične podatke
   - Email adresu
   - Rolu
   - Status (aktiviranje/deaktiviranje)
   - Password reset
3. Kliknite **"Sačuvaj Izmjene"**

### Deaktiviranje Korisnika

**Umjesto brisanja, preporučujemo deaktiviranje:**

1. Odaberite korisnika
2. Promijenite status na **"Inactive"**
3. Korisnik neće moći se prijaviti, ali podaci ostaju

### Brisanje Korisnika

⚠️ **Oprez**: Brisanje je nepovratno!

1. Kliknite **🗑️ Delete** pored korisnika
2. Potvrdite akciju
3. Svi korisnički podaci će biti obrisani

**Pre brisanja:**
- Reassign-ujte njihove taskove
- Transferirajte dokumente
- Arhivirajte važne podatke

### Reset Lozinke

#### Admin Reset

1. Odaberite korisnika
2. Kliknite **"Reset Password"**
3. Unesite novu privremenu lozinku
4. **Notify User**: Email sa novom lozinkom
5. Force password change on next login

### Pretraga i Filtriranje

- **Search**: Pretražite po imenu ili email-u
- **Filter po roli**: Admin, Manager, Employee, itd.
- **Filter po statusu**: Active, Inactive
- **Filter po datumu**: Novi, Stari

---

## 🔐 Role i Permissioni (RBAC)

Role-Based Access Control omogućava granularnu kontrolu pristupa.

### Razumijevanje RBAC Sistema

**Hijerarhija:**
```
Permission → Role → User
```

- **Permission**: Pojedinačna akcija (npr. "create-project")
- **Role**: Grupa permissiona (npr. "Project Manager")
- **User**: Dodijeljena rola

### Kreiranje Nove Role

1. Idite na **Admin → Roles**
2. Kliknite **"+ Nova Rola"**
3. Unesite:
   - **Naziv**: Employee, Manager, HR, itd.
   - **Slug**: employee, manager, hr (lowercase, bez space-ova)
   - **Opis**: Kratki opis role
4. Kliknite **"Kreiraj"**

### Dodjeljivanje Permissiona Roli

1. Otvorite rolu za uređivanje
2. Vidite listu svih dostupnih permissiona, grupisanih po modulima:

#### **Dashboard**
- `view-dashboard`: Pristup dashboardu

#### **CRM**
- `view-crm`: Pregled CRM modula
- `create-contact`: Kreiranje kontakata
- `edit-contact`: Uređivanje kontakata
- `delete-contact`: Brisanje kontakata
- `create-company`: Kreiranje kompanija
- `create-deal`: Kreiranje deal-ova
- `edit-deal`: Uređivanje deal-ova

#### **Projects**
- `view-projects`: Pregled projekata
- `create-project`: Kreiranje projekata
- `edit-project`: Uređivanje projekata
- `delete-project`: Brisanje projekata
- `create-task`: Kreiranje taskova
- `assign-task`: Assignment taskova
- `edit-task`: Uređivanje taskova

#### **DMS**
- `view-documents`: Pregled dokumenata
- `upload-document`: Upload dokumenata
- `download-document`: Download dokumenata
- `delete-document`: Brisanje dokumenata
- `share-document`: Dijeljenje dokumenata
- `create-folder`: Kreiranje foldera

#### **LMS**
- `view-courses`: Pregled kurseva
- `create-course`: Kreiranje kurseva (instruktori)
- `edit-course`: Uređivanje kurseva
- `delete-course`: Brisanje kurseva
- `enroll-course`: Upis u kurs

#### **HRM**
- `view-employees`: Pregled zaposlenika
- `create-employee`: Dodavanje zaposlenika
- `edit-employee`: Uređivanje zaposlenika
- `delete-employee`: Brisanje zaposlenika
- `view-salary`: Pregled plata (HR only)
- `approve-leave`: Odobravanje odsustva
- `view-time-entries`: Pregled evidencije rada

#### **Chat**
- `use-chat`: Korištenje chat-a

#### **Notifications**
- `view-notifications`: Pregled notifikacija

#### **GDPR**
- `manage-gdpr`: Upravljanje GDPR zahtjevima (Admin)
- `request-data-export`: Zahtjev za izvoz
- `request-data-deletion`: Zahtjev za brisanje

#### **Admin**
- `manage-users`: Upravljanje korisnicima
- `manage-roles`: Upravljanje rolama
- `manage-settings`: Sistemske postavke
- `view-logs`: Pregled logova

3. Označite checkboxes za permissione koje želite dodijeliti
4. Kliknite **"Sačuvaj Promjene"**

### Predefinisane Role

#### Super Admin
- **Sve permissione**: Potpuna kontrola sistema
- **Ne može se obrisati**: Zaštićena rola

#### Admin
- Sve osim kritičnih sistemskih operacija
- Upravljanje korisnicima, rolama
- Pristup svim modulima

#### Manager
- Kreiranje i upravljanje projektima
- Assignment taskova
- Pregled CRM-a i dokumenata

#### Employee
- Osnovno korištenje svih modula
- Ne može kreirati projekte
- Ne može administrirati sistem

#### HR Manager
- Svi HRM permissioni
- Upravljanje zaposlenicima
- Odobravanje odsustva
- Pregled plata

### Dodjeljivanje Role Korisniku

1. Idite na **Admin → Users**
2. Kliknite **"Dodijeli Rolu"** pored korisnika
3. Izaberite rolu iz dropdown-a
4. Kliknite **"Dodijeli"**

**Napomena**: Korisnik može imati više rola istovremeno.

### UI Restriction

Permissioni automatski kontrolišu:
- **Sidebar navigation**: Sakriva module bez pristupa
- **Buttons**: Sakriva akcije bez permissiona
- **API calls**: Backend također validira permissione

---

## 🔧 Upravljanje Modulima

### Aktiviranje/Deaktiviranje Modula

1. Idite na **Admin → Modules**
2. Lista svih 16 modula
3. Toggle switch za enable/disable
4. Deaktivirani moduli se ne prikazuju korisnicima

### Modul Konfiguracija

#### CRM Settings
- Default currency: KM, EUR, USD
- Deal stages customization
- Lead sources

#### Project Settings
- Default project status
- Task priority levels
- Kanban column names

#### DMS Settings
- Max file upload size
- Allowed file types
- Storage quota per user

#### LMS Settings
- Certificate template
- Passing score percentage
- Course approval required

#### HRM Settings
- Leave types
- Working hours per day
- Overtime calculation

---

## ⚙️ Sistemske Postavke

### General Settings

1. **Application**
   - App Name
   - Logo (upload)
   - Favicon
   - Default timezone

2. **Localization**
   - Default language
   - Date format
   - Time format
   - Currency

3. **Registration**
   - Public registration: Enable/Disable
   - Default role for new users
   - Email verification required

### Email Settings

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@plantim.local
MAIL_FROM_NAME="PlanTim"
```

### Database Settings

- Connection: MySQL
- Host: 127.0.0.1
- Port: 3306
- Database: plantim
- Username: root
- Password: ****

### Cache Settings

- Driver: Redis (preporučeno) ili File
- Redis host: 127.0.0.1
- Redis port: 6379

### Queue Settings

- Driver: Redis (za background jobs)
- Connection: default

### Storage Settings

- Default disk: local ili s3
- S3 configuration (ako koristite AWS)
- Public URL

---

## 🔒 GDPR Administracija

### Pregled GDPR Zahtjeva

1. Idite na **Admin → GDPR**
2. Vidite sve zahtjeve korisnika:
   - **Data Export**: Pending, Processing, Completed
   - **Data Deletion**: Pending, Approved, Rejected, Completed

### Data Export Zahtjevi

#### Obrada Zahtjeva

1. Novi zahtjev ima status **"Pending"**
2. Kliknite **"Process"**
3. Sistem automatski kreira ZIP fajl sa:
   - Profil podacima
   - Dokumentima
   - Porukama
   - Task-ovima
   - Aktivnostima
4. Status: **"Completed"**
5. Korisnik dobija download link (važi 7 dana)

### Data Deletion Zahtjevi

⚠️ **KRITIČNO: Ova akcija je nepovratna!**

#### Odobravanje Brisanja

1. Pregledajte zahtjev
2. Razlog korisnika
3. Provjerite da li postoje:
   - Aktivni projekti
   - Nepredati dokumenti
   - Finansijske obaveze
4. Opcije:
   - **Approve**: Odobrite brisanje
   - **Reject**: Odbijte sa obrazloženjem

#### Pseudonimizacija (Alternativa)

Umjesto potpunog brisanja:
- Zami jenite lične podatke sa: "Deleted User #123"
- Zadržite business podatke za izvještaje
- GDPR compliant

### Audit Log

Automatski se loguju sve akcije:
- Ko je pristupio podacima
- Kada
- Šta je urađeno
- IP adresa

**Retention**: 5 godina (GDPR requirement)

### Consent Management

- Pregled svih consent tipova
- Ko je dao/povukao saglasnost
- Kada je dato/povučeno

---

## 💾 Backup i Restore

### Automatski Backup

#### Konfiguracija

1. Idite na **Admin → Backup**
2. Schedule:
   - **Daily**: Svaki dan u 2AM
   - **Weekly**: Nedjeljom
   - **Monthly**: Prvog u mjesecu
3. Retention:
   - Daily: 7 dana
   - Weekly: 4 sedmice
   - Monthly: 12 mjeseci

#### Šta se Backup-uje

- ✅ MySQL database (kompletna)
- ✅ Uploaded fajlovi (documents, avatars)
- ✅ `.env` configuration
- ✅ Application logs

### Manuelni Backup

#### Database Backup

```bash
# Preko Artisan komande
php artisan backup:run --only-db

# Ili direktno mysqldump
mysqldump -u root -p plantim > backup_$(date +%Y%m%d).sql
```

#### Full Backup

```bash
php artisan backup:run

# ZIP fajl će biti kreiran u storage/app/backups/
```

### Restore iz Backup-a

#### Database Restore

```bash
# Prvo kreirajte fresh database
mysql -u root -p -e "DROP DATABASE IF EXISTS plantim; CREATE DATABASE plantim;"

# Restore iz SQL fajla
mysql -u root -p plantim < backup_20251117.sql

# Clear cache
php artisan cache:clear
php artisan config:clear
```

#### Full Restore

1. Extract backup ZIP fajl
2. Restore database (gore)
3. Kopirajte fajlove u `storage/` folder
4. Restore `.env` konfiguraciju
5. Restartujte servise

### Off-site Backup

**Best Practice**: Backup na eksternu lokaciju

#### AWS S3 Backup

```php
// config/backup.php
'destination' => [
    'disks' => [
        'local',
        's3', // Remote backup
    ],
],
```

#### FTP Backup

```bash
# Cron job za upload na FTP
0 3 * * * /usr/bin/ftp-upload-script.sh
```

---

## 📊 Monitoring i Logovi

### System Logs

1. Idite na **Admin → Logs**
2. Filtrirajte po:
   - **Level**: Info, Warning, Error, Critical
   - **Date**: Danas, Ova sedmica, Ovaj mjesec
   - **Module**: Specific module logs

### Activity Logs

- Ko je uradio šta
- Timestamp
- IP adresa
- User agent (browser)

**Primjeri:**
```
[2025-11-17 10:30] User "Marko Markovic" created project "Website Redesign"
[2025-11-17 11:15] User "Ana Anic" uploaded document "Report.pdf"
[2025-11-17 14:20] Admin "Petar Petrovic" deleted user "test@example.com"
```

### Error Logs

- PHP errors
- Database errors
- API errors
- Failed login attempts

### Performance Monitoring

#### Response Time

```bash
# Prosječno vrijeme odgovora
php artisan route:cache
php artisan optimize
```

#### Database Queries

- Slow query log
- Missing indexes
- N+1 query detection

#### Memory Usage

```bash
# Check memory
php artisan about

# Optimize
php artisan optimize:clear
php artisan view:cache
php artisan config:cache
```

### Disk Space

1. Idite na **Admin → System Info**
2. Vidite:
   - Total disk space
   - Used space
   - Database size
   - Uploads folder size

⚠️ **Alert**: Ako je disk > 85%, očistite stare backup-e

---

## 📧 Email i Notifikacije

### Email Templates

1. Idite na **Admin → Email Templates**
2. Customizujte:
   - Welcome email
   - Password reset
   - Task assigned
   - Project deadline
   - Leave approved/rejected

### Notification Rules

#### Kreiranje Pravila

1. **Admin → Notifications → Rules**
2. Kreirajte novo pravilo:
   - **Trigger**: Task created, Project completed, etc.
   - **Recipients**: All users, Specific role, Specific users
   - **Channels**: Email, In-app, Push
   - **Template**: Izaberite email template

#### Primjeri Pravila

**Pravilo 1: Task Deadline**
```
Trigger: Task due date is in 1 day
Recipients: Task assignee
Channels: Email + In-app
Template: task_deadline_reminder
```

**Pravilo 2: Leave Request**
```
Trigger: Leave request created
Recipients: Manager role
Channels: Email + In-app
Template: leave_request_notification
```

### Push Notifications

Zahtijeva **Pusher** ili **Laravel Echo** setup:

```env
PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-key
PUSHER_APP_SECRET=your-secret
PUSHER_APP_CLUSTER=mt1
```

---

## 🔐 Sigurnost Sistema

### Password Policy

1. **Admin → Settings → Security**
2. Postavite:
   - Min length: 8 characters
   - Require uppercase: Yes
   - Require numbers: Yes
   - Require symbols: Yes
   - Password expiration: 90 days (opciono)

### Two-Factor Authentication (2FA)

**Planirana funkcionalnost** (priprema za implementaciju):
- Google Authenticator
- SMS verification
- Email code

### Session Management

- Session timeout: 120 minutes (default)
- Logout inactive users: Yes
- Remember me duration: 30 days

### Failed Login Attempts

- Max attempts: 5
- Lockout duration: 15 minutes
- Notify admin: Yes

### IP Whitelist

Za admin pristup, možete ograničiti IP adrese:

```php
// config/admin.php
'ip_whitelist' => [
    '192.168.1.100',
    '10.0.0.50',
],
```

### Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-XSS-Protection "1; mode=block";
add_header X-Content-Type-Options "nosniff";
add_header Referrer-Policy "no-referrer-when-downgrade";
add_header Content-Security-Policy "default-src 'self'";
```

### SSL/TLS Certificate

**Production MUST have HTTPS!**

```bash
# Let's Encrypt
sudo certbot --nginx -d plantim.com
```

---

## 🔧 Troubleshooting

### Česti Problemi

#### Problem: Korisnici ne mogu se prijaviti

**Rješenje:**
1. Provjerite database connection
2. Clear cache: `php artisan cache:clear`
3. Check session driver u `.env`
4. Pregledajte failed login logs

#### Problem: Email se ne šalje

**Rješenje:**
1. Test SMTP settings:
   ```bash
   php artisan tinker
   Mail::raw('Test', function($msg) {
       $msg->to('test@example.com')->subject('Test');
   });
   ```
2. Check mail queue:
   ```bash
   php artisan queue:work
   ```

#### Problem: Fajlovi se ne upload-uju

**Rješenje:**
1. Check permissions:
   ```bash
   chmod -R 775 storage/
   chown -R www-data:www-data storage/
   ```
2. Check `upload_max_filesize` u `php.ini`
3. Check disk space

#### Problem: Spora aplikacija

**Rješenje:**
1. Enable Redis cache
2. Optimize:
   ```bash
   php artisan optimize
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```
3. Enable database indexing
4. Use queue for heavy tasks

---

## 🔌 API i Integracije

### API Dokumentacija

PlanTim ima **RESTful API** za sve module.

**Base URL**: `https://your-domain.com/api`

### Authentication

Koristi **Laravel Sanctum** token authentication:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "token": "1|abc123...",
  "user": {...}
}
```

Sve ostale API pozive autentifikujte sa:
```http
Authorization: Bearer 1|abc123...
```

### API Endpoints

Pogledajte `routes/api.php` za kompletan spisak.

#### Dashboard
- `GET /api/dashboard`
- `GET /api/dashboard/upcoming-tasks`

#### CRM
- `GET /api/crm/contacts`
- `POST /api/crm/contacts`
- `PUT /api/crm/contacts/{id}`
- `DELETE /api/crm/contacts/{id}`

#### Projects
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{id}/tasks`

*... (170+ endpoints)*

### External Integrations

#### Office 365

```env
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-secret
MICROSOFT_REDIRECT_URI=https://your-domain.com/auth/microsoft/callback
```

#### OpenAI (AI Module)

```env
OPENAI_API_KEY=sk-...
```

#### Slack Notifications

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## ⚡ Performance Optimizacija

### Database Optimization

#### Indexing

```sql
-- Dodaj indexes za često pretraživane kolone
ALTER TABLE users ADD INDEX idx_email (email);
ALTER TABLE tasks ADD INDEX idx_status (status);
ALTER TABLE projects ADD INDEX idx_owner (owner_id);
```

#### Query Optimization

```bash
# Enable slow query log
mysql -u root -p
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

### Caching Strategy

```php
// Redis cache za često korištene podatke
Cache::remember('user_' . $id, 3600, function() use ($id) {
    return User::find($id);
});
```

### Queue Workers

```bash
# Background job processing
php artisan queue:work --daemon

# Supervisor config za production
[program:plantim-worker]
command=php /var/www/plantim/artisan queue:work --sleep=3
autostart=true
autorestart=true
```

### CDN za Static Assets

```php
// config/filesystems.php
'cloudfront' => [
    'driver' => 's3',
    'url' => 'https://d111111abcdef8.cloudfront.net',
],
```

### Load Balancing

Za high-traffic aplikacije:
- Multiple app servers
- Nginx load balancer
- Shared Redis/Database
- Session store na Redis

---

## 📋 Best Practices

### Security Best Practices

1. ✅ **Uvijek koristite HTTPS** u produkciji
2. ✅ **Regular updates** Laravel-a i dependencies
3. ✅ **Strong passwords** za sve admin račune
4. ✅ **Backup daily** i test restore
5. ✅ **Monitor logs** redovno
6. ✅ **Limited admin accounts** - dajte samo kad je neophodno
7. ✅ **2FA** za admin račune (enable kad bude dostupno)
8. ✅ **IP whitelisting** za admin panel

### Data Management Best Practices

1. ✅ **Archive old data** (projekti stariji od 2 godine)
2. ✅ **Regular cleanup** nepotrebnih fajlova
3. ✅ **Monitor disk space**
4. ✅ **Test restore procedure** mjesečno
5. ✅ **Document changes** u sistemu

### User Management Best Practices

1. ✅ **Immediate offboarding** - deaktiviraj račune odmah nakon odlaska
2. ✅ **Regular permission audit** - ko ima pristup čemu
3. ✅ **Principle of least privilege** - minimalne neophodne permissione
4. ✅ **Training** - obuči korisnike kako koristiti sistem

### Maintenance Schedule

#### Dnevno
- ✅ Check backup status
- ✅ Monitor error logs
- ✅ Check disk space

#### Sedmično
- ✅ Review activity logs
- ✅ Check failed jobs queue
- ✅ User activity report

#### Mjesečno
- ✅ Update dependencies
- ✅ Permission audit
- ✅ Performance review
- ✅ Test backup restore
- ✅ Archive old data

#### Kvartalno
- ✅ Security audit
- ✅ Database optimization
- ✅ User feedback review
- ✅ System upgrades planning

---

## 📞 Podrška i Kontakt

### Za tehničku podršku:
- 📧 **Email**: admin@plantim.local
- 💬 **Slack**: #plantim-support
- 📚 **Dokumentacija**: `/docs`

### Za hitne probleme (Production Down):
- 📱 **24/7 Hotline**: +387-XX-XXX-XXX
- 🚨 **Emergency Email**: emergency@plantim.local

### Korisni Resursi:
- **Laravel Documentation**: https://laravel.com/docs
- **React Documentation**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **MySQL Documentation**: https://dev.mysql.com/doc/

---

## 📝 Revision History

| Verzija | Datum | Izmjene |
|---------|-------|---------|
| 1.0.0 | 2025-11-17 | Initial release |

---

**Hvala što administrirate PlanTim! 🛡️**

*Za dodatna pitanja ili sugestije, kontaktirajte development tim.*

