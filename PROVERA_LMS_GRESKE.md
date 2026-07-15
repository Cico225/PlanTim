# Provera LMS Greške - Čuvanje Kursa

## Koraci za dijagnostiku:

### 1. Proveri Laravel Log
```bash
# Otvori terminal i proveri poslednje greške
tail -n 100 storage/logs/laravel.log | grep -i "lms\|course"
```

### 2. Proveri da li tabela postoji u bazi

Otvorite phpMyAdmin ili terminal i pokrenite:
```sql
SHOW TABLES LIKE 'lms_courses';
```

Ako tabela ne postoji, pokrenite migracije:
```bash
php artisan migrate
```

### 3. Proveri strukturu tabele
```sql
DESCRIBE lms_courses;
```

Očekivane kolone:
- id
- title
- description
- cover_image
- video_intro_url (može biti nullable)
- category
- level
- duration
- is_published
- is_featured
- instructor_id
- created_by
- created_at
- updated_at
- deleted_at (soft delete)

### 4. Proveri u Developer Tools (F12)

1. Otvori **Network** tab
2. Pokušaj ponovo da sačuvaš kurs
3. Klikni na zahtev `/api/lms/courses` (POST)
4. Proveri:
   - **Status Code** (treba biti 201 ili greška)
   - **Response** tab - šta vraća server
   - **Request** tab - šta šalje frontend

### 5. Proveri permisije

U konzoli proveri da li korisnik ima role:
```php
php artisan tinker
$user = User::where('email', 'TVOJ_EMAIL')->first();
$user->hasRole('admin'); // treba vratiti true ili false
$user->hasRole('manager'); // treba vratiti true ili false
```

## Najčešći problemi:

### Problem 1: Tabela ne postoji
**Rešenje:**
```bash
php artisan migrate
```

### Problem 2: Korisnik nema dozvole
**Rešenje:**
```bash
php artisan tinker
$user = User::where('email', 'TVOJ_EMAIL')->first();
$user->assignRole('manager');
```

### Problem 3: Greška u strukturi podataka
**Proveri:**
- Da li su sva obavezna polja popunjena
- Da li `level` ima vrednost: beginner, intermediate ili advanced
- Da li `duration` je broj ili null

### Problem 4: Database connection error
**Proveri:**
- `.env` fajl - da li je DB konfiguracija ispravna
- Da li MySQL server radi

## Debug mode

U `.env` fajlu uključi debug mode:
```
APP_DEBUG=true
```

Ovo će prikazati detaljnije greške u odgovoru.




