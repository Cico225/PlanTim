# 🚀 PlanTim - Brza Pomoć

## 📱 Problem: Promenio sam WiFi mrežu i aplikacija ne radi

### ✅ REŠENJE - Automatska Konfiguracija

Kreirana su 3 nova fajla koja automatski rešavaju problem sa mrežom:

---

## 1️⃣ **UPDATE_NETWORK_CONFIG.bat** ⭐ PREPORUČENO

**Šta radi:**
- Automatski detektuje vašu trenutnu IP adresu
- Ažurira backend i frontend konfiguraciju
- Priprema sistem za trenutnu mrežu

**Kada koristiti:**
- Kada promenite WiFi mrežu
- Kada ne možete da se prijavite
- Pre svakog korišćenja aplikacije

**Kako koristiti:**
```
Dupli klik na: UPDATE_NETWORK_CONFIG.bat
```

---

## 2️⃣ **START_ALL_AUTO_NETWORK.bat** ⭐ NAJBOLJI IZBOR

**Šta radi:**
- Automatski ažurira mrežnu konfiguraciju
- Pokreće backend server na vašoj IP adresi
- Pokreće frontend server
- Omogućava pristup sa drugih uređaja na mreži

**Kada koristiti:**
- Za normalno pokretanje aplikacije
- Kada želite pristup sa telefona/tableta
- Automatski se prilagođava novoj WiFi mreži

**Kako koristiti:**
```
Dupli klik na: START_ALL_AUTO_NETWORK.bat
```

**Pristup:**
- Sa ovog računara: `http://localhost:5173`
- Sa telefona/tableta: `http://VASA_IP:5173` (prikazuje se u prozoru)

---

## 3️⃣ **START_LOCALHOST_ONLY.bat**

**Šta radi:**
- Pokreće servere samo za ovaj računar
- NE omogućava pristup sa drugih uređaja
- Brže pokretanje

**Kada koristiti:**
- Samo za rad na ovom računaru
- Kada ne trebate pristup sa telefona

**Kako koristiti:**
```
Dupli klik na: START_LOCALHOST_ONLY.bat
```

---

## 🎯 Koja skripta za koju situaciju?

| Situacija | Skripta | Zašto |
|-----------|---------|-------|
| **Promenio WiFi** | `UPDATE_NETWORK_CONFIG.bat` | Samo ažurira konfiguraciju |
| **Normalan rad** | `START_ALL_AUTO_NETWORK.bat` | Sve automatski + pristup sa telefona |
| **Brzo testiranje** | `START_LOCALHOST_ONLY.bat` | Samo ovaj računar |
| **Prvi put** | `START_ALL_AUTO_NETWORK.bat` | Najbolji izbor |

---

## 📋 Korak po Korak - Promena WiFi Mreže

### Scenario: Prešao sam sa kućnog WiFi-a na WiFi u kancelariji

**Stari način (NE RADI):**
1. Pokušam da se prijavim ❌
2. Greška: "Nema odgovora od servera" ❌
3. Moram ručno da menjam IP u .env fajlovima ❌

**Novi način (RADI):**
1. Dupli klik na `UPDATE_NETWORK_CONFIG.bat` ✅
2. Skripta automatski detektuje novu IP adresu ✅
3. Pokrenem aplikaciju sa `START_ALL_AUTO_NETWORK.bat` ✅
4. Sve radi! ✅

---

## 🔧 Šta ove skripte rade u pozadini?

### UPDATE_NETWORK_CONFIG.bat:
```
1. Detektuje IP adresu: 192.168.1.XXX
2. Ažurira backend/.env: APP_URL=http://192.168.1.XXX:8000
3. Ažurira frontend/.env: VITE_API_URL=http://192.168.1.XXX:8000/api
4. Kreira TRENUTNA_IP_ADRESA.txt sa informacijama
```

### START_ALL_AUTO_NETWORK.bat:
```
1. Poziva UPDATE_NETWORK_CONFIG.bat
2. Proveri da li je MySQL pokrenut
3. Pokreće backend na http://VASA_IP:8000
4. Pokreće frontend na http://VASA_IP:5173
5. Otvara browser
```

---

## 📱 Pristup sa Telefona/Tableta

Nakon pokretanja `START_ALL_AUTO_NETWORK.bat`:

1. **Na računaru** - pročitaj prozor i pronađi svoju IP adresu, npr: `192.168.1.105`
2. **Na telefonu** - otvori browser
3. **Unesi adresu:** `http://192.168.1.105:5173`
4. **Prijavi se** sa: `admin@plantim.com` / `password`

**VAŽNO:** Telefon i računar moraju biti na **istoj WiFi mreži**!

---

## 🆘 Ako i dalje ne radi

### Problem 1: "Ne mogu se prijaviti"
**Rešenje:**
```
1. Zatvori sve servere (Ctrl+C u terminal prozorima)
2. Pokreni: UPDATE_NETWORK_CONFIG.bat
3. Pokreni: START_ALL_AUTO_NETWORK.bat
```

### Problem 2: "MySQL nije pokrenut"
**Rešenje:**
```
1. Otvori XAMPP Control Panel
2. Klikni "Start" pored MySQL
3. Pokušaj ponovo
```

### Problem 3: "PHP nije prepoznat"
**Rešenje:**
```
1. Proveri da li je XAMPP instaliran u C:\xampp
2. Ako nije, otvori .bat fajlove i promeni putanju
```

### Problem 4: "Node nije prepoznat"
**Rešenje:**
```
1. Instaliraj Node.js sa: https://nodejs.org
2. Restartuj računar
3. U frontend folderu: npm install
```

---

## 💡 Pro Tips

### Tip 1: Dodaj Prečicu
- Desni klik na `START_ALL_AUTO_NETWORK.bat`
- "Send to" → "Desktop (create shortcut)"
- Sada možeš brzo pokrenuti sa desktop-a!

### Tip 2: Proveri Trenutnu IP
- Otvori fajl: `TRENUTNA_IP_ADRESA.txt`
- Vidi trenutnu konfiguraciju

### Tip 3: Za Developere
- `START_ALL_AUTO_NETWORK.bat` - za rad sa više uređaja
- `START_LOCALHOST_ONLY.bat` - za brzi development

---

## 📊 Poređenje Modova

| Feature | Localhost Only | Auto Network |
|---------|----------------|--------------|
| Pristup sa računara | ✅ | ✅ |
| Pristup sa telefona | ❌ | ✅ |
| Auto WiFi update | ❌ | ✅ |
| Brzina | ⚡⚡⚡ | ⚡⚡ |
| Idealno za | Development | Production/Demo |

---

## 🎓 Za Tehničare

**Kako radi detekcija IP adrese:**
```batch
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP_RAW=%%a
    goto :found_ip
)
```

**Kako se ažurira frontend .env:**
```batch
echo VITE_API_URL=http://%LOCAL_IP%:8000/api > frontend\.env
```

**Kako se pokreće backend na specifičnoj IP:**
```batch
php artisan serve --host=%LOCAL_IP% --port=8000
```

---

## ✅ Checklist Pre Korišćenja

- [ ] XAMPP instaliran
- [ ] MySQL server pokrenut (XAMPP Control Panel)
- [ ] Node.js instaliran
- [ ] `npm install` izvršen u frontend folderu
- [ ] Migracije pokrenute (`php artisan migrate`)
- [ ] Seederi pokrenuti (`php artisan db:seed`)

---

## 🎉 Sve Spremno!

Sada možete slobodno menjati WiFi mreže!

**Jednostavan proces:**
1. Promenite WiFi
2. Pokrenite `START_ALL_AUTO_NETWORK.bat`
3. Gotovo! ✨

---

**Poslednje ažuriranje:** 2025-11-18
**Verzija:** 1.0
**Autor:** PlanTim Development Team






