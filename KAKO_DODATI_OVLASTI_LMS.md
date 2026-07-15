# Kako Dodati Ovlasti za Upravljanje Kursevima (LMS)

Tab "Upravljanje kursevima" je vidljiv samo korisnicima sa **admin** ili **manager** ulogom.

---

## 🔧 Najlakši način: Preko Admin Panela

### Korak 1: Otvori Admin Panel
1. Prijavi se u sistem
2. Otvori **Admin** modul u glavnom meniju
3. Klikni na **"Upravljanje Korisnicima"** (User Management)

### Korak 2: Pronađi Korisnika
1. U tabeli korisnika, pronađi sebe ili korisnika kome želiš dodijeliti ovlasti
2. U redu tog korisnika, pronađi akcijske dugmiće (ikonice sa desne strane)

### Korak 3: Dodeli Ulogu
1. Klikni na **štit ikonicu** (🛡️) pored korisnika (lila/purple boja)
2. U modalnom prozoru koji se otvori, izaberi jednu od uloga:
   - **`admin`** - Administrator (pun pristup sistemu)
   - **`manager`** - Menadžer (pristup LMS modulu za upravljanje kursevima)
3. Klikni na **"Dodeli Ulogu"**

### Korak 4: Osveži Stranicu
1. Nakon dodele uloge, **odjavi se** iz sistema
2. **Prijavi se ponovo** (bitno za osvežavanje tokena/sesije)
3. Otvori **LMS** modul
4. Tab **"Upravljanje kursevima"** bi sada trebao biti vidljiv na vrhu

---

## 💻 Preko Artisan Komande (Najbrži način!)

1. Otvori terminal u projektu (`C:\xampp\htdocs\PlanTim`)
2. Pokreni komandu:

```bash
# Za admin ulogu (pun pristup sistemu)
php artisan user:assign-role tvoj_email@example.com admin

# ILI za manager ulogu (samo LMS pristup)
php artisan user:assign-role tvoj_email@example.com manager
```

3. **Odjavi se i prijavi ponovo** u sistem

---

## 🔧 Preko Laravel Tinker-a

1. Otvori terminal u projektu (`C:\xampp\htdocs\PlanTim`)
2. Pokreni:
```bash
php artisan tinker
```

3. U tinker konzoli, kopiraj i izvrši:

```php
// Pronađi korisnika po email-u
$user = \App\Models\User::where('email', 'TvojEmail@example.com')->first();

// Dodeli admin ulogu (za pun pristup)
$user->assignRole('admin');

// ILI dodeli manager ulogu (samo za LMS)
$user->assignRole('manager');

// Proveri da li je uloga dodeljena
$user->hasRole('admin'); // treba vratiti true
```

4. Zatvori tinker: `exit`
5. **Odjavi se i prijavi ponovo** u sistem

---

## 🗄️ Preko Baze Podataka

Ako ne možeš pristupiti Admin panelu, možeš dodati ulogu direktno u bazi:

### 1. Pronađi ID korisnika:
```sql
SELECT id, name, email FROM users WHERE email = 'tvoj_email@example.com';
```

### 2. Proveri da li role postoje:
```sql
SELECT * FROM roles WHERE name IN ('admin', 'manager');
```

### 3. Ako role ne postoje, kreiraj ih:
```sql
INSERT INTO roles (name, guard_name, created_at, updated_at) VALUES 
('admin', 'web', NOW(), NOW()),
('manager', 'web', NOW(), NOW());
```

### 4. Pronađi ID role:
```sql
SELECT id, name FROM roles WHERE name = 'admin' OR name = 'manager';
```

### 5. Dodeli ulogu korisniku:
```sql
-- Zameni 1 sa ID korisnika i 2 sa ID role (admin ili manager)
INSERT INTO model_has_roles (role_id, model_type, model_id)
VALUES (2, 'App\\Models\\User', 1);
```

---

## ✅ Provera da li Role Postoje

Ako role ne postoje, pokreni seeder:

```bash
php artisan db:seed --class=RolePermissionSeeder
```

---

## 🔍 Troubleshooting

### Tab i dalje nije vidljiv?

1. **Osveži token/sesiju:**
   - Odjavi se i prijavi ponovo (obavezno!)
   - Obriši cache: `php artisan cache:clear`

2. **Proveri role korisnika:**
   - U Admin panelu -> User Management -> Klikni na korisnika
   - Ili u tinker: `User::find(1)->getRoleNames()`

3. **Proveri u Developer Tools (F12):**
   - Otvori Console tab
   - Pronađi poruku "🔍 LMS User check:" koja prikazuje:
     - Role korisnika
     - Permissions
     - Da li je `isManager` true

4. **Proveri da li korisnik ima role ili permissions:**
   ```php
   // U tinker
   $user = User::find(1);
   $user->getRoleNames(); // treba prikazati ['admin'] ili ['manager']
   $user->getAllPermissions(); // dozvole
   ```

---

## 📝 Napomene

- **Admin** uloga = Pun pristup celom sistemu
- **Manager** uloga = Pristup LMS modulu za upravljanje kursevima
- Jedan korisnik može imati samo jednu ulogu (prema trenutnoj konfiguraciji)
- Uloga se dodeljuje preko Spatie Laravel Permission paketa

---

## 🚀 Brzi put za testiranje

1. Otvori terminal u projektu
2. Pokreni: `php artisan tinker`
3. Kopiraj i izvrši:
```php
$user = \App\Models\User::where('email', 'TVOJ_EMAIL')->first();
$user->assignRole('manager');
$user->hasRole('manager'); // proveri
```
4. Odjavi se i prijavi ponovo u sistem
5. Otvori LMS modul - tab bi trebao biti vidljiv!
