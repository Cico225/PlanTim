# 🔧 Rješenje: MariaDB localhost Permission Error

## Problem
```
SQLSTATE[HY000] [1130] Host 'localhost' is not allowed to connect to this MariaDB server
```

## ✅ Rješenje - Kroz phpMyAdmin (Najlakše)

### Korak 1: Otvorite phpMyAdmin
1. Otvorite browser i idite na: **http://localhost/phpmyadmin**
2. Prijavite se sa:
   - **Username:** `root`
   - **Password:** (ostavite prazno)

### Korak 2: Pokrenite SQL Komandu
1. Kliknite na **SQL** tab (gore u meniju)
2. Kopirajte i zalijepite ovu SQL komandu:

```sql
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' IDENTIFIED BY '' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

3. Kliknite **Go** (ili pritisnite Ctrl+Enter)

### Korak 3: Provjerite da li je uspjelo
1. Kliknite ponovo na **SQL** tab
2. Pokrenite ovu komandu:

```sql
SELECT Host, User FROM mysql.user WHERE User='root';
```

3. Trebali biste vidjeti barem jedan red sa `Host='localhost'` i `User='root'`

### Korak 4: Restartujte Backend Server
1. Zaustavite backend server (Ctrl+C)
2. Pokrenite ponovo: `php artisan serve`
3. Pokušajte ponovo prijaviti

---

## 🔄 Alternativno Rješenje - Ako phpMyAdmin ne radi

### Opcija A: Kroz XAMPP Control Panel
1. Otvorite **XAMPP Control Panel**
2. Kliknite **Stop** na MySQL
3. Sačekajte 5 sekundi
4. Kliknite **Start** na MySQL
5. Pokušajte ponovo

### Opcija B: Provjerite my.ini konfiguraciju
1. Otvorite: `C:\xampp\mysql\bin\my.ini`
2. Provjerite da li postoji linija:
   ```
   bind-address = 127.0.0.1
   ```
3. Ako ne postoji, dodajte je u sekciju `[mysqld]`
4. Restartujte MySQL kroz XAMPP Control Panel

---

## 📝 SQL Skripta (Za ručno pokretanje)

Ako želite koristiti SQL fajl direktno, kopirajte sadržaj iz:
- `fix_mariadb_localhost.sql`

I pokrenite ga u phpMyAdmin SQL tabu.

---

## ⚠️ Ako i dalje ne radi

1. Provjerite da li je MySQL/MariaDB pokrenut u XAMPP Control Panelu
2. Provjerite da li možete pristupiti phpMyAdmin (http://localhost/phpmyadmin)
3. Provjerite `.env` fajl - `DB_HOST` treba biti `127.0.0.1` (ne `localhost`)
4. Restartujte XAMPP MySQL servis

---

## 🎯 Brzi Test

Nakon što dodate dozvole, testirajte konekciju:

```bash
php artisan tinker
```

Zatim u tinkeru:
```php
DB::connection()->getPdo();
```

Ako dobijete PDO objekt umjesto greške, konekcija radi! ✅

