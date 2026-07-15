# Implementacija Realnih Statistika u Admin Modulu

## 📊 Šta Je Urađeno

Administracioni modul je povezan sa bazom podataka i sada prikazuje **realne podatke** umesto tvrdokodirane vrijednosti.

### Implementirane Statistike:

1. **Ukupno Korisnika** - Broj svih korisnika u sistemu
2. **Aktivne Sesije** - Broj aktivnih pristupnih tokena (zadnjih 15 minuta)
3. **Sistem Uptime** - Broj dana od prvog korisnika u sistemu
4. **DB Veličina** - Realna veličina baze podataka (u MB ili GB)

### Dodatne Informacije:

- **Novi Korisnici Danas** - Prikazuje se pored "Ukupno Korisnika" ako postoje novi korisnici
- **Server Time** - Trenutno vrijeme servera
- **Automatsko Osvježavanje** - Statistika se automatski osvježava svakih 30 sekundi

---

## 🔧 Backend Izmjene

### 1. AdminController.php

Dodana nova metoda `getSystemStats()` koja vraća realne podatke:

```php
Route: GET /api/admin/stats

Vraća:
{
  "total_users": 15,
  "active_sessions": 3,
  "uptime_days": 45,
  "uptime_formatted": "45 dana",
  "database_size_mb": 12.34,
  "database_size_formatted": "12.34 MB",
  "new_users_today": 2,
  "new_users_this_week": 7,
  "server_time": "2024-11-19 14:30:00"
}
```

**Kako Radi:**

- **Broj Korisnika**: `SELECT COUNT(*) FROM users`
- **Aktivne Sesije**: Broji aktivne tokene iz `personal_access_tokens` tabele (zadnjih 15 min)
- **Uptime**: Računa razliku u danima od prvog korisnika do danas
- **DB Veličina**: Koristi `information_schema.TABLES` za preciznu veličinu baze

### 2. routes/api.php

Dodana nova ruta:

```php
Route::get('/stats', [AdminController::class, 'getSystemStats']);
```

**Zaštita**: Ruta je zaštićena sa `role:admin|super-admin` middleware-om.

---

## 🎨 Frontend Izmjene

### AdminOverview.tsx

**Dodato:**

1. **State Management**:
   ```typescript
   const [stats, setStats] = useState<SystemStats | null>(null);
   const [loading, setLoading] = useState(true);
   ```

2. **API Poziv**:
   ```typescript
   const response = await api.get('/admin/stats');
   setStats(response.data);
   ```

3. **Auto-Refresh**:
   - Statistika se osvježava automatski svakih 30 sekundi
   - Koristi `setInterval` koji se čisti pri unmount-u komponente

4. **Loading State**:
   - Prikazuje skeleton loader dok se podaci učitavaju
   - Koristi Tailwind animate-pulse animaciju

---

## 🗄️ Baza Podataka

### Potrebne Tabele:

✅ **users** - Već postoji  
✅ **personal_access_tokens** - Već postoji (Sanctum)

**Napomena**: `personal_access_tokens` tabela je kreirana SQL skriptom (`create_all_tables.sql`).

Ako tabela ne postoji, može se kreirati pomoću migracije:

```bash
php artisan migrate
```

Nova migracija je dodana u:
```
database/migrations/2019_12_14_000001_create_personal_access_tokens_table.php
```

---

## 🚀 Kako Testirati

### 1. Pokrenite Backend i Frontend

**Backend:**
```cmd
START_BACKEND.bat
```

**Frontend:**
```cmd
START_FRONTEND.bat
```

### 2. Prijavite se kao Administrator

```
Email: admin@plantim.com
Password: password
```

### 3. Idite na Administraciju

Kliknite na **Administracija** u glavnom meniju.

### 4. Provjerite Statistiku

Trebali biste vidjeti:

- ✅ **Realan broj korisnika** iz baze
- ✅ **Broj aktivnih sesija** (broj korisnika online)
- ✅ **Sistem uptime** u danima
- ✅ **DB veličinu** u MB ili GB

### 5. Testirajte Auto-Refresh

- Otvorite novi tab i prijavite se kao drugi korisnik
- Vratite se na Admin Dashboard
- Nakon maksimalno 30 sekundi, broj aktivnih sesija bi trebao porasti

---

## 📊 Primjer Prikaza

```
┌─────────────────────────────────────────────────┐
│  Ukupno Korisnika                               │
│  15                                             │
│  +2 danas                                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Aktivnih Sesija                                │
│  3                                              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Sistem Uptime                                  │
│  45 dana                                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  DB Veličina                                    │
│  12.34 MB                                       │
└─────────────────────────────────────────────────┘
```

---

## 🔒 Sigurnost

- ✅ Endpoint zaštićen sa `role:admin|super-admin` middleware
- ✅ Samo administratori mogu pristupiti statistikama
- ✅ Koristi Sanctum autentifikaciju
- ✅ SQL injection zaštita (koristi Laravel Query Builder)

---

## ⚡ Performance

- Optimizovani SQL upiti
- Cache-friendly struktura (može se dodati Redis cache kasnije)
- Automatsko osvježavanje svakih 30 sekundi (ne opterećuje server)
- Koristi COUNT i SUM agregacije umjesto učitavanja svih redova

---

## 🎯 Buduće Poboljšanje

### Moguće Nadogradnje:

1. **Redis Cache**: Keširati statistiku na 1 minutu
2. **Grafikon Uptime**: Prikazati istoriju uptime-a
3. **Detaljnija Statistika Sesija**: Ko je online i kada
4. **Alarmiranje**: Notifikacije kada se baza približi limitu
5. **Istorija Statistike**: Čuvati dnevne statistike u posebnoj tabeli

---

## 🐛 Troubleshooting

### Problem: "403 Forbidden" pri pristupu `/api/admin/stats`

**Uzrok**: Korisnik nema admin ili super-admin ulogu.

**Rješenje**:
```sql
-- Provjerite ulogu korisnika
SELECT users.email, roles.name
FROM users
JOIN model_has_roles ON users.id = model_has_roles.model_id
JOIN roles ON model_has_roles.role_id = roles.id
WHERE users.email = 'admin@plantim.com';

-- Dodijelite admin ulogu ako ne postoji
-- (Koristite Seeder ili ručno dodajte u bazi)
```

### Problem: "Aktivne Sesije" pokazuje 0

**Uzrok**: Nema aktivnih tokena ili tabela ne postoji.

**Rješenje**:
```bash
# Pokrenite migracije
php artisan migrate

# Ili kreirajte tabelu ručno
mysql -u root plantim < create_all_tables.sql
```

### Problem: "DB Veličina" pokazuje 0 MB

**Uzrok**: MySQL korisniku nedostaje privilegija za `information_schema`.

**Rješenje**:
```sql
GRANT SELECT ON information_schema.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

---

## ✅ Gotovo!

Administracioni modul sada prikazuje **realne podatke iz sistema**! 🎉

Svi podaci se automatski osvježavaju i reflektuju stvarno stanje sistema.




