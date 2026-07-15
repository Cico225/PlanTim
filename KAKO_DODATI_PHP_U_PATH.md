# 🔧 Kako Dodati PHP u PATH (Opciono)

## ⚠️ Napomena

**NE MORATE OVO RADITI** ako koristite `SETUP_AUTO.bat` i `START_ALL_AUTO.bat` skripte.

Ove skripte automatski koriste punu putanju do PHP-a.

---

## Zašto Dodati PHP u PATH?

Dodavanje PHP-a u PATH omogućava da:
- Koristite `php` komandu bilo gdje u Command Prompt-u
- Koristite originalne batch skripte (`CREATE_ENV_AND_SETUP.bat`)
- Pokrenete Laravel komande direktno

---

## 📝 Korak po Korak (Windows 10/11)

### Korak 1: Kopirajte PHP Putanju

Standardna XAMPP putanja:
```
C:\xampp\php
```

Ako ste instalirali XAMPP na drugu lokaciju, pronađite vašu putanju.

---

### Korak 2: Otvorite System Properties

**Metoda 1 - Brza:**
1. Pritisnite `Windows + R`
2. Upišite: `sysdm.cpl`
3. Pritisnite Enter

**Metoda 2 - Preko Settings:**
1. Pritisnite `Windows + I` (Settings)
2. Kliknite na **System**
3. Kliknite na **About** (na dnu)
4. Kliknite na **Advanced system settings**

---

### Korak 3: Otvorite Environment Variables

1. U **System Properties** prozoru, kliknite na tab **Advanced**
2. Kliknite na dugme **Environment Variables** (na dnu)

---

### Korak 4: Pronađite PATH Variable

U **System variables** sekciji (donji dio prozora):

1. Pronađite varijablu koja se zove **Path**
2. Izaberite je (jedan klik)
3. Kliknite na dugme **Edit**

---

### Korak 5: Dodajte PHP Putanju

**Windows 10/11:**
1. U novom prozoru, kliknite **New**
2. Dodajte: `C:\xampp\php`
3. Kliknite **OK**

**Starije verzije Windows:**
1. Na kraju postojećeg teksta dodajte `;` (tačka-zarez)
2. Zatim dodajte: `C:\xampp\php`
3. Kliknite **OK**

---

### Korak 6: Dodajte Composer (Opciono)

Ako želite i `composer` komandu, dodajte i:

```
C:\ProgramData\ComposerSetup\bin
```

Napomena: Putanja može biti drugačija zavisno gdje je Composer instaliran.

---

### Korak 7: Primijenite Promjene

1. Kliknite **OK** u svim otvorenim prozorima
2. **ZATVORITE** sve Command Prompt prozore
3. Otvorite **novi** Command Prompt

---

### Korak 8: Testirajte

Otvorite **novi** Command Prompt i upišite:

```cmd
php --version
```

**Očekivani rezultat:**
```
PHP 8.2.4 (cli) (built: ...)
```

Ako vidite verziju PHP-a - **uspješno ste dodali PHP u PATH!** ✅

---

## 🚫 Šta Ako Ne Radi?

### Problem: "php nije prepoznato"

**Mogući uzroci:**

1. **Niste restartovali Command Prompt**
   - Zatvorite SVE Command Prompt prozore
   - Otvorite novi Command Prompt
   - Pokušajte ponovo

2. **Pogrešna putanja**
   - Provjerite da li `C:\xampp\php` zaista postoji
   - Provjerite da li u tom folderu postoji `php.exe`

3. **Sintaksna greška u PATH**
   - Provjerite da ste koristili `;` (tačka-zarez) za razdvajanje
   - Provjerite da nema dodatnih razmaka

---

## 🔄 Kako Ukloniti PHP iz PATH?

Ako želite ukloniti:

1. Otvorite **Environment Variables** (koraci 2-4 od gore)
2. Pronađite **Path** varijablu
3. Kliknite **Edit**
4. Pronađite `C:\xampp\php`
5. Izaberite ga i kliknite **Delete**
6. Kliknite **OK**

---

## 💡 Alternativa - Korištenje Aliasa (PowerShell)

Ako ne želite mijenjati sistem PATH, možete kreirati alias:

### Za PowerShell:

1. Otvorite PowerShell
2. Upišite:
   ```powershell
   notepad $PROFILE
   ```
3. Dodajte:
   ```powershell
   Set-Alias php C:\xampp\php\php.exe
   Set-Alias composer C:\xampp\php\composer.phar
   ```
4. Sačuvajte i zatvorite
5. Restartujte PowerShell

---

## 🎯 Preporuka

Ako ne želite mijenjati sistem PATH, jednostavno koristite:

```
SETUP_AUTO.bat          ← Za instalaciju
START_ALL_AUTO.bat      ← Za pokretanje
```

Ove skripte **ne zahtijevaju** PATH konfiguraciju! 🎉

---

## 📚 Dodatne Informacije

- **Windows PATH Dokumentacija:** https://docs.microsoft.com/en-us/windows/deployment/usmt/usmt-recognized-environment-variables
- **XAMPP Dokumentacija:** https://www.apachefriends.org/docs/
- **PHP Manual:** https://www.php.net/manual/

---

**Napomena:** Nakon što dodate PHP u PATH, možete koristiti bilo koju batch skriptu iz projekta.

