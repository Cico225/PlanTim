# Rešavanje Problema sa MySQL u XAMPP-u

## ⚠️ Aria Recovery Error - Najčešći Problem

Ako vidite grešku:
```
ERROR: mysqld.exe: Aria recovery failed. Please run aria_chk -r on all Aria tables and delete all aria_log.######## files
ERROR: Could not open mysql.plugin table. Some plugins may be not loaded
ERROR: Failed to initialize plugins.
```

**Rešenje:**
1. Pokrenite `COMPLETE_MYSQL_FIX.bat` kao Administrator
2. Ova skripta će automatski popraviti sve probleme
3. Zatim pokrenite MySQL iz XAMPP Control Panel-a

## Najčešći Problemi i Rešenja

### 1. Port 3306 je zauzet

**Simptom:** MySQL se ne može pokrenuti, greška "port already in use"

**Rešenje:**
1. Pokrenite `DIAGNOSE_MYSQL.bat` da proverite koji proces koristi port 3306
2. Zaustavite MySQL Windows servis:
   ```cmd
   net stop MySQL
   net stop mysql80
   ```
3. Onemogućite automatsko pokretanje:
   ```cmd
   sc config MySQL start= disabled
   sc config mysql80 start= disabled
   ```

### 2. MySQL Windows Servis konfliktuje sa XAMPP

**Simptom:** MySQL se pokreće, ali odmah pada

**Rešenje:**
1. Pokrenite Command Prompt kao Administrator
2. Zaustavite i onemogućite MySQL servis:
   ```cmd
   sc stop MySQL
   sc stop mysql80
   sc config MySQL start= disabled
   sc config mysql80 start= disabled
   ```
3. Pokrenite MySQL iz XAMPP Control Panel-a

### 3. Korumpirani PID fajlovi

**Simptom:** MySQL se ne može pokrenuti nakon neočekivanog zaustavljanja

**Rešenje:**
1. Obrišite PID fajlove:
   ```cmd
   del C:\xampp\mysql\data\*.pid
   ```
2. Pokrenite MySQL ponovo iz XAMPP Control Panel-a

### 4. Problemi sa permisijama

**Simptom:** MySQL se ne može pokrenuti, greške o permisijama u logu

**Rešenje:**
1. Pokrenite XAMPP Control Panel kao Administrator
   - Desni klik na XAMPP Control Panel → "Run as administrator"
2. Proverite da imate prava za pisanje u `C:\xampp\mysql\data\`

### 5. Korumpirani MySQL data folder

**Simptom:** MySQL se ne može pokrenuti, greške u error logu o korumpiranim tabelama

**Rešenje:**
1. **VAŽNO: Kreirajte backup baze podataka pre nego što nastavite!**
   ```cmd
   BACKUP_DATABASE.bat
   ```
2. Ako je moguće, pokušajte da popravite tabele:
   ```cmd
   C:\xampp\mysql\bin\mysqlcheck.exe -u root -p --all-databases --repair
   ```
3. Ako to ne pomaže, možda je potrebno da reinstalirate MySQL u XAMPP-u

### 6. Konflikt sa drugim MySQL instalacijama

**Simptom:** MySQL se ne može pokrenuti, različite verzije MySQL-a

**Rešenje:**
1. Proverite sve MySQL instalacije na sistemu:
   ```cmd
   sc query | findstr /i mysql
   ```
2. Zaustavite sve MySQL servise osim XAMPP verzije
3. Onemogućite automatsko pokretanje za sve osim XAMPP MySQL-a

## Koraci za Dijagnostiku

### Korak 1: Pokrenite Dijagnostiku

```cmd
DIAGNOSE_MYSQL.bat
```

Ova skripta će prikazati:
- MySQL error logove
- Procese koji koriste port 3306
- Status Windows MySQL servisa
- Konfiguraciju MySQL-a
- Status MySQL data foldera

### Korak 2: Pokrenite Fix Skriptu

```cmd
FIX_XAMPP_MYSQL.bat
```

Ova skripta će pokušati automatski da reši najčešće probleme:
- Zaustavljanje Windows MySQL servisa
- Brisanje PID fajlova
- Proveru i rešavanje konflikata sa portovima

### Korak 3: Ručna Provera Error Logova

Proverite MySQL error log:
```cmd
type C:\xampp\mysql\data\*.err
```

Ili otvorite u Notepad-u:
```
notepad C:\xampp\mysql\data\[HOSTNAME].err
```

## Provera da li MySQL radi

Nakon što pokrenete MySQL u XAMPP Control Panel-u, proverite:

1. **Provera statusa:**
   - U XAMPP Control Panel-u, MySQL bi trebao biti zelen (pokrenut)
   - Port 3306 bi trebao biti vidljiv

2. **Test konekcije:**
   ```cmd
   C:\xampp\mysql\bin\mysql.exe -u root
   ```
   Ako se prikaže MySQL prompt, MySQL radi ispravno.

3. **Test iz aplikacije:**
   - Pokušajte da pristupite aplikaciji
   - Proverite da li se podaci učitavaju

## Česte Greške i Rešenja

### Error: "MySQL shutdown unexpectedly"

**Uzroci:**
- Port 3306 je zauzet
- Windows MySQL servis je pokrenut
- Korumpirani PID fajlovi
- Problemi sa permisijama
- Korumpirani data folder

**Rešenje:**
1. Pokrenite `FIX_XAMPP_MYSQL.bat`
2. Proverite error log u `C:\xampp\mysql\data\*.err`
3. Ako problem perzistira, proverite da li imate backup i razmotrite reinstalaciju MySQL-a u XAMPP-u

### Error: "Access denied for user"

**Rešenje:**
- Proverite kredencijale u `.env` fajlu
- Proverite da li je root korisnik aktivan:
  ```cmd
  C:\xampp\mysql\bin\mysql.exe -u root
  ```

### Error: "Can't connect to MySQL server"

**Rešenje:**
- Proverite da li je MySQL pokrenut u XAMPP Control Panel-u
- Proverite port (trebao bi biti 3306)
- Proverite `my.ini` konfiguraciju

## Kontakt za Dodatnu Pomoć

Ako nijedno od ovih rešenja ne pomaže:
1. Sačuvajte error log iz `C:\xampp\mysql\data\*.err`
2. Sačuvajte izlaz iz `DIAGNOSE_MYSQL.bat`
3. Kontaktirajte tim za podršku sa ovim informacijama

