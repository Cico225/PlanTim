# Omogućavanje PHP GD ekstenzije u XAMPP-u

## Problem
Greška: "The PHP GD extension is required, but is not installed."

## Rješenje za XAMPP (Windows)

### Korak 1: Pronađite php.ini fajl
1. Otvorite XAMPP Control Panel
2. Kliknite na "Config" pored Apache-a
3. Izaberite "PHP (php.ini)"
4. Fajl će se otvoriti u vašem editoru

### Korak 2: Omogućite GD ekstenziju
1. Pronađite liniju: `;extension=gd` ili `;extension=gd2`
2. Uklonite tačku-zarez (`;`) na početku linije
3. Trebalo bi biti: `extension=gd` ili `extension=gd2`

### Korak 3: Provjerite da li postoji GD sekcija
Provjerite da li postoji sekcija koja izgleda ovako:
```ini
[gd]
extension=gd
```

### Korak 4: Sačuvajte promjene i restartujte Apache
1. Sačuvajte php.ini fajl
2. U XAMPP Control Panel-u kliknite "Stop" za Apache
3. Zatim kliknite "Start" za Apache

### Korak 5: Provjerite da li je GD omogućen
1. Napravite novi fajl `phpinfo.php` u `C:\xampp\htdocs\PlanTim\public\`
2. Dodajte sljedeći kod:
```php
<?php
phpinfo();
```
3. Otvorite u browseru: `http://localhost/PlanTim/public/phpinfo.php`
4. Pronađite "gd" u stranici i provjerite da li je omogućen

### Alternativno - Provjera putem command line
Otvortie Command Prompt i pokrenite:
```bash
php -m | findstr gd
```

Ako vidite "gd", ekstenzija je omogućena.

## Napomena
Nakon omogućavanja GD ekstenzije, potrebno je restartovati Apache server da bi promjene bile primjenjene.








