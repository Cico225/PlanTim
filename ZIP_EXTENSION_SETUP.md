# Omogućavanje PHP ZIP ekstenzije u XAMPP-u

## Problem
Greška: `Class "ZipArchive" not found`

Ova greška se javlja kada pokušavate da učitavate Excel fajlove (.xlsx) jer PhpSpreadsheet zahteva ZIP ekstenziju.

## Rješenje za XAMPP (Windows)

### Korak 1: Pronađite php.ini fajl
1. Otvorite **XAMPP Control Panel**
2. Kliknite na **"Config"** pored Apache-a
3. Izaberite **"PHP (php.ini)"**
4. Fajl će se otvoriti u vašem editoru

**Ili ručno:**
- Fajl se nalazi u: `C:\xampp\php\php.ini`

### Korak 2: Omogućite ZIP ekstenziju
1. Pronađite liniju: `;extension=zip`
2. Uklonite tačku-zarez (`;`) na početku linije
3. Trebalo bi biti: `extension=zip`

**Napomena:** Možda ćete vidjeti i `;extension=zip2` - to nije potrebno, samo `extension=zip` je dovoljno.

### Korak 3: Sačuvajte promjene i restartujte Apache
1. **Sačuvajte** php.ini fajl (Ctrl+S)
2. U **XAMPP Control Panel**-u kliknite **"Stop"** za Apache
3. Zatim kliknite **"Start"** za Apache

### Korak 4: Provjerite da li je ZIP omogućen

**Opcija A - Kroz phpinfo:**
1. Napravite novi fajl `phpinfo.php` u `C:\xampp\htdocs\PlanTim\public\`
2. Dodajte sljedeći kod:
```php
<?php
phpinfo();
```
3. Otvorite u browseru: `http://localhost/PlanTim/public/phpinfo.php`
4. Pronađite "zip" u stranici i provjerite da li je omogućen

**Opcija B - Kroz Command Prompt:**
```cmd
C:\xampp\php\php.exe -m | findstr zip
```

Ako vidite "zip", ekstenzija je omogućena.

## Alternativno - Ako ZIP ekstenzija ne postoji

Ako ne vidite `extension=zip` u php.ini fajlu:

1. Proverite da li postoji `php_zip.dll` fajl u `C:\xampp\php\ext\` direktorijumu
2. Ako ne postoji, možda treba da preuzmete noviju verziju XAMPP-a
3. Ili možete preuzeti `php_zip.dll` za vašu PHP verziju sa https://pecl.php.net/package/zip

## Napomena
Nakon omogućavanja ZIP ekstenzije, **obavezno restartujte Apache server** da bi promjene bile primjenjene.

## Provjera nakon restartovanja

Pokušajte ponovo da učitavate Excel fajl. Greška bi trebala nestati.




