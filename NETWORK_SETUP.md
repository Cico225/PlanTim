# 🌐 PlanTim - Pristup sa Mobilnog i Drugih Računara

## ⚡ BRZO RJEŠENJE (2 koraka)

### KORAK 1: Popravi Sve Automatski

**Desni klik** na ovu skriptu → **Run as Administrator**:
```
COMPLETE_NETWORK_FIX.bat
```

✅ Ova skripta automatski:
- Detektuje tvoju IP adresu
- Dodaje Windows Firewall pravila
- Ažurira frontend i backend konfiguraciju
- Čisti cache
- Kreira `START_NETWORK.bat` skriptu

⚠️ **OBAVEZNO pokrenuti kao Administrator!**

---

### KORAK 2: Pokreni Servere

1. **Zatvori** sve pokrenute servere (Ctrl+C ili zatvori prozore)
2. **Duplim klikom** pokreni:
   ```
   START_NETWORK.bat
   ```

---

## 🔑 Pristup

### Sa Glavnog Računara:
```
http://localhost:5173
```

### Sa Mobilnog/Drugog Računara (na istoj WiFi):
```
http://TVOJA_IP_ADRESA:5173
```

**Primer:**
```
http://192.168.1.204:5173
```

### Login:
```
Email:    admin@plantim.com
Password: password
```

🔒 **GDPR:** Pri prijavi potrebno je prihvatiti Uslove korištenja i Politiku privatnosti.

---

## ✅ Testiranje

Pokreni test skriptu da proveriš da li sve radi:
```
TEST_NETWORK.bat
```

Ova skripta će proveriti:
- ✓ Da li serveri rade
- ✓ Da li su dostupni preko IP adrese
- ✓ Da li firewall pravila postoje
- ✓ Koja je tvoja IP adresa

---

## ⚠️ Najčešći Problemi

### Problem 1: "Nema odgovora od servera"

**Uzrok:** Firewall blokira pristup

**Rješenje:**
```
Desni klik → COMPLETE_NETWORK_FIX.bat → Run as Administrator
```

---

### Problem 2: "Connection refused"

**Uzrok:** Serveri nisu pokrenuti za network pristup

**Rješenje:**
1. Zatvori sve servere
2. Pokreni `START_NETWORK.bat`

---

### Problem 3: IP adresa se promenila

**Uzrok:** Router dodelio novu IP adresu

**Rješenje:**
```
Pokreni ponovo: COMPLETE_NETWORK_FIX.bat (kao Administrator)
```

---

### Problem 4: Radi sa računara, ali ne sa mobilnog

**Proveri:**
- ✓ Da li su računar i mobilni na **istoj WiFi mreži**?
- ✓ Da li je firewall ispravno podešen?
- ✓ Da li koristiš **tačnu IP adresu**?

**Rješenje:**
```
Pokreni: TEST_NETWORK.bat
```

---

## 🔧 Ručno Rješavanje (ako skripte ne rade)

### 1. Dodaj Firewall Pravila Ručno

**Windows Security** → **Firewall & network protection** → **Advanced settings**

**Inbound Rules** → **New Rule:**
- Type: **Port**
- Protocol: **TCP**
- Specific local ports: **8000**
- Action: **Allow the connection**
- Profile: **Domain, Private, Public** (sva 3)
- Name: **PlanTim Backend**

Ponovi za port **5173** (ime: **PlanTim Frontend**)

---

### 2. Proveri IP Adresu

```cmd
ipconfig
```

Traži liniju: `IPv4 Address . . . : 192.168.X.X`

---

### 3. Ažuriraj Frontend Konfiguraciju

U fajlu `frontend/.env` promeni:
```
VITE_API_URL=http://TVOJA_IP:8000/api
```

---

### 4. Pokreni Servere za Network

**Backend:**
```cmd
C:\xampp\php\php.exe artisan serve --host=0.0.0.0 --port=8000
```

**Frontend:**
```cmd
cd frontend
npm run dev -- --host 0.0.0.0
```

---

## 📱 Testiranje Mobilnog Pristupa

### Korak 1: Proveri WiFi
Mobilni i računar moraju biti na **istoj WiFi mreži**!

### Korak 2: Otvori Browser na Mobilnom
```
http://192.168.X.X:5173
```
(zameni sa tvojom IP adresom)

### Korak 3: Prijavi se
```
Email:    admin@plantim.com
Password: password
```

---

## 🔍 Dijagnostika

### Komanda za Proveru Portova:
```cmd
netstat -an | findstr ":8000"
netstat -an | findstr ":5173"
```

**Trebalo bi da vidiš:**
```
TCP    0.0.0.0:8000         0.0.0.0:0              LISTENING
TCP    0.0.0.0:5173         0.0.0.0:0              LISTENING
```

Ako vidiš `127.0.0.1` umesto `0.0.0.0` → serveri nisu pokrenuti za network!

---

### Komanda za Proveru Firewall Pravila:
```cmd
netsh advfirewall firewall show rule name="PlanTim Backend"
netsh advfirewall firewall show rule name="PlanTim Frontend"
```

Ako vidiš "No rules match" → firewall pravila nisu dodata!

---

### Test Pristupa API-ju:
```cmd
curl http://TVOJA_IP:8000/api/health
```

**Očekivano:**
```json
{"status":"ok","timestamp":"..."}
```

---

## 🆘 Ako Ništa Ne Radi

### Privremeno Isključi Firewall (samo za test):

**Windows Security** → **Firewall & network protection** → Isključi

Ako sada radi → problem je firewall → koristi `COMPLETE_NETWORK_FIX.bat`

---

### Proveri Antivirus:

Neki antivirus programi (Avast, Kaspersky, Norton) blokiraju mrežni pristup.

Privremeno isključi i testaj.

---

### Proveri Router:

Neki routeri imaju "AP Isolation" ili "Client Isolation" opciju.

Ako je uključena, uređaji na WiFi ne mogu međusobno komunicirati.

**Rješenje:** Isključi AP Isolation u router postavkama.

---

## 📋 Sažetak

| Akcija | Skripta |
|--------|---------|
| **Automatski fix** | `COMPLETE_NETWORK_FIX.bat` (kao Admin) |
| **Pokreni servere** | `START_NETWORK.bat` |
| **Testiraj pristup** | `TEST_NETWORK.bat` |

---

## ✅ Checklist

- [ ] Pokrenuo `COMPLETE_NETWORK_FIX.bat` kao Administrator
- [ ] Zatvorio sve stare servere
- [ ] Pokrenuo `START_NETWORK.bat`
- [ ] Računar i mobilni na istoj WiFi mreži
- [ ] Koristim tačnu IP adresu (proveri sa `ipconfig`)
- [ ] Testiram sa Incognito/Private mode na mobilnom
- [ ] Firewall pravila postoje (proveri sa `TEST_NETWORK.bat`)

---

**Ako i dalje ne radi nakon svega ovoga, pošalji mi screenshot rezultata iz `TEST_NETWORK.bat`!** 🔧

