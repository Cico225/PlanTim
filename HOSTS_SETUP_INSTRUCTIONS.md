# PlanTim - Konfiguracija Plantim Domena

## 📋 Pregled

Ovo uputstvo objašnjava kako konfigurisati PlanTim aplikaciju da koristi `http://plantim:5173` umesto `http://localhost:5173`.

## 🔧 Automatska Konfiguracija

Pokrenite batch skriptu:

```bash
CONFIGURE_PLANTIM_DOMAIN.bat
```

Ova skripta će automatski ažurirati:
- `frontend/.env` fajl
- Backend `.env` fajl
- Vite konfiguraciju

## 📝 Ručni Koraci - Hosts Fajl

**VAŽNO:** Ovo mora biti urađeno ručno jer zahteva administratorske privilegije.

### Korak 1: Otvorite Notepad kao Administrator

1. Pritisnite `Windows Key`
2. Upišite "Notepad"
3. Desni klik na "Notepad"
4. Izaberite **"Run as administrator"**

### Korak 2: Otvorite Hosts Fajl

1. U Notepad-u, kliknite **File** → **Open**
2. Navigirajte do: `C:\Windows\System32\drivers\etc\`
3. U donjem desnom uglu, promenite filter sa "Text Documents (*.txt)" na **"All Files (*.*)"**
4. Izaberite fajl `hosts` (bez ekstenzije)
5. Kliknite **Open**

### Korak 3: Dodajte Plantim Unos

Na kraju fajla, dodajte sledeću liniju:

```
127.0.0.1    plantim
```

Primer kako bi trebalo da izgleda:

```
# Copyright (c) 1993-2009 Microsoft Corp.
#
# This is a sample HOSTS file used by Microsoft TCP/IP for Windows.
#
# ...
127.0.0.1       localhost
::1             localhost
127.0.0.1       plantim
```

### Korak 4: Sačuvajte Fajl

1. Pritisnite `Ctrl + S` ili kliknite **File** → **Save**
2. Zatvorite Notepad

### Korak 5: Restartujte Browser

Zatvorite i ponovo otvorite browser da primeni promene u hosts fajlu.

## ✅ Verifikacija

Nakon konfiguracije, otvorite Command Prompt i pokrenite:

```bash
ping plantim
```

Trebalo bi da vidite:

```
Pinging plantim [127.0.0.1] with 32 bytes of data:
Reply from 127.0.0.1: bytes=32 time<1ms TTL=128
...
```

## 🚀 Pokretanje Aplikacije

1. Pokrenite servere:
   ```bash
   START_ALL_AUTO_NETWORK.bat
   ```

2. Otvorite browser i idite na:
   - Frontend: `http://plantim:5173`
   - Backend API: `http://plantim:8000/api`

## 🔄 Povratak na Localhost

Ako želite da se vratite na `localhost`:

1. Uklonite liniju `127.0.0.1    plantim` iz hosts fajla
2. Pokrenite `CONFIGURE_PLANTIM_DOMAIN.bat` i odaberite opciju za vraćanje na localhost (ili ručno ažurirajte .env fajlove)

## 🐛 Troubleshooting

### Problem: "This site can't be reached" ili "ERR_NAME_NOT_RESOLVED"

**Rešenje:**
- Proverite da li ste dodali unos u hosts fajl
- Proverite da li je hosts fajl sačuvan
- Restartujte browser
- Možda treba da očistite DNS cache:
  ```bash
  ipconfig /flushdns
  ```

### Problem: Serveri se ne pokreću

**Rešenje:**
- Proverite da li su .env fajlovi ažurirani
- Proverite da li su portovi 5173 i 8000 slobodni
- Restartujte servere

### Problem: API pozivi ne rade

**Rešenje:**
- Proverite da li je `VITE_API_URL` u `frontend/.env` postavljen na `http://plantim:8000/api`
- Proverite da li je `SANCTUM_STATEFUL_DOMAINS` u backend `.env` sadrži `plantim,plantim:5173`

## 📚 Dodatne Informacije

- Hosts fajl omogućava mapiranje imena domena na IP adrese lokalno
- `127.0.0.1` je loopback adresa koja se uvek odnosi na lokalni računar
- Promene u hosts fajlu primenjuju se odmah, ali možda treba restartovati browser











